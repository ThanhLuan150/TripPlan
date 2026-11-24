// Mobile screen name -> web path.
export const routes = {
  LandingPage: '/',
  Login: '/login',
  Registration: '/registration',
  ForgotPassword: '/forgot-password',
  VerifyAccount: '/verify-account',
  RefreshVerifyCode: '/refresh-verify-code',
  NewPassword: '/new-password',
  // bottom tabs ("Homestack")
  Home: '/home', // 'Trang chủ'
  Assistant: '/assistant', // 'Trợ lý'
  Chat: '/assistant/chat',
  AddNewTrip: '/assistant/trips',
  TripPlanChoose: '/assistant/trips/new',
  GenerateTripsScreen: '/assistant/trips/generate',
  DetailTripScreen: (idTrip: string) => `/assistant/trips/${idTrip}`,
  MapScreen: (idTrip: string) => `/assistant/trips/${idTrip}/map`,
  SharedTrip: (token: string) => `/shared/${token}`, // public, read only
  Ranking: '/ranking', // 'Xếp hạng'
  Profile: '/profile', // 'Tài khoản'
  // stack screens without the tab bar
  Editprofile: '/profile/edit',
  Notification: '/notification',
  VideoTravel: '/videos',
  WhatAloca: '/what-aloca',
  Benefit: '/benefit',
} as const;

// Admin panel (web only, role "admin"): features/admin, loaded on demand.
export const adminRoutes = {
  root: '/admin',
  dashboard: '/admin/dashboard',
  users: '/admin/users',
  user: (id: string) => `/admin/users/${id}`,
  trips: '/admin/trips',
  challenges: '/admin/challenges',
  ai: '/admin/ai',
  videos: '/admin/videos',
  home: '/admin/home',
  notifications: '/admin/notifications',
  reports: '/admin/reports',
  settings: '/admin/settings',
  activityLogs: '/admin/activity-logs',
  moderation: '/admin/moderation',
  roles: '/admin/roles',
} as const;

