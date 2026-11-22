import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors} from '../../lib/theme';

// "Please wait" while the AI works (also used for saving and loading a plan).
export function PleaseWait() {
  const {t} = useTranslation();
  return (
    <View style={styles.center}>
      <ActivityIndicator size={100} color={colors.primary} />
      <Text style={styles.wait}>{t('common.pleaseWait')}</Text>
    </View>
  );
}

// Sad picture with "Something went wrong" and a retry button.
export function GenerateError({
  overlap,
  onRetry,
}: {
  overlap: boolean;
  onRetry: () => void;
}) {
  const {t} = useTranslation();
  return (
    <ImageBackground
      style={styles.error}
      source={require('../../assets/images/ErrBackGround.png')}>
      <Text style={styles.errorTitle}>{t('trips.generate.errorTitle')}</Text>
      <Image
        style={styles.sorry}
        source={require('../../assets/images/sorry.png')}
      />
      {overlap && (
        <Text style={styles.errorText}>{t('trips.generate.overlap')}</Text>
      )}
      {!overlap && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retry}>{t('trips.retry')}</Text>
        </TouchableOpacity>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  wait: {color: colors.primary, fontSize: 30, fontWeight: '900'},
  error: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: colors.primary,
    fontSize: 35,
    fontWeight: '900',
    textAlign: 'center',
  },
  sorry: {width: 200, height: 220, alignSelf: 'center'},
  errorText: {color: colors.primary, textAlign: 'center', marginHorizontal: 30},
  retry: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '900',
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 10,
    overflow: 'hidden',
  },
});
