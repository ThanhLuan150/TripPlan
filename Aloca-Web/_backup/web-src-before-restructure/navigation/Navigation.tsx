import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import {routes} from './routes';
import {getUser} from '../Helper/storage';
import MainLayout from './MainLayout';
import AssistanceLayout from './AssistanceLayout';
import LandingPage from '../components/management_Account/LandingPage';
import Login from '../components/management_Account/Login';
import Registration from '../components/management_Account/Registration';
import ForgotPassword from '../components/management_Account/ForgotPassword';
import VerifyAccount from '../components/management_Account/VerifyAccount';
import RefreshVerifyCode from '../components/management_Account/RefreshVerifyCode';
import NewPassword from '../components/management_Account/NewPassword';
import EditProfile from '../components/management_Account/EditProfile';
import Notification from '../components/management_Account/Notification';
import VideoTravel from '../components/shortVideo/VideoTravel';
import WhatAloca from '../components/contentAloca/WhatAloca';
import Benefit from '../components/contentAloca/Benefit';
import HomeScreens from '../screens/HomeScreens';
import RankingScreen from '../screens/RankingScreen';
import ProfileScreens from '../screens/ProfileScreens';
import {TripPlanScreen} from '../screens/TripPlannersStack/AddNewTripPlanScreen';
import {TripPlanChoose} from '../screens/TripPlannersStack/CreateTripPlanScreen';
import {GenerateTripsScreen} from '../screens/TripPlannersStack/GenerateTripsScreen';
import {DetailTripScreen} from '../screens/TripPlannersStack/DetailTripScreen';
import {MapScreen} from '../screens/MapsScreen';

function RequireAuth() {
  const location = useLocation();
  if (!getUser()) {
    return <Navigate to={routes.Login} replace state={{from: location}} />;
  }
  return <Outlet />;
}

export default function Navigation() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.LandingPage} element={<LandingPage />} />
        <Route path={routes.Login} element={<Login />} />
        <Route path={routes.Registration} element={<Registration />} />
        <Route path={routes.ForgotPassword} element={<ForgotPassword />} />
        <Route path={routes.VerifyAccount} element={<VerifyAccount />} />
        <Route
          path={routes.RefreshVerifyCode}
          element={<RefreshVerifyCode />}
        />
        <Route path={routes.NewPassword} element={<NewPassword />} />

        <Route element={<RequireAuth />}>
          <Route element={<MainLayout />}>
            <Route path={routes.Home} element={<HomeScreens />} />
            <Route path={routes.Assistant} element={<AssistanceLayout />}>
              <Route index element={<Navigate to="chat" replace />} />
              {/* ChatScreen is rendered by AssistanceLayout so it stays mounted */}
              <Route path="chat" element={null} />
              <Route path="trips" element={<TripPlanScreen />} />
              <Route path="trips/new" element={<TripPlanChoose />} />
              <Route path="trips/generate" element={<GenerateTripsScreen />} />
              <Route path="trips/:idTrip" element={<DetailTripScreen />} />
              <Route path="trips/:idTrip/map" element={<MapScreen />} />
            </Route>
            <Route path={routes.Ranking} element={<RankingScreen />} />
            <Route path={routes.Profile} element={<ProfileScreens />} />
          </Route>
          <Route path={routes.Editprofile} element={<EditProfile />} />
          <Route path={routes.Notification} element={<Notification />} />
          <Route path={routes.VideoTravel} element={<VideoTravel />} />
          <Route path={routes.WhatAloca} element={<WhatAloca />} />
          <Route path={routes.Benefit} element={<Benefit />} />
        </Route>

        <Route path="*" element={<Navigate to={routes.LandingPage} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
