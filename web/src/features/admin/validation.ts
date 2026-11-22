import * as Yup from 'yup';
import {isEmail} from '@/lib/validators';

// Yup schemas of the admin forms. Messages are i18n keys: forms show them
// with t(error). The same rules as the backend (adminService).

export const MAX_POINTS = 1000;
export const MAX_ORDER = 9999;

const PHONE_PATTERN = /^[0-9+\s().-]{6,20}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;

const fullname = Yup.string()
  .trim()
  .required('admin.users.errors.fullnameRequired')
  .max(100, 'admin.users.errors.fullnameLong');

const email = Yup.string()
  .trim()
  .required('admin.users.errors.emailRequired')
  .test('email', 'admin.users.errors.emailInvalid', value => !value || isEmail(value));

const phone = Yup.string()
  .trim()
  .test('phone', 'admin.users.errors.phoneInvalid', value => !value || PHONE_PATTERN.test(value));

const role = Yup.string().oneOf(['user', 'admin']).required();

export const userSchema = Yup.object({fullname, email, phone, role});

export const createUserSchema = userSchema.shape({
  username: Yup.string()
    .trim()
    .required('admin.users.errors.usernameInvalid')
    .matches(USERNAME_PATTERN, 'admin.users.errors.usernameInvalid'),
  password: Yup.string().required('admin.users.errors.passwordShort').min(8, 'admin.users.errors.passwordShort'),
});

export const challengeSchema = Yup.object({
  name: Yup.string().trim().required('admin.challenges.errors.nameRequired'),
  summary: Yup.string(),
  points: Yup.number()
    .typeError('admin.challenges.errors.points')
    .integer('admin.challenges.errors.points')
    .min(0, 'admin.challenges.errors.points')
    .max(MAX_POINTS, 'admin.challenges.errors.points')
    .required('admin.challenges.errors.points'),
});

export const announcementSchema = Yup.object({
  title: Yup.string().trim().required('admin.notifications.errors.titleRequired'),
  message: Yup.string(),
  status: Yup.string().oneOf(['draft', 'published']).required(),
  publishAt: Yup.string().test(
    'date',
    'admin.notifications.errors.dateInvalid',
    value => !Number.isNaN(new Date(value ?? '').getTime()),
  ),
});

export const videoSchema = Yup.object({
  title: Yup.string().trim().required('admin.videos.errors.titleRequired'),
  location: Yup.string(),
  youtubeLink: Yup.string()
    .trim()
    .test('link', 'admin.videos.errors.linkInvalid', value => !value || URL_PATTERN.test(value)),
  duration: Yup.number()
    .typeError('admin.videos.errors.duration')
    .integer('admin.videos.errors.duration')
    .min(0, 'admin.videos.errors.duration')
    .required('admin.videos.errors.duration'),
  status: Yup.string().required(),
  showOnHome: Yup.boolean(),
});

export const showcaseSchema = Yup.object({
  imageUrl: Yup.string().required('admin.showcase.errors.imageRequired'),
  title: Yup.string().max(200),
  location: Yup.string().max(200),
  sortOrder: Yup.number()
    .typeError('admin.showcase.errors.order')
    .integer('admin.showcase.errors.order')
    .min(0, 'admin.showcase.errors.order')
    .max(MAX_ORDER, 'admin.showcase.errors.order')
    .required('admin.showcase.errors.order'),
  status: Yup.string().required(),
});

export const settingsSchema = Yup.object({
  appName: Yup.string().trim().required('admin.settings.errors.appName'),
  supportEmail: Yup.string()
    .trim()
    .test('email', 'admin.settings.errors.email', value => !value || isEmail(value)),
  hotline: Yup.string()
    .trim()
    .test('hotline', 'admin.settings.errors.hotline', value => !value || /^[0-9+().\s-]+$/.test(value)),
});
