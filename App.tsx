import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type TabKey = '首页' | '统计' | '记录' | '知识' | '我的';
type RecordType = '吃奶' | '睡觉' | '臭臭';
type RecordMode = '快速记录' | '记录详情';

type RecordItem = {
  date: string;
  type: RecordType;
  time: string;
  amount?: number;
  duration?: number;
  note?: string;
};

const tabs: TabKey[] = ['首页', '统计', '记录', '知识', '我的'];

const weekDays = [
  { label: '周一', date: '2026-03-09' },
  { label: '周二', date: '2026-03-10' },
  { label: '周三', date: '2026-03-11' },
  { label: '周四', date: '2026-03-12' },
  { label: '周五', date: '2026-03-13' },
  { label: '周六', date: '2026-03-14' },
  { label: '周日', date: '2026-03-15' },
];

const records: RecordItem[] = [
  { date: '2026-03-09', type: '吃奶', time: '09:10', amount: 95, duration: 12 },
  { date: '2026-03-09', type: '睡觉', time: '13:00', duration: 85 },
  { date: '2026-03-10', type: '吃奶', time: '08:30', amount: 105, duration: 14 },
  { date: '2026-03-10', type: '臭臭', time: '12:12', note: '正常' },
  { date: '2026-03-11', type: '吃奶', time: '10:35', amount: 120, duration: 15 },
  { date: '2026-03-11', type: '睡觉', time: '13:20', duration: 90 },
  { date: '2026-03-11', type: '臭臭', time: '08:12', note: '便便偏软' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('首页');
  const [recordType, setRecordType] = useState<RecordType>('吃奶');
  const [recordMode, setRecordMode] = useState<RecordMode>('快速记录');
  const [selectedDate, setSelectedDate] = useState('2026-03-11');
  const [feedSide, setFeedSide] = useState<'左侧' | '右侧' | '双侧'>('左侧');
  const [amount, setAmount] = useState('120');
  const [duration, setDuration] = useState('15');
  const [note, setNote] = useState('');

  const selectedDay = useMemo(() => records.filter((r) => r.date === selectedDate), [selectedDate]);
  const selectedMilk = useMemo(
    () => selectedDay.filter((r) => r.type === '吃奶').reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [selectedDay]
  );
  const selectedSleep = useMemo(
    () => selectedDay.filter((r) => r.type === '睡觉').reduce((sum, r) => sum + (r.duration ?? 0), 0),
    [selectedDay]
  );
  const selectedPoop = useMemo(() => selectedDay.filter((r) => r.type === '臭臭').length, [selectedDay]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === '首页' && <HomePage onQuickTap={() => setActiveTab('记录')} />}

          {activeTab === '统计' && (
            <StatsPage
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedMilk={selectedMilk}
              selectedSleep={selectedSleep}
              selectedPoop={selectedPoop}
            />
          )}

          {activeTab === '记录' && (
            <RecordPage
              recordMode={recordMode}
              setRecordMode={setRecordMode}
              recordType={recordType}
              setRecordType={setRecordType}
              feedSide={feedSide}
              setFeedSide={setFeedSide}
              amount={amount}
              setAmount={setAmount}
              duration={duration}
              setDuration={setDuration}
              note={note}
              setNote={setNote}
            />
          )}

          {activeTab === '知识' && <KnowledgePage />}

          {activeTab === '我的' && <ProfilePage />}
        </ScrollView>

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabIcon, active && styles.activeTab]}>●</Text>
                <Text style={[styles.tabText, active && styles.activeTab]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function HomePage({ onQuickTap }: { onQuickTap: () => void }) {
  return (
    <View>
      <Text style={styles.pageTitle}>朵朵宝贝</Text>
      <Text style={styles.pageSubtitle}>今天 128 天了</Text>

      <View style={styles.quickRow}>
        {[
          ['🍼', '吃奶'],
          ['🌙', '睡觉'],
          ['👶', '臭臭'],
        ].map(([icon, label]) => (
          <TouchableOpacity key={label} style={styles.quickCard} onPress={onQuickTap}>
            <Text style={styles.quickIcon}>{icon}</Text>
            <Text style={styles.quickLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.todayPanel}>
        <Text style={styles.todayTitle}>今日动态</Text>
        <View style={styles.todayStats}>
          <SummaryCard label="喂养次数" value="8 次" />
          <SummaryCard label="睡眠时长" value="12.5 h" />
          <SummaryCard label="便便记录" value="3 次" />
        </View>
      </View>

      <View style={styles.weekPanel}>
        <View style={styles.rowBetween}>
          <Text style={styles.blockTitle}>本周概况</Text>
          <Text style={styles.pinkText}>查看全部</Text>
        </View>
        <View style={styles.weekDates}>
          {['12', '13', '14', '15', '16', '17', '18'].map((d) => (
            <View key={d} style={[styles.dateBubble, d === '15' && styles.dateBubbleActive]}>
              <Text style={[styles.dateText, d === '15' && styles.dateTextActive]}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function StatsPage({
  selectedDate,
  setSelectedDate,
  selectedMilk,
  selectedSleep,
  selectedPoop,
}: {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedMilk: number;
  selectedSleep: number;
  selectedPoop: number;
}) {
  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.pageTitle}>数据统计</Text>
        <View style={styles.calendarBtn}>
          <Text style={styles.pinkText}>📅</Text>
        </View>
      </View>

      <View style={styles.segmentRow}>
        <Segment text="周" active />
        <Segment text="月" />
        <Segment text="年" />
      </View>

      <View style={styles.whiteCard}>
        <Text style={styles.blockTitle}>日历统计</Text>
        <Text style={styles.pageSubtitle}>当前日期：{selectedDate}</Text>
        <View style={styles.weekGrid}>
          {weekDays.map((item) => {
            const active = item.date === selectedDate;
            return (
              <TouchableOpacity
                key={item.date}
                style={[styles.weekGridItem, active && styles.weekGridItemActive]}
                onPress={() => setSelectedDate(item.date)}
              >
                <Text style={[styles.weekGridText, active && styles.weekGridTextActive]}>
                  {item.label.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.metricRow}>
          <Metric title="奶量" value={`${selectedMilk} ml`} hint="喂养趋势" />
          <Metric title="睡眠" value={`${(selectedSleep / 60).toFixed(1)} h`} hint="睡眠质量" />
          <Metric title="臭臭" value={`${selectedPoop} 次`} hint="大小便" />
        </View>
      </View>
    </View>
  );
}

function RecordPage({
  recordMode,
  setRecordMode,
  recordType,
  setRecordType,
  feedSide,
  setFeedSide,
  amount,
  setAmount,
  duration,
  setDuration,
  note,
  setNote,
}: {
  recordMode: RecordMode;
  setRecordMode: (m: RecordMode) => void;
  recordType: RecordType;
  setRecordType: (t: RecordType) => void;
  feedSide: '左侧' | '右侧' | '双侧';
  setFeedSide: (v: '左侧' | '右侧' | '双侧') => void;
  amount: string;
  setAmount: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.pageTitle}>{recordMode}</Text>

      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.modeBtn, recordMode === '快速记录' && styles.modeBtnActive]}
          onPress={() => setRecordMode('快速记录')}
        >
          <Text style={[styles.modeText, recordMode === '快速记录' && styles.modeTextActive]}>快速记录</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, recordMode === '记录详情' && styles.modeBtnActive]}
          onPress={() => setRecordMode('记录详情')}
        >
          <Text style={[styles.modeText, recordMode === '记录详情' && styles.modeTextActive]}>记录详情</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.whiteCard}>
        <View style={styles.typeRow}>
          {(['吃奶', '睡觉', '臭臭'] as RecordType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typePill, recordType === type && styles.typePillActive]}
              onPress={() => setRecordType(type)}
            >
              <Text style={[styles.typePillText, recordType === type && styles.typePillTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>记录时间</Text>
        <TextInput editable={false} value="今天 10:35" style={styles.input} />

        {recordType === '吃奶' && (
          <>
            <Text style={styles.fieldLabel}>喂养侧边</Text>
            <View style={styles.typeRow}>
              {(['左侧', '右侧', '双侧'] as Array<'左侧' | '右侧' | '双侧'>).map((side) => (
                <TouchableOpacity
                  key={side}
                  style={[styles.typePill, feedSide === side && styles.typePillActive]}
                  onPress={() => setFeedSide(side)}
                >
                  <Text style={[styles.typePillText, feedSide === side && styles.typePillTextActive]}>{side}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {(recordType === '吃奶' || recordType === '睡觉') && (
          <>
            <Text style={styles.fieldLabel}>奶量 / 时长</Text>
            <View style={styles.doubleRow}>
              <TextInput
                style={styles.inputHalf}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="奶量 ml"
                placeholderTextColor="#a3acb8"
              />
              <TextInput
                style={styles.inputHalf}
                keyboardType="number-pad"
                value={duration}
                onChangeText={setDuration}
                placeholder="时长 min"
                placeholderTextColor="#a3acb8"
              />
            </View>
          </>
        )}

        {recordType === '臭臭' && (
          <>
            <Text style={styles.fieldLabel}>备注字段：大小便（示例）</Text>
            <View style={styles.typeRow}>
              <View style={styles.checkChip}>
                <Text style={styles.checkChipText}>○ 尿尿</Text>
              </View>
              <View style={styles.checkChip}>
                <Text style={styles.checkChipText}>○ 便便</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.fieldLabel}>备注（选填）</Text>
        <TextInput
          multiline
          value={note}
          onChangeText={setNote}
          style={[styles.input, styles.noteInput]}
          placeholder="写下宝宝这次的表现吧..."
          placeholderTextColor="#a3acb8"
        />
      </View>
    </View>
  );
}

function KnowledgePage() {
  return (
    <View>
      <Text style={styles.pageTitle}>知识</Text>
      <View style={styles.whiteCard}>
        <Text style={styles.blockTitle}>今日推荐</Text>
        <Text style={styles.knowledgeItem}>• 4 月龄宝宝喂养间隔：2.5 - 4 小时</Text>
        <Text style={styles.knowledgeItem}>• 白天小睡过短，可延长睡前安抚流程</Text>
        <Text style={styles.knowledgeItem}>• 记录便便颜色/状态，便于日后复盘</Text>
      </View>
    </View>
  );
}

function ProfilePage() {
  return (
    <View>
      <Text style={styles.pageTitle}>宝宝档案</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>Image</Text>
        </View>
        <Text style={styles.profileName}>朵朵宝贝</Text>
        <Text style={styles.profileMeta}>出生 128 天 · 2025年10月10日</Text>
      </View>

      <View style={styles.whiteCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.blockTitle}>基本信息</Text>
          <Text style={styles.pinkText}>更新数据</Text>
        </View>
        <View style={styles.baseGrid}>
          <BaseCell label="性别" value="小公主" />
          <BaseCell label="血型" value="O型" />
          <BaseCell label="当前身高" value="65.2 cm" />
          <BaseCell label="当前体重" value="7.5 kg" />
        </View>
      </View>
    </View>
  );
}

function Segment({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <View style={[styles.segmentItem, active && styles.segmentItemActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{text}</Text>
    </View>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function Metric({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricHint}>{hint}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function BaseCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.baseCell}>
      <Text style={styles.baseLabel}>{label}</Text>
      <Text style={styles.baseValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100, gap: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  pageTitle: { fontSize: 32, fontWeight: '700', color: '#1d2a3a' },
  pageSubtitle: { marginTop: 4, color: '#97a0af', fontSize: 16 },
  blockTitle: { fontSize: 18, color: '#2b3848', fontWeight: '700' },
  pinkText: { color: '#f48fc1', fontSize: 15, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  quickCard: {
    flex: 1,
    backgroundColor: '#f4eef2',
    borderRadius: 20,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickIcon: { fontSize: 28 },
  quickLabel: { fontSize: 24, fontWeight: '700', color: '#263448' },

  todayPanel: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: '#f28ec2',
    padding: 16,
  },
  todayTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
  todayStats: { marginTop: 12, flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ef9ec9',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: { color: '#fde8f2', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 5 },

  weekPanel: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 16,
  },
  weekDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  dateBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBubbleActive: { backgroundColor: '#f48fc1' },
  dateText: { color: '#7f8a9c', fontSize: 15, fontWeight: '600' },
  dateTextActive: { color: '#fff' },

  segmentRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  segmentItem: {
    width: 80,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf1f5',
  },
  segmentItemActive: { backgroundColor: '#fde9f3' },
  segmentText: { color: '#8995a6', fontSize: 18, fontWeight: '600' },
  segmentTextActive: { color: '#f48fc1' },

  calendarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fdebf4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whiteCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 14,
    marginTop: 14,
  },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  weekGridItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f3f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekGridItemActive: { backgroundColor: '#f48fc1' },
  weekGridText: { color: '#7d8795', fontWeight: '700' },
  weekGridTextActive: { color: '#fff' },

  metricRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#fafbfe',
    borderWidth: 1,
    borderColor: '#edf1f6',
    padding: 10,
  },
  metricHint: { color: '#96a1b1', fontSize: 12 },
  metricTitle: { color: '#2f3c4d', marginTop: 4, fontSize: 16, fontWeight: '700' },
  metricValue: { color: '#f48fc1', marginTop: 5, fontSize: 20, fontWeight: '700' },

  modeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#edf1f5',
  },
  modeBtnActive: { backgroundColor: '#fdebf4' },
  modeText: { color: '#92a0b2', fontWeight: '600' },
  modeTextActive: { color: '#f48fc1' },

  typeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  typePill: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e8ee',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typePillActive: { backgroundColor: '#fbeaf3', borderColor: '#f3a0cb' },
  typePillText: { color: '#8592a4', fontSize: 18, fontWeight: '600' },
  typePillTextActive: { color: '#ef78b5' },
  fieldLabel: { marginTop: 14, marginBottom: 6, color: '#3d4b60', fontWeight: '600', fontSize: 16 },

  input: {
    backgroundColor: '#f2f5f9',
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#243145',
  },
  doubleRow: { flexDirection: 'row', gap: 10 },
  inputHalf: {
    flex: 1,
    backgroundColor: '#f2f5f9',
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#243145',
  },
  checkChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#f6f8fb',
    borderWidth: 1,
    borderColor: '#e5eaf0',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  checkChipText: { color: '#a1acba', fontSize: 18 },
  noteInput: { minHeight: 88, textAlignVertical: 'top', paddingVertical: 10 },

  knowledgeItem: { color: '#586477', fontSize: 16, marginTop: 10 },

  profileCard: {
    backgroundColor: '#f8eef3',
    borderRadius: 24,
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#111317',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 18 },
  profileName: { color: '#1d2a3d', fontSize: 30, fontWeight: '700' },
  profileMeta: { color: '#7c8899', marginTop: 6 },

  baseGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12, rowGap: 10 },
  baseCell: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#edf1f6',
    backgroundColor: '#fbfcfe',
    padding: 12,
  },
  baseLabel: { color: '#96a2b2', fontSize: 13 },
  baseValue: { color: '#283548', fontSize: 20, fontWeight: '700', marginTop: 6 },

  tabBar: {
    height: 72,
    borderTopWidth: 1,
    borderTopColor: '#e7ebf1',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: { alignItems: 'center', flex: 1 },
  tabIcon: { fontSize: 8, color: '#9ca7b7', marginBottom: 3 },
  tabText: { color: '#8f9aac', fontSize: 13, fontWeight: '600' },
  activeTab: { color: '#f48fc1' },
});
