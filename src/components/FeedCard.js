import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FEED_CARD_COLORS } from '../services/homeFeedService';

const ACTION_LABELS = {
  view_detail: '查看详情',
  view_ai: '去问 AI',
  record: '立即记录',
  none: '',
};

export default function FeedCard({ card, onPress, style }) {
  const colors = FEED_CARD_COLORS[card.type] || FEED_CARD_COLORS.daily_summary;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: '#FFFFFF' }, style]}
      onPress={() => onPress && onPress(card)}
      pressOpacity={0.7}
    >
      <View style={styles.body}>
        {/* 左侧图标 */}
        <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
          <Text style={styles.icon}>{card.icon || '📌'}</Text>
        </View>

        {/* 右侧内容 */}
        <View style={styles.content}>
          <View style={styles.tagRow}>
            <Text style={[styles.tag, { color: colors.text }]}>{card.tag || card.type}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{card.title}</Text>
          <Text style={styles.summary} numberOfLines={2}>{card.summary}</Text>

          {/* 底部操作 */}
          {card.action && card.action !== 'none' && (
            <View style={styles.actionRow}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                {ACTION_LABELS[card.action] || '查看'}
              </Text>
              <Text style={[styles.arrow, { color: colors.text }]}>›</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  body: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  summary: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 2,
  },
});
