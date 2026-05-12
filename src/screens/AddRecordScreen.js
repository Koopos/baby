import { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { addRecord, addVaccineRecord, updateRecord, updateVaccineRecord, updateDiaperRecord, addADRecord, updateADRecord, getRecordById, deleteRecord } from '../db/recordsRepository';

export default function AddRecordScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const editRecordId = route.params?.recordId;
  const isEditMode = !!editRecordId;

  const [recordType, setRecordType] = useState(route.params?.recordType || '母乳');
  const isVaccine = recordType === '疫苗';
  const isCheckup = recordType === '体检';
  const isDiaper = recordType === '大小便';
  const isAD = recordType === 'AD';

  const [duration, setDuration] = useState('');
  const [solidFood, setSolidFood] = useState('');
  const [formulaAmount, setFormulaAmount] = useState('');
  const [diaperType, setDiaperType] = useState('');
  const [stoolConsistency, setStoolConsistency] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDose, setVaccineDose] = useState('');
  const [hospital, setHospital] = useState('');
  const [vaccinatedAt, setVaccinatedAt] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  });
  const [recordedAt, setRecordedAt] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  });
  const [notes, setNotes] = useState('');
  const [adTaken, setAdTaken] = useState(true);
  const [adDosage, setAdDosage] = useState('一粒');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadRecord = async () => {
      if (!editRecordId) return;
      const record = await getRecordById(editRecordId);
      if (!record) return;

      if (record.record_type === 'vaccine') {
        setRecordType('疫苗');
        setVaccineName(record.feed_type || '');
        setVaccineDose(record.vaccine_dose || '');
        setHospital(record.hospital || '');
        setVaccinatedAt(record.vaccinated_at || record.created_at);
      } else if (record.feed_type === '小便' || record.feed_type === '大便' || record.feed_type === '两者都有') {
        setRecordType('大小便');
        setDiaperType(record.feed_type || '');
        setStoolConsistency(record.solid_food || '');
      } else if (record.feed_type === 'AD') {
        setRecordType('AD');
        setAdTaken(record.duration === 1);
        setAdDosage(record.solid_food || '一粒');
      } else {
        setRecordType(record.feed_type || '母乳');
        setDuration(String(record.duration || 0));
        setSolidFood(record.solid_food || '');
        setFormulaAmount(record.solid_food || '');
      }
      const d = new Date(); const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      setRecordedAt(record.recorded_at || record.created_at || fmt);
      setNotes(record.notes || '');
    };
    loadRecord();
  }, [editRecordId]);

  const handleSave = async () => {
    if (isVaccine) {
      if (!vaccineName.trim()) {
        Alert.alert('请补充内容', '请填写疫苗名称。');
        return;
      }
      if (!vaccinatedAt.trim()) {
        Alert.alert('请补充内容', '请填写接种时间。');
        return;
      }
    }

    try {
      setSaving(true);
      if (isVaccine) {
        if (isEditMode) {
          await updateVaccineRecord(editRecordId, { vaccineName, vaccineDose, hospital, notes, vaccinatedAt });
        } else {
          await addVaccineRecord({ vaccineName, vaccineDose, hospital, notes, vaccinatedAt });
        }
      } else if (isDiaper) {
        if (isEditMode) {
          await updateDiaperRecord(editRecordId, { diaperType, stoolConsistency, notes });
        } else {
          await addRecord({ feedType: recordType, duration: '0', notes, solidFood: stoolConsistency, diaperType, stoolConsistency, recordedAt });
        }
      } else if (isAD) {
        if (isEditMode) {
          await updateADRecord(editRecordId, { isTaken: adTaken, dosage: adDosage, recordedAt, notes });
        } else {
          await addADRecord({ isTaken: adTaken, dosage: adDosage, recordedAt, notes });
        }
      } else {
        if (isEditMode) {
          await updateRecord(editRecordId, { feedType: recordType, duration, notes, solidFood: recordType === '配方奶' ? formulaAmount : solidFood });
        } else {
          await addRecord({ feedType: recordType, duration, notes, solidFood: recordType === '配方奶' ? formulaAmount : solidFood, diaperType, stoolConsistency, recordedAt });
        }
      }

      if (!isEditMode) {
        setDuration('');
        setSolidFood('');
        setFormulaAmount('');
        setDiaperType('');
        setStoolConsistency('');
        setVaccineName('');
        setVaccineDose('');
        setHospital('');
        setVaccinatedAt(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')} ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}:${String(new Date().getSeconds()).padStart(2,'0')}`);
        setRecordedAt(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')} ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}:${String(new Date().getSeconds()).padStart(2,'0')}`);
        setNotes('');
        setAdTaken(true);
        setAdDosage('一粒');
      }
      Alert.alert('保存成功');
    } catch (error) {
      Alert.alert('保存失败', '本地保存失败，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isEditMode ? '编辑记录' : '添加记录'}</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>记录类型</Text>
          <View style={styles.typeRow}>
            {['母乳', '配方奶', '辅食', '疫苗', '体检', '大小便', 'AD'].map((item) => {
              const active = item === recordType;
              return (
                <Pressable
                  key={item}
                  style={[styles.typeChip, active && styles.typeChipActive, isEditMode && styles.typeChipDisabled]}
                  onPress={() => !isEditMode && setRecordType(item)}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          {isVaccine ? (
            <>
              <Text style={styles.label}>疫苗名称</Text>
              <TextInput
                value={vaccineName}
                onChangeText={setVaccineName}
                placeholder="例如：五联疫苗"
                style={styles.input}
              />
              <Text style={styles.label}>剂次</Text>
              <TextInput
                value={vaccineDose}
                onChangeText={setVaccineDose}
                placeholder="例如：第1针 / 加强针"
                style={styles.input}
              />
              <Text style={styles.label}>接种机构</Text>
              <TextInput
                value={hospital}
                onChangeText={setHospital}
                placeholder="例如：xx社区卫生服务中心"
                style={styles.input}
              />
              <Text style={styles.label}>接种时间</Text>
              <TextInput
                value={vaccinatedAt}
                onChangeText={setVaccinatedAt}
                placeholder="例如：2026-05-01 09:30:00"
                style={styles.input}
              />
            </>
          ) : isCheckup ? (
            <>
              <Text style={styles.label}>体检时间</Text>
              <TextInput
                value={recordedAt}
                onChangeText={setRecordedAt}
                placeholder="例如：2026-05-01 09:30:00"
                style={styles.input}
              />
              <Text style={styles.label}>备注</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="可记录身高、体重、发育情况…"
                style={[styles.input, styles.textarea]}
                multiline
              />
            </>
          ) : isDiaper ? (
            <>
              <Text style={styles.label}>类型</Text>
              <View style={styles.typeRow}>
                {['小便', '大便', '两者都有'].map((item) => {
                  const active = item === diaperType;
                  return (
                    <Pressable key={item} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setDiaperType(item)}>
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {(diaperType === '大便' || diaperType === '两者都有') && (
                <>
                  <Text style={styles.label}>大便形态</Text>
                  <View style={styles.typeRow}>
                    {['正常', '偏硬', '偏软', '稀水'].map((item) => {
                      const active = item === stoolConsistency;
                      return (
                        <Pressable key={item} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setStoolConsistency(item)}>
                          <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          ) : isAD ? (
            <>
              <Text style={styles.label}>今日是否服用 AD</Text>
              <View style={styles.typeRow}>
                {[['是', true], ['否', false]].map(([label, val]) => {
                  const active = adTaken === val;
                  return (
                    <Pressable key={label} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setAdTaken(val)}>
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {adTaken && (
                <>
                  <Text style={styles.label}>剂量</Text>
                  <View style={styles.typeRow}>
                    {['一粒', '两粒'].map((item) => {
                      const active = item === adDosage;
                      return (
                        <Pressable key={item} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setAdDosage(item)}>
                          <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              {recordType === '配方奶' ? (
                <>
                  <Text style={styles.label}>时长（分钟）</Text>
                  <TextInput
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="例如：20"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <Text style={styles.label}>毫升数</Text>
                  <TextInput
                    value={formulaAmount}
                    onChangeText={setFormulaAmount}
                    placeholder="例如：120"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </>
              ) : recordType === '辅食' ? (
                <>
                  <Text style={styles.label}>时长（分钟）</Text>
                  <TextInput
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="例如：20"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <Text style={styles.label}>辅食内容</Text>
                  <TextInput
                    value={solidFood}
                    onChangeText={setSolidFood}
                    placeholder="例如：米粉 + 苹果泥"
                    style={styles.input}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>时长（分钟）</Text>
                  <TextInput
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="例如：20"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </>
              )}
            </>
          )}

          <Text style={styles.label}>{isDiaper || isAD ? '时间' : '喂养时间'}</Text>
          <TextInput
            value={recordedAt}
            onChangeText={setRecordedAt}
            placeholder="例如：2026-05-01 09:30:00"
            style={styles.input}
          />

          <Text style={styles.label}>备注</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="可记录接种反应、注意事项…"
            style={[styles.input, styles.textarea]}
            multiline
          />
          <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存'}</Text>
          </Pressable>
          {isEditMode && (
            <Pressable style={styles.deleteButton} onPress={async () => {
              Alert.alert('确认删除', '删除该条记录？', [
                { text: '取消', style: 'cancel' },
                {
                  text: '删除',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteRecord(editRecordId);
                    navigation?.goBack?.();
                  },
                },
              ]);
            }}>
              <Text style={styles.deleteButtonText}>删除记录</Text>
            </Pressable>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  typeChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  typeChipActive: { backgroundColor: '#FF6E68', borderColor: '#FF6E68' },
  typeChipDisabled: { opacity: 0.5 },
  typeChipText: { fontSize: 14, color: '#666', fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#FF6E68', marginTop: 16, padding: 14, borderRadius: 26, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteButton: { marginTop: 10, padding: 14, borderRadius: 26, alignItems: 'center', borderWidth: 1.5, borderColor: '#EF4444' },
  deleteButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
