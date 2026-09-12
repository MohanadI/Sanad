import { AppRoute } from './types';
import { TranslationKey } from '../localization/types';

export interface RouteMeta {
  route: AppRoute;
  titleKey: TranslationKey;
  iconName?: string;
  isAccessibleMainTab: boolean;
}

export const APP_ROUTES: Record<AppRoute, RouteMeta> = {
  home: {
    route: 'home',
    titleKey: 'title_home',
    isAccessibleMainTab: true,
  },
  voice: {
    route: 'voice',
    titleKey: 'title_voice',
    isAccessibleMainTab: true,
  },
  confirm: {
    route: 'confirm',
    titleKey: 'title_confirm',
    isAccessibleMainTab: false,
  },
  aliases: {
    route: 'aliases',
    titleKey: 'title_aliases',
    isAccessibleMainTab: true,
  },
  permissions: {
    route: 'permissions',
    titleKey: 'title_permissions',
    isAccessibleMainTab: true,
  },
  settings: {
    route: 'settings',
    titleKey: 'title_settings',
    isAccessibleMainTab: true,
  },
  audit: {
    route: 'audit',
    titleKey: 'title_audit',
    isAccessibleMainTab: true,
  },
};
