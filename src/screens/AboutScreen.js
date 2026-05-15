import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen({ navigation }) {

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>关于我们</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoCard}>
          <Text style={styles.logoEmoji}>👶</Text>
          <Text style={styles.appName}>宝宝日常记录</Text>
          <Text style={styles.version}>v1.0.1</Text>
          <Text style={styles.subtitle}>简洁好用的宝宝成长记录应用</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>关于应用</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>当前版本</Text>
            <Text style={styles.infoValue}>1.0.1</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>平台</Text>
            <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
          </View>
        </View>

        <Text style={styles.footer}>问题反馈：宝宝成长记录</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { fontSize: 17, color: '#222' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  content: { padding: 16, flex: 1 },
  logoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 16 },
  logoEmoji: { fontSize: 56, marginBottom: 8 },
  appName: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 4 },
  version: { fontSize: 14, color: '#FF6E68', fontWeight: '600', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#999', textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#666', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel: { fontSize: 15, color: '#666' },
  infoValue: { fontSize: 15, color: '#222', fontWeight: '600' },
  footer: { textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 8 },
});
