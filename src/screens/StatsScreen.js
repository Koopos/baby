import { useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordDateKeys, getRecordsByDate, getSolidFoodRecordsByMonth } from '../db/recordsRepository';

const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];

function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function extractSolidFoodItems(solidFood) {
  return (solidFood || '')
    .split(/[+,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function StatsScreen() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const [selectedDate, setSelectedDate] = useState(formatDateKey(year, month, today.getDate()));
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [recordDateKeys, setRecordDateKeys] = useState([]);
  const [solidFoodPreviewByDate, setSolidFoodPreviewByDate] = useState({});

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadData = async () => {
        const [allDateKeys, dayRecords, monthSolidFoodRecords] = await Promise.all([
          getRecordDateKeys(),
          getRecordsByDate(selectedDate),
          getSolidFoodRecordsByMonth(year, month),
        ]);

        const solidFoodMap = {};
        for (const item of monthSolidFoodRecords) {
          const dateKey = item.date_key;
          if (!dateKey) {
            continue;
          }
          if (!solidFoodMap[dateKey]) {
            solidFoodMap[dateKey] = [];
          }
          const parsedFoods = extractSolidFoodItems(item.solid_food);
          for (const foodName of parsedFoods) {
            if (solidFoodMap[dateKey].length >= 2) {
              break;
            }
            solidFoodMap[dateKey].push(foodName);
          }
        }

        if (mounted) {
          setRecordDateKeys(allDateKeys);
          setSelectedRecords(dayRecords);
          setSolidFoodPreviewByDate(solidFoodMap);
        }
      };
      loadData();
      return () => {
        mounted = false;
      };
    }, [month, selectedDate, year])
  );

  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
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
  }, [month, year]);

  const vaccineCount = selectedRecords.filter((item) => item.record_type === 'vaccine').length;
  const feedCount = selectedRecords.length - vaccineCount;
  const totalDuration = selectedRecords
    .filter((item) => item.record_type !== 'vaccine')
    .reduce((total, item) => total + (item.duration || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>日历记录</Text>
        <View style={styles.calendarCard}>
          <Text style={styles.monthTitle}>{year}年{month}月</Text>
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
              const dateKey = formatDateKey(year, month, day);
              const hasRecord = recordDateKeys.includes(dateKey);
              const isSelected = selectedDate === dateKey;
              const solidFoodPreview = solidFoodPreviewByDate[dateKey] || [];
              return (
                <Pressable
                  key={dateKey}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDate(dateKey)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                  {solidFoodPreview.length > 0 ? (
                    <Text
                      numberOfLines={2}
                      style={[styles.dayFoodPreview, isSelected && styles.dayFoodPreviewSelected]}
                    >
                      {solidFoodPreview.join('、')}
                    </Text>
                  ) : null}
                  {hasRecord ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
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
            selectedRecords.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.row}>
                <Text style={styles.time}>
                  {new Date(item.created_at.replace(' ', 'T')).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </Text>
                <Text style={styles.rowIcon}>
                  {item.record_type === 'vaccine' ? '💉' : item.feed_type === '辅食' ? '🥣' : '🍼'}
                </Text>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>{item.feed_type}</Text>
                  <Text style={styles.rowDesc}>
                    {item.record_type === 'vaccine'
                      ? `${item.vaccine_dose ? `${item.vaccine_dose} · ` : ''}${item.hospital || '疫苗接种'}${item.notes ? ` · ${item.notes}` : ''}`
                      : `${item.feed_type === '辅食' && item.solid_food ? `${item.solid_food} · ` : ''}${item.duration || 0}分钟${item.notes ? ` · ${item.notes}` : ''}`}
                  </Text>
                </View>
              </View>
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
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 16 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 12 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', color: '#888', fontSize: 13 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.285%', height: 66 },
  dayCell: {
    width: '14.285%',
    height: 66,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  dayCellSelected: { backgroundColor: '#FF6E68' },
  dayText: { color: '#333', fontWeight: '600' },
  dayTextSelected: { color: '#fff' },
  dayFoodPreview: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    color: '#777',
    marginTop: 2,
  },
  dayFoodPreviewSelected: { color: '#FFF2F1' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6E68', marginTop: 4 },
  dotSelected: { backgroundColor: '#fff' },
  detailCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  detailTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#222' },
  detailMeta: { color: '#666', marginBottom: 12 },
  emptyText: { color: '#999', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  time: { width: 56, color: '#555', fontWeight: '600' },
  rowIcon: { width: 26, fontSize: 18 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowDesc: { color: '#777', marginTop: 2 },
});
