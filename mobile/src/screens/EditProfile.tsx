import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {Asset, launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';
import {profileApi} from '../api';
import {BackHeader, Button, ErrorText, FormInput} from '../components';
import {useApiMutation} from '../hooks/useApiMutation';
import {uploadImage} from '../lib/upload';
import {getAccessToken, useAuth} from '../store/session';
import {alert} from '../lib/alert';
import {imageSource} from '../lib/imageSource';
import {colors, radius, shadow} from '../lib/theme';

export default function EditProfile() {
  const {t} = useTranslation();
  const {user, signIn} = useAuth();
  const navigation = useNavigation<any>();
  const [fullname, setFullname] = useState(user?.fullname ?? '');
  const [phone, setPhone] = useState(user?.phone != null ? String(user.phone) : '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [formError, setFormError] = useState('');

  const save = useApiMutation(
    async () => {
      const data = {
        fullname: fullname.trim(),
        email: user?.email,
        phone,
        address: address.trim(),
        image: photo ? await uploadImage(photo) : user?.image ?? '',
      };
      await profileApi.update(data);
      return data;
    },
    {
      onSuccess: async data => {
        await signIn({accessToken: getAccessToken() ?? '', data: {...user, ...data}});
        alert.success(t('common.success'), t('profile.saved'));
        navigation.goBack();
      },
    },
  );

  const pickPhoto = async () => {
    const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1, quality: 0.8, maxWidth: 1600, maxHeight: 1600});
    const asset = res.assets?.[0];
    if (!asset) return;
    if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) return setFormError(t('common.imageTooLarge'));
    setFormError('');
    setPhoto(asset);
  };

  const submit = () => {
    if (!fullname.trim() || !phone || !address.trim()) return setFormError(t('profile.missingInfo'));
    if (!/^\d{10}$/.test(phone)) return setFormError(t('profile.invalidPhone'));
    setFormError('');
    save.mutate();
  };

  const picture = photo?.uri ?? user?.image;

  return (
    <View style={styles.container}>
      <BackHeader title={t('profile.editTitle')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.photo} onPress={pickPhoto} activeOpacity={0.85}>
          {picture ? <Image source={picture.startsWith('file:') || picture.startsWith('content:') ? {uri: picture} : imageSource(picture)} style={styles.image} /> : <View style={[styles.image, styles.empty]} />}
          <View style={[styles.camera, shadow]}>
            <AntDesign name="camera" size={20} color={colors.primaryDark} />
          </View>
        </TouchableOpacity>
        <Text style={styles.hint}>{t('profile.changePhoto')}</Text>
        <View style={[styles.card, shadow]}>
          <FormInput label={t('profile.fullname').toUpperCase()} icon="person-outline" value={fullname} onChangeText={setFullname} autoCapitalize="words" />
          <FormInput label={t('profile.email').toUpperCase()} icon="mail-outline" value={user?.email} editable={false} style={styles.disabled} />
          <FormInput label={t('profile.phone').toUpperCase()} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="numeric" maxLength={10} placeholder={t('profile.phonePlaceholder')} />
          <FormInput label={t('profile.address').toUpperCase()} icon="location-outline" value={address} onChangeText={setAddress} />
          <ErrorText message={formError || save.errorMessage} />
          <Button title={save.isPending ? t('profile.saving') : t('profile.save')} onPress={submit} loading={save.isPending} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  content: {padding: 16, paddingBottom: 40},
  photo: {alignSelf: 'center', marginTop: 4},
  image: {width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: '#fff'},
  empty: {backgroundColor: colors.border},
  camera: {position: 'absolute', right: -2, bottom: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  hint: {color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 10, marginBottom: 16},
  card: {backgroundColor: '#fff', borderRadius: radius.lg + 4, padding: 20},
  disabled: {color: colors.muted},
});
