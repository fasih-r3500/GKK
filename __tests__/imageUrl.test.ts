import {
  buildDisplayImageUrl,
  markImageTransformsUnavailable,
  resetImageTransformsSupport,
} from '../services/imageUrl';

const PUBLIC_IMAGE =
  'https://example.supabase.co/storage/v1/object/public/avatars/dish-images/chef-1.jpg';

describe('buildDisplayImageUrl', () => {
  beforeEach(() => {
    resetImageTransformsSupport();
  });

  it('asks Supabase for a resized variant of a public object URL', () => {
    expect(buildDisplayImageUrl(PUBLIC_IMAGE, 80, 80)).toBe(
      'https://example.supabase.co/storage/v1/render/image/public/avatars/dish-images/chef-1.jpg' +
        '?width=160&height=160&resize=cover'
    );
  });

  it('adds size parameters to an existing render URL', () => {
    const renderUrl =
      'https://example.supabase.co/storage/v1/render/image/public/avatars/kitchen.jpg?quality=80';

    expect(buildDisplayImageUrl(renderUrl, 40, 40)).toBe(
      `${renderUrl}&width=80&height=80&resize=cover`
    );
  });

  it('leaves non-Supabase URLs and missing values alone', () => {
    expect(buildDisplayImageUrl('https://via.placeholder.com/80', 80, 80)).toBe(
      'https://via.placeholder.com/80'
    );
    expect(buildDisplayImageUrl('data:image/png;base64,abc', 80, 80)).toBe(
      'data:image/png;base64,abc'
    );
    expect(buildDisplayImageUrl(null, 80, 80)).toBeNull();
  });

  it('falls back to the original URL once transformations are known to be unavailable', () => {
    markImageTransformsUnavailable();

    expect(buildDisplayImageUrl(PUBLIC_IMAGE, 80, 80)).toBe(PUBLIC_IMAGE);
  });
});
