import { ScrollView, StyleSheet, Text, View } from 'react-native';

const summary = [
  { icon: '🍼', title: '喂奶', times: '5次', amount: '850ml', bg: '#FCECEC' },
  { icon: '💩', title: '大小便', times: '2次', amount: '6次', bg: '#FFF5E7' },
  { icon: '🥣', title: '辅食', times: '2次', amount: '约120g', bg: '#F3FAEA' },
  { icon: '🌙', title: '睡眠', times: '2次', amount: '10小时', bg: '#EEF3FF' },
];

const timeline = [
  ['08:00', '🍼', '喂奶', '母乳 120ml'],
  ['10:30', '💩', '大便', '黄色 正常'],
  ['12:30', '🥣', '辅食', '米粉 + 苹果泥 60g'],
  ['15:00', '🍼', '喂奶', '母乳 150ml'],
  ['16:20', '💩', '大便', '黄色 正常'],
];

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>宝宝日常记录</Text>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>小宝贝 ♂</Text>
        <Text style={styles.profileMeta}>6个月20天 · 2024年5月20日（周一）</Text>
      </View>

      <Text style={styles.sectionTitle}>今日记录概览</Text>
      <View style={styles.summaryGrid}>
        {summary.map((item) => (
          <View key={item.title} style={[styles.summaryCard, { backgroundColor: item.bg }]}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.times}</Text>
            <Text style={styles.cardSub}>{item.amount}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>今日记录</Text>
      <View style={styles.listCard}>
        {timeline.map((row) => (
          <View key={row[0] + row[2]} style={styles.row}>
            <Text style={styles.time}>{row[0]}</Text>
            <Text style={styles.rowIcon}>{row[1]}</Text>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row[2]}</Text>
              <Text style={styles.rowDesc}>{row[3]}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 16 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  profileName: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  profileMeta: { fontSize: 14, color: '#666', marginBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#222' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: { width: '48%', borderRadius: 14, padding: 12 },
  icon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  cardSub: { color: '#666', marginTop: 2 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { width: 56, color: '#555', fontWeight: '600' },
  rowIcon: { width: 28, fontSize: 20 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  rowDesc: { color: '#777', marginTop: 2 },
});
