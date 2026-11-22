import {useState} from 'react';
import {Image, ImageSourcePropType, ImageStyle, StyleProp} from 'react-native';

interface Props {
  source: ImageSourcePropType | undefined;
  // bundled picture shown when the remote one is missing or fails to load
  fallback: number;
  style?: StyleProp<ImageStyle>;
}

// Remote picture that falls back to a bundled one instead of leaving a blank box.
export default function SafeImage({source, fallback, style}: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={failed || !source ? fallback : source}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
