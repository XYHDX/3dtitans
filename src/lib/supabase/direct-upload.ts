/**
 * Browser helper: upload a file straight to Supabase Storage.
 *
 *   1. POST /api/storage/upload-url  → server validates and returns a signed
 *      upload URL bound to one object path (no anon key, no open bucket policy).
 *   2. PUT the bytes to that URL with XMLHttpRequest (fetch has no upload
 *      progress), so large 3D models never pass through a Vercel Function.
 *
 * Errors are thrown as `DirectUploadError` with a stable `code` that the UI
 * turns into a translated message (see `uploadErrorMessage`).
 */
import { UPLOAD_KINDS, allowedExtension, type UploadKind } from './upload-kinds';

export type DirectUploadResult = {
  bucket: string;
  path: string;
  /** Storage URL in the same format the old /api/storage/upload returned. */
  url: string;
  size: number;
  contentType: string;
};

export type DirectUploadErrorCode =
  | 'login'
  | 'forbidden'
  | 'too_large'
  | 'bad_type'
  | 'rate_limited'
  | 'network'
  | 'aborted'
  | 'not_configured'
  | 'storage';

export class DirectUploadError extends Error {
  code: DirectUploadErrorCode;
  constructor(code: DirectUploadErrorCode, message?: string) {
    super(message || code);
    this.name = 'DirectUploadError';
    this.code = code;
  }
}

type Options = {
  /** 0–100 while the bytes are being sent. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

const KNOWN_CODES: DirectUploadErrorCode[] = [
  'login', 'forbidden', 'too_large', 'bad_type', 'rate_limited', 'not_configured', 'storage',
];

export async function uploadFileDirect(file: File, kind: UploadKind, opts: Options = {}): Promise<DirectUploadResult> {
  const spec = UPLOAD_KINDS[kind];
  // Same checks as the server, so customers get an instant answer.
  if (!allowedExtension(kind, file.name)) throw new DirectUploadError('bad_type');
  if (file.size <= 0 || file.size > spec.maxBytes) throw new DirectUploadError('too_large');

  let res: Response;
  try {
    res = await fetch('/api/storage/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, fileName: file.name, size: file.size, contentType: file.type || undefined }),
      signal: opts.signal,
    });
  } catch {
    if (opts.signal?.aborted) throw new DirectUploadError('aborted');
    throw new DirectUploadError('network');
  }
  const ticket = await res.json().catch(() => null);
  if (!res.ok || !ticket?.signedUrl) {
    const code = KNOWN_CODES.includes(ticket?.code) ? (ticket.code as DirectUploadErrorCode) : res.status === 401 ? 'login' : 'storage';
    throw new DirectUploadError(code, ticket?.error);
  }

  await putWithProgress(ticket.signedUrl, file, ticket.contentType, opts);
  opts.onProgress?.(100);

  return {
    bucket: ticket.bucket,
    path: ticket.path,
    url: ticket.url,
    size: file.size,
    contentType: ticket.contentType,
  };
}

function putWithProgress(url: string, file: File, contentType: string, opts: Options): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    // Raw body + Content-Type: Storage stores it with this type and checks it
    // against the bucket's allowed types. No apikey needed: the token in the
    // URL authorises exactly this one object path (no overwrite).
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        // Keep 100 for "done" (after the server answered).
        opts.onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // not JSON
      }
      const status = Number(body?.statusCode || xhr.status);
      const text = String(body?.error || body?.message || '');
      if (status === 413 || /too large|exceeded the maximum/i.test(text)) return reject(new DirectUploadError('too_large'));
      if (status === 415 || /mime type|invalid_mime/i.test(text)) return reject(new DirectUploadError('bad_type'));
      reject(new DirectUploadError('storage', text || `Storage responded ${xhr.status}`));
    };
    xhr.onerror = () => reject(new DirectUploadError('network'));
    xhr.ontimeout = () => reject(new DirectUploadError('network'));
    xhr.onabort = () => reject(new DirectUploadError('aborted'));

    if (opts.signal) {
      if (opts.signal.aborted) {
        reject(new DirectUploadError('aborted'));
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

type Translate = (key: string, fallback?: string, vars?: Record<string, string | number>) => string;

/** Friendly, translated message for any error thrown during an upload. */
export function uploadErrorMessage(err: unknown, t: Translate, kind: UploadKind): string {
  const spec = UPLOAD_KINDS[kind];
  const code = err instanceof DirectUploadError ? err.code : 'storage';
  switch (code) {
    case 'login':
      return t('uploads.err.login', 'Your session has expired. Please log in again and retry.');
    case 'forbidden':
      return t('uploads.err.forbidden', 'Your account is not allowed to upload this kind of file.');
    case 'too_large':
      return t('uploads.err.tooLarge', 'This file is too large. The maximum is {size} MB.', {
        size: Math.round(spec.maxBytes / 1024 / 1024),
      });
    case 'bad_type':
      return t('uploads.err.badType', 'This file type is not accepted. Allowed: {types}.', {
        types: spec.extensions.join(' '),
      });
    case 'rate_limited':
      return t('uploads.err.rateLimited', 'Too many uploads in a short time. Please wait a few minutes and try again.');
    case 'network':
      return t('uploads.err.network', 'The connection was interrupted. Check your internet connection and try again.');
    case 'aborted':
      return t('uploads.err.aborted', 'Upload cancelled.');
    default:
      return t('uploads.err.generic', 'We could not upload your file right now. Please try again in a few minutes.');
  }
}
