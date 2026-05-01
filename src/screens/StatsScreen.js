import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];

const dailyRecords = {
  '2024-05-18': [
    { type: '喂养', icon: '🍼', time: '08:00', detail: '母乳 120ml' },
    { type: '大小便', icon: '💩', time: '10:10', detail: '大便 1次' },
    { type: '喂养', icon: '🍼', time: '12:40', detail: '配方奶 150ml' },
  ],
  '2024-05-19': [
    { type: '喂养', icon: '🍼', time: '07:50', detail: '母乳 110ml' },
    { type: '大小便', icon: '💧', time: '09:20', detail: '小便 2次' },
    { type: '喂养', icon: '🍼', time: '14:30', detail: '母乳 130ml' },
    { type: '大小便', icon: '💩', time: '18:20', detail: '大便 1次' },
  ],
  '2024-05-20': [
    { type: '喂养', icon: '🍼', time: '08:00', detail: '母乳 120ml' },
    { type: '大小便', icon: '💩', time: '10:30', detail: '大便 1次' },
    { type: '喂养', icon: '🍼', time: '15:00', detail: '母乳 150ml' },
  ],
  '2024-05-21': [
    { type: '喂养', icon: '🍼', time: '09:00', detail: '配方奶 140ml' },
    { type: '大小便', icon: '💧', time: '11:15', detail: '小便 2次' },
  ],
};

function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function StatsScreen() {
  const year = 2024;
  const month = 5;
  const [selectedDate, setSelectedDate] = useState('2024-05-20');

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

  const selectedRecords = dailyRecords[selectedDate] || [];
  const feedCount = selectedRecords.filter((item) => item.type === '喂养').length;
  const toiletCount = selectedRecords.filter((item) => item.type === '大小便').length;

  return (
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
            const hasRecord = Boolean(dailyRecords[dateKey]);
            const isSelected = selectedDate === dateKey;
            return (
              <Pressable
                key={dateKey}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                onPress={() => setSelectedDate(dateKey)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                {hasRecord ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>{selectedDate} 记录</Text>
        <Text style={styles.detailMeta}>喂养 {feedCount}次 · 大小便 {toiletCount}次</Text>
        {selectedRecords.length === 0 ? (
          <Text style={styles.emptyText}>当天暂无记录</Text>
        ) : (
          selectedRecords.map((item, index) => (
            <View key={`${item.time}-${index}`} style={styles.row}>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{item.type}</Text>
                <Text style={styles.rowDesc}>{item.detail}</Text>
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
  calendarCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 12 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', color: '#888', fontSize: 13 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyCell: { width: '14.285%', aspectRatio: 1 },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellSelected: { backgroundColor: '#FF6E68' },
  dayText: { color: '#333', fontWeight: '600' },
  dayTextSelected: { color: '#fff' },
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
