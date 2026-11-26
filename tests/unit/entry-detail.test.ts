import { describe, expect, it } from 'vitest';
import {
  curlCopyText,
  matchNetworkEvent,
  presentPayload,
  requestCopyText,
  responseCopyText,
  type ExchangeCopy,
} from '../../lib/entry-detail';

describe('presentPayload', () => {
  it('pretty-prints JSON objects and arrays', () => {
    expect(presentPayload('{"a":1}')).toEqual({ text: '{\n  "a": 1\n}' });
    expect(presentPayload(' [1,2] ')).toEqual({ text: '[\n  1,\n  2\n]' });
  });

  it('leaves ordinary text alone', () => {
    expect(presentPayload('POST /login 400')).toEqual({
      text: 'POST /login 400',
    });
    expect(presentPayload('{not json')).toEqual({ text: '{not json' });
  });

  it('reports base64 bodies as a byte count', () => {
    expect(presentPayload('YQ==', 'base64')).toEqual({ binaryBytes: 1 });
    expect(presentPayload('', 'base64')).toEqual({ binaryBytes: 0 });
  });
});

describe('matchNetworkEvent', () => {
  const baseMs = Date.parse('2026-11-26T12:00:00.000Z');
  const event = {
    kind: 'network',
    t: baseMs + 19700,
    method: 'POST',
    url: 'https://apis.example/login',
    status: 400,
    statusText: 'Bad Request',
    requestHeaders: { 'content-type': 'application/json', empty: '' },
    responseBody: '{"ok":false}',
    size: 12,
    resourceType: 'fetch',
  };

  it('matches the request on the same clock and drops empty headers', () => {
    const match = matchNetworkEvent([event, { kind: 'click', t: 1 }, null], {
      t: 19700,
      method: 'POST',
      url: 'https://apis.example/login',
      status: 400,
      baseMs,
    });
    expect(match?.statusText).toBe('Bad Request');
    expect(match?.requestHeaders).toEqual({
      'content-type': 'application/json',
    });
    expect(match?.responseBody).toBe('{"ok":false}');
    expect(match?.size).toBe(12);
    expect(match?.resourceType).toBe('fetch');
  });

  it('skips a later call to the same address', () => {
    expect(
      matchNetworkEvent([event], {
        t: 90_000,
        method: 'POST',
        url: event.url,
        status: 400,
        baseMs,
      }),
    ).toBeNull();
  });

  it('picks the closest call when two share the address', () => {
    const other = { ...event, t: baseMs + 19800, statusText: 'Later' };
    const match = matchNetworkEvent([other, event], {
      t: 19700,
      method: 'POST',
      url: event.url,
      status: 400,
      baseMs,
    });
    expect(match?.statusText).toBe('Bad Request');
  });
});

describe('exchange copy text', () => {
  const note = (bytes: number) => `not text (${bytes} bytes)`;
  const exchange: ExchangeCopy = {
    method: 'POST',
    url: "https://apis.example/login?q=a'b",
    status: 400,
    statusText: 'Bad Request',
    requestHeaders: {
      'content-type': 'application/json',
      host: 'apis.example',
      'content-length': '12',
      cookie: 'sid=1',
    },
    responseHeaders: { 'content-type': 'application/json' },
    requestBody: '{"user":"ada"}',
    responseBody: '{"ok":false}',
  };

  it('copies the request as it was sent', () => {
    expect(requestCopyText(exchange, note)).toBe(
      [
        "POST https://apis.example/login?q=a'b",
        'content-type: application/json',
        'host: apis.example',
        'content-length: 12',
        'cookie: sid=1',
        '',
        '{"user":"ada"}',
      ].join('\n'),
    );
  });

  it('copies the response with its status line', () => {
    expect(responseCopyText(exchange, note)).toBe(
      ['400 Bad Request', 'content-type: application/json', '', '{"ok":false}'].join(
        '\n',
      ),
    );
  });

  it('builds a curl command and quotes single quotes', () => {
    expect(curlCopyText(exchange, note)).toBe(
      [
        "curl 'https://apis.example/login?q=a'\\''b' \\",
        "-X 'POST' \\",
        "-H 'content-type: application/json' \\",
        "-H 'cookie: sid=1' \\",
        "--data-raw '{\"user\":\"ada\"}'",
      ].join('\n'),
    );
  });

  it('leaves a binary body out of curl and notes the size', () => {
    const text = curlCopyText(
      {
        method: 'POST',
        url: 'https://apis.example/up',
        status: 0,
        requestBody: 'YQ==',
        requestEncoding: 'base64',
      },
      note,
    );
    expect(text).toBe(
      ["curl 'https://apis.example/up' \\", "-X 'POST'", '# not text (1 bytes)'].join(
        '\n',
      ),
    );
    expect(text).not.toContain('--data-raw');
  });
});
