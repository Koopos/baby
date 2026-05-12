import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';
import { setApiKey } from '../services/aiChatService';

const ACCENT = '#FF6E68';
const GRADIENT_BG = '#FFF5F4';
const API_KEY_STORAGE = 'ai_chat_api_key';

export default function MeScreen({ navigation }) {
  const { profile, reloadProfile } = useBabyProfile();
  const [apiKey, setApiKeyState] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    loadApiKey();
  }, []);

  async function loadApiKey() {
    const saved = await AsyncStorage.getItem(API_KEY_STORAGE);
    if (saved) {
      setApiKeyState(saved);
      setApiKey(saved);
    }
  }

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('请输入 API Key');
      return;
    }
    await AsyncStorage.setItem(API_KEY_STORAGE, apiKeyInput.trim());
    setApiKeyState(apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setShowApiKeyInput(false);
    setApiKeyInput('');
    Alert.alert('保存成功', 'API Key 已设置');
  }, [apiKeyInput]);

  const handleClearApiKey = useCallback(async () => {
    await AsyncStorage.removeItem(API_KEY_STORAGE);
    setApiKeyState('');
    setApiKey('');
    setShowApiKeyInput(false);
    setApiKeyInput('');
    Alert.alert('已清除', 'API Key 已移除');
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      reloadProfile();
    });
    return unsubscribe;
  }, [navigation, reloadProfile]);

  async function onRefresh() {
    await reloadProfile();
  }

  const quickActions = [
    { icon: '🔔', title: '提醒设置', desc: '喂养/换尿布提醒', color: '#FFEEE8', onPress: () => navigation.getParent().navigate('Reminder') },
  ];

  const menuItems = [
    { icon: '🤖', title: 'AI 育儿助手', desc: '智能问答，个性化建议', color: '#EEF3FF', onPress: () => navigation.getParent().navigate('AIChat') },
    { icon: '🔑', title: 'API Key 设置', desc: apiKey ? '已设置 ✓' : '点击设置 MiniMax Key', color: '#FFF8E7', onPress: () => setShowApiKeyInput(true) },
    { icon: '🥣', title: '喂养建议', desc: '按月龄查看推荐食谱', color: '#F3FAEA', onPress: () => navigation.getParent().navigate('FeedingGuide') },
    { icon: '💉', title: '就诊记录', desc: '疫苗与体检信息', color: '#FFF5E7', onPress: () => navigation.getParent().navigate('MedicalRecords') },
    { icon: 'ℹ️', title: '关于我们', desc: '版本信息与反馈', color: '#F5EEFF', onPress: () => navigation.getParent().navigate('About') },
  ];

  const name = profile?.name || '小宝贝';
  const gender = profile?.gender || '男';
  const birthday = profile?.birthday || '';
  const emoji = profile?.avatar_emoji || '👶';
  const nextCheckup = profile?.next_checkup || '';
  const weight = profile?.weight || '';
  const height = profile?.height || '';
  const development = profile?.development || '良好';
  const age = calcAge(birthday);

  const stats = [
    { icon: '🎂', label: '月龄', value: age !== '-' ? age : '-', bg: '#FFF0F0' },
    { icon: '⚖️', label: '体重', value: weight ? `${weight} kg` : '-', bg: '#EEF3FF' },
    { icon: '📏', label: '身高', value: height ? `${height} cm` : '-', bg: '#F0FAF3' },
    { icon: '🧠', label: '发育', value: development || '-', bg: '#FFF8E7' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>我的</Text>
        </View>

        {/* Profile Card — 头像 + 名字 + 基础信息 */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('EditBaby', { profile })}
        >
          <View style={styles.profileInner}>
            <View style={[styles.avatarRing, { backgroundColor: GRADIENT_BG }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{emoji}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileTags}>
                <Text style={styles.genderBadge}>{gender === '男' ? '♂ 男宝宝' : '♀ 女宝宝'}</Text>
                <Text style={styles.dot}> · </Text>
                <Text style={styles.profileBirthday}>{birthday ? `生日 ${birthday}` : '未设置生日'}</Text>
              </Text>
              {nextCheckup ? (
                <View style={styles.checkupBadge}>
                  <Text style={styles.checkupText}>📅 下次体检 {nextCheckup}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.editButton}>
              <Text style={styles.editButtonText}>编辑</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Stats Cards */}
        <Text style={styles.sectionTitle}>成长概览</Text>
        <View style={styles.statsGrid}>
          {stats.map((item) => (
            <View key={item.label} style={[styles.statsCard, { backgroundColor: item.bg }]}>
              <View style={styles.statsIconRow}>
                <Text style={styles.statsIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.statsLabel}>{item.label}</Text>
              <Text style={styles.statsValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Quick Action */}
        {quickActions.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.actionCard, { backgroundColor: item.color }]}
            activeOpacity={0.75}
            onPress={item.onPress}
          >
            <View style={styles.actionLeft}>
              <Text style={styles.actionIcon}>{item.icon}</Text>
              <View>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDesc}>{item.desc}</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Menu List */}
        <Text style={styles.sectionTitle}>更多功能</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.menuRow,
                index < menuItems.length - 1 && styles.menuRowBorder,
              ]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.color }]}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* API Key 设置弹窗 */}
        {showApiKeyInput && (
          <View style={styles.apiKeyOverlay}>
            <TouchableOpacity
              style={styles.apiKeyBackdrop}
              activeOpacity={1}
              onPress={() => { setShowApiKeyInput(false); setApiKeyInput(''); }}
            />
            <View style={styles.apiKeyModal}>
              <Text style={styles.apiKeyTitle}>API Key 设置</Text>
              <Text style={styles.apiKeyDesc}>
                用于调用 AI 对话服务。可在 MiniMax 平台获取：platform.minimaxi.com
              </Text>
              <TextInput
                style={styles.apiKeyInput}
                placeholder="输入 API Key"
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <View style={styles.apiKeyBtns}>
                {apiKey ? (
                  <TouchableOpacity
                    style={[styles.apiKeyBtn, styles.apiKeyBtnClear]}
                    onPress={handleClearApiKey}
                  >
                    <Text style={styles.apiKeyBtnClearText}>清除</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.apiKeyBtn, styles.apiKeyBtnCancel]}
                  onPress={() => { setShowApiKeyInput(false); setApiKeyInput(''); }}
                >
                  <Text style={styles.apiKeyBtnCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.apiKeyBtn, styles.apiKeyBtnSave]}
                  onPress={handleSaveApiKey}
                >
                  <Text style={styles.apiKeyBtnSaveText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { paddingBottom: 40 },

  /* ── Header ── */
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#F7F7F8',
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },

  /* ── Profile Card ── */
  profileCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#FF6E68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileInner: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarText: { fontSize: 32 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 5, letterSpacing: -0.3 },
  profileTags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  genderBadge: { fontSize: 13, color: '#FF6E68', fontWeight: '700' },
  dot: { color: '#CCC', fontSize: 13 },
  profileBirthday: { fontSize: 13, color: '#888' },
  checkupBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  checkupText: { fontSize: 11, color: '#FF6E68', fontWeight: '600' },
  editButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editButtonText: { color: '#FF6E68', fontWeight: '700', fontSize: 13 },

  /* ── Section Title ── */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    marginHorizontal: 20,
    letterSpacing: -0.2,
  },

  /* ── Stats Grid ── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    minWidth: '43%',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
  },
  statsIconRow: { marginBottom: 6 },
  statsIcon: { fontSize: 22 },
  statsLabel: { fontSize: 12, color: '#888', marginBottom: 3, fontWeight: '500' },
  statsValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.3 },

  /* ── Action Card ── */
  actionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { fontSize: 24, marginRight: 12 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  actionDesc: { fontSize: 12, color: '#888' },
  actionArrow: { fontSize: 22, color: '#CCC', fontWeight: '300' },

  /* ── Menu Card ── */
  menuCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIcon: { fontSize: 20 },
  menuTextWrap: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  menuDesc: { fontSize: 12, color: '#AAA' },
  menuArrow: { fontSize: 20, color: '#CCC', fontWeight: '300', marginLeft: 8 },

  footer: { height: 30 },

  /* ── API Key Modal ── */
  apiKeyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  apiKeyBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  apiKeyModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  apiKeyTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 10, textAlign: 'center' },
  apiKeyDesc: { fontSize: 13, color: '#777', lineHeight: 20, marginBottom: 16 },
  apiKeyInput: {
    backgroundColor: '#F7F7F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  apiKeyBtns: { flexDirection: 'row', gap: 10 },
  apiKeyBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  apiKeyBtnClear: { backgroundColor: '#FFF0F0' },
  apiKeyBtnClearText: { color: '#FF6E68', fontSize: 15, fontWeight: '600' },
  apiKeyBtnCancel: { backgroundColor: '#F0F0F0' },
  apiKeyBtnCancelText: { color: '#666', fontSize: 15, fontWeight: '600' },
  apiKeyBtnSave: { backgroundColor: '#FF6E68' },
  apiKeyBtnSaveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
