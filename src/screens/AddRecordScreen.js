import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addRecord } from '../db/recordsRepository';

const feedTypes = ['母乳', '配方奶', '混合喂养', '辅食'];

export default function AddRecordScreen() {
  const [feedType, setFeedType] = useState('母乳');
  const [duration, setDuration] = useState('20');
  const [notes, setNotes] = useState('');
  const [solidFood, setSolidFood] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (feedType === '辅食' && !solidFood.trim()) {
      Alert.alert('请补充内容', '请选择辅食记录时，请填写“辅食具体是什么”。');
      return;
    }
    if (!duration.trim()) {
      Alert.alert('请补充内容', '请填写喂养时长。');
      return;
    }

    try {
      setSaving(true);
      await addRecord({ feedType, duration, notes, solidFood });
      setDuration('20');
      setNotes('');
      setSolidFood('');
      Alert.alert('保存成功', '已保存到本地 SQLite。');
    } catch (error) {
      Alert.alert('保存失败', '本地保存失败，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>添加记录</Text>
      <View style={styles.segment}>
        {feedTypes.map((type) => (
          <Pressable
            key={type}
            style={[styles.chip, feedType === type && styles.chipActive]}
            onPress={() => setFeedType(type)}
          >
            <Text style={[styles.chipLabel, feedType === type && styles.chipLabelActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.formCard}>
        <Text style={styles.label}>开始时间</Text>
        <TextInput value={new Date().toLocaleString('zh-CN')} editable={false} style={styles.input} />
        {feedType === '辅食' ? (
          <>
            <Text style={styles.label}>辅食具体是什么</Text>
            <TextInput
              value={solidFood}
              onChangeText={setSolidFood}
              placeholder="例如：米粉、南瓜泥、苹果泥"
              style={styles.input}
            />
          </>
        ) : null}
        <Text style={styles.label}>时长（分钟）</Text>
        <TextInput value={duration} onChangeText={setDuration} style={styles.input} keyboardType="numeric" />
        <Text style={styles.label}>备注</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="可记录宝宝状态…"
          style={[styles.input, styles.textarea]}
          multiline
        />
        <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F4',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#FF6E68' },
  chipLabel: { color: '#555' },
  chipLabelActive: { color: '#fff', fontWeight: '700' },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#FF6E68', marginTop: 16, padding: 14, borderRadius: 26, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
