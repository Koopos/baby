import { useState, useEffect } from 'react';
import {
  ScrollView, StyleSheet, Text, View, TextInput,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateBabyProfile } from '../db/recordsRepository';

const EMOJIS = ['👶', '🧒', '👧', '👦', '🐻', '🐼', '🐨', '🦁', '🐰', '🐶', '🐱', '🌟'];
const GENDERS = ['男', '女'];
const DEVELOPMENT_OPTIONS = ['优秀', '良好', '正常', '偏弱'];

export default function EditBabyScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('男');
  const [birthday, setBirthday] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('👶');
  const [nextCheckup, setNextCheckup] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [development, setDevelopment] = useState('良好');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route.params?.profile) {
      const p = route.params.profile;
      setName(p.name || '');
      setGender(p.gender || '男');
      setBirthday(p.birthday || '');
      setAvatarEmoji(p.avatar_emoji || '👶');
      setNextCheckup(p.next_checkup || '');
      setWeight(p.weight || '');
      setHeight(p.height || '');
      setDevelopment(p.development || '良好');
    }
  }, [route.params?.profile]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('请输入宝宝姓名');
      return;
    }
    if (!birthday.trim()) {
      Alert.alert('请输入宝宝生日');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday.trim())) {
      Alert.alert('生日格式请填写 YYYY-MM-DD，例如 2023-11-01');
      return;
    }
    if (weight && !/^\d+(\.\d+)?$/.test(weight.trim())) {
      Alert.alert('体重格式有误，请填写数字，如 8.5');
      return;
    }
    if (height && !/^\d+(\.\d+)?$/.test(height.trim())) {
      Alert.alert('身高格式有误，请填写数字，如 68');
      return;
    }
    setSaving(true);
    try {
      await updateBabyProfile({ name, gender, birthday, avatarEmoji, nextCheckup, weight, height, development });
      navigation.goBack();
    } catch (err) {
      Alert.alert('保存失败', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑宝贝信息</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>选择头像</Text>
        <View style={styles.emojiGrid}>
          {EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, avatarEmoji === e && styles.emojiBtnSelected]}
              onPress={() => setAvatarEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>基本信息</Text>
        <View style={styles.formCard}>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>姓名</Text>
            <TextInput
              style={styles.formInput}
              value={name}
              onChangeText={setName}
              placeholder="请输入宝宝姓名"
              placeholderTextColor="#AAA"
              maxLength={20}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>性别</Text>
            <View style={styles.genderGroup}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextSelected]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>生日</Text>
            <TextInput
              style={styles.formInput}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#AAA"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>下次体检</Text>
            <TextInput
              style={styles.formInput}
              value={nextCheckup}
              onChangeText={setNextCheckup}
              placeholder="YYYY-MM-DD（选填）"
              placeholderTextColor="#AAA"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>生长发育</Text>
        <View style={styles.formCard}>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>体重（kg）</Text>
            <TextInput
              style={styles.formInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="如 8.5"
              placeholderTextColor="#AAA"
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>身高（cm）</Text>
            <TextInput
              style={styles.formInput}
              value={height}
              onChangeText={setHeight}
              placeholder="如 68"
              placeholderTextColor="#AAA"
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.formRowTop}>
            <Text style={styles.formLabel}>发育评估</Text>
            <View style={styles.devGroup}>
              {DEVELOPMENT_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.devBtn, development === d && styles.devBtnSelected]}
                  onPress={() => setDevelopment(d)}
                >
                  <Text style={[styles.devBtnText, development === d && styles.devBtnTextSelected]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { fontSize: 17, color: '#222' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  saveBtn: { fontSize: 17, color: '#FF6E68', fontWeight: '600' },
  saveBtnDisabled: { color: '#CCC' },
  content: { padding: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#666', marginBottom: 10, marginTop: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  emojiBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#EEE',
  },
  emojiBtnSelected: { borderColor: '#FF6E68', backgroundColor: '#FFF5F4' },
  emojiText: { fontSize: 26 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 12 },
  formRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  formRowTop: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  formLabel: { fontSize: 16, color: '#333', width: 90 },
  formInput: { flex: 1, fontSize: 16, color: '#222', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 12 },
  genderGroup: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  genderBtn: {
    paddingHorizontal: 18, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#DDD',
  },
  genderBtnSelected: { borderColor: '#FF6E68', backgroundColor: '#FFF0EF' },
  genderBtnText: { fontSize: 15, color: '#666' },
  genderBtnTextSelected: { color: '#FF6E68', fontWeight: '600' },
  devGroup: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' },
  devBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD',
  },
  devBtnSelected: { borderColor: '#FF6E68', backgroundColor: '#FFF0EF' },
  devBtnText: { fontSize: 14, color: '#666' },
  devBtnTextSelected: { color: '#FF6E68', fontWeight: '600' },
});
