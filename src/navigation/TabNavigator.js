import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddRecordScreen from '../screens/AddRecordScreen';
import HomeScreen from '../screens/HomeScreen';
import MeScreen from '../screens/MeScreen';
import StatsScreen from '../screens/StatsScreen';

const Tab = createBottomTabNavigator();

const tabIconMap = {
  Home: '🏠',
  Stats: '📊',
  AddRecord: '➕',
  Me: '👤',
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6E68',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#eee',
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
          height: 62 + insets.bottom,
        },
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{tabIconMap[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
      <Tab.Screen name="AddRecord" component={AddRecordScreen} options={{ title: '记录' }} />
      <Tab.Screen name="Me" component={MeScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}
