import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function StatsScreen() {
  const bars = [500, 900, 680, 760, 620, 1100, 800, 980, 840, 1020];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>统计</Text>
      <View style={styles.segment}>
        <Text style={[styles.segmentItem, styles.segmentActive]}>按月统计</Text>
        <Text style={styles.segmentItem}>按日统计</Text>
      </View>
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>喂奶统计 · 总量 6540ml</Text>
        <View style={styles.barWrap}>
          {bars.map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View style={[styles.bar, { height: h / 12 }]} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  segmentItem: { flex: 1, textAlign: 'center', paddingVertical: 8, color: '#666' },
  segmentActive: { backgroundColor: '#FF6E68', borderRadius: 16, color: '#fff', fontWeight: '700' },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  barWrap: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  bar: { backgroundColor: '#FF7D7D', borderRadius: 8 },
});
