import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addVaccineRecord } from '../db/recordsRepository';

export default function AddRecordScreen() {
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDose, setVaccineDose] = useState('');
  const [hospital, setHospital] = useState('');
  const [vaccinatedAt, setVaccinatedAt] = useState(new Date().toLocaleString('zh-CN'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!vaccineName.trim()) {
      Alert.alert('请补充内容', '请填写疫苗名称。');
      return;
    }
    if (!vaccinatedAt.trim()) {
      Alert.alert('请补充内容', '请填写接种时间。');
      return;
    }

    try {
      setSaving(true);
      await addVaccineRecord({ vaccineName, vaccineDose, hospital, notes, vaccinatedAt });
      setVaccineName('');
      setVaccineDose('');
      setHospital('');
      setVaccinatedAt(new Date().toLocaleString('zh-CN'));
      setNotes('');
      Alert.alert('保存成功', '已保存到本地 SQLite。');
    } catch (error) {
      Alert.alert('保存失败', '本地保存失败，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>添加疫苗记录</Text>
      <View style={styles.formCard}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  title: { fontSize: 28, fontWeight: '700', color: '#222', marginBottom: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#FF6E68', marginTop: 16, padding: 14, borderRadius: 26, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
