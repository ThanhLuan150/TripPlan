import {Platform, ViewStyle} from 'react-native';

// Colours of the original Aloca app: white screens, teal (#2AB6AD) accents.
export const colors = {
  primary: '#2AB6AD',
  primaryLight: '#3FCBC1',
  primaryDark: '#1F928B',
  primaryDeep: '#1C5D5A',
  tabBar: '#D0FFF9',
  tint: '#EFFDFB',
  light: '#E0F7FA',
  bg: '#FFFFFF',
  surface: '#F6F8FA',
  card: '#FFFFFF',
  text: '#111827',
  body: '#374151',
  label: '#3E4958',
  muted: '#6B7280',
  faint: '#9CA3AF',
  border: '#E5E7EB',
  dark: '#37474F',
  danger: '#FF5858',
  error: '#E11D48',
  success: '#16A34A',
  warning: '#F59E0B',
};

// Brand gradient (buttons, headers).
export const gradient = ['#3FCBC1', '#2AB6AD', '#1F928B'];

export const radius = {sm: 10, md: 14, lg: 20, pill: 999};

// Background of every screen.
export const screen = {backgroundColor: colors.bg} as const;

// Soft card shadow.
export const shadow: ViewStyle = Platform.select({
  android: {elevation: 3, shadowColor: '#0F172A'},
  default: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
}) as ViewStyle;

// Teal glow under primary buttons.
export const shadowLift: ViewStyle = Platform.select({
  android: {elevation: 6, shadowColor: colors.primaryDark},
  default: {
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
}) as ViewStyle;
