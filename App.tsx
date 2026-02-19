import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from './redux/RootReducer';
import { AppDispatch } from './redux/Store';
import { setTheme } from './redux/Action';
import { runBootstrap } from './app/bootstrap';
import LoadingScreen from './screens/LoadingScreen';
import HomeScreen from './screens/HomeScreen';
import OnboardingContainer from './screens/Onboarding';
import AuthContainer from './screens/Auth';

const ONBOARDING_KEY = '@has_seen_onboarding';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  /**
   * Two independent conditions must both be true before we hide the
   * LoadingScreen:
   *   1. animationDone  — the LoadingScreen's animation sequence finished
   *   2. backendReady   — bootstrapThunk completed (health check + session restore)
   *
   * This ensures the backend is always awake before the user can interact
   * with the auth screens, even on a cold-start that takes several seconds.
   */
  const [animationDone, setAnimationDone] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const deviceTheme = useColorScheme();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const backendReady = useSelector((state: RootState) => state.auth.backendReady);
  const authStatus = useSelector((state: RootState) => state.auth.status);

  // Stay on loading screen until the animation finishes AND bootstrap has
  // either succeeded (backendReady) or permanently failed (status='error').
  // Without the 'error' escape hatch the app would be stuck forever on a
  // cold start where the backend never responds.
  const bootstrapSettled = backendReady || authStatus === 'error';
  const isLoading = !animationDone || !bootstrapSettled;

  // Apply system theme preference (ignore 'unspecified' which has no direct mapping)
  useEffect(() => {
    if (deviceTheme === 'light' || deviceTheme === 'dark') {
      dispatch(setTheme(deviceTheme));
    }
  }, [deviceTheme, dispatch]);

  // Run bootstrap on mount — health check + optional session restore
  useEffect(() => {
    runBootstrap(dispatch);
  }, [dispatch]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (hasSeenOnboarding === null) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleLoadingComplete = () => {
    setAnimationDone(true);
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
        translucent={false} hidden
      />
      {isLoading ? (
        <LoadingScreen onAnimationComplete={handleLoadingComplete} theme={themeMode} />
      ) : showOnboarding ? (
        <OnboardingContainer onComplete={handleOnboardingComplete} theme={themeMode} />
      ) : !isAuthenticated ? (
        <AuthContainer />
      ) : (
        <HomeScreen />
      )}
    </SafeAreaProvider>
  );
}

export default App;
