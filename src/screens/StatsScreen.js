import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordDateKeys, getRecordsByDate, getRecordsByMonth, seedTestRecords, clearAllRecords, deleteRecord } from '../db/recordsRepository';
import RecordRow from '../components/RecordRow';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';

const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];

function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function StatsScreen() {
  const navigation = useNavigation();
  const { profile } = useBabyProfile();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [recordDateKeys, setRecordDateKeys] = useState([]);
  const [solidFoodByDate, setSolidFoodByDate] = useState({});
  const [vaccineCountByDate, setVaccineCountByDate] = useState({});
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const titleTapCount = useRef(0);
  const titleTapTimer = useRef(null);

  const handleTitleTap = () => {
    titleTapCount.current += 1;
    clearTimeout(titleTapTimer.current);
    titleTapTimer.current = setTimeout(() => {
      titleTapCount.current = 0;
    }, 2000);
    if (titleTapCount.current >= 5) {
      titleTapCount.current = 0;
      setShowDevMenu((v) => !v);
    }
  };

  const loadData = async () => {
    const [allDateKeys, dayRecords, allMonthRecords] = await Promise.all([
      getRecordDateKeys(),
      getRecordsByDate(selectedDate),
      getRecordsByMonth(viewYear, viewMonth),
    ]);

    const solidFoodMap = {};
    const vaccineMap = {};
    for (const record of allMonthRecords) {
      const dateKey = record.created_at.split(' ')[0];
      if (record.record_type === 'vaccine') {
        vaccineMap[dateKey] = (vaccineMap[dateKey] || 0) + 1;
      } else if (record.feed_type === '辅食' && record.solid_food) {
        solidFoodMap[dateKey] = record.solid_food;
      }
    }

    setRecordDateKeys(allDateKeys);
    setSelectedRecords(dayRecords);
    setSolidFoodByDate(solidFoodMap);
    setVaccineCountByDate(vaccineMap);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedTestRecords();
      await loadData();
      setSelectedDate(formatDateKey(viewYear, viewMonth, 1));
    } catch (error) {
      console.error('Seed error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClear = async () => {
    Alert.alert('确认清空', '删除所有记录，此操作不可恢复？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认清空',
        style: 'destructive',
        onPress: async () => {
          setIsClearing(true);
          try {
            await clearAllRecords();
            setSelectedDate(formatDateKey(viewYear, viewMonth, 1));
          } catch (error) {
            console.error('Clear error:', error);
          } finally {
            setIsClearing(false);
          }
        },
      },
    ]);
  };

  const handleDeleteRecord = async (id) => {
    Alert.alert('确认删除', '删除该条记录？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(id);
          setSelectedRecords((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  const handlePreviousMonth = () => {
    let newMonth = viewMonth - 1;
    let newYear = viewYear;
    if (newMonth === 0) {
      newMonth = 12;
      newYear -= 1;
    }
    setViewYear(newYear);
    setViewMonth(newMonth);
    setSelectedDate(formatDateKey(newYear, newMonth, 1));
  };

  const handleNextMonth = () => {
    let newMonth = viewMonth + 1;
    let newYear = viewYear;
    if (newMonth === 13) {
      newMonth = 1;
      newYear += 1;
    }
    setViewYear(newYear);
    setViewMonth(newMonth);
    setSelectedDate(formatDateKey(newYear, newMonth, 1));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) await loadData();
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [viewMonth, selectedDate, viewYear]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < startOffset; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }, [viewMonth, viewYear]);

  const vaccineCount = selectedRecords.filter((item) => item.record_type === 'vaccine').length;
  const feedCount = selectedRecords.length - vaccineCount;
  const totalDuration = selectedRecords
    .filter((item) => item.record_type !== 'vaccine')
    .reduce((total, item) => total + (item.duration || 0), 0);

  const emoji = profile?.avatar_emoji || '👶';
  const name = profile?.name || '小宝贝';
  const birthday = profile?.birthday || '';
  const age = calcAge(birthday);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleTitleTap}>
            <Text style={styles.title}>日历记录</Text>
          </Pressable>
          {showDevMenu && (
            <View style={styles.headerButtons}>
              <Pressable style={styles.seedButton} onPress={handleSeed} disabled={isSeeding}>
                <Text style={styles.seedButtonText}>{isSeeding ? '导入中...' : '导入测试数据'}</Text>
              </Pressable>
              <Pressable style={[styles.seedButton, styles.clearButton]} onPress={handleClear} disabled={isClearing}>
                <Text style={styles.seedButtonText}>{isClearing ? '清空中...' : '清空记录'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.profileText}>{emoji} {name} · {age !== '-' ? age : '请设置生日'}</Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Pressable style={styles.monthNavButton} onPress={handlePreviousMonth}>
              <Text style={styles.monthNavText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{viewYear}年{viewMonth}月</Text>
            <Pressable style={styles.monthNavButton} onPress={handleNextMonth}>
              <Text style={styles.monthNavText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {weekLabels.map((label) => (
              <Text key={label} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {calendarCells.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.emptyCell} />;
              }
              const dateKey = formatDateKey(viewYear, viewMonth, day);
              const hasRecord = recordDateKeys.includes(dateKey);
              const isSelected = selectedDate === dateKey;
              const solidFoodLabel = solidFoodByDate[dateKey];
              const vaccineN = vaccineCountByDate[dateKey] || 0;
              return (
                <Pressable
                  key={dateKey}
                  style={[styles.dayCell, hasRecord && !isSelected && styles.dayCellHasRecord, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDate(dateKey)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                  {solidFoodLabel && (
                    <View style={[styles.tagBadge, isSelected && styles.tagBadgeSelected]}>
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                        {String(solidFoodLabel).substring(0, 3)}
                      </Text>
                    </View>
                  )}
                  {vaccineN > 0 && (
                    <Text style={[styles.vaccineBadge, isSelected && styles.vaccineBadgeSelected]}>
                      💉{vaccineN}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedDate} 记录</Text>
          <Text style={styles.detailMeta}>喂养 {feedCount}次 · 疫苗 {vaccineCount}次 · 总时长 {totalDuration}分钟</Text>
          {selectedRecords.length === 0 ? (
            <Text style={styles.emptyText}>当天暂无记录</Text>
          ) : (
            selectedRecords.map((item) => (
              <Pressable key={item.id} onLongPress={() => handleDeleteRecord(item.id)}>
                <RecordRow item={item} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#222' },
  seedButton: { backgroundColor: '#FF6E68', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearButton: { backgroundColor: '#EF4444' },
  seedButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  profileCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12 },
  profileText: { fontSize: 15, fontWeight: '600', color: '#444' },
  calendarCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  monthNavButton: { padding: 8, minWidth: 40, alignItems: 'center' },
  monthNavText: { fontSize: 24, color: '#FF6E68', fontWeight: '300' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', color: '#888', fontSize: 13 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.285%', height: 68 },
  dayCell: {
    width: '14.285%',
    height: 68,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  dayCellHasRecord: { backgroundColor: '#FFF5F5' },
  dayCellSelected: { backgroundColor: '#FFE8E7' },
  dayText: { color: '#333', fontWeight: '600' },
  dayTextSelected: { color: '#FF6E68' },
  tagBadge: { backgroundColor: '#FF6E68', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 3 },
  tagBadgeSelected: { backgroundColor: '#FF6E68' },
  tagText: { color: '#fff', fontSize: 8, fontWeight: '600' },
  tagTextSelected: { color: '#fff' },
  vaccineBadge: { fontSize: 9, color: '#10B981', fontWeight: '700', marginTop: 2 },
  vaccineBadgeSelected: { color: '#10B981' },
  detailCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  detailTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#222' },
  detailMeta: { color: '#666', marginBottom: 12 },
  emptyText: { color: '#999', paddingVertical: 12 },
});
