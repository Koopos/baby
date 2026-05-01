import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const feedTypes = ['母乳', '配方奶', '混合喂养'];

export default function AddRecordScreen() {
  const [feedType, setFeedType] = useState('母乳');

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
        <TextInput value="2024年5月20日 08:00" editable={false} style={styles.input} />
        <Text style={styles.label}>时长（分钟）</Text>
        <TextInput value="20" style={styles.input} keyboardType="numeric" />
        <Text style={styles.label}>备注</Text>
        <TextInput placeholder="可记录宝宝状态…" style={[styles.input, styles.textarea]} multiline />
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>保存</Text>
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
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
