import React, { useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View, Text, Button } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LoadingScreen from './screens/LoadingScreen';

function App() {
  const isDarkMode = useColorScheme() === 'light';
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0a0a0f"
        translucent={false}
      />
      {isLoading ? (
        <LoadingScreen onAnimationComplete={handleLoadingComplete} />
      ) : (
        <AppContent />
      )}
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to Brain Extension</Text>
      <Button title="Get Started" onPress={() => console.log("ButtonPressed")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
});

export default App;
