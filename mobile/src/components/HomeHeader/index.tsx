import {useTranslation} from 'react-i18next';
import {Image, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SessionUser} from '../../store/session';
import {colors, radius, shadow} from '../../lib/theme';
import {imageSource} from '../../lib/imageSource';

interface Props {
  user: SessionUser | null;
  query: string;
  unread: number;
  onQuery: (text: string) => void;
  onSearch: () => void;
  onBell: () => void;
  onProfile: () => void;
}

// Greeting, notification bell with a red counter, the user's round picture and the search box.
export default function HomeHeader({user, query, unread, onQuery, onSearch, onBell, onProfile}: Props) {
  const {t} = useTranslation();
  const name = user?.fullname || user?.username;
  return (
    <View>
      <View style={styles.top}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>{t('home.hello')}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {name || t('home.you')} 👋
          </Text>
        </View>
        <TouchableOpacity style={[styles.bell, shadow]} onPress={onBell}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread >= 10 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onProfile}>
          {user?.image ? <Image style={styles.avatar} source={imageSource(user.image)} /> : <View style={[styles.avatar, styles.avatarEmpty]} />}
        </TouchableOpacity>
      </View>
      <View style={[styles.search, shadow]}>
        <Ionicons name="search" size={20} color={colors.faint} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onQuery}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          placeholder={t('home.search')}
          placeholderTextColor={colors.faint}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {flexDirection: 'row', alignItems: 'center', gap: 12},
  greeting: {flex: 1},
  hello: {color: colors.muted, fontSize: 14},
  name: {color: colors.text, fontSize: 22, fontWeight: '800'},
  bell: {width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  badge: {position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff'},
  badgeText: {color: '#fff', fontSize: 10, fontWeight: '800'},
  avatar: {width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.tabBar},
  avatarEmpty: {backgroundColor: colors.border},
  search: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, height: 50, borderRadius: radius.md + 2, backgroundColor: '#fff', paddingHorizontal: 16},
  input: {flex: 1, color: colors.text, fontSize: 15},
});
