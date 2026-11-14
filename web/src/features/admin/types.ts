import type {Role} from '@/features/auth/types';

// Shapes of the admin panel data. They follow the MongoDB models of the
// backend (backend/src/models) so the mock data can be swapped for API calls.

export type AdminTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

// User.isActive: "notActive" = email not confirmed yet, "suspended" = blocked by an admin
export type UserStatus = 'active' | 'notActive' | 'suspended' | 'delete';

export interface AdminUser {
  id: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  image: string;
  city: string;
  role: Role;
  status: UserStatus;
  // why an admin suspended the account (status "suspended")
  suspendReason: string;
  suspendedAt: string | null;
  level: number;
  experience: number;
  createdAt: string;
  // last sign-in, null until the user signs in
  lastActiveAt: string | null;
  totalTrips: number;
  completedTrips: number;
  challengesJoined: number;
  challengesCompleted: number;
}

export interface AdminUserChallenge {
  id: string;
  name: string;
  location: string;
  points: number;
  completed: boolean;
  joinedAt: string | null;
  completedAt: string | null;
}

export interface AdminUserActivity {
  id: string;
  at: string;
  action: string;
  target: string;
  level: LogLevel;
}

// GET /admin/users/:id
export interface AdminUserDetail {
  user: AdminUser;
  aiConversations: number;
  trips: AdminTrip[];
  challenges: AdminUserChallenge[];
  activity: AdminUserActivity[];
}

// Fields an admin may change (PATCH /admin/users/:id)
export interface AdminUserUpdate {
  fullname?: string;
  email?: string;
  phone?: string;
  role?: Role;
  status?: 'active' | 'suspended' | 'delete';
  suspendReason?: string;
  // URL of an uploaded photo
  image?: string;
}

// POST /admin/users: an account that is active at once
export interface AdminUserCreate {
  fullname: string;
  username: string;
  email: string;
  phone?: string;
  role: Role;
  password: string;
}

export interface AdminTripDay {
  id: string;
  day: number;
  date: string | null;
  title: string;
  imageUrl: string;
  cost: number;
}

// GET /admin/trips/:id
export interface AdminTripDetail extends AdminTrip {
  ownerId: string;
  // the plan day by day (`days` is how many)
  plan: AdminTripDay[];
}

// TripPlan.status
export type TripStatus = 'active' | 'delete';
export type TripPhase = 'upcoming' | 'ongoing' | 'completed';

export interface AdminTrip {
  id: string;
  nameTrip: string;
  location: string;
  owner: string;
  // cover photo, "" when the trip has none
  imageUrl?: string;
  // when the plan was saved
  createdAt?: string | null;
  // by the dates of the trip
  phase?: TripPhase;
  startDate: string;
  endDate: string;
  days: number;
  transportCostTotal: number;
  foodCostTotal: number;
  otherCostTotal: number;
  challenges: number;
  status: TripStatus;
}

export interface AdminChallenge {
  id: string;
  nameLocation: string;
  location: string;
  province: string;
  points: number;
  challengeSummary: string;
  participants: number;
  completed: number;
}

