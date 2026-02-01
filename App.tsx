import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './redux/RootReducer';
import { setTheme } from './redux/Action';
import LoadingScreen from './screens/LoadingScreen';
import HomeScreen from './screens/HomeScreen';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const deviceTheme = useColorScheme();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isHydrated = useSelector((state: RootState) => state._persist?.rehydrated);

  useEffect(() => {
    if (isHydrated && deviceTheme) {
      dispatch(setTheme(deviceTheme));
    }
  }, [isHydrated, deviceTheme, dispatch]);

  const handleLoadingComplete = () => {
    setIsLoading(false);
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
      ) : (
        <HomeScreen />
      )}
    </SafeAreaProvider>
  );
}

export default App;
