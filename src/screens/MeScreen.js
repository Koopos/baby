import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, RefreshControl, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';
import { getAllRecordsForExport, getBabyProfile } from '../db/recordsRepository';

export default function MeScreen({ navigation }) {
  const { profile, reloadProfile } = useBabyProfile();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      reloadProfile();
    });
    return unsubscribe;
  }, [navigation, reloadProfile]);

  async function onRefresh() {
    await reloadProfile();
  }

  const handleExport = async () => {
    try {
      const records = await getAllRecordsForExport();
      if (records.length === 0) {
        Alert.alert('无数据', '暂无任何记录可导出。');
        return;
      }
      const baby = await getBabyProfile();
      const lines = [
        `宝宝成长记录`,
        `姓名：${baby?.name || '小宝贝'}`,
        `生日：${baby?.birthday || '-'}`,
        `---`,
      ];
      for (const r of records) {
        const date = r.created_at;
        const type = r.record_type === 'vaccine' ? '💉疫苗' : r.feed_type;
        const detail = r.record_type === 'vaccine'
          ? [r.vaccine_dose, r.hospital, r.notes].filter(Boolean).join(' · ')
          : [r.solid_food, r.duration ? `${r.duration}分钟` : '', r.notes].filter(Boolean).join(' · ');
        lines.push(`${date}  ${type}  ${detail}`);
      }
      const text = lines.join('\n');
      await Share.share({ message: text, title: `${baby?.name || '宝宝'}成长记录` });
    } catch (err) {
      Alert.alert('导出失败', err.message);
    }
  };

  const quickActions = [
    { icon: '🔔', title: '提醒设置', desc: '喂养/换尿布提醒' },
    { icon: '📤', title: '数据导出', desc: '生成成长记录报告', onPress: handleExport },
  ];

  const menuItems = [
    { icon: '🥣', title: '喂养建议', desc: '按月龄查看推荐食谱' },
    { icon: '👨‍⚕️', title: '就诊记录', desc: '疫苗与体检信息' },
    { icon: '❓', title: '关于我们', desc: '版本信息与反馈' },
  ];

  const name = profile?.name || '小宝贝';
  const gender = profile?.gender || '男';
  const birthday = profile?.birthday || '';
  const emoji = profile?.avatar_emoji || '👶';
  const nextCheckup = profile?.next_checkup || '';
  const weight = profile?.weight || '';
  const height = profile?.height || '';
  const development = profile?.development || '良好';
  const age = calcAge(birthday);

  const stats = [
    { icon: '🎂', label: '月龄', value: age !== '-' ? age : '-', bg: '#FCECEC' },
    { icon: '⚖️', label: '体重', value: weight ? `${weight}kg` : '-', bg: '#EEF3FF' },
    { icon: '📏', label: '身高', value: height ? `${height}cm` : '-', bg: '#F3FAEA' },
    { icon: '🧠', label: '发育', value: development || '-', bg: '#FFF5E7' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>我的</Text>
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('EditBaby', { profile })}
        >
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{emoji}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileMeta}>{gender === '男' ? '男宝宝' : '女宝宝'} · 生日 {birthday || '未设置'}</Text>
              {nextCheckup ? <Text style={styles.profileMeta}>下一次体检：{nextCheckup}</Text> : null}
            </View>
            <Text style={styles.editHint}>编辑 ›</Text>
          </View>
          <View style={styles.profileTag}>
            <Text style={styles.profileTagText}>点击编辑宝贝信息</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>成长概览</Text>
        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <View key={item.label} style={[styles.statsCard, { backgroundColor: item.bg }]}>
              <Text style={styles.statsIcon}>{item.icon}</Text>
              <Text style={styles.statsLabel}>{item.label}</Text>
              <Text style={styles.statsValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.quickCard}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickRow}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowIcon}>{item.icon}</Text>
                <View>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.desc}</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
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
  editHint: { fontSize: 14, color: '#FF6E68', fontWeight: '600' },
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
