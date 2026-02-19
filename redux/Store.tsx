/**
 * redux/Store.tsx
 *
 * Redux store configuration + post-creation wiring.
 *
 * Post-creation steps (order is critical):
 *  1. `injectStoreCallbacks` — gives the axios response interceptor the ability
 *     to dispatch `setTokens` and `signOut` without creating a circular import.
 *     Must be called before any API request is made.
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from './RootReducer';
import { injectStoreCallbacks } from '../api/httpClient';
import { setTokens, signOut } from '../store/auth/auth.slice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // 'auth' is excluded here because it has its own nested persistReducer
  // in RootReducer.tsx.  Adding it here would cause double-serialisation.
  whitelist: ['theme'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
      },
    }),
});

// ── Inject store callbacks into the axios interceptor ────────────────────────
// This MUST happen after `store` is created and before any API calls.
injectStoreCallbacks(
  (accessToken, refreshToken) => {
    store.dispatch(setTokens({ accessToken, refreshToken }));
  },
  () => {
    store.dispatch(signOut());
  },
);
// ─────────────────────────────────────────────────────────────────────────────

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;

export default store;
