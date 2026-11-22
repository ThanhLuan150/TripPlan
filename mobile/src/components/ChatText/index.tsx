import {StyleSheet, Text, TextStyle} from 'react-native';
import {colors} from '../../lib/theme';

// **bold** inside a line -> bold pieces
const inline = (line: string, base: TextStyle) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <Text key={i} style={[base, styles.bold]}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    ),
  );

// Light markdown for the AI's answers: "# title", "**bold**" and "* / - bullet" lines (stars are not shown as stars).
export default function ChatText({
  text,
  style,
}: {
  text: string;
  style?: TextStyle;
}) {
  const lines = text.split('\n');
  return (
    <Text style={[styles.text, style]}>
      {lines.map((raw, i) => {
        const heading = raw.match(/^#{1,4}\s+(.*)$/);
        const bullet = raw.match(/^\s*[*-]\s+(.*)$/);
        const line = heading ? heading[1] : bullet ? `•  ${bullet[1]}` : raw;
        return (
          <Text key={i} style={heading ? styles.heading : undefined}>
            {inline(line, style ?? {})}
            {i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {color: colors.text, fontSize: 15, lineHeight: 22},
  bold: {fontWeight: '700'},
  heading: {fontWeight: '700', fontSize: 16},
});
