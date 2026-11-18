import {ScrollView, ScrollViewProps, StyleSheet} from 'react-native';
import {screen} from '../../lib/theme';

// Scrollable screen with the app background and standard padding.
export default function Screen({children, ...rest}: ScrollViewProps) {
  return (
    <ScrollView style={screen} contentContainerStyle={styles.content} {...rest}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {padding: 16},
});
