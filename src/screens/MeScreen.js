import { ScrollView, StyleSheet, Text, View } from 'react-native';

const growthStats = [
  { icon: '🎂', label: '月龄', value: '6个月20天', bg: '#FCECEC' },
  { icon: '⚖️', label: '体重', value: '8.2kg', bg: '#EEF3FF' },
  { icon: '📏', label: '身高', value: '68cm', bg: '#F3FAEA' },
  { icon: '🧠', label: '发育', value: '良好', bg: '#FFF5E7' },
];

const quickActions = [
  { icon: '🔔', title: '提醒设置', desc: '喂养/换尿布提醒' },
  { icon: '📤', title: '数据导出', desc: '生成成长记录报告' },
];

const menuItems = [
  { icon: '🥣', title: '喂养建议', desc: '按月龄查看推荐食谱' },
  { icon: '👨‍⚕️', title: '就诊记录', desc: '疫苗与体检信息' },
  { icon: '❓', title: '关于我们', desc: '版本信息与反馈' },
];

export default function MeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>我的</Text>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👶</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>小宝贝</Text>
            <Text style={styles.profileMeta}>男宝宝 · 生日 2023-11-01</Text>
            <Text style={styles.profileMeta}>下一次体检：2024-06-08</Text>
          </View>
        </View>
        <View style={styles.profileTag}>
          <Text style={styles.profileTagText}>本周记录完整度 92%</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>成长概览</Text>
      <View style={styles.statsGrid}>
        {growthStats.map((item) => (
          <View key={item.label} style={[styles.statsCard, { backgroundColor: item.bg }]}>
            <Text style={styles.statsIcon}>{item.icon}</Text>
            <Text style={styles.statsLabel}>{item.label}</Text>
            <Text style={styles.statsValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.quickCard}>
        {quickActions.map((item) => (
          <View key={item.title} style={styles.quickRow}>
            <View style={styles.rowMain}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.desc}</Text>
              </View>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </View>
        ))}
      </View>

      <View style={styles.listCard}>
        {menuItems.map((item) => (
          <View key={item.title} style={styles.settingRow}>
            <View style={styles.rowMain}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.desc}</Text>
              </View>
            </View>
            <Text style={styles.rowArrow}>›</Text>
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
  profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 30 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '700', marginBottom: 6, color: '#222' },
  profileMeta: { fontSize: 13, color: '#666', marginBottom: 2 },
  profileTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFF1F0',
  },
  profileTagText: { color: '#FF6E68', fontWeight: '600', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#222' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statsCard: { width: '48%', borderRadius: 14, padding: 12 },
  statsIcon: { fontSize: 24, marginBottom: 6 },
  statsLabel: { fontSize: 13, color: '#666', marginBottom: 2 },
  statsValue: { fontSize: 18, fontWeight: '700', color: '#222' },
  quickCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 12, marginBottom: 12 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 12 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { width: 28, fontSize: 20 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  rowSub: { color: '#777', marginTop: 2, fontSize: 13 },
  rowArrow: { color: '#A3A3A3', fontSize: 20, marginLeft: 8 },
});
