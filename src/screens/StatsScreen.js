import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordDateKeys, getRecordsByDate, getRecordsByMonth, seedTestRecords, clearAllRecords, deleteRecord } from '../db/recordsRepository';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';

const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
const ACCENT = '#FF6E68';

function pad(num) { return String(num).padStart(2, '0'); }
function formatDateKey(year, month, day) { return `${year}-${pad(month)}-${pad(day)}`; }

// ─── 辅食颜色映射 ─────────────────────────────────────────────────────
const SOLID_FOOD_COLORS = [
  { bg: '#FFE8E7', text: '#FF6E68', label: '#FFB3AF' }, // 珊瑚红
  { bg: '#E8F5FF', text: '#4A6CF7', label: '#A8C5FF' }, // 蓝色
  { bg: '#FFF8E7', text: '#F59E0B', label: '#FFD166' }, // 橙黄
  { bg: '#E8FFF0', text: '#52C41A', label: '#A3E096' }, // 绿色
  { bg: '#F5E8FF', text: '#722ED1', label: '#C297FF' }, // 紫色
  { bg: '#FFF0F8', text: '#EB2F96', label: '#FF8EC4' }, // 粉色
  { bg: '#E7FFFC', text: '#00BFD6', label: '#66E5F0' }, // 青色
  { bg: '#FFF5E7', text: '#D46B08', label: '#FFB066' }, // 深橙
  { bg: '#F0FFF4', text: '#389E0D', label: '#85CF6A' }, // 深绿
  { bg: '#EEF3FF', text: '#2F54EB', label: '#8095E8' }, // 靛蓝
];

// 按辅食名称分配固定颜色（相同名称 → 相同颜色）
const foodColorCache = {};
let colorIndex = 0;

function getColorForFood(foodName) {
  if (!foodName) return SOLID_FOOD_COLORS[0];
  if (!(foodName in foodColorCache)) {
    foodColorCache[foodName] = SOLID_FOOD_COLORS[colorIndex % SOLID_FOOD_COLORS.length];
    colorIndex++;
  }
  return foodColorCache[foodName];
}

// 从记录列表中提取当天不同辅食及其颜色
function getFoodColorsForDate(records) {
  const foodMap = {};
  records.forEach(r => {
    if (r.feed_type === '辅食' && r.solid_food) {
      if (!foodMap[r.solid_food]) {
        foodMap[r.solid_food] = getColorForFood(r.solid_food);
      }
    }
  });
  return Object.values(foodMap);
}

