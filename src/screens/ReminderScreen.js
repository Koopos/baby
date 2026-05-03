import { useEffect, useState, useCallback } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllReminders, addReminder, toggleReminder, deleteReminder } from '../db/reminderRepository';
import { requestPermissions } from '../services/notificationService';

const TYPE_COLORS = { feed: '#FCECEC', diaper: '#EEF3FF', medicine: '#F3FAEA', checkup: '#FFF5E7' };
const TYPE_ICONS = { feed: '🍼', diaper: '🧷', medicine: '💊', checkup: '👨‍⚕️' };

export default function ReminderScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState('feed');
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getAllReminders();
    setReminders(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('提示', '未获得通知权限，将无法收到提醒。请在系统设置中开启通知权限。');
      }
    };
    init();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const handleToggle = async (id, enabled) => {
    await toggleReminder(id, enabled);
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
  };

  const handleDelete = (id) => {
    Alert.alert('确认删除', '删除该提醒？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteReminder(id);
          setReminders((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) { Alert.alert('请输入提醒名称'); return; }
    if (!/^\d{2}:\d{2}$/.test(newTime.trim())) { Alert.alert('时间格式为 HH:MM，如 08:00'); return; }
    setSaving(true);
    try {
      await addReminder({ type: newType, title: newTitle.trim(), time: newTime.trim() });
      setShowAdd(false);
      setNewTitle('');
      setNewTime('');
      setNewType('feed');
      await load();
    } catch (err) {
      Alert.alert('保存失败', err.message);
    } finally {
      setSaving(false);
    }
  };

  const grouped = reminders.reduce((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>提醒设置</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtn}>+ 新增</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无提醒，点击右上角新增</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <View key={type} style={styles.group}>
              <Text style={styles.groupTitle}>{TYPE_ICONS[type] || '📌'} {'提醒'}</Text>
              {items.map((r) => (
                <View key={r.id} style={[styles.card, { backgroundColor: TYPE_COLORS[type] || '#f5f5f5' }]}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardTime}>{r.time}</Text>
                    <Text style={styles.cardTitle}>{r.title}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Switch
                      value={r.enabled}
                      onValueChange={(v) => handleToggle(r.id, v)}
                      trackColor={{ false: '#ddd', true: '#FF6E68' }}
                      thumbColor="#fff"
                    />
                    <TouchableOpacity onPress={() => handleDelete(r.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>删除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>新增提醒</Text>
            <Text style={styles.label}>提醒类型</Text>
            <View style={styles.typeRow}>
              {Object.entries(TYPE_ICONS).map(([k, icon]) => (
                <Pressable key={k} style={[styles.typeChip, newType === k && styles.typeChipActive]} onPress={() => setNewType(k)}>
                  <Text style={styles.typeChipText}>{icon} {k === 'feed' ? '喂养' : k === 'diaper' ? '换尿布' : k === 'medicine' ? '喂药' : '体检'}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>名称</Text>
            <TextInput value={newTitle} onChangeText={setNewTitle} placeholder="如：母乳喂养" style={styles.input} placeholderTextColor="#AAA" />
            <Text style={styles.label}>时间</Text>
            <TextInput value={newTime} onChangeText={setNewTime} placeholder="HH:MM，如 08:00" style={styles.input} keyboardType="numbers-and-punctuation" placeholderTextColor="#AAA" maxLength={5} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { color: '#999' },
  group: { marginBottom: 16 },
  groupTitle: { fontSize: 15, fontWeight: '700', color: '#666', marginBottom: 8 },
  card: { borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: {},
  cardTime: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 2 },
  cardTitle: { fontSize: 14, color: '#555' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#EF4444', fontSize: 13 },
  label: { fontSize: 14, color: '#666', marginBottom: 6, marginTop: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  typeChipActive: { borderColor: '#FF6E68', backgroundColor: '#FFF0EF' },
  typeChipText: { fontSize: 14, color: '#555' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#222', backgroundColor: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 13, borderRadius: 26, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  cancelBtnText: { color: '#666', fontSize: 16, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 13, borderRadius: 26, alignItems: 'center', backgroundColor: '#FF6E68' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
