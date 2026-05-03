import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordsByDate } from '../db/recordsRepository';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';
import RecordRow from '../components/RecordRow';

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekdayName(date) {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return map[date.getDay()];
}

export default function HomeScreen() {
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, reloadProfile } = useBabyProfile();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadData = async () => {
        await reloadProfile();
        const todayRecords = await getRecordsByDate(getDateKey(new Date()));
        if (!cancelled) {
          setRecords(todayRecords);
        }
      };
      loadData();
      return () => {
        cancelled = true;
      };
    }, [reloadProfile])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reloadProfile();
    const todayRecords = await getRecordsByDate(getDateKey(new Date()));
    setRecords(todayRecords);
    setRefreshing(false);
  }, [reloadProfile]);

  const today = new Date();
  const dateKey = getDateKey(today);
  const weekday = getWeekdayName(today);
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${weekday}）`;

  const name = profile?.name || '小宝贝';
  const gender = profile?.gender || '男';
  const birthday = profile?.birthday || '';
  const emoji = profile?.avatar_emoji || '👶';
  const age = calcAge(birthday);

  const summary = useMemo(() => {
    const vaccineRecords = records.filter((item) => item.record_type === 'vaccine');
    const feedRecords = records.filter((item) => item.record_type !== 'vaccine' && item.feed_type !== '辅食');
    const solidFoodRecords = records.filter((item) => item.record_type !== 'vaccine' && item.feed_type === '辅食');
    const totalDuration = records.reduce((total, item) => total + (item.duration || 0), 0);
    const avgDuration = records.length > 0 ? Math.round(totalDuration / records.length) : 0;

    return [
      { icon: '💉', title: '疫苗', times: `${vaccineRecords.length}次`, amount: vaccineRecords.length > 0 ? '含最近接种记录' : '尚无接种记录', bg: '#F1EEFF' },
      { icon: '🍼', title: '喂奶', times: `${feedRecords.length}次`, amount: `总时长 ${feedRecords.reduce((n, item) => n + (item.duration || 0), 0)} 分钟`, bg: '#FCECEC' },
      { icon: '🥣', title: '辅食', times: `${solidFoodRecords.length}次`, amount: `总时长 ${solidFoodRecords.reduce((n, item) => n + (item.duration || 0), 0)} 分钟`, bg: '#F3FAEA' },
      { icon: '⏱️', title: '总时长', times: `${totalDuration}分钟`, amount: `平均每次 ${avgDuration} 分钟`, bg: '#FFF5E7' },
      { icon: '📝', title: '记录数', times: `${records.length}条`, amount: '来自本地 SQLite', bg: '#EEF3FF' },
    ];
  }, [records]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>宝宝日常记录</Text>
        <View style={styles.profileCard}>
          <Text style={styles.profileName}>{emoji} {name} {gender === '男' ? '♂' : '♀'}</Text>
          <Text style={styles.profileMeta}>{age !== '-' ? age : '请设置生日'} · {dateStr}</Text>
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
          {records.length === 0 ? (
            <Text style={styles.emptyText}>今天暂无记录，去"记录"页新增一条吧。</Text>
          ) : (
            records.map((row) => <RecordRow key={row.id} item={row} />)
          )}
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
  profileName: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  profileMeta: { fontSize: 14, color: '#666', marginBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#222' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: { width: '48%', borderRadius: 14, padding: 12 },
  icon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  cardSub: { color: '#666', marginTop: 2 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  emptyText: { color: '#999', paddingVertical: 8 },
});
