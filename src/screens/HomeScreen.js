import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordsByDate } from '../db/recordsRepository';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';
import RecordRow from '../components/RecordRow';

const { width: SCREEN_W } = Dimensions.get('window');
const ACCENT = '#FF6E68';

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

function getMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function HomeScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, reloadProfile } = useBabyProfile();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadData = async () => {
        await reloadProfile();
        const todayRecords = await getRecordsByDate(getDateKey(new Date()));
        if (!cancelled) setRecords(todayRecords);
      };
      loadData();
      return () => { cancelled = true; };
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
  const weekday = getWeekdayName(today);
  const monthDay = getMonthDay(today);

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
      {
        type: 'vaccine',
        icon: '💉',
        label: '疫苗',
        times: vaccineRecords.length,
        sub: vaccineRecords.length > 0 ? '含最近接种记录' : '尚无接种记录',
        color: '#EEF3FF',
        textColor: '#4A6CF7',
        iconBg: '#E8EDFF',
      },
      {
        type: 'feed',
        icon: '🍼',
        label: '喂奶',
        times: feedRecords.length,
        sub: `${feedRecords.reduce((n, item) => n + (item.duration || 0), 0)} 分钟`,
        color: '#FFF0F0',
        textColor: '#FF6E68',
        iconBg: '#FFE8E7',
      },
      {
        type: 'solid',
        icon: '🥣',
        label: '辅食',
        times: solidFoodRecords.length,
        sub: `${solidFoodRecords.reduce((n, item) => n + (item.duration || 0), 0)} 分钟`,
        color: '#F0FAF3',
        textColor: '#22C55E',
        iconBg: '#E8FFE9',
      },
      {
        type: 'total',
        icon: '⏱️',
        label: '总时长',
        times: totalDuration,
        sub: `均 ${avgDuration} 分钟/次`,
        color: '#FFF8E7',
        textColor: '#F59E0B',
        iconBg: '#FFF4DC',
      },
    ];
  }, [records]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>宝宝日常</Text>
            <Text style={styles.subGreeting}>{name} · {age !== '-' ? age : '请设置生日'}</Text>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{monthDay}</Text>
            <Text style={styles.weekdayText}>{weekday}</Text>
          </View>
        </View>

        {/* Profile Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerLeft}>
            <View style={[styles.bannerAvatar, { backgroundColor: '#FFF0F0' }]}>
              <Text style={styles.bannerAvatarText}>{emoji}</Text>
            </View>
            <View>
              <Text style={styles.bannerName}>{name}</Text>
              <Text style={styles.bannerMeta}>
                {gender === '男' ? '男宝宝 ♂' : '女宝宝 ♀'}
              </Text>
            </View>
          </View>
          <View style={styles.bannerRight}>
            <Text style={styles.bannerTag}>今日记录</Text>
          </View>
        </View>

        {/* Summary Strip */}
        <View style={styles.summaryStrip}>
          {summary.map((item) => (
            <View key={item.type} style={[styles.summaryItem, { backgroundColor: item.color }]}>
              <View style={[styles.summaryIconWrap, { backgroundColor: item.iconBg }]}>
                <Text style={styles.summaryIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.summaryLabel, { color: item.textColor }]}>{item.label}</Text>
              <Text style={styles.summaryTimes}>{item.times}次</Text>
              <Text style={styles.summarySub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        {/* Today's Records */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日记录</Text>
          <Text style={styles.sectionCount}>{records.length} 条</Text>
        </View>

        <View style={styles.listCard}>
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>今天暂无记录</Text>
              <Text style={styles.emptyHint}>去「记录」页新增一条吧</Text>
            </View>
          ) : (
            records.map((row, index) => (
              <View key={row.id}>
                <RecordRow item={row} />
                {index < records.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { paddingBottom: 40 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, color: '#888', marginTop: 3 },
  datePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#FF6E68',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  datePillText: { fontSize: 15, fontWeight: '800', color: '#FF6E68' },
  weekdayText: { fontSize: 11, color: '#FFB3AF', fontWeight: '600', marginTop: 1 },

  /* ── Banner Card ── */
  bannerCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#FF6E68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  bannerLeft: { flexDirection: 'row', alignItems: 'center' },
  bannerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerAvatarText: { fontSize: 26 },
  bannerName: { fontSize: 19, fontWeight: '800', color: '#1A1A1A', marginBottom: 3 },
  bannerMeta: { fontSize: 13, color: '#888' },
  bannerRight: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerTag: { color: '#FF6E68', fontWeight: '700', fontSize: 13 },

  /* ── Summary Strip ── */
  summaryStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryIcon: { fontSize: 17 },
  summaryLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  summaryTimes: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  summarySub: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },

  /* ── Section ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.2 },
  sectionCount: {
    backgroundColor: '#FFF0F0',
    color: '#FF6E68',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },

  /* ── List Card ── */
  listCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },

  /* ── Empty State ── */
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 15, color: '#888', fontWeight: '600', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: '#BBB' },

  footer: { height: 30 },
});
