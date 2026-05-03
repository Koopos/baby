/**
 * AI 育儿助手聊天页面
 * 支持对话、显示宝宝信息、设置 API Key
 */

import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBabyProfile } from '../hooks/useBabyProfile';
import { sendChatMessage, setApiKey } from '../services/aiChatService';

const API_KEY_STORAGE = 'ai_chat_api_key';

export default function AIChatScreen({ navigation }) {
  const { profile, calcAge } = useBabyProfile();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const flatListRef = useRef(null);
  const apiKeyRef = useRef('');

  const babyInfo = {
    name: profile?.name || '小宝贝',
    age: profile?.birthday ? calcAge(profile.birthday) : '',
    gender: profile?.gender || '男',
    weight: profile?.weight || '',
    height: profile?.height || '',
  };

  const getAgeMonths = () => {
    if (!profile?.birthday) return null;
    const birth = new Date(profile.birthday + 'T12:00:00');
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months;
  };

  useEffect(() => {
    loadApiKey();
    const ageMonths = getAgeMonths();
    const ageText = ageMonths !== null ? `${ageMonths}个月` : '';
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 你好！我是宝贝成长助手，专为${babyInfo.name}（${ageText}${babyInfo.gender === '男' ? '男宝' : '女宝'}）家长提供育儿支持。\n\n有什么想聊的？比如：\n• 喂养问题（母乳、辅食、断奶）\n• 睡眠问题（夜醒、抱睡、规律作息）\n• 健康问题（发烧、腹泻、湿疹）\n• 发育早教（抬头、翻身、说话）`,
        time: new Date(),
      },
    ]);
  }, []);

  const loadApiKey = async () => {
    try {
      const key = await AsyncStorage.getItem(API_KEY_STORAGE);
      if (key) apiKeyRef.current = key;
    } catch (e) {}
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    if (!apiKeyRef.current) {
      setShowApiKeyInput(true);
      return;
    }

    setApiKey(apiKeyRef.current);
    setInputText('');
    setLoading(true);

    const userMessage = { id: Date.now().toString(), role: 'user', content: text, time: new Date() };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);

    try {
      const history = currentMessages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(history, babyInfo);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, time: new Date() },
      ]);
    } catch (err) {
      Alert.alert('发送失败', err.message);
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    await AsyncStorage.setItem(API_KEY_STORAGE, apiKeyInput.trim());
    apiKeyRef.current = apiKeyInput.trim();
    setShowApiKeyInput(false);
    setApiKeyInput('');
    Alert.alert('已保存', 'API Key 已保存，请重新发送消息。');
  };

  const renderBubble = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        {!isUser && <Text style={styles.avatarBot}>🤖</Text>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
        {isUser && <Text style={styles.avatarUser}>👤</Text>}
      </View>
    );
  };

  const ageMonths = getAgeMonths();
  const ageText = ageMonths !== null ? `${ageMonths}个月` : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>🤖 育儿助手</Text>
          <Text style={styles.headerSubText}>{babyInfo.name} · {ageText || '月龄未知'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowApiKeyInput(true)} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* API Key 设置弹窗 */}
      {showApiKeyInput && (
        <View style={styles.apiKeyOverlay}>
          <View style={styles.apiKeyModal}>
            <Text style={styles.apiKeyTitle}>设置 API Key</Text>
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

      {/* 聊天区域 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderBubble}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={loading ? (
          <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
            <Text style={styles.avatarBot}>🤖</Text>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <ActivityIndicator size="small" color="#FF6E68" />
            </View>
          </View>
        ) : null}
      />

      {/* 输入区域 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="输入你的问题..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 17, color: '#FF6E68' },
  headerTitle: { alignItems: 'center' },
  headerTitleText: { fontSize: 17, fontWeight: '700', color: '#222' },
  headerSubText: { fontSize: 12, color: '#999', marginTop: 2 },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 20 },
  chatList: { padding: 16, paddingBottom: 8 },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  bubbleRowBot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarBot: { fontSize: 28, marginRight: 8 },
  avatarUser: { fontSize: 28, marginLeft: 8 },
  bubble: {
    maxWidth: '72%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#FF6E68',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, color: '#333', lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#333',
  },
  sendBtn: {
    backgroundColor: '#FF6E68',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#FFC9C6',
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // API Key Modal
  apiKeyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  apiKeyModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  apiKeyTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 10 },
  apiKeyDesc: { fontSize: 13, color: '#777', lineHeight: 20, marginBottom: 16 },
  apiKeyInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  apiKeyBtns: { flexDirection: 'row', gap: 10 },
  apiKeyBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  apiKeyBtnCancel: { backgroundColor: '#F0F0F0' },
  apiKeyBtnCancelText: { color: '#666', fontSize: 15, fontWeight: '600' },
  apiKeyBtnSave: { backgroundColor: '#FF6E68' },
  apiKeyBtnSaveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
