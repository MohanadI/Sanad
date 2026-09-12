export type AppRoute =
  | 'home'
  | 'voice'
  | 'confirm'
  | 'aliases'
  | 'permissions'
  | 'settings'
  | 'audit';

export interface ConfirmationRouteParams {
  confirmationToken: string;
  promptArabic: string;
  onConfirmed: () => Promise<void>;
  onCancelled: () => void;
  timeoutSeconds?: number;
}

export interface NavigationState {
  currentRoute: AppRoute;
  previousRoute: AppRoute | null;
  params?: Record<string, unknown>;
}

export interface NavigationContextValue {
  state: NavigationState;
  navigate: (route: AppRoute, params?: Record<string, unknown>) => void;
  goBack: () => void;
}
