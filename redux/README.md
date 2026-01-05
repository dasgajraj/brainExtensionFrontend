# Redux Theme Management

This directory contains the Redux store configuration and theme management system for the Brain Extension app.

## Overview

The theme system provides automatic synchronization with Android's system theme (light/dark mode) while allowing manual theme toggling. The theme preference is persisted across app sessions using `redux-persist`.

## Structure

```
redux/
├── Store.tsx          # Redux store configuration with persistence
├── RootReducer.tsx    # Root reducer combining all reducers
├── ThemeReducer.tsx   # Theme state management
├── Action.tsx         # Theme action creators
├── Constant.tsx       # Action type constants
└── README.md         # This file
```

## Theme Features

- ✅ **Auto-sync with system theme**: Automatically detects and applies Android system theme changes (light ↔ dark)
- ✅ **Manual toggle**: Users can manually switch between light and dark modes
- ✅ **Persistent state**: Theme preference is saved and restored on app restart
- ✅ **TypeScript support**: Fully typed for better development experience

## Redux State

### Theme State Interface

```typescript
interface ThemeState {
  mode: 'light' | 'dark';
}
```

### Initial State

```typescript
{
  mode: 'dark'  // Default theme mode
}
```

## Actions

### 1. Toggle Theme

Manually switches between light and dark modes.

```typescript
import { toggleTheme } from './redux/Action';
import { useDispatch } from 'react-redux';

const dispatch = useDispatch();

// Toggle theme
dispatch(toggleTheme());
```

### 2. Set Theme

Sets a specific theme mode (used for system theme sync).

```typescript
import { setTheme } from './redux/Action';
import { useDispatch, useColorScheme } from 'react-native';

const dispatch = useDispatch();
const deviceTheme = useColorScheme();

// Set specific theme
dispatch(setTheme('dark'));
// or sync with system
dispatch(setTheme(deviceTheme));
```

## Usage in Components

### Basic Usage

```typescript
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './redux/RootReducer';
import { toggleTheme } from './redux/Action';

function MyComponent() {
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.theme.mode);

  return (
    <View style={{ backgroundColor: themeMode === 'dark' ? '#000' : '#fff' }}>
      <Text style={{ color: themeMode === 'dark' ? '#fff' : '#000' }}>
        Current theme: {themeMode}
      </Text>
      <Button title="Toggle Theme" onPress={() => dispatch(toggleTheme())} />
    </View>
  );
}
```

### Auto-sync with System Theme

The app automatically syncs with the device theme in `App.tsx`:

```typescript
import { useColorScheme } from 'react-native';
import { setTheme } from './redux/Action';

const deviceTheme = useColorScheme(); // 'light' | 'dark' | null

useEffect(() => {
  if (deviceTheme) {
    dispatch(setTheme(deviceTheme));
  }
}, [deviceTheme, dispatch]);
```

This ensures:
- Light → Dark mode: ✅ Synced
- Dark → Light mode: ✅ Synced
- Manual toggle: ✅ Works independently

## Action Types

| Action Type | Constant | Description |
|-------------|----------|-------------|
| `TOGGLE_THEME` | `'TOGGLE_THEME'` | Toggles between light and dark modes |
| `SET_THEME` | `'SET_THEME'` | Sets a specific theme mode |

## Reducer Logic

```typescript
switch (action.type) {
  case TOGGLE_THEME:
    // Switches between 'light' and 'dark'
    return { ...state, mode: state.mode === 'light' ? 'dark' : 'light' };
  
  case SET_THEME:
    // Sets to a specific mode
    return { ...state, mode: action.payload || 'dark' };
  
  default:
    return state;
}
```

## Persistence

Theme state is persisted using `redux-persist` with AsyncStorage:

```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['theme'], // Only theme is persisted
};
```

This means the user's theme preference is:
- Saved automatically on change
- Restored when the app is reopened
- Synced across app restarts

## Color Schemes

### Recommended Color Palette

```typescript
const colors = {
  dark: {
    background: '#0a0a0f',
    text: '#ffffff',
    primary: '#6366f1',
    secondary: '#8b5cf6',
  },
  light: {
    background: '#ffffff',
    text: '#0a0a0f',
    primary: '#4f46e5',
    secondary: '#7c3aed',
  },
};
```

### Using with StyleSheet

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkBg: {
    backgroundColor: '#0a0a0f',
  },
  lightBg: {
    backgroundColor: '#ffffff',
  },
  darkText: {
    color: '#ffffff',
  },
  lightText: {
    color: '#0a0a0f',
  },
});

// Usage
<View style={[styles.container, themeMode === 'dark' ? styles.darkBg : styles.lightBg]}>
  <Text style={themeMode === 'dark' ? styles.darkText : styles.lightText}>
    Hello World
  </Text>
</View>
```

## Best Practices

1. **Always check for hydration**: Wait for redux-persist to rehydrate before applying theme
2. **Use TypeScript**: Type your selectors and actions for better IDE support
3. **Consistent naming**: Use `themeMode` for the state value across components
4. **StatusBar sync**: Update StatusBar style when theme changes
5. **Test both modes**: Always test UI in both light and dark themes

## Troubleshooting

### Theme not persisting
- Check if `redux-persist` is properly configured
- Ensure `PersistGate` is wrapping your app
- Verify AsyncStorage permissions on Android

### Theme not syncing with system
- Check if `useColorScheme()` is being called
- Ensure the effect has proper dependencies: `[deviceTheme, dispatch]`
- Test by manually changing system theme in device settings

### Theme lag on app start
- Use the `isHydrated` state to wait for persistence rehydration
- Show a loading screen until theme is properly loaded

## Future Enhancements

- [ ] Support for custom color themes
- [ ] Schedule-based theme switching (e.g., auto-dark at night)
- [ ] Per-screen theme overrides
- [ ] Theme transition animations
- [ ] Accessibility contrast modes

## Related Files

- `App.tsx`: Main theme application and system sync logic
- `screens/LoadingScreen.tsx`: Theme-aware loading screen
- `package.json`: Dependencies (`redux`, `react-redux`, `redux-persist`)

## Dependencies

```json
{
  "react-redux": "^x.x.x",
  "redux": "^x.x.x",
  "redux-persist": "^x.x.x",
  "@react-native-async-storage/async-storage": "^x.x.x"
}
```

---

**Last Updated**: January 2026  
**Maintainer**: Brain Extension Team
