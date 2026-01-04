import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View, Text, Button, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './redux/Store';
import { RootState } from './redux/RootReducer';
import { toggleTheme, setTheme } from './redux/Action';
import LoadingScreen from './screens/LoadingScreen';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppWrapper />
      </PersistGate>
    </Provider>
  );
}

function AppWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const deviceTheme = useColorScheme();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isHydrated = useSelector((state: RootState) => state._persist?.rehydrated);

  useEffect(() => {
    if (isHydrated && deviceTheme) {
      const persistedTheme = store.getState().theme.mode;
      if (!persistedTheme || persistedTheme === 'light') {
        dispatch(setTheme(deviceTheme));
      }
    }
  }, [isHydrated, deviceTheme, dispatch]);

  useEffect(() => {
    if (deviceTheme) {
      dispatch(setTheme(deviceTheme));
    }
  }, []);

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
        <AppContent />
      )}
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.theme.mode);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return (
    <View style={[styles.container, themeMode === 'dark' ? styles.darkBg : styles.lightBg]}>
      <Text style={[styles.welcomeText, themeMode === 'dark' ? styles.darkText : styles.lightText]}>
        Welcome to Brain Extension
      </Text>
      <Button title="Get Started" onPress={() => console.log("ButtonPressedButtonPressed")} />
      <Button title="Toggle Theme" onPress={handleToggleTheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBg: {
    backgroundColor: '#0a0a0f',
  },
  lightBg: {
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  darkText: {
    color: '#ffffff',
  },
  lightText: {
    color: '#0a0a0f',
  },
});

export default App;
