import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBabyProfile, calcAge } from '../hooks/useBabyProfile';

const GUIDE_DATA = [
  {
    minMonths: 0, maxMonths: 4,
    title: '纯母乳/配方奶喂养',
    subtitle: '0～4个月',
    tips: ['母乳按需喂养，建议每日8～12次', '配方奶宝宝按说明书剂量喂养', '无需额外添加水分', '出生15天后补充维生素AD'],
    foods: [],
    emoji: '🍼',
    bg: '#FCECEC',
  },
  {
    minMonths: 4, maxMonths: 6,
    title: '辅食添加初期',
    subtitle: '4～6个月',
    tips: ['宝宝可以坐稳、对食物感兴趣时添加', '第一口辅食：高铁米粉', '开始每天1次辅食，在两顿奶之间', '新食物每次只加一种，观察3天'],
    foods: ['高铁米粉', '南瓜泥', '土豆泥', '胡萝卜泥', '苹果泥'],
    emoji: '🥄',
    bg: '#F3FAEA',
  },
  {
    minMonths: 6, maxMonths: 7,
    title: '辅食排敏期',
    subtitle: '6～7个月',
    tips: ['每天1～2次辅食', '可添加：红肉泥（猪/牛/羊）', '继续尝试新蔬菜泥', '每种食物观察3天排查过敏'],
    foods: ['米粉', '猪肉泥', '牛肉泥', '西兰花泥', '红薯泥', '梨泥'],
    emoji: '🥦',
    bg: '#EEF3FF',
  },
  {
    minMonths: 7, maxMonths: 9,
    title: '辅食过渡期',
    subtitle: '7～9个月',
    tips: ['每天2次辅食，可以代替一顿奶', '食物由泥糊状过渡到碎末状', '可添加：蛋黄（从1/4开始）', '引入手指食物：蒸软的蔬菜条'],
    foods: ['稠粥/碎面条', '蛋黄', '鱼泥', '豆腐', '香蕉片', '蒸西葫芦'],
    emoji: '🍳',
    bg: '#FFF5E7',
  },
  {
    minMonths: 9, maxMonths: 12,
    title: '辅食巩固期',
    subtitle: '9～12个月',
    tips: ['每天3次辅食，与家人进餐时间同步', '食物形状：小块状、软饭', '鼓励宝宝自己用勺子进食', '可以喝少量白开水'],
    foods: ['软饭', '小馄饨', '蒸鱼块', '青菜碎', '草莓', '酸奶'],
    emoji: '🍽️',
    bg: '#F1EEFF',
  },
  {
    minMonths: 12, maxMonths: 18,
    title: '1岁以上',
    subtitle: '12～18个月',
    tips: ['饮食规律接近成人，食材多样化', '鼓励自主进食', '少盐少糖，烹饪清淡', '继续补充维生素AD'],
    foods: ['家庭饭菜（少盐少糖）', '全蛋', '鲜奶', '坚果碎（注意防噎）', '各种蔬菜水果'],
    emoji: '🍚',
    bg: '#FCECEC',
  },
];

function getMonthFromAgeStr(ageStr) {
  // ageStr like "6个月8天" or "1岁3个月"
  if (!ageStr || ageStr === '-') return null;
  const yearMatch = ageStr.match(/(\d+)岁/);
  const monthMatch = ageStr.match(/(\d+)个月/);
  const y = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  const m = monthMatch ? parseInt(monthMatch[1], 10) : 0;
  return y * 12 + m;
}

export default function FeedingGuideScreen({ navigation }) {
  const { profile } = useBabyProfile();
  const birthday = profile?.birthday || '';
  const age = calcAge(birthday);
  const currentMonths = useMemo(() => getMonthFromAgeStr(age), [age]);

  const currentGuide = useMemo(() => {
    if (currentMonths === null) return GUIDE_DATA[0];
    return GUIDE_DATA.find((g) => currentMonths >= g.minMonths && currentMonths < g.maxMonths) || GUIDE_DATA[GUIDE_DATA.length - 1];
  }, [currentMonths]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.backBtn} onPress={() => navigation.goBack()}>‹ 返回</Text>
        <Text style={styles.headerTitle}>喂养建议</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.ageCard, { backgroundColor: currentGuide.bg }]}>
          <Text style={styles.ageEmoji}>{currentGuide.emoji}</Text>
          <Text style={styles.ageTitle}>{currentGuide.title}</Text>
          <Text style={styles.ageSubtitle}>{currentGuide.subtitle} · 宝宝目前 {age}</Text>
        </View>

        <Text style={styles.sectionTitle}>喂养要点</Text>
        <View style={styles.tipsCard}>
          {currentGuide.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {currentGuide.foods.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>推荐食材</Text>
            <View style={styles.foodsGrid}>
              {currentGuide.foods.map((food, i) => (
                <View key={i} style={styles.foodChip}>
                  <Text style={styles.foodText}>{food}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>各月龄参考</Text>
        {GUIDE_DATA.map((guide, i) => (
          <View key={i} style={[styles.historyCard, { backgroundColor: guide.bg }]}>
            <Text style={styles.historyEmoji}>{guide.emoji}</Text>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>{guide.title}</Text>
              <Text style={styles.historySub}>{guide.subtitle}</Text>
            </View>
            {currentMonths !== null && currentMonths >= guide.minMonths && currentMonths < guide.maxMonths && (
              <Text style={styles.currentBadge}>当前</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { fontSize: 17, color: '#FF6E68' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  content: { padding: 16 },
  ageCard: { borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center' },
  ageEmoji: { fontSize: 48, marginBottom: 10 },
  ageTitle: { fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 4 },
  ageSubtitle: { fontSize: 14, color: '#666' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 10, marginTop: 4 },
  tipsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  tipRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 8 },
  tipBullet: { color: '#FF6E68', fontSize: 16, marginRight: 8, lineHeight: 22 },
  tipText: { flex: 1, fontSize: 15, color: '#444', lineHeight: 22 },
  foodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  foodChip: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#eee' },
  foodText: { fontSize: 14, color: '#444' },
  historyCard: { borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  historyEmoji: { fontSize: 28, marginRight: 12 },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  historySub: { fontSize: 13, color: '#666', marginTop: 2 },
  currentBadge: { backgroundColor: '#FF6E68', color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
});
