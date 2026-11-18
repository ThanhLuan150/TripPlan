import {StyleSheet, Text, TextInput, TextStyle} from 'react-native';

// Be Vietnam Pro (the font of the web app). A custom font has one file per weight, so the
// `fontWeight` written in the styles is turned into the matching family when a Text is drawn.
const families: Record<string, string> = {
  '100': 'BeVietnamPro-Regular',
  '200': 'BeVietnamPro-Regular',
  '300': 'BeVietnamPro-Regular',
  '400': 'BeVietnamPro-Regular',
  normal: 'BeVietnamPro-Regular',
  '500': 'BeVietnamPro-Medium',
  '600': 'BeVietnamPro-SemiBold',
  '700': 'BeVietnamPro-Bold',
  bold: 'BeVietnamPro-Bold',
  '800': 'BeVietnamPro-ExtraBold',
  '900': 'BeVietnamPro-ExtraBold',
};

const withFont = (style: unknown) => {
  const flat: TextStyle = StyleSheet.flatten(style as TextStyle) ?? {};
  const family = flat.fontFamily ?? families[String(flat.fontWeight ?? '400')] ?? families['400'];
  // fontWeight must go: Android would fake a second bold on top of the bold file
  return {...flat, fontFamily: family, fontWeight: undefined};
};

// Text and TextInput are forwardRef components; wrap their render once at start-up.
const patch = (component: unknown) => {
  const target = component as {render: (props: {style?: unknown}, ref: unknown) => {props: {style?: unknown}}};
  const original = target.render;
  target.render = function (props, ref) {
    const element = original.call(this, props, ref);
    return {...element, props: {...element.props, style: withFont(element.props.style)}} as never;
  };
};

export const applyFonts = () => {
  patch(Text);
  patch(TextInput);
};
