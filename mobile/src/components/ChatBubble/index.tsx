import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, gradient, shadow} from '../../lib/theme';
import ChatText from '../ChatText';

interface Props {
  text: string;
  mine: boolean;
  // "reload" button under the last failed answer
  onResend?: () => void;
  // "Plan from this suggestion" under a real AI answer
  onPlan?: () => void;
}

// User: teal gradient bubble on the right. Assistant: white bubble with a thin teal border on the left.
export default function ChatBubble({text, mine, onResend, onPlan}: Props) {
  const {t} = useTranslation();
  if (mine) {
    return (
      <View style={[styles.row, styles.rowMine]}>
        <LinearGradient colors={gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.bubble, styles.bubbleMine]}>
          <Text style={[styles.text, styles.textMine]}>{text}</Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <View style={[styles.bubble, styles.bubbleBot, shadow]}>
        <ChatText text={text} />
      </View>
      {onResend && (
        <TouchableOpacity onPress={onResend} style={styles.resend}>
          <Ionicons name="reload" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
      {onPlan && (
        <TouchableOpacity onPress={onPlan} style={styles.plan}>
          <Ionicons name="add-circle" size={16} color={colors.primaryDark} />
          <Text style={styles.planText}>{t('assistant.planFromSuggestion')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {marginTop: 8, alignItems: 'flex-start'},
  rowMine: {alignItems: 'flex-end'},
  bubble: {maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18},
  bubbleMine: {borderBottomRightRadius: 4},
  bubbleBot: {backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#B8EFEA'},
  text: {color: colors.text, fontSize: 15, lineHeight: 22},
  textMine: {color: '#fff'},
  resend: {marginTop: 4, marginLeft: 6, padding: 4},
  plan: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#B8EFEA', backgroundColor: colors.tint},
  planText: {color: colors.primaryDark, fontSize: 12, fontWeight: '700'},
});
