/**
 * Display-size URLs for images stored in Supabase Storage.
 *
 * A full public object URL makes the phone download and decode the original upload, even when
 * it is rendered in an 80pt thumbnail. Supabase can serve a resized variant from its render
 * endpoint, so list rows ask for the size they actually draw.
 *
 * Image transformations are only enabled on some Supabase plans. When a requested variant
 * fails, `RemoteImage` marks transformations unavailable and every later image falls back to
 * the original public URL, so the app never depends on them being enabled.
 */

const SUPABASE_OBJECT_PUBLIC = '/storage/v1/object/public/';
const SUPABASE_RENDER_PUBLIC = '/storage/v1/render/image/public/';

/** Request roughly two pixels per display point so the result stays sharp on dense screens. */
const PIXELS_PER_POINT = 2;

let transformsUnavailable = false;

/** Turn off resized requests after this project rejected one. */
export function markImageTransformsUnavailable(): void {
  transformsUnavailable = true;
}

/** Visible for tests: restore the initial state. */
export function resetImageTransformsSupport(): void {
  transformsUnavailable = false;
}

function appendSizeParams(url: string, width: number, height: number): string {
  const requestWidth = Math.max(1, Math.round(width * PIXELS_PER_POINT));
  const requestHeight = Math.max(1, Math.round(height * PIXELS_PER_POINT));
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${requestWidth}&height=${requestHeight}&resize=cover`;
}

/**
 * Build a URL that asks Supabase for a `width` x `height` variant of a stored image.
 *
 * Values that are already sized, are not Supabase public object URLs, or are absolute
 * non-Supabase URLs (placeholders, data URIs) are returned unchanged.
 */
export function buildDisplayImageUrl(
  uri: string | null | undefined,
  width: number,
  height: number
): string | null {
  if (!uri || transformsUnavailable) {
    return uri ?? null;
  }

  if (uri.includes(SUPABASE_RENDER_PUBLIC)) {
    return appendSizeParams(uri, width, height);
  }

  if (!uri.includes(SUPABASE_OBJECT_PUBLIC)) {
    return uri;
  }

  return appendSizeParams(
    uri.replace(SUPABASE_OBJECT_PUBLIC, SUPABASE_RENDER_PUBLIC),
    width,
    height
  );
}
