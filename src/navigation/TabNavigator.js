import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddRecordScreen from '../screens/AddRecordScreen';
import HomeScreen from '../screens/HomeScreen';
import MeScreen from '../screens/MeScreen';
import StatsScreen from '../screens/StatsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: require('../../assets/tab-icons/home-icon_001.jpg'), inactive: require('../../assets/tab-icons/home-icon_001.jpg') },
  Stats: { active: require('../../assets/tab-icons/stats-icon_001.jpg'), inactive: require('../../assets/tab-icons/stats-icon_001.jpg') },
  AddRecord: { active: require('../../assets/tab-icons/addrecord-icon_001.jpg'), inactive: require('../../assets/tab-icons/addrecord-icon_001.jpg') },
  Me: { active: require('../../assets/tab-icons/me-icon_001.jpg'), inactive: require('../../assets/tab-icons/me-icon_001.jpg') },
};

const TAB_LABELS = {
  Home: '首页',
  Stats: '统计',
  AddRecord: '记录',
  Me: '我的',
};

function TabIcon({ route, focused }) {
  const icons = TAB_ICONS[route.name];
  const source = focused ? icons.active : icons.inactive;

  return (
    <View style={styles.iconContainer}>
      <Image
        source={source}
        style={[styles.iconImage, focused && styles.iconActive]}
        resizeMode="contain"
      />
      <Text style={[styles.label, focused && styles.labelActive]}>{TAB_LABELS[route.name]}</Text>
    </View>
  );
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 0.5,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
          height: 62 + insets.bottom,
          shadowColor: '#FF6E68',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarIcon: ({ focused }) => <TabIcon route={route} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen
        name="AddRecord"
        component={AddRecordScreen}
        options={{ tabBarIcon: ({ focused }) => (
          <View style={styles.addButton}>
            <Text style={styles.addIcon}>+</Text>
          </View>
        )}}
      />
      <Tab.Screen name="Me" component={MeScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  iconImage: { width: 24, height: 24, borderRadius: 4, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, color: '#AAA', marginTop: 2, fontWeight: '600' },
  labelActive: { color: '#FF6E68' },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6E68',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
    shadowColor: '#FF6E68',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addIcon: { fontSize: 28, color: '#FFF', fontWeight: '300' },
});
