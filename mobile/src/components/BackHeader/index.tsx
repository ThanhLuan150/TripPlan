import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {gradient} from '../../lib/theme';

interface Props {
  title: string;
  onBack: () => void;
  height?: number;
}

// Teal gradient bar with a round back button and a white title (notifications, videos, edit profile).
export default function BackHeader({title, onBack, height = 64}: Props) {
  return (
    <LinearGradient colors={gradient} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={[styles.bar, {height: height + 20}]}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 12, paddingHorizontal: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24},
  back: {width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginRight: 14},
  title: {fontSize: 21, color: '#fff', fontWeight: '700', marginBottom: 4},
});