export interface AdminAiChat {
  id: string;
  title: string;
  user: string;
  messages: number;
  updatedAt: string;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Metric {
  value: number;
  // change against the previous period, as a ratio (0.12 = +12 %); missing when there is no comparison
  delta?: number;
}

export interface AdminAiOverview {
  stats: {conversations: Metric; messages: Metric; activeUsers: Metric; avgMessages: Metric};
  dailyMessages: SeriesPoint[];
  chats: AdminAiChat[];
}

export type VideoStatus = 'published' | 'hidden';

export interface AdminVideo {
  id: string;
  title: string;
  location: string;
  youtubeLink: string;
  // direct file URL (optional)
  src: string;
  durationSec: number;
  views: number;
  showOnHome: boolean;
  status: VideoStatus;
  createdAt: string;
}

// Body of POST / PATCH /admin/videos
export type AdminVideoInput = Partial<
  Pick<AdminVideo, 'title' | 'location' | 'youtubeLink' | 'src' | 'durationSec' | 'showOnHome' | 'status'>
>;

// Picture of the home page of the app (the slider, or a destination suggestion)
export type ShowcaseKind = 'banner' | 'suggestion';
export type ShowcaseStatus = 'published' | 'hidden';

export interface AdminShowcase {
  id: string;
  kind: ShowcaseKind;
  title: string;
  location: string;
  imageUrl: string;
  status: ShowcaseStatus;
  sortOrder: number;
  createdAt: string;
}

export type AdminShowcaseInput = Partial<Pick<AdminShowcase, 'kind' | 'title' | 'location' | 'imageUrl' | 'status' | 'sortOrder'>>;

// Announcement: written by an admin, shown in the notifications screen of the app
export type AnnouncementStatus = 'draft' | 'published';
// what the admin sees: a published announcement with a future date is "scheduled"
export type CampaignStatus = 'sent' | 'scheduled' | 'draft';

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  status: AnnouncementStatus;
  publishAt: string;
  createdAt: string;
}

export type AdminAnnouncementInput = Partial<Pick<AdminAnnouncement, 'title' | 'message' | 'status' | 'publishAt'>>;

export type LogLevel = 'info' | 'warning' | 'error';
export type LogAction =
  | 'login'
  | 'register'
  | 'useAi'
  | 'createUser'
  | 'createTrip'
  | 'deleteTrip'
  | 'completeChallenge'
  | 'updateProfile'
  | 'deleteUser'
  | 'restoreUser'
  | 'suspendUser'
  | 'updateUser'
  | 'changeRole'
  | 'updateChallenge'
  | 'manageVideo'
  | 'manageShowcase'
  | 'manageAnnouncement'
  | 'moderate'
  | 'updateSettings';

export interface AdminActivityLog {
  id: string;
  at: string;
  actor: string;
  action: LogAction;
  target: string;
  ip: string;
  level: LogLevel;
}

export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type ModerationType = 'challengePhoto' | 'chatMessage' | 'profile' | 'video';
export type ModerationReason = 'spam' | 'inappropriate' | 'wrongLocation' | 'copyright';

export interface AdminModerationItem {
  id: string;
  type: ModerationType;
  reason: ModerationReason;
  content: string;
  author: string;
  reportedAt: string;
  status: ModerationStatus;
}

// Bell menu of the admin header
export type AdminAlertType = 'newUsers' | 'pendingModeration' | 'aiErrors' | 'reportReady';

export interface AdminAlert {
  id: string;
  type: AdminAlertType;
  count: number;
  at: string;
  read?: boolean;
}

export interface AdminDashboard {
  stats: {users: Metric; trips: Metric; challengesCompleted: Metric; aiChats: Metric};
  // first day of each month
  newUsers: SeriesPoint[];
  topDestinations: {name: string; trips: number}[];
}

export type ReportPeriod = '7d' | '30d' | '90d';

export interface AdminReport {
  stats: {newUsers: Metric; tripsCreated: Metric; completionRate: Metric; avgTripCost: Metric};
  tripsCreated: SeriesPoint[];
  provinces: {name: string; trips: number; avgCost: number}[];
}

export type Permission =
  | 'planTrips'
  | 'chatAi'
  | 'completeChallenges'
  | 'viewRanking'
  | 'deleteOwnAccount'
  | 'deleteAnyAccount'
  | 'manageContent'
  | 'moderate'
  | 'viewReports'
  | 'manageSettings';

// Settings the app reads (GET /settings) and the admin edits (PUT /admin/settings)
export interface AdminSettings {
  appName: string;
  supportEmail: string;
  hotline: string;
}

// GET /admin/roles
export interface AdminRoles {
  members: Record<Role, number>;
  permissions: {permission: Permission; roles: Role[]}[];
}
