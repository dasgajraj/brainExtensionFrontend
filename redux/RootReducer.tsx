/**
 * redux/RootReducer.tsx
 *
 * Combines all slice reducers into a single root reducer.
 *
 * Auth persistence strategy (nested persistReducer):
 *  - The auth sub-reducer has its OWN persistConfig so we can whitelist
 *    only the fields that should survive an app restart:
 *      user, isAuthenticated, displayName, flowStep
 *  - Excluded from persistence:
 *      accessToken   → lives in AsyncStorage via token.service.ts
 *      refreshToken  → idem
 *      status        → always reset to idle on restart
 *      errorMessage  → always reset
 *      backendReady  → re-established by bootstrapThunk on every start
 *      tempUserIdentifier → reset to be safe
 *
 * The outer persistConfig (in Store.tsx) keeps only 'theme' in the whitelist
 * because auth now manages its own persist layer here.
 */

import { combineReducers } from 'redux';
import { persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import themeReducer from './ThemeReducer';
import authReducer from '../store/auth/auth.slice';

// ── Nested persist config for auth ───────────────────────────────────────────
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'isAuthenticated', 'displayName', 'flowStep', 'verifyPurpose'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

// ── Root reducer ─────────────────────────────────────────────────────────────
const rootReducer = combineReducers({
  theme: themeReducer,
  auth: persistedAuthReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
