import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export interface NativeSigner {
  signRequest(
    method: string,
    path: string,
    body?: string | null
  ): {
    timestamp: string;
    nonce: string;
    signature: string;
    body: string;
  };
  initModule(baseUrl: string): void;
}

let cachedNative: NativeSigner | null = null;
let nativeAttempted = false;

export function getNativeSigner(): NativeSigner | null {
  if (nativeAttempted) {
    return cachedNative;
  }
  nativeAttempted = true;

  try {
    const require = createRequire(import.meta.url);
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const archDir = `${process.platform}-${process.arch}`;
    const candidates = [
      path.join(__dirname, 'luminylyrics_signer.node'),
      path.join(__dirname, '../internal/luminylyrics_signer.node'),
      path.join(__dirname, '../../dist/internal/luminylyrics_signer.node'),
      path.join(__dirname, `../../prebuilds/${archDir}/luminylyrics_signer.node`),
      path.join(__dirname, `../prebuilds/${archDir}/luminylyrics_signer.node`),
      path.join(process.cwd(), `prebuilds/${archDir}/luminylyrics_signer.node`),
      path.join(process.cwd(), `node_modules/lyricsradar/prebuilds/${archDir}/luminylyrics_signer.node`),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        cachedNative = require(p) as NativeSigner;
        return cachedNative;
      }
    }
  } catch {
    cachedNative = null;
  }

  return cachedNative;
}
