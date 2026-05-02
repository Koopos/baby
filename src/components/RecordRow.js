import { View, Text, StyleSheet } from 'react-native';

function getRecordIcon(feedType, recordType) {
  if (recordType === 'vaccine') return '💉';
  if (feedType === 'AD') return '💊';
  if (feedType === '辅食') return '🥣';
  if (feedType === '小便' || feedType === '大便' || feedType === '两者都有') return '🧷';
  return '🍼';
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
      const parts = [
        item.solid_food || null, // stool_consistency stored here
        item.notes || null,
      ].filter(Boolean);
      return parts.join(' · ') || '记录';
    }
    if (item.feed_type === 'AD') {
      const parts = [
        item.notes || null, // '已服用' or '未服用'
        item.duration === 1 ? item.solid_food : null, // dosage if taken
      ].filter(Boolean);
      return parts.join(' · ') || '记录';
    }
    // 母乳 / 配方奶
    const parts = [
      item.duration ? `${item.duration}分钟` : null,
      item.notes || null,
    ].filter(Boolean);
    return parts.join(' · ');
  };

  return (
    <View style={styles.row}>
      {showTime && <Text style={styles.time}>{formatTime(item.created_at)}</Text>}
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{item.feed_type}</Text>
        <Text style={styles.desc}>{renderDesc()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 4 },
  time: { width: 56, color: '#555', fontWeight: '600', fontSize: 13 },
  icon: { width: 28, fontSize: 18 },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#222' },
  desc: { color: '#777', marginTop: 2, fontSize: 13 },
});
