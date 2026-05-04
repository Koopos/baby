import { View, Text, StyleSheet } from 'react-native';

function getRecordIcon(feedType, recordType) {
  if (recordType === 'vaccine') return '💉';
  if (feedType === 'AD') return '💊';
  if (feedType === '辅食') return '🥣';
  if (feedType === '小便' || feedType === '大便' || feedType === '两者都有') return '🧷';
  return '🍼';
}

function getRecordColor(feedType, recordType) {
  if (recordType === 'vaccine') return { bg: '#EEF3FF', text: '#4A6CF7', icon: '#E8EDFF' };
  if (feedType === 'AD') return { bg: '#FFF8E7', text: '#F59E0B', icon: '#FFF4DC' };
  if (feedType === '辅食') return { bg: '#F0FAF3', text: '#22C55E', icon: '#E8FFE9' };
  if (feedType === '小便' || feedType === '大便' || feedType === '两者都有') return { bg: '#FFF0F0', text: '#FF6E68', icon: '#FFE8E7' };
  return { bg: '#FFF0F0', text: '#FF6E68', icon: '#FFE8E7' };
}

function formatTime(datetime) {
  return new Date(datetime.replace(' ', 'T')).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function RecordRow({ item, showTime = true }) {
  const icon = getRecordIcon(item.feed_type, item.record_type);
  const colors = getRecordColor(item.feed_type, item.record_type);

  const renderDesc = () => {
    if (item.record_type === 'vaccine') {
      const parts = [
        item.vaccine_dose ? item.vaccine_dose : null,
        item.hospital || '疫苗接种',
        item.notes || null,
      ].filter(Boolean);
      return parts.join(' · ');
    }
    if (item.feed_type === '辅食') {
      const parts = [
        item.solid_food || null,
        item.duration ? `${item.duration}分钟` : null,
        item.notes || null,
      ].filter(Boolean);
      return parts.join(' · ');
    }
    if (item.feed_type === '小便' || item.feed_type === '大便' || item.feed_type === '两者都有') {
      const parts = [item.solid_food || null, item.notes || null].filter(Boolean);
      return parts.join(' · ') || '记录';
    }
    if (item.feed_type === 'AD') {
      const parts = [
        item.notes || null,
        item.duration === 1 ? item.solid_food : null,
      ].filter(Boolean);
      return parts.join(' · ') || '记录';
    }
    const parts = [
      item.duration ? `${item.duration}分钟` : null,
      item.notes || null,
    ].filter(Boolean);
    return parts.join(' · ');
  };

  return (
    <View style={styles.row}>
      {showTime && (
        <View style={styles.timeWrap}>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
      )}
      <View style={[styles.iconWrap, { backgroundColor: colors.icon }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{item.feed_type}</Text>
        <Text style={styles.desc}>{renderDesc()}</Text>
      </View>
      <View style={[styles.typeIndicator, { backgroundColor: colors.bg }]}>
        <Text style={[styles.typeDot, { backgroundColor: colors.text }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  timeWrap: {
    width: 48,
    marginRight: 8,
  },
  time: {
    color: '#AAA',
    fontWeight: '600',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: { fontSize: 17 },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  desc: { color: '#999', fontSize: 12, lineHeight: 16 },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  typeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
