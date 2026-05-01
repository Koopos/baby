import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRecordsByDate } from '../db/recordsRepository';

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimeLabel(datetime) {
  return new Date(datetime.replace(' ', 'T')).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getRecordIcon(feedType) {
  return feedType === '疫苗' ? '💉' : feedType === '辅食' ? '🥣' : '🍼';
}

export default function HomeScreen() {
  const [records, setRecords] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadTodayRecords = async () => {
        const todayRecords = await getRecordsByDate(getDateKey(new Date()));
        if (mounted) {
          setRecords(todayRecords);
        }
      };
      loadTodayRecords();
      return () => {
        mounted = false;
      };
    }, [])
  );

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
        {records.length === 0 ? (
          <Text style={styles.emptyText}>今天暂无记录，去“记录”页新增一条吧。</Text>
        ) : (
          records.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.time}>{getTimeLabel(row.created_at)}</Text>
              <Text style={styles.rowIcon}>{row.record_type === 'vaccine' ? '💉' : getRecordIcon(row.feed_type)}</Text>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{row.feed_type}</Text>
                <Text style={styles.rowDesc}>
                  {row.record_type === 'vaccine'
                    ? `${row.vaccine_dose ? `${row.vaccine_dose} · ` : ''}${row.hospital ? `${row.hospital}` : '疫苗接种'}${row.notes ? ` · ${row.notes}` : ''}`
                    : `${row.feed_type === '辅食' && row.solid_food ? `${row.solid_food} · ` : ''}${row.duration || 0}分钟${row.notes ? ` · ${row.notes}` : ''}`}
                </Text>
              </View>
            </View>
          ))
        )}
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
  emptyText: { color: '#999', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { width: 56, color: '#555', fontWeight: '600' },
  rowIcon: { width: 28, fontSize: 20 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  rowDesc: { color: '#777', marginTop: 2 },
});
