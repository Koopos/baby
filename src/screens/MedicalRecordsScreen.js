import { useEffect, useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAllRecords, deleteRecord } from '../db/recordsRepository';
import RecordRow from '../components/RecordRow';

export default function MedicalRecordsScreen({ navigation }) {
  const [vaccineRecords, setVaccineRecords] = useState([]);
  const [checkupRecords, setCheckupRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getAllRecords();
    const vaccines = all.filter((r) => r.record_type === 'vaccine');
    // Checkups are detected by feed_type containing "体检" or notes containing "体检"
    const checkups = all.filter(
      (r) => r.record_type !== 'vaccine' && (r.feed_type?.includes('体检') || r.notes?.includes('体检'))
    );
    setVaccineRecords(vaccines);
    setCheckupRecords(checkups);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (id) => {
    Alert.alert('确认删除', '删除该条记录？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>就诊记录</Text>
        <TouchableOpacity onPress={() => Alert.alert('选择记录类型', '请选择要添加的记录类型', [
          { text: '疫苗记录', onPress: () => navigation.navigate('AddRecord', { recordType: '疫苗' }) },
          { text: '体检记录', onPress: () => navigation.navigate('AddRecord', { recordType: '体检' }) },
          { text: '取消', style: 'cancel' },
        ])}>
          <Text style={styles.addBtn}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>💉 疫苗记录</Text>
        {vaccineRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无疫苗记录</Text>
            <Text style={styles.emptySub}>点击右上角添加疫苗接种记录</Text>
          </View>
        ) : (
          vaccineRecords.map((r) => (
            <Pressable key={r.id} onLongPress={() => handleDelete(r.id)}>
              <View style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordName}>{r.feed_type}</Text>
                  <Text style={styles.recordDate}>{r.vaccinated_at || r.created_at}</Text>
                </View>
                {r.vaccine_dose ? <Text style={styles.recordDetail}>剂次：{r.vaccine_dose}</Text> : null}
                {r.hospital ? <Text style={styles.recordDetail}>机构：{r.hospital}</Text> : null}
                {r.notes ? <Text style={styles.recordNotes}>{r.notes}</Text> : null}
              </View>
            </Pressable>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🩺 体检记录</Text>
        {checkupRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无体检记录</Text>
            <Text style={styles.emptySub}>在添加记录时选择"体检"类型可添加体检记录</Text>
          </View>
        ) : (
          checkupRecords.map((r) => (
            <Pressable key={r.id} onLongPress={() => handleDelete(r.id)}>
              <View style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordName}>{r.feed_type}</Text>
                  <Text style={styles.recordDate}>{r.created_at}</Text>
                </View>
                {r.notes ? <Text style={styles.recordNotes}>{r.notes}</Text> : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { fontSize: 17, color: '#222' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  addBtn: { fontSize: 15, color: '#FF6E68', fontWeight: '600' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 12 },
  emptyText: { color: '#999', fontSize: 15 },
  emptySub: { color: '#ccc', fontSize: 13, marginTop: 4, textAlign: 'center' },
  recordCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  recordName: { fontSize: 16, fontWeight: '700', color: '#222' },
  recordDate: { fontSize: 13, color: '#999' },
  recordDetail: { fontSize: 14, color: '#666', marginTop: 2 },
  recordNotes: { fontSize: 14, color: '#FF6E68', marginTop: 6, fontStyle: 'italic' },
});
