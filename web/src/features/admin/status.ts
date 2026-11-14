import type {Role} from '@/features/auth/types';
import type {
  AdminAlertType,
  AdminTone,
  CampaignStatus,
  LogAction,
  LogLevel,
  ModerationReason,
  ModerationStatus,
  ModerationType,
  Permission,
  TripPhase,
  TripStatus,
  UserStatus,
  VideoStatus,
} from './types';

// Translation key (and badge tone) of every enum value shown in the admin
// panel. Written out in full so the locale tests can check each key.

interface Badge {
  tone: AdminTone;
  labelKey: string;
}

export const roleBadge: Record<Role, Badge> = {
  admin: {tone: 'brand', labelKey: 'admin.roles.admin'},
  user: {tone: 'neutral', labelKey: 'admin.roles.user'},
};

export const userStatusBadge: Record<UserStatus, Badge> = {
  active: {tone: 'success', labelKey: 'admin.status.active'},
  notActive: {tone: 'warning', labelKey: 'admin.status.notActive'},
  suspended: {tone: 'danger', labelKey: 'admin.status.suspended'},
  delete: {tone: 'danger', labelKey: 'admin.status.deleted'},
};

export const tripStatusBadge: Record<TripStatus, Badge> = {
  active: {tone: 'success', labelKey: 'admin.status.active'},
  delete: {tone: 'danger', labelKey: 'admin.status.deleted'},
};

export const tripPhaseBadge: Record<TripPhase, Badge> = {
  upcoming: {tone: 'info', labelKey: 'admin.users.trips.phase.upcoming'},
  ongoing: {tone: 'brand', labelKey: 'admin.users.trips.phase.ongoing'},
  completed: {tone: 'success', labelKey: 'admin.users.trips.phase.completed'},
};

export const videoStatusBadge: Record<VideoStatus, Badge> = {
  published: {tone: 'success', labelKey: 'admin.status.published'},
  hidden: {tone: 'neutral', labelKey: 'admin.status.hidden'},
};

export const campaignStatusBadge: Record<CampaignStatus, Badge> = {
  sent: {tone: 'success', labelKey: 'admin.status.sent'},
  scheduled: {tone: 'info', labelKey: 'admin.status.scheduled'},
  draft: {tone: 'neutral', labelKey: 'admin.status.draft'},
};

export const logLevelBadge: Record<LogLevel, Badge> = {
  info: {tone: 'info', labelKey: 'admin.status.info'},
  warning: {tone: 'warning', labelKey: 'admin.status.warning'},
  error: {tone: 'danger', labelKey: 'admin.status.error'},
};

export const moderationStatusBadge: Record<ModerationStatus, Badge> = {
  pending: {tone: 'warning', labelKey: 'admin.status.pending'},
  approved: {tone: 'success', labelKey: 'admin.status.approved'},
  rejected: {tone: 'danger', labelKey: 'admin.status.rejected'},
};

export const logActionLabel: Record<LogAction, string> = {
  login: 'admin.activityLogs.actions.login',
  register: 'admin.activityLogs.actions.register',
  useAi: 'admin.activityLogs.actions.useAi',
  createUser: 'admin.activityLogs.actions.createUser',
  createTrip: 'admin.activityLogs.actions.createTrip',
  deleteTrip: 'admin.activityLogs.actions.deleteTrip',
  completeChallenge: 'admin.activityLogs.actions.completeChallenge',
  updateProfile: 'admin.activityLogs.actions.updateProfile',
  deleteUser: 'admin.activityLogs.actions.deleteUser',
  restoreUser: 'admin.activityLogs.actions.restoreUser',
  suspendUser: 'admin.activityLogs.actions.suspendUser',
  updateUser: 'admin.activityLogs.actions.updateUser',
  changeRole: 'admin.activityLogs.actions.changeRole',
  updateChallenge: 'admin.activityLogs.actions.updateChallenge',
  manageVideo: 'admin.activityLogs.actions.manageVideo',
  manageShowcase: 'admin.activityLogs.actions.manageShowcase',
  manageAnnouncement: 'admin.activityLogs.actions.manageAnnouncement',
  moderate: 'admin.activityLogs.actions.moderate',
  updateSettings: 'admin.activityLogs.actions.updateSettings',
};

export const moderationTypeLabel: Record<ModerationType, string> = {
  challengePhoto: 'admin.moderation.types.challengePhoto',
  chatMessage: 'admin.moderation.types.chatMessage',
  profile: 'admin.moderation.types.profile',
  video: 'admin.moderation.types.video',
};

export const moderationReasonLabel: Record<ModerationReason, string> = {
  spam: 'admin.moderation.reasons.spam',
  inappropriate: 'admin.moderation.reasons.inappropriate',
  wrongLocation: 'admin.moderation.reasons.wrongLocation',
  copyright: 'admin.moderation.reasons.copyright',
};

export const permissionLabel: Record<Permission, string> = {
  planTrips: 'admin.rolesPage.permissions.planTrips',
  chatAi: 'admin.rolesPage.permissions.chatAi',
  completeChallenges: 'admin.rolesPage.permissions.completeChallenges',
  viewRanking: 'admin.rolesPage.permissions.viewRanking',
  deleteOwnAccount: 'admin.rolesPage.permissions.deleteOwnAccount',
  deleteAnyAccount: 'admin.rolesPage.permissions.deleteAnyAccount',
  manageContent: 'admin.rolesPage.permissions.manageContent',
  moderate: 'admin.rolesPage.permissions.moderate',
  viewReports: 'admin.rolesPage.permissions.viewReports',
  manageSettings: 'admin.rolesPage.permissions.manageSettings',
};

export const alertLabel: Record<AdminAlertType, string> = {
  newUsers: 'admin.layout.alerts.newUsers',
  pendingModeration: 'admin.layout.alerts.pendingModeration',
  aiErrors: 'admin.layout.alerts.aiErrors',
  reportReady: 'admin.layout.alerts.reportReady',
};

// select options from one of the maps above
export const optionsOf = <K extends string>(
  map: Record<K, Badge | string>,
  t: (key: string) => string,
) =>
  (Object.keys(map) as K[]).map(value => {
    const entry = map[value];
    return {value, label: t(typeof entry === 'string' ? entry : entry.labelKey)};
  });
