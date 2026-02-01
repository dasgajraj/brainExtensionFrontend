import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/RootReducer';
import { toggleTheme } from '../redux/Action';

function HomeScreen() {
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

export default HomeScreen;