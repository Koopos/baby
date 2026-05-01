import { ScrollView, StyleSheet, Text, View } from 'react-native';

const menuItems = ['提醒设置', '数据导出', '喂养建议', '关于我们'];

export default function MeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>我的</Text>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>宝宝档案</Text>
        <Text style={styles.profileMeta}>昵称：小宝贝</Text>
        <Text style={styles.profileMeta}>生日：2023-11-01</Text>
      </View>
      <View style={styles.listCard}>
        {menuItems.map((item) => (
          <View key={item} style={styles.settingRow}>
            <Text style={styles.rowTitle}>{item}</Text>
            <Text style={styles.rowDesc}>›</Text>
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
  listCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  rowDesc: { color: '#777', marginTop: 2 },
});
