import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/RootReducer';
import { AppDispatch } from '../redux/Store';
import { toggleTheme } from '../redux/Action';
import { logoutThunk } from '../redux/authSlice';

function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((state: RootState) => state.theme.mode);

  return (
    <View style={[styles.container, themeMode === 'dark' ? styles.darkBg : styles.lightBg]}>
      <Text style={[styles.welcomeText, themeMode === 'dark' ? styles.darkText : styles.lightText]}>
        Welcome to Brain Extension
      </Text>
      <Button title="Get Started" onPress={() => console.log('ButtonPressed')} />
      <View style={styles.gap} />
      <Button title="Toggle Theme" onPress={() => dispatch(toggleTheme())} />
      <View style={styles.gap} />
      <Button
        title="Log Out"
        color="#e74c3c"
        onPress={() => dispatch(logoutThunk())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBg: { backgroundColor: '#0a0a0f' },
  lightBg: { backgroundColor: '#ffffff' },
  welcomeText: { fontSize: 24, fontWeight: '300' },
  darkText: { color: '#ffffff' },
  lightText: { color: '#0a0a0f' },
  gap: { height: 12 },
});

export default HomeScreen;