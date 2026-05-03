import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import EditBabyScreen from './src/screens/EditBabyScreen';
import AddRecordScreen from './src/screens/AddRecordScreen';
import ReminderScreen from './src/screens/ReminderScreen';
import FeedingGuideScreen from './src/screens/FeedingGuideScreen';
import MedicalRecordsScreen from './src/screens/MedicalRecordsScreen';
import AboutScreen from './src/screens/AboutScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="EditBaby"
            component={EditBabyScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AddRecord"
            component={AddRecordScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Reminder"
            component={ReminderScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="FeedingGuide"
            component={FeedingGuideScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MedicalRecords"
            component={MedicalRecordsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
