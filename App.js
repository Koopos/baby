import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'add', label: '记录', icon: '➕' },
  { key: 'me', label: '我的', icon: '👤' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [feedType, setFeedType] = useState('母乳');

  const content = useMemo(() => {
    if (activeTab === 'home') return <HomeScreen />;
    if (activeTab === 'stats') return <StatsScreen />;
    if (activeTab === 'add') return <AddRecordScreen feedType={feedType} onTypeChange={setFeedType} />;
    return <MeScreen />;
  }, [activeTab, feedType]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {content}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const focused = activeTab === tab.key;
          return (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabItem}>
              <Text style={[styles.tabIcon, focused && styles.tabFocused]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, focused && styles.tabFocused]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function HomeScreen() {
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

function StatsScreen() {
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

function AddRecordScreen({ feedType, onTypeChange }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>添加记录</Text>
      <View style={styles.segment}>
        {['母乳', '配方奶', '混合喂养'].map((type) => (
          <Pressable
            key={type}
            style={[styles.chip, feedType === type && styles.chipActive]}
            onPress={() => onTypeChange(type)}
          >
            <Text style={[styles.chipLabel, feedType === type && styles.chipLabelActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.label}>开始时间</Text>
        <TextInput value="2024年5月20日 08:00" editable={false} style={styles.input} />
        <Text style={styles.label}>时长（分钟）</Text>
        <TextInput value="20" style={styles.input} keyboardType="numeric" />
        <Text style={styles.label}>备注</Text>
        <TextInput placeholder="可记录宝宝状态…" style={[styles.input, styles.textarea]} multiline />
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>保存</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>我的</Text>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>宝宝档案</Text>
        <Text style={styles.profileMeta}>昵称：小宝贝</Text>
        <Text style={styles.profileMeta}>生日：2023-11-01</Text>
      </View>
      <View style={styles.listCard}>
        {['提醒设置', '数据导出', '喂养建议', '关于我们'].map((item) => (
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 30 },
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
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
    paddingBottom: 12,
  },
  tabItem: { alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 18, color: '#999' },
  tabLabel: { fontSize: 12, color: '#999' },
  tabFocused: { color: '#FF6E68', fontWeight: '700' },
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
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#FF6E68' },
  chipLabel: { color: '#555' },
  chipLabelActive: { color: '#fff', fontWeight: '700' },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#FF6E68', marginTop: 16, padding: 14, borderRadius: 26, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
