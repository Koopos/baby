import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordDateKeys, getRecordsByDate, getRecordsByMonth, seedTestRecords, clearAllRecords, deleteRecord } from '../db/recordsRepository';
import RecordRow from '../components/RecordRow';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';

const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
const ACCENT = '#FF6E68';

function pad(num) { return String(num).padStart(2, '0'); }
function formatDateKey(year, month, day) { return `${year}-${pad(month)}-${pad(day)}`; }

export default function StatsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
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
    titleTapTimer.current = setTimeout(() => { titleTapCount.current = 0; }, 2000);
    if (titleTapCount.current >= 5) { titleTapCount.current = 0; setShowDevMenu(v => !v); }
  };

  const loadData = useCallback(async () => {
    const [allDateKeys, dayRecords, allMonthRecords] = await Promise.all([
      getRecordDateKeys(),
      getRecordsByDate(selectedDate),
      getRecordsByMonth(viewYear, viewMonth),
    ]);
    const solidFoodMap = {};
    const vaccineMap = {};
    for (const record of allMonthRecords) {
      const dateKey = (record.recorded_at || record.created_at).split(' ')[0];
      if (record.record_type === 'vaccine') vaccineMap[dateKey] = (vaccineMap[dateKey] || 0) + 1;
      else if (record.feed_type === '辅食' && record.solid_food) solidFoodMap[dateKey] = record.solid_food;
    }
    setRecordDateKeys(allDateKeys);
    setSelectedRecords(dayRecords);
    setSolidFoodByDate(solidFoodMap);
    setVaccineCountByDate(vaccineMap);
  }, [selectedDate, viewYear, viewMonth]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try { await seedTestRecords(); await loadData(); setSelectedDate(formatDateKey(viewYear, viewMonth, 1)); }
    catch (error) { console.error('Seed error:', error); }
    finally { setIsSeeding(false); }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await loadData(); } finally { setIsRefreshing(false); }
  };

  const handleClear = () => {
    Alert.alert('确认清空', '删除所有记录，此操作不可恢复？', [
      { text: '取消', style: 'cancel' },
      { text: '确认清空', style: 'destructive', onPress: async () => {
        setIsClearing(true);
        try { await clearAllRecords(); setSelectedDate(formatDateKey(viewYear, viewMonth, 1)); }
        catch (error) { console.error('Clear error:', error); }
        finally { setIsClearing(false); }
      }},
    ]);
  };

  const handleDeleteRecord = (id) => {
    Alert.alert('确认删除', '删除该条记录？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { await deleteRecord(id); setSelectedRecords(prev => prev.filter(r => r.id !== id)); }},
    ]);
  };

  const handlePreviousMonth = () => {
    let newMonth = viewMonth - 1, newYear = viewYear;
    if (newMonth === 0) { newMonth = 12; newYear -= 1; }
    setViewYear(newYear); setViewMonth(newMonth);
    setSelectedDate(formatDateKey(newYear, newMonth, 1));
  };

  const handleNextMonth = () => {
    let newMonth = viewMonth + 1, newYear = viewYear;
    if (newMonth === 13) { newMonth = 1; newYear += 1; }
    setViewYear(newYear); setViewMonth(newMonth);
    setSelectedDate(formatDateKey(newYear, newMonth, 1));
  };

  // Refresh data when this tab is focused (e.g. after adding a record from another tab)
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, viewYear, viewMonth, selectedDate]);

  useEffect(() => { let cancelled = false; const load = async () => { if (!cancelled) await loadData(); }; load(); return () => { cancelled = true; }; }, [viewMonth, selectedDate, viewYear]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  const vaccineCount = selectedRecords.filter((item) => item.record_type === 'vaccine').length;
  const feedCount = selectedRecords.length - vaccineCount;
  const totalDuration = selectedRecords.filter((item) => item.record_type !== 'vaccine').reduce((total, item) => total + (item.duration || 0), 0);

  const emoji = profile?.avatar_emoji || '👶';
  const name = profile?.name || '小宝贝';
  const birthday = profile?.birthday || '';
  const age = calcAge(birthday);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleTitleTap}>
            <Text style={styles.headerTitle}>日历记录</Text>
          </Pressable>
          {showDevMenu && (
            <View style={styles.headerButtons}>
              <Pressable style={[styles.devBtn, { backgroundColor: '#3B82F6' }]} onPress={handleSeed} disabled={isSeeding}>
                <Text style={styles.devBtnText}>{isSeeding ? '导入中...' : '导入数据'}</Text>
              </Pressable>
              <Pressable style={[styles.devBtn, styles.clearBtn]} onPress={handleClear} disabled={isClearing}>
                <Text style={styles.devBtnText}>{isClearing ? '清空中...' : '清空'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Profile strip */}
        <View style={styles.profileStrip}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{emoji}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileAge}>{age !== '-' ? age : '请设置生日'}</Text>
          </View>
        </View>

        {/* Month Navigator Card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Pressable style={styles.navBtn} onPress={handlePreviousMonth}>
              <Text style={styles.navBtnText}>‹</Text>
            </Pressable>
            <View style={styles.monthTitleWrap}>
              <Text style={styles.monthTitle}>{viewYear}年</Text>
              <View style={styles.monthPill}>
                <Text style={styles.monthPillText}>{viewMonth}月</Text>
              </View>
            </View>
            <Pressable style={styles.navBtn} onPress={handleNextMonth}>
              <Text style={styles.navBtnText}>›</Text>
            </Pressable>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekRow}>
            {weekLabels.map((label) => (
              <Text key={label} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.daysGrid}>
            {calendarCells.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.emptyCell} />;
              const dateKey = formatDateKey(viewYear, viewMonth, day);
              const hasRecord = recordDateKeys.includes(dateKey);
              const isSelected = selectedDate === dateKey;
              const solidFoodLabel = solidFoodByDate[dateKey];
              const vaccineN = vaccineCountByDate[dateKey] || 0;
              return (
                <Pressable
                  key={dateKey}
                  style={[
                    styles.dayCell,
                    hasRecord && !isSelected && styles.dayCellHasRecord,
                    isSelected && styles.dayCellSelected,
                  ]}
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
                  {hasRecord && !solidFoodLabel && vaccineN === 0 && (
                    <View style={[styles.dotBadge, isSelected && styles.dotBadgeSelected]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFF0F0' }]} />
            <Text style={styles.legendText}>有记录</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFE8E7' }]} />
            <Text style={styles.legendText}>选中</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendTag}>🥣</Text>
            <Text style={styles.legendText}>辅食</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendTag}>💉</Text>
            <Text style={styles.legendText}>疫苗</Text>
          </View>
        </View>

        {/* Selected Day Detail */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedDate}</Text>
            <View style={styles.detailMetaRow}>
              {feedCount > 0 && <View style={[styles.metaBadge, { backgroundColor: '#FFF0F0' }]}><Text style={[styles.metaBadgeText, { color: '#FF6E68' }]}>喂养 {feedCount}次</Text></View>}
              {vaccineCount > 0 && <View style={[styles.metaBadge, { backgroundColor: '#EEF3FF' }]}><Text style={[styles.metaBadgeText, { color: '#4A6CF7' }]}>疫苗 {vaccineCount}次</Text></View>}
              {totalDuration > 0 && <View style={[styles.metaBadge, { backgroundColor: '#FFF8E7' }]}><Text style={[styles.metaBadgeText, { color: '#F59E0B' }]}>共{totalDuration}分钟</Text></View>}
            </View>
          </View>
          {selectedRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>当天暂无记录</Text>
            </View>
          ) : (
            selectedRecords.map((item) => (
              <Pressable key={item.id} onLongPress={() => handleDeleteRecord(item.id)}>
                <RecordRow item={item} />
                {selectedRecords.indexOf(item) < selectedRecords.length - 1 && <View style={styles.rowDivider} />}
              </Pressable>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, flexWrap: 'wrap', gap: 8 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  devBtn: { backgroundColor: '#FF6E68', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearBtn: { backgroundColor: '#EF4444' },
  devBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* ── Profile Strip ── */
  profileStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 16, shadowColor: '#FF6E68', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  profileAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  profileAvatarText: { fontSize: 22 },
  profileName: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  profileAge: { fontSize: 13, color: '#888', marginTop: 1 },

  /* ── Calendar Card ── */
  calendarCard: { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F7F7F8', alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 22, color: '#FF6E68', fontWeight: '300' },
  monthTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  monthPill: { backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  monthPillText: { color: '#FF6E68', fontWeight: '800', fontSize: 15 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', color: '#AAA', fontSize: 13, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.285%', height: 66 },
  dayCell: { width: '14.285%', height: 66, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, paddingHorizontal: 2, borderRadius: 10 },
  dayCellHasRecord: { backgroundColor: '#FFF0F0' },
  dayCellSelected: { backgroundColor: '#FFE8E7' },
  dayText: { color: '#333', fontWeight: '600', fontSize: 14 },
  dayTextSelected: { color: '#FF6E68', fontWeight: '800' },
  tagBadge: { backgroundColor: '#FF6E68', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 3 },
  tagBadgeSelected: { backgroundColor: '#CC4F47' },
  tagText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  tagTextSelected: { color: '#fff' },
  vaccineBadge: { fontSize: 9, color: '#10B981', fontWeight: '700', marginTop: 2 },
  vaccineBadgeSelected: { color: '#0D9668' },
  dotBadge: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFB3AF', marginTop: 3 },
  dotBadgeSelected: { backgroundColor: '#FF6E68' },

  /* ── Legend ── */
  legendRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, color: '#AAA' },
  legendTag: { fontSize: 12 },

  /* ── Detail Card ── */
  detailCard: { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  detailHeader: { marginBottom: 12 },
  detailTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metaBadgeText: { fontSize: 12, fontWeight: '700' },
  rowDivider: { height: 0.5, backgroundColor: '#F0F0F0', marginVertical: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#AAA' },

  footer: { height: 30 },
});
