import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {routerFuture, routes} from './routes';
import RequireAuth from './RequireAuth';
import MainLayout from '@/components/layout/MainLayout';
import AssistantLayout from '@/components/layout/AssistantLayout';
import LandingPage from '@/features/auth/pages/LandingPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import VerifyAccountPage from '@/features/auth/pages/VerifyAccountPage';
import ResetCodePage from '@/features/auth/pages/ResetCodePage';
import NewPasswordPage from '@/features/auth/pages/NewPasswordPage';
import HomePage from '@/features/home/pages/HomePage';
import TripListPage from '@/features/trips/pages/TripListPage';
import CreateTripPage from '@/features/trips/pages/CreateTripPage';
import GenerateTripsPage from '@/features/trips/pages/GenerateTripsPage';
import TripDetailPage from '@/features/trips/pages/TripDetailPage';
import TripMapPage from '@/features/trips/pages/TripMapPage';
import RankingPage from '@/features/ranking/pages/RankingPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import EditProfilePage from '@/features/profile/pages/EditProfilePage';
import NotificationsPage from '@/features/profile/pages/NotificationsPage';
import VideosPage from '@/features/videos/pages/VideosPage';
import WhatAlocaPage from '@/features/about/pages/WhatAlocaPage';
import BenefitPage from '@/features/about/pages/BenefitPage';

export default function AppRouter() {
  return (
    <BrowserRouter future={routerFuture}>
      <Routes>
        {/* public */}
        <Route path={routes.LandingPage} element={<LandingPage />} />
        <Route path={routes.Login} element={<LoginPage />} />
        <Route path={routes.Registration} element={<RegisterPage />} />
        <Route path={routes.ForgotPassword} element={<ForgotPasswordPage />} />
        <Route path={routes.VerifyAccount} element={<VerifyAccountPage />} />
        <Route path={routes.RefreshVerifyCode} element={<ResetCodePage />} />
        <Route path={routes.NewPassword} element={<NewPasswordPage />} />

        {/* signed in (any role) */}
        <Route element={<RequireAuth />}>
          <Route element={<MainLayout />}>
            <Route path={routes.Home} element={<HomePage />} />
            <Route path={routes.Assistant} element={<AssistantLayout />}>
              <Route index element={<Navigate to="chat" replace />} />
              {/* the chat is rendered by AssistantLayout so it stays mounted */}
              <Route path="chat" element={null} />
              <Route path="trips" element={<TripListPage />} />
              <Route path="trips/new" element={<CreateTripPage />} />
              <Route path="trips/generate" element={<GenerateTripsPage />} />
              <Route path="trips/:idTrip" element={<TripDetailPage />} />
              <Route path="trips/:idTrip/map" element={<TripMapPage />} />
            </Route>
            <Route path={routes.Ranking} element={<RankingPage />} />
            <Route path={routes.Profile} element={<ProfilePage />} />
          </Route>
          <Route path={routes.Editprofile} element={<EditProfilePage />} />
          <Route path={routes.Notification} element={<NotificationsPage />} />
          <Route path={routes.VideoTravel} element={<VideosPage />} />
          <Route path={routes.WhatAloca} element={<WhatAlocaPage />} />
          <Route path={routes.Benefit} element={<BenefitPage />} />
        </Route>

        <Route path="*" element={<Navigate to={routes.LandingPage} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
