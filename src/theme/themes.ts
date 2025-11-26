/**
 * Système de thème avec support dark mode
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  success: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  warning: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  error: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  info: {
    main: string;
    light: string;
    dark: string;
    contrast: string;
  };
  background: {
    default: string;
    paper: string;
    dark: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    hint: string;
  };
  border: {
    light: string;
    main: string;
    dark: string;
  };
}

export const lightTheme: ThemeColors = {
  primary: {
    main: '#0a7ea4',
    light: '#3d9fc4',
    dark: '#075a7a',
    contrast: '#ffffff',
  },
  secondary: {
    main: '#6c757d',
    light: '#adb5bd',
    dark: '#495057',
    contrast: '#ffffff',
  },
  success: {
    main: '#28a745',
    light: '#5cb85c',
    dark: '#1e7e34',
    contrast: '#ffffff',
  },
  warning: {
    main: '#ffc107',
    light: '#ffd54f',
    dark: '#f57c00',
    contrast: '#000000',
  },
  error: {
    main: '#dc3545',
    light: '#e57373',
    dark: '#c62828',
    contrast: '#ffffff',
  },
  info: {
    main: '#17a2b8',
    light: '#4dd0e1',
    dark: '#0d7377',
    contrast: '#ffffff',
  },
  background: {
    default: '#f8f9fa',
    paper: '#ffffff',
    dark: '#212529',
  },
  text: {
    primary: '#212529',
    secondary: '#6c757d',
    disabled: '#adb5bd',
    hint: '#868e96',
  },
  border: {
    light: '#dee2e6',
    main: '#ced4da',
    dark: '#adb5bd',
  },
};

export const darkTheme: ThemeColors = {
  primary: {
    main: '#3d9fc4',
    light: '#5fb8d6',
    dark: '#0a7ea4',
    contrast: '#ffffff',
  },
  secondary: {
    main: '#adb5bd',
    light: '#ced4da',
    dark: '#6c757d',
    contrast: '#ffffff',
  },
  success: {
    main: '#5cb85c',
    light: '#7dd87d',
    dark: '#28a745',
    contrast: '#ffffff',
  },
  warning: {
    main: '#ffd54f',
    light: '#ffe082',
    dark: '#ffc107',
    contrast: '#000000',
  },
  error: {
    main: '#e57373',
    light: '#ef9a9a',
    dark: '#dc3545',
    contrast: '#ffffff',
  },
  info: {
    main: '#4dd0e1',
    light: '#80deea',
    dark: '#17a2b8',
    contrast: '#ffffff',
  },
  background: {
    default: '#121212',
    paper: '#1e1e1e',
    dark: '#0a0a0a',
  },
  text: {
    primary: '#ffffff',
    secondary: '#b0b0b0',
    disabled: '#707070',
    hint: '#909090',
  },
  border: {
    light: '#333333',
    main: '#404040',
    dark: '#555555',
  },
};

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

