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
  Ranking: '/ranking', // 'Xếp hạng'
  Profile: '/profile', // 'Tài khoản'
  // stack screens without the tab bar
  Editprofile: '/profile/edit',
  Notification: '/notification',
  VideoTravel: '/videos',
  WhatAloca: '/what-aloca',
  Benefit: '/benefit',
} as const;
