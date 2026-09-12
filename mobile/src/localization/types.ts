export type DialectLocale =
  | 'ar-PS-WestBank'
  | 'ar-PS-Gaza'
  | 'ar-PS-Jerusalem'
  | 'ar-STANDARD';

export interface DialectInfo {
  code: DialectLocale;
  nameArabic: string;
  nameEnglish: string;
  description: string;
}

export type TranslationKey =
  | 'app_name'
  | 'app_tagline'
  // Status & Greetings
  | 'greeting_morning'
  | 'greeting_evening'
  | 'status_ready'
  | 'status_listening'
  | 'status_thinking'
  | 'status_speaking'
  | 'status_offline'
  // Actions
  | 'action_listen'
  | 'action_stop'
  | 'action_cancel'
  | 'action_confirm'
  | 'action_deny'
  | 'action_retry'
  | 'action_save'
  | 'action_delete'
  | 'action_back'
  | 'action_purge_emergency'
  // Navigation
  | 'nav_home'
  | 'nav_voice'
  | 'nav_aliases'
  | 'nav_permissions'
  | 'nav_settings'
  | 'nav_audit'
  // Screen Titles
  | 'title_home'
  | 'title_voice'
  | 'title_aliases'
  | 'title_permissions'
  | 'title_settings'
  | 'title_audit'
  | 'title_confirm'
  // Confirmations
  | 'confirm_prompt_general'
  | 'confirm_affirmative'
  | 'confirm_negative'
  | 'confirm_cancel'
  | 'confirm_timeout_warning'
  | 'confirm_purge_prompt'
  | 'confirm_purge_success'
  // Aliases
  | 'alias_empty'
  | 'alias_add_new'
  | 'alias_name_label'
  | 'alias_contact_label'
  | 'alias_added_success'
  | 'alias_deleted_success'
  | 'alias_exists_overwrite_prompt'
  // Permissions & Tiers
  | 'perm_tier1_feature_gate'
  | 'perm_tier2_user_consent'
  | 'perm_tier3_os_runtime'
  | 'perm_tier4_action_challenge'
  | 'perm_status_granted'
  | 'perm_status_denied'
  | 'perm_status_blocked'
  | 'perm_btn_grant'
  | 'perm_btn_revoke'
  // Capability Gates (Arabic Explanations)
  | 'gate_call_disabled'
  | 'gate_sms_disabled'
  | 'gate_location_disabled'
  | 'gate_calendar_disabled'
  | 'gate_emergency_disabled'
  // Earcon Descriptions for Screen Readers
  | 'earcon_desc_listening_start'
  | 'earcon_desc_thinking'
  | 'earcon_desc_confirm'
  | 'earcon_desc_success'
  | 'earcon_desc_cancelled'
  | 'earcon_desc_error'
  | 'earcon_desc_emergency_countdown'
  // Emergency Workflow
  | 'emergency_countdown_start'
  | 'emergency_cancelled'
  | 'emergency_dispatched'
  // Location Privacy Guard (SEC-P2-02)
  | 'location_privacy_warning'
  | 'location_privacy_earcon'
  // Accessibility Hints
  | 'a11y_hint_double_tap_listen'
  | 'a11y_hint_cancel_current'
  | 'a11y_hint_screen_curtain'
  | 'a11y_hint_purge_emergency'
  | 'a11y_live_screen_changed'
  | 'a11y_screen_curtain_active'
  | 'a11y_screen_curtain_inactive'
  // Errors
  | 'error_general'
  | 'error_network'
  | 'error_unrecognized_intent'
  | 'error_unauthorized'
  | 'error_token_expired';

export type Translations = Record<TranslationKey, string>;
