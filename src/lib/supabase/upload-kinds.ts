/**
 * What each kind of user upload may be: bucket, size limit and file types.
 *
 * Shared by the server routes (/api/storage/upload-url, the legacy
 * /api/storage/upload, /api/uploads) and the browser helpers, so the limits
 * shown to customers always match what the server enforces. Bucket-level
 * limits are set once in scripts/phase13_storage_lockdown.sql.
 *
 * Safe to import from client components (no secrets, no server imports).
 */

export type UploadKind = 'model' | 'proof' | 'image';

type KindSpec = {
  bucket: string;
  maxBytes: number;
  /** Lower-case extensions including the dot. */
  extensions: readonly string[];
  /** Bucket is publicly readable (only product-images). */
  public: boolean;
};

const MB = 1024 * 1024;

export const UPLOAD_KINDS: Record<UploadKind, KindSpec> = {
  // 3D models for custom print requests. PRIVATE: admins and the assigned store
  // owner download them through /api/uploads/[id]/download (signed links).
  model: {
    bucket: 'model-uploads',
    maxBytes: 100 * MB,
    extensions: ['.stl', '.3mf', '.obj'],
    public: false,
  },
  // Payment screenshots. PRIVATE: viewed through /api/payments/proof/view.
  // .heic/.heif are accepted because iPhone photos picked in the mobile app
  // arrive in that format (the previous upload route accepted them too).
  proof: {
    bucket: 'payment-proofs',
    maxBytes: 10 * MB,
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.heic', '.heif'],
    public: false,
  },
  // Product photos and store avatars/covers (admins and store owners only).
  image: {
    bucket: 'product-images',
    maxBytes: 5 * MB,
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    public: true,
  },
};

/** Content type stored with the object, derived from the validated extension. */
const EXT_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
  '.stl': 'model/stl',
  '.3mf': 'model/3mf',
  '.obj': 'model/obj',
};

export function isUploadKind(v: unknown): v is UploadKind {
  return v === 'model' || v === 'proof' || v === 'image';
}

/** Matching allowed extension of `fileName` for `kind`, or null. */
export function allowedExtension(kind: UploadKind, fileName: string): string | null {
  const lower = String(fileName || '').toLowerCase();
  return UPLOAD_KINDS[kind].extensions.find((ext) => lower.endsWith(ext)) || null;
}

export function contentTypeForExtension(ext: string): string {
  return EXT_CONTENT_TYPES[ext] || 'application/octet-stream';
}

/** Keep only safe characters; never longer than 100 characters. */
export function sanitizeFileName(name: string): string {
  const cleaned = String(name || '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|-$/g, '');
  return (cleaned || 'file').slice(-100);
}

export function maxMegabytes(kind: UploadKind): number {
  return Math.round(UPLOAD_KINDS[kind].maxBytes / MB);
}

/** Value for an <input type="file" accept="..."> */
export function acceptAttribute(kind: UploadKind): string {
  const exts = UPLOAD_KINDS[kind].extensions;
  const types = Array.from(new Set(exts.map((e) => EXT_CONTENT_TYPES[e]).filter((t) => !t.startsWith('model/'))));
  return [...exts, ...types].join(',');
}
