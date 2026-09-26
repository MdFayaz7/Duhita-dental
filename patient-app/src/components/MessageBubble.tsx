import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../lib/api';
import { colors } from '../theme';

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.bot]}>
        <Text style={[styles.text, mine && styles.textMine]} selectable>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 13 },
  mine: { backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
  bot: {
    backgroundColor: colors.botBubble,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  textMine: { color: '#fff' },
});

export default memo(MessageBubble);
