/**
 * AI 育儿助手聊天页面
 * 支持多对话、显示宝宝信息、历史记录持久化
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBabyProfile } from '../hooks/useBabyProfile';
import { sendChatMessage, setApiKey } from '../services/aiChatService';

const API_KEY_STORAGE = 'ai_chat_api_key';
const CONVERSATIONS_STORAGE = 'ai_conversations';
const MAX_STORED_MESSAGES = 50;

// 从旧格式迁移
const OLD_MESSAGES_STORAGE = 'ai_chat_messages';

function extractTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (firstUser) {
    return firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '…' : '');
  }
  return '新对话';
}

// 获取或创建当前对话
async function getOrCreateConversation(conversationId, messages) {
  try {
    const saved = await AsyncStorage.getItem(CONVERSATIONS_STORAGE);
    let conversations = saved ? JSON.parse(saved) : [];

    if (conversationId) {
      // 已有对话，找到并返回
      const idx = conversations.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        return { conversation: conversations[idx], conversations, idx };
      }
    }

    // 新建对话
    const newConv = {
      id: Date.now().toString(),
      title: extractTitle(messages),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    conversations.unshift(newConv);
    // 限制数量
    if (conversations.length > MAX_STORED_MESSAGES) {
      conversations = conversations.slice(0, MAX_STORED_MESSAGES);
    }
    await AsyncStorage.setItem(CONVERSATIONS_STORAGE, JSON.stringify(conversations));
    return { conversation: newConv, conversations, idx: 0 };
  } catch (e) {
    console.error('getOrCreateConversation error:', e);
    return { conversation: null, conversations: [], idx: -1 };
  }
}

// 保存对话消息
async function saveConversation(conversations, idx, messages) {
  if (idx < 0) return;
  const updated = [...conversations];
  updated[idx] = {
    ...updated[idx],
    title: extractTitle(messages),
    updatedAt: new Date().toISOString(),
    messages: messages.slice(-MAX_STORED_MESSAGES).map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  };
  await AsyncStorage.setItem(CONVERSATIONS_STORAGE, JSON.stringify(updated));
}

// 迁移旧数据
async function migrateOldData() {
  try {
    const old = await AsyncStorage.getItem(OLD_MESSAGES_STORAGE);
    if (!old) return null;
    const messages = JSON.parse(old);
    if (!Array.isArray(messages) || messages.length === 0) return null;
    // 导入为第一个对话
    const newConv = {
      id: 'legacy_' + Date.now(),
      title: extractTitle(messages),
      updatedAt: new Date().toISOString(),
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content })),
    };
    await AsyncStorage.setItem(CONVERSATIONS_STORAGE, JSON.stringify([newConv]));
    await AsyncStorage.removeItem(OLD_MESSAGES_STORAGE);
    return newConv;
  } catch (e) {
    return null;
  }
}

export default function AIChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { profile } = useBabyProfile();
  const conversationId = route.params?.conversationId || null;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(conversationId);
  const flatListRef = useRef(null);
  const apiKeyRef = useRef('');

  // 持久化的对话列表引用
  const convDataRef = useRef({ conversations: [], idx: -1 });

  const babyInfo = {
    name: profile?.name || '小宝贝',
    ageMonths: profile?.birthday ? (() => {
      const birth = new Date(profile.birthday + 'T12:00:00');
      const now = new Date();
      return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    })() : null,
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

  // 构建欢迎语
  const buildWelcomeMessage = useCallback(() => {
    const ageMonths = getAgeMonths();
    const ageText = ageMonths !== null ? `${ageMonths}个月` : '';
    return {
      id: 'welcome',
      role: 'assistant',
      content: `👋 你好！我是宝贝成长助手，专为${babyInfo.name}（${ageText}${babyInfo.gender === '男' ? '男宝' : '女宝'}）家长提供育儿支持。\n\n有什么想聊的？比如：\n• 喂养问题（母乳、辅食、断奶）\n• 睡眠问题（夜醒、抱睡、规律作息）\n• 健康问题（发烧、腹泻、湿疹）\n• 发育早教（抬头、翻身、说话）`,
      time: new Date(),
    };
  }, [babyInfo]);

  // 加载历史记录
  useEffect(() => {
    const loadData = async () => {
      await loadApiKey();

      // 尝试迁移旧数据
      const legacy = await migrateOldData();

      if (conversationId) {
        // 加载指定对话
        try {
          const saved = await AsyncStorage.getItem(CONVERSATIONS_STORAGE);
          if (saved) {
            const conversations = JSON.parse(saved);
            const idx = conversations.findIndex(c => c.id === conversationId);
            if (idx !== -1) {
              const conv = conversations[idx];
              setMessages(conv.messages.length > 0 ? conv.messages : [buildWelcomeMessage()]);
              convDataRef.current = { conversations, idx };
              setCurrentConvId(conversationId);
              setHistoryLoaded(true);
              return;
            }
          }
        } catch (e) {}
      }

      // 新对话或找不到对话
      setMessages([buildWelcomeMessage()]);
      setCurrentConvId(null);
      setHistoryLoaded(true);
    };
    loadData();
  }, [conversationId]);

  // 保存聊天记录到当前对话
  const saveMessages = async (msgs) => {
    try {
      let { conversations, idx } = convDataRef.current;

      if (idx === -1 || !currentConvId) {
        // 首次发消息，创建对话
        const result = await getOrCreateConversation(null, msgs);
        if (result.conversation) {
          conversations = result.conversations;
          idx = result.idx;
          const newId = result.conversation.id;
          setCurrentConvId(newId);
          convDataRef.current = { conversations, idx };
          // 更新 navigation params 以便返回列表能刷新
          navigation.setParams({ conversationId: newId });
        } else {
          return;
        }
      }

      await saveConversation(conversations, idx, msgs);
    } catch (e) {
      console.error('saveMessages error:', e);
    }
  };

  // 清空聊天记录
  const handleClearHistory = () => {
    Alert.alert(
      '清空对话',
      '确定要清空这个对话的所有聊天记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            const welcome = [buildWelcomeMessage()];
            setMessages(welcome);
            const { conversations, idx } = convDataRef.current;
            if (idx !== -1) {
              await saveConversation(conversations, idx, welcome);
            }
          },
        },
      ]
    );
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

    const userMessage = { id: Date.now().toString(), role: 'user', content: text };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);

    try {
      const history = currentMessages.map(m => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(history, babyInfo);
      const newMessages = [
        ...currentMessages,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ];
      setMessages(newMessages);
      await saveMessages(newMessages);
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
    setApiKey(apiKeyInput.trim());
    setShowApiKeyInput(false);
    setApiKeyInput('');
    Alert.alert('已保存', 'API Key 已保存，请重新发送消息。');
  };

  const loadApiKey = async () => {
    try {
      const key = await AsyncStorage.getItem(API_KEY_STORAGE);
      if (key) {
        apiKeyRef.current = key;
        setApiKey(key);
      }
    } catch (e) {}
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
        <View style={styles.headerRight}>
          {messages.length > 1 && (
            <TouchableOpacity onPress={handleClearHistory} style={styles.headerBtn}>
              <Text style={styles.headerBtnIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowApiKeyInput(true)} style={styles.headerBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{ paddingBottom: insets.bottom }}
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
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 4 },
  headerBtnIcon: { fontSize: 18 },
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
