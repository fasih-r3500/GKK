import { supabase } from '../supabase';

/**
 * Helpers for the single public storage bucket this app uses, `avatars`.
 *
 * Canonical representation of an image column value: a **bare object path** inside the bucket.
 *   - `chef_profiles.kitchen_image` holds a file name at the bucket root,
 *     e.g. `<user>-<timestamp>.jpg`.
 *   - `dishes.image_url` holds a path under `dish-images/`,
 *     e.g. `dish-images/<user>-<timestamp>.jpg`.
 *
 * Rows written before this convention can still hold a full public URL in
 * `dishes.image_url`, so every read goes through `resolveStorageImageUrl`, which returns an
 * absolute URL unchanged and only builds a public URL for a bare path.
 */

export const STORAGE_BUCKET = 'avatars';
export const DISH_IMAGE_PREFIX = 'dish-images';

const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP: Record<string, number> = BASE64_ALPHABET.split('').reduce(
  (lookup, character, index) => {
    lookup[character] = index;
    return lookup;
  },
  {} as Record<string, number>
);

/** True when the value is already an absolute URL, such as `https://...` or `data:...`. */
export function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value.trim());
}

/**
 * Turn a stored image value into something `Image` can render.
 *
 * Stored values are a bare bucket path by convention, but rows created before that convention
 * hold a full public URL. An absolute URL is returned as is; anything else is treated as a path
 * in the `avatars` bucket and resolved to its public URL.
 */
export function resolveStorageImageUrl(
  value: string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  const objectPath = trimmed.replace(/^\/+/, '');
  if (!objectPath) {
    return null;
  }

  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath).data
    .publicUrl;
}

function extensionOf(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }

  const withoutQueryOrFragment = name.split('?')[0].split('#')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(withoutQueryOrFragment);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Content type to send when uploading an image. Prefers the picker's MIME type, falls back to
 * the file name extension, and finally to `image/jpeg`.
 */
export function imageContentType(
  mimeType?: string | null,
  sourceName?: string | null
): string {
  const normalized = (mimeType ?? '').trim().toLowerCase();
  if (normalized.startsWith('image/')) {
    return normalized;
  }

  const extension = extensionOf(sourceName);
  if (extension && CONTENT_TYPE_BY_EXTENSION[extension]) {
    return CONTENT_TYPE_BY_EXTENSION[extension];
  }

  return DEFAULT_IMAGE_CONTENT_TYPE;
}

/** File extension to use for an uploaded image, without the leading dot. */
export function imageExtension(
  mimeType?: string | null,
  sourceName?: string | null
): string {
  const extension = extensionOf(sourceName);
  if (extension && CONTENT_TYPE_BY_EXTENSION[extension]) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  return EXTENSION_BY_CONTENT_TYPE[imageContentType(mimeType, sourceName)] ?? 'jpg';
}

/** Build the bare object path a dish photo is stored at inside the `avatars` bucket. */
export function buildDishImagePath(
  userId: string,
  mimeType?: string | null,
  sourceName?: string | null,
  timestamp: number = Date.now()
): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, '') || 'chef';
  return `${DISH_IMAGE_PREFIX}/${safeUserId}-${timestamp}.${imageExtension(
    mimeType,
    sourceName
  )}`;
}

/**
 * Decode base64 image data into bytes. The picker hands back base64 rather than a readable file
 * URI, and raw bytes with an explicit content type upload reliably from React Native.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const input = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const output = new Uint8Array(Math.floor((input.length * 3) / 4));

  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let position = 0; position < input.length; position += 1) {
    buffer = (buffer << 6) | BASE64_LOOKUP[input[position]];
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return output.slice(0, index);
}

/**
 * Turn an upload or picker failure into a message a chef can act on, including the storage error
 * code when the API returned one.
 */
export function describeError(error: unknown): string {
  if (error === null || error === undefined) {
    return 'The request failed without an error message.';
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || 'The request failed without an error message.';
  }

  const candidate = error as {
    message?: unknown;
    statusCode?: unknown;
    status?: unknown;
  };

  const message =
    typeof candidate.message === 'string' && candidate.message.trim()
      ? candidate.message.trim()
      : String(error);

  const code = candidate.statusCode ?? candidate.status;
  const formattedCode =
    code === null || code === undefined || !String(code).trim()
      ? ''
      : ` (code ${String(code)})`;

  return `${message}${formattedCode}`;
}
