import {ReactNode} from 'react';
import {Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, radius, shadow} from '../../lib/theme';

interface Props {
  title?: string;
  // smaller on the sign-up screen, which has more fields
  logoSize?: number;
  children: ReactNode;
}

// Soft teal header with the logo and the title, then the form on a rounded white card.
export default function AuthScreen({title = 'ALOCA', logoSize = 150, children}: Props) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'height' : 'padding'} style={styles.flex}>
      <LinearGradient colors={[colors.tabBar, '#fff']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.logoBox, shadow]}>
            <Image source={require('../../assets/images/Icon.png')} style={{width: logoSize, height: logoSize, borderRadius: logoSize / 6}} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.card, shadow]}>{children}</View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {paddingTop: 56, paddingBottom: 32, paddingHorizontal: 20, alignItems: 'center'},
  logoBox: {borderRadius: 28, backgroundColor: '#fff', padding: 6},
  title: {color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 5, textAlign: 'center', marginTop: 14, marginBottom: 22},
  card: {width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: radius.lg + 4, padding: 22},
});
