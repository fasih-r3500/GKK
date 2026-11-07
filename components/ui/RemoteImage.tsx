import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  buildDisplayImageUrl,
  markImageTransformsUnavailable,
} from '../../services/imageUrl';

type RemoteImageProps = {
  uri: string | null | undefined;
  /** Display width in points. The requested network image is sized from this. */
  width: number;
  /** Display height in points. */
  height: number;
  className?: string;
  accessibilityLabel?: string;
};

/**
 * A list-sized image with a safe fallback.
 *
 * The image is requested at its display size. If Supabase rejects the resized variant (image
 * transformations are not enabled on every plan), the same component retries the original URL
 * and turns off resized requests for the rest of the session.
 */
export function RemoteImage({
  uri,
  width,
  height,
  className,
  accessibilityLabel,
}: RemoteImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const sizedUri = buildDisplayImageUrl(uri, width, height);
  const imageStyle = useMemo(() => ({ width, height }), [height, width]);

  const handleError = useCallback(() => {
    if (!sizedUri || sizedUri === uri) return;
    setFailedUri(sizedUri);
    markImageTransformsUnavailable();
  }, [sizedUri, uri]);

  if (!uri) {
    return null;
  }

  const source = sizedUri && failedUri !== sizedUri ? sizedUri : uri;

  return (
    <View className={className}>
      <Image
        source={source}
        style={imageStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={uri}
        transition={0}
        accessibilityLabel={accessibilityLabel}
        onError={handleError}
      />
    </View>
  );
}
