import { assertEquals } from 'https://deno.land/std@0.193.0/testing/asserts.ts';

import { Status } from 'https://deno.land/std@0.193.0/http/http_status.ts';

import { json, validateRequest } from './mod.ts';

Deno.test('json() response has correct content-type', () => {
  const response = json({});

  assertEquals(
    response.headers.get('content-type'),
    'application/json; charset=utf-8',
  );
});

Deno.test('validateRequest() validates methods', async () => {
  const request = new Request('https://example.com', {
    method: 'POST',
  });

  const { error } = await validateRequest(request, {
    GET: {},
  });

  assertEquals(error!.message, 'method POST is not allowed for the URL');
  assertEquals(error!.status, Status.MethodNotAllowed);
});

Deno.test('validateRequest() validates headers', async () => {
  const request = new Request('https://example.com', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer token',
    },
  });

  const { error } = await validateRequest(request, {
    POST: {
      headers: ['Authorization', 'Content-Type'],
    },
  });

  assertEquals(error!.message, 'header \'Content-Type\' not available');
  assertEquals(error!.status, Status.BadRequest);
});

Deno.test('validateRequest() validates query strings', async () => {
  const request = new Request('https://example.com?name=Satya', {
    method: 'GET',
  });

  const { error } = await validateRequest(request, {
    GET: {
      params: ['name', 'age'],
    },
  });

  assertEquals(
    error!.message,
    'param \'age\' is required to process the request',
  );
  assertEquals(error!.status, Status.BadRequest);
});

Deno.test('validateRequest() validates body of POST request', async () => {
  const request = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Satya',
    }),
  });

  const { error, body } = await validateRequest(request, {
    POST: {
      body: ['name', 'age'],
    },
  });

  assertEquals(body, undefined);
  assertEquals(error!.message, 'field \'age\' is not available in the body');
});

Deno.test('validateRequest() populates body as per schema', async () => {
  const request = new Request('https://example.com', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Satya',
      age: 98,
    }),
  });

  const { error, body } = await validateRequest(request, {
    POST: {
      body: ['name', 'age'],
    },
  });

  assertEquals(error, undefined);
  assertEquals(body, { name: 'Satya', age: 98 });
});

const headersInitCases: {
  description: string;
  headers: HeadersInit;
  entries: [string, string][];
}[] = [
  {
    description: 'merges Headers',
    headers: new Headers({
      'content-type': 'type/subtype',
      'custom-header-1': '1',
      'custom-header-2': '2',
    }),
    entries: [
      ['content-type', 'type/subtype'],
      ['custom-header-1', '1'],
      ['custom-header-2', '2'],
    ],
  },
  {
    description: 'merges [string, string][]',
    headers: [
      ['content-type', 'type/subtype'],
      ['custom-header-1', '1'],
      ['custom-header-2', '2'],
    ],
    entries: [
      ['content-type', 'type/subtype'],
      ['custom-header-1', '1'],
      ['custom-header-2', '2'],
    ],
  },
  {
    description: 'merges Record<string, string>',
    headers: {
      'content-type': 'type/subtype',
      'custom-header-1': '1',
      'custom-header-2': '2',
    },
    entries: [
      ['content-type', 'type/subtype'],
      ['custom-header-1', '1'],
      ['custom-header-2', '2'],
    ],
  },
];

for (const { entries, headers, description } of headersInitCases) {
  Deno.test(`HeadersInit: json() ${description}`, () => {
    const response = json(null, { headers });
    for (const [key, value] of entries) {
      assertEquals(response.headers.get(key), value);
    }
  });
}
