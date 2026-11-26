import { describe, expect, it } from 'vitest';
import {
  networkFailureText,
  rejectionText,
  sourceFromStack,
  sourceLabel,
} from '../../lib/console-line';

describe('networkFailureText', () => {
  it('matches the line Chrome prints for an HTTP error', () => {
    expect(
      networkFailureText(
        'POST',
        'https://apis.interbank.pe/bie/authentication/api/auth/login',
        400,
        'Bad Request',
      ),
    ).toBe(
      'POST https://apis.interbank.pe/bie/authentication/api/auth/login 400 (Bad Request)',
    );
  });

  it('omits the reason when the status text is empty', () => {
    expect(networkFailureText('GET', 'https://example.com/x', 404, '  ')).toBe(
      'GET https://example.com/x 404',
    );
  });

  it('describes a request that never got a status', () => {
    expect(networkFailureText('GET', 'https://example.com/x', 0, 'Failed to fetch')).toBe(
      'GET https://example.com/x (Failed to fetch)',
    );
  });

  it('ignores successful responses', () => {
    expect(networkFailureText('GET', 'https://example.com/x', 200, 'OK')).toBeUndefined();
  });
});

describe('rejectionText', () => {
  it('prefixes an Error the way the console does', () => {
    expect(rejectionText(new Error('canal cerrado'))).toBe(
      'Uncaught (in promise) Error: canal cerrado',
    );
  });
});

describe('source labels', () => {
  it('keeps the file name and line Chrome shows beside a message', () => {
    expect(
      sourceLabel(
        'https://empresas.interbank.pe/ruxitagent_ICA.js',
        768,
      ),
    ).toBe('ruxitagent_ICA.js:768');
  });

  it('skips the extension frame and uses the page caller', () => {
    const stack = [
      'Error',
      '    at window.fetch (chrome-extension://abcdefghijklmnop/recorder-main.js:10:5)',
      '    at send (https://empresas.interbank.pe/ruxitagent_ICA.js:768:12)',
      '    at a.invokeTask (https://empresas.interbank.pe/polyfills.js:1:9)',
    ].join('\n');
    expect(sourceFromStack(stack)).toBe('ruxitagent_ICA.js:768');
  });

  it('keeps an anonymous caller', () => {
    expect(sourceFromStack('Error\n    at <anonymous>:124:25')).toBe(
      '<anonymous>:124',
    );
  });
});
