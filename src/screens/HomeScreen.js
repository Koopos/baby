import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';
import FeedCard from '../components/FeedCard';
import { fetchHomeFeedCards } from '../services/homeFeedService';

const { width: SCREEN_W } = Dimensions.get('window');
const ACCENT = '#FF6E68';

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekdayName(date) {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return map[date.getDay()];
}

function getMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// FeedCard 展开详情
function FeedDetailModal({ card, visible, onClose }) {
  if (!visible || !card) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalIcon}>{card.icon}</Text>
          <Text style={styles.modalTitle}>{card.title}</Text>
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalDetail}>{card.detail}</Text>
        </ScrollView>
        <Pressable style={styles.modalCloseBtn} onPress={onClose}>
          <Text style={styles.modalCloseText}>关闭</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Feed 列表头部（宝宝信息 + 日期）
function FeedHeader({ profile, today, weekday, monthDay, onProfilePress }) {
  const name = profile?.name || '小宝贝';
  const birthday = profile?.birthday || '';
  const emoji = profile?.avatar_emoji || '👶';
  const age = calcAge(birthday);
  const gender = profile?.gender || '男';

  return (
    <View style={styles.feedHeader}>
      {/* 宝宝信息卡 */}
      <Pressable style={styles.profileCard} onPress={onProfilePress}>
        <View style={styles.profileLeft}>
          <View style={[styles.profileAvatar, { backgroundColor: '#FFF0F0' }]}>
            <Text style={styles.profileAvatarText}>{emoji}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileMeta}>
              {gender === '男' ? '男宝宝 ♂' : '女宝宝 ♀'} · {age !== '-' ? age : '请设置生日'}
            </Text>
          </View>
        </View>
        <View style={styles.profileRight}>
          <Text style={styles.profileTag}>首页</Text>
        </View>
      </Pressable>

      {/* 日期标签 */}
      <View style={styles.dateCard}>
        <Text style={styles.dateText}>{monthDay}</Text>
        <Text style={styles.weekdayText}>{weekday}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [feedCards, setFeedCards] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const { profile, reloadProfile } = useBabyProfile();

  const loadFeedCards = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const cards = await fetchHomeFeedCards();
      setFeedCards(cards || []);
    } catch (err) {
      console.warn('[Home] loadFeedCards failed:', err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadData = async () => {
        await reloadProfile();
      };
      loadData();
      loadFeedCards();
      return () => { cancelled = true; };
    }, [reloadProfile, loadFeedCards])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reloadProfile();
    await loadFeedCards();
    setRefreshing(false);
  }, [reloadProfile, loadFeedCards]);

  const today = new Date();
  const weekday = getWeekdayName(today);
  const monthDay = getMonthDay(today);

  const handleCardPress = useCallback((card) => {
    if (card.action === 'view_detail') {
      setSelectedCard(card);
      setShowDetail(true);
    } else if (card.action === 'view_ai') {
      navigation.navigate('AIChat');
    } else if (card.action === 'record') {
      navigation.navigate('AddRecord');
    }
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate('EditBaby');
  }, [navigation]);

  // 合并 AI 卡片
  const allCards = useMemo(() => {
    return feedCards;
  }, [feedCards]);

  // 分离信息流卡片和底部记录
  const infoCards = allCards;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={infoCards}
        keyExtractor={(item, index) => item.title + index}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        ListHeaderComponent={
          <FeedHeader
            profile={profile}
            today={today}
            weekday={weekday}
            monthDay={monthDay}
            onProfilePress={handleProfilePress}
          />
        }
        ListEmptyComponent={
          !loadingFeed ? null : (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.loadingText}>AI 正在生成内容...</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <FeedCard card={item} onPress={handleCardPress} />
          </View>
        )}
        ListFooterComponent={null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 详情弹窗 */}
      <FeedDetailModal
        card={selectedCard}
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedCard(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F8' },

  listContent: { paddingBottom: 100 },

  /* ── Feed Header ── */
  feedHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#FF6E68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: { fontSize: 26 },
  profileName: { fontSize: 19, fontWeight: '800', color: '#1A1A1A', marginBottom: 3 },
  profileMeta: { fontSize: 13, color: '#888' },
  profileRight: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  profileTag: { color: '#FF6E68', fontWeight: '700', fontSize: 13 },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#FF6E68',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dateText: { fontSize: 15, fontWeight: '800', color: '#FF6E68' },
  weekdayText: { fontSize: 12, color: '#FFB3AF', fontWeight: '600' },

  /* ── Card List ── */
  cardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },

  /* ── Loading ── */
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: '#AAA', marginTop: 12 },

  /* ── Detail Modal ── */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  modalIcon: { fontSize: 28 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  modalContent: { maxHeight: 300 },
  modalDetail: { fontSize: 15, color: '#444', lineHeight: 24 },
  modalCloseBtn: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseText: { color: '#FF6E68', fontWeight: '700', fontSize: 16 },
});
