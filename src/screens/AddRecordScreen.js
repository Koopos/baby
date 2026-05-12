import { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { addRecord, updateRecord, getRecordById, deleteRecord } from '../db/recordsRepository';

export default function AddRecordScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const editRecordId = route.params?.recordId;
  const isEditMode = !!editRecordId;

  const [recordType, setRecordType] = useState(route.params?.recordType || '辅食');
  const isCheckup = recordType === '体检';

  const [duration, setDuration] = useState('');
  const [solidFood, setSolidFood] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  });
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadRecord = async () => {
      if (!editRecordId) return;
      const record = await getRecordById(editRecordId);
      if (!record) return;
      setRecordType(record.feed_type || '辅食');
      setDuration(String(record.duration || 0));
      setSolidFood(record.solid_food || '');
      setRecordedAt(record.recorded_at || record.created_at || '');
      setNotes(record.notes || '');
      setWeight(record.weight || '');
      setHeight(record.height || '');
    };
    loadRecord();
  }, [editRecordId]);

  const handleSave = async () => {
    if (isCheckup) {
      if (!duration.trim()) {
        Alert.alert('请补充内容', '请填写月龄。');
        return;
      }
      if (!weight.trim()) {
        Alert.alert('请补充内容', '请填写体重。');
        return;
      }
      if (!height.trim()) {
        Alert.alert('请补充内容', '请填写身高。');
        return;
      }
    } else {
      if (!duration.trim()) {
        Alert.alert('请补充内容', '请填写喂养时长。');
        return;
      }
      if (!solidFood.trim()) {
        Alert.alert('请补充内容', '请填写辅食内容。');
        return;
      }
    }

    try {
      setSaving(true);
      if (isEditMode) {
        await updateRecord(editRecordId, { feedType: recordType, duration, notes, solidFood, weight, height });
      } else {
        await addRecord({ feedType: recordType, duration, notes, solidFood, recordedAt, weight, height });
      }

      if (!isEditMode) {
        setDuration('');
        setSolidFood('');
        setWeight('');
        setHeight('');
        setRecordedAt(`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')} ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}:${String(new Date().getSeconds()).padStart(2,'0')}`);
        setNotes('');
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
            {['辅食', '体检'].map((item) => {
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

          {isCheckup ? (
            <>
              <Text style={styles.label}>月龄（个月）</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
                placeholder="例如：6"
                keyboardType="number-pad"
                style={styles.input}
              />
              <Text style={styles.label}>体重（kg）</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="例如：8.5"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Text style={styles.label}>身高（cm）</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="例如：68"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Text style={styles.label}>备注</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="可记录发育情况…"
                style={[styles.input, styles.textarea]}
                multiline
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
              <Text style={styles.label}>辅食内容</Text>
              <TextInput
                value={solidFood}
                onChangeText={setSolidFood}
                placeholder="例如：米粉 + 苹果泥"
                style={styles.input}
              />
              <Text style={styles.label}>体重（kg）</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="例如：8.5"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Text style={styles.label}>身高（cm）</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="例如：68"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Text style={styles.label}>喂养时间</Text>
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
                placeholder="可记录辅食情况…"
                style={[styles.input, styles.textarea]}
                multiline
              />
            </>
          )}
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