export default function StatsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { profile } = useBabyProfile();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  const [recordDateKeys, setRecordDateKeys] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [solidFoodByDate, setSolidFoodByDate] = useState({}); // dateKey -> [{food, color}, ...]
  const [solidFoodLegend, setSolidFoodLegend] = useState([]); // [{food, color}, ...] unique foods
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

    // Build per-date food list with colors (only solid food records)
    const foodMap = {}; // dateKey -> [{food, color}]
    const allFoods = {}; // foodName -> color (for legend)
    for (const record of allMonthRecords) {
      if (record.feed_type === '辅食' && record.solid_food) {
        const dateKey = (record.recorded_at || record.created_at).split(' ')[0];
        if (!foodMap[dateKey]) foodMap[dateKey] = [];
        // avoid duplicate food on same day
        if (!foodMap[dateKey].find(f => f.food === record.solid_food)) {
          const color = getColorForFood(record.solid_food);
          foodMap[dateKey].push({ food: record.solid_food, color });
          if (!allFoods[record.solid_food]) {
            allFoods[record.solid_food] = color;
          }
        }
      }
    }

    // Legend: all unique foods this month, sorted by first appearance
    const legend = Object.entries(allFoods).map(([food, color]) => ({ food, color }));

    setRecordDateKeys(allDateKeys);
    setSelectedRecords(dayRecords);
    setSolidFoodByDate(foodMap);
    setSolidFoodLegend(legend);
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
    // 用 UTC 方法避免本地时区歧义导致 getDay() 错位
    // new Date(y, m-1, d, 12) 在某些时区设备上 getDay() 可能返回前一天
    const utcDate = Date.UTC(viewYear, viewMonth - 1, 1);
    const firstDay = new Date(utcDate);
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    // getUTCDay(): 0=Sun,1=Mon,...,6=Sat → 转为 周一=0 格式
    const startOffset = (firstDay.getUTCDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth, viewYear]);

  // Only count solid food records
  const solidFoodRecords = selectedRecords.filter((item) => item.feed_type === '辅食');
  const solidFoodCount = solidFoodRecords.length;
  // Count unique food types on selected date
  const uniqueFoodsOnDate = [...new Set(solidFoodRecords.map(r => r.solid_food).filter(Boolean))];

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
            <Text style={styles.headerTitle}>辅食统计</Text>
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
              const foodsOnDay = solidFoodByDate[dateKey] || [];
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
                  {foodsOnDay.length > 0 && (
                    <View style={styles.foodTagsWrap}>
                      {foodsOnDay.slice(0, 3).map((item) => (
                        <View
                          key={item.food}
                          style={[styles.foodTagBadge, { backgroundColor: item.color.bg }]}
                        >
                          <Text
                            style={[styles.foodTagText, { color: item.color.text }]}
                            numberOfLines={1}
                          >
                            {item.food.length > 4 ? item.food.slice(0, 3) + '…' : item.food}
                          </Text>
                        </View>
                      ))}
                      {foodsOnDay.length > 3 && (
                        <Text style={[styles.foodMore, { color: isSelected ? '#FF6E68' : '#AAA' }]}>
                          +{foodsOnDay.length - 3}
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Food Legend */}
        {solidFoodLegend.length > 0 && (
          <View style={styles.legendRow}>
            {solidFoodLegend.map(({ food, color }) => (
              <View key={food} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color.bg }]} />
                <Text style={[styles.legendText, { color: color.text }]}>{food}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Selected Day Detail */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedDate}</Text>
            <View style={styles.detailMetaRow}>
              <View style={[styles.metaBadge, { backgroundColor: '#FFF0F0' }]}>
                <Text style={[styles.metaBadgeText, { color: '#FF6E68' }]}>
                  🥣 辅食 {solidFoodCount}次
                </Text>
              </View>
              {uniqueFoodsOnDate.length > 0 && (
                <View style={[styles.metaBadge, { backgroundColor: '#EEF3FF' }]}>
                  <Text style={[styles.metaBadgeText, { color: '#4A6CF7' }]}>
                    {uniqueFoodsOnDate.length}种食材
                  </Text>
                </View>
              )}
            </View>
          </View>
          {solidFoodRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🥣</Text>
              <Text style={styles.emptyText}>当天暂无辅食记录</Text>
            </View>
          ) : (
            solidFoodRecords.map((item) => {
              const color = getColorForFood(item.solid_food);
              return (
                <View key={item.id} style={[styles.solidFoodRow, { borderLeftColor: color.text }]}>
                  <View style={[styles.solidFoodDot, { backgroundColor: color.bg }]}>
                    <Text style={styles.solidFoodDotText}>{item.solid_food?.charAt(0)}</Text>
                  </View>
                  <View style={styles.solidFoodInfo}>
                    <Text style={[styles.solidFoodName, { color: color.text }]}>{item.solid_food}</Text>
                    <Text style={styles.solidFoodTime}>
                      {((item.recorded_at || item.created_at).split(' ')[1] || '').substring(0, 5)}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })
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
  /* ── Calendar Day Cell ── */
  emptyCell: { width: '14.285%', height: 70 },
  dayCell: { width: '14.285%', height: 70, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, paddingHorizontal: 2, borderRadius: 10 },
  dayCellHasRecord: { backgroundColor: '#FFF0F0' },
  dayCellSelected: { backgroundColor: '#FFE8E7' },
  dayText: { color: '#333', fontWeight: '600', fontSize: 13 },
  dayTextSelected: { color: '#FF6E68', fontWeight: '800' },

  /* ── Calendar Food Tags (text below calendar day) ── */
  foodTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 1, marginTop: 2, paddingHorizontal: 1 },
  foodTagBadge: { borderRadius: 3, paddingHorizontal: 2, paddingVertical: 1, marginBottom: 1 },
  foodTagText: { fontSize: 7, fontWeight: '700' },
  foodMore: { fontSize: 7, color: '#AAA', fontWeight: '700' },

  /* ── Legend ── */
  legendRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 12, fontWeight: '600' },

  /* ── Detail Card ── */
  detailCard: { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  detailHeader: { marginBottom: 12 },
  detailTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  detailMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metaBadgeText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#AAA' },

  /* ── Solid Food Row ── */
  solidFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6E68',
    marginBottom: 4,
  },
  solidFoodDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  solidFoodDotText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  solidFoodInfo: { flex: 1 },
  solidFoodName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  solidFoodTime: { fontSize: 12, color: '#AAA' },

  footer: { height: 30 },
});
