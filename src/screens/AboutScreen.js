import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkForUpdate, downloadAndApplyUpdate } from '../services/updateService';

export default function AboutScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCheckUpdate = async () => {
    if (checking || downloading) return;
    setChecking(true);
    const result = await checkForUpdate();
    setChecking(false);

    if (result.error) {
      const errorMsg = result.error.message || '未知错误';
      Alert.alert(
        '检查更新失败',
        errorMsg + '\n\n提示：EAS Update 功能需要在 EAS Build 打包的应用中才能使用。',
        [{ text: '确定' }]
      );
      return;
    }

    if (!result.available) {
      Alert.alert('已是最新版本', `当前已是最新版本（v1.0.0）`, [{ text: '确定' }]);
      return;
    }

    Alert.alert('发现新版本', '有新版本可用，是否立即更新？', [
      { text: '稍后', style: 'cancel' },
      {
        text: '立即更新',
        onPress: async () => {
          setDownloading(true);
          const { error: updateError } = await downloadAndApplyUpdate();
          setDownloading(false);
          if (updateError) {
            Alert.alert('更新失败', '下载更新失败，请稍后重试。', [{ text: '确定' }]);
          }
        },
      },
    ]);
  };

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

        <TouchableOpacity style={styles.updateBtn} onPress={handleCheckUpdate} disabled={checking || downloading} activeOpacity={0.8}>
          <Text style={styles.updateBtnText}>
            {checking ? '检查中...' : downloading ? '更新中...' : '检查新版本'}
          </Text>
        </TouchableOpacity>

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
  updateBtn: { backgroundColor: '#FF6E68', borderRadius: 26, padding: 15, alignItems: 'center', marginBottom: 16 },
  updateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 8 },
});
