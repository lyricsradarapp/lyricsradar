import { getNativeSigner } from './native.js';

export interface SignResult {
  headers: {
    'x-luminy-timestamp': string;
    'x-luminy-nonce': string;
    'x-luminy-signature': string;
  };
  body: string;
}

export function signRequest(
  method: string,
  pathname: string,
  body?: string | Buffer | Record<string, unknown> | null,
): SignResult {
  const methodUpper = method.trim().toUpperCase();
  const cleanPath = pathname.trim().split('?')[0];

  let bodyStr = '';
  if (body) {
    if (typeof body === 'string') {
      bodyStr = body;
    } else if (Buffer.isBuffer(body)) {
      bodyStr = body.toString('utf8');
    } else {
      bodyStr = JSON.stringify(body);
    }
  }

  const native = getNativeSigner();
  if (native) {
    const res = native.signRequest(methodUpper, cleanPath, bodyStr);

    return {
      headers: {
        'x-luminy-timestamp': res.timestamp,
        'x-luminy-nonce': res.nonce,
        'x-luminy-signature': res.signature,
      },
      body: res.body,
    };
  }

  throw new Error(
    '[LuminyLyrics] Signer binary not found for platform: ' +
      `${process.platform}-${process.arch}. Please ensure prebuilds are present.`
  );
}
