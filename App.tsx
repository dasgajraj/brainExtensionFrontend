import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from './redux/RootReducer';
import { setTheme } from './redux/Action';
import LoadingScreen from './screens/LoadingScreen';
import HomeScreen from './screens/HomeScreen';
import OnboardingContainer from './screens/Onboarding';

const ONBOARDING_KEY = '@has_seen_onboarding';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const dispatch = useDispatch();
  const deviceTheme = useColorScheme();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isHydrated = useSelector((state: RootState) => state._persist?.rehydrated);

  useEffect(() => {
    if (isHydrated && deviceTheme) {
      dispatch(setTheme(deviceTheme));
    }
  }, [isHydrated, deviceTheme, dispatch]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (hasSeenOnboarding === null) {
        // First time user
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setShowOnboarding(false);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={themeMode === 'dark' ? '#0a0a0f' : '#ffffff'}
        translucent={false}
      />
      {isLoading ? (
        <LoadingScreen onAnimationComplete={handleLoadingComplete} theme={themeMode} />
      ) : showOnboarding ? (
        <OnboardingContainer onComplete={handleOnboardingComplete} theme={themeMode} />
      ) : (
        <HomeScreen />
      )}
    </SafeAreaProvider>
  );
}

export default App;
