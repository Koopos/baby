/**
 * AI 对话列表页
 * 显示所有历史对话，点击进入聊天
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONVERSATIONS_STORAGE = 'ai_conversations';
const MAX_CONVERSATIONS = 50;

// 提取第一句用户消息作为标题
function extractTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (firstUser) {
    return firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '');
  }
  return '新对话';
}

function formatTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}

export default function AIConversationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);

  const loadConversations = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(CONVERSATIONS_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 按最新时间排序
        parsed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setConversations(parsed);
      }
    } catch (e) {
      console.error('加载对话列表失败:', e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadConversations);
    loadConversations();
    return unsubscribe;
  }, [navigation, loadConversations]);

  const handleDelete = (id) => {
    Alert.alert(
      '删除对话',
      '确定删除这个对话吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const updated = conversations.filter(c => c.id !== id);
            setConversations(updated);
            await AsyncStorage.setItem(CONVERSATIONS_STORAGE, JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const handleNewChat = () => {
    navigation.navigate('AIChat', { conversationId: null });
  };

  const handleOpenChat = (item) => {
    navigation.navigate('AIChat', { conversationId: item.id });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleOpenChat(item)}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.conversationContent}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {item.title || '新对话'}
        </Text>
        <Text style={styles.conversationPreview} numberOfLines={1}>
          {item.messages.length > 0
            ? (item.messages[item.messages.length - 1]?.role === 'user'
                ? '你: ' + item.messages[item.messages.length - 1]?.content.slice(0, 20)
                : '助手: ' + item.messages[item.messages.length - 1]?.content.slice(0, 20))
            : '暂无消息'}
        </Text>
      </View>
      <View style={styles.conversationMeta}>
        <Text style={styles.conversationTime}>{formatTime(item.updatedAt)}</Text>
        <Text style={styles.deleteHint}>长按删除</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🤖 育儿助手</Text>
        <TouchableOpacity onPress={handleNewChat} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ 新对话</Text>
        </TouchableOpacity>
      </View>

      {/* 对话列表 */}
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>暂无对话记录</Text>
          <Text style={styles.emptySubText}>点击右上角开始新对话</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  backBtn: { padding: 4, minWidth: 60 },
  backText: { fontSize: 17, color: '#FF6E68' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  newBtn: { padding: 4 },
  newBtnText: { fontSize: 15, color: '#FF6E68', fontWeight: '600' },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  conversationContent: { flex: 1 },
  conversationTitle: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 4 },
  conversationPreview: { fontSize: 13, color: '#999' },
  conversationMeta: { alignItems: 'flex-end', marginLeft: 12 },
  conversationTime: { fontSize: 12, color: '#BBB', marginBottom: 2 },
  deleteHint: { fontSize: 10, color: '#DDD' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#CCC' },
});
