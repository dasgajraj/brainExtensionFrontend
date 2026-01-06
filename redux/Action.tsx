import { TOGGLE_THEME, SET_THEME } from './Constant';

export const toggleTheme = () => ({
  type: TOGGLE_THEME,
});

export const setTheme = (theme: 'light' | 'dark') => ({
  type: SET_THEME,
  payload: theme,
});