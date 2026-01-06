import { TOGGLE_THEME, SET_THEME } from './Constant';

interface ThemeState {
  mode: 'light' | 'dark';
}

const initialState: ThemeState = {
  mode: 'dark',
};

interface ThemeAction {
  type: string;
  payload?: 'light' | 'dark';
}

const themeReducer = (state = initialState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case TOGGLE_THEME:
      return {
        ...state,
        mode: state.mode === 'light' ? 'dark' : 'light',
      };
    case SET_THEME:
      return {
        ...state,
        mode: action.payload || 'dark',
      };
    default:
      return state;
  }
};

export default themeReducer;