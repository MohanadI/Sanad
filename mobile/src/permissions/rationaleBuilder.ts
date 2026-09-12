import { PermissionId } from './types';
import { PERMISSION_DEFINITIONS } from './permissionRegistry';

export function buildPermissionRationaleArabic(permissionId: PermissionId): {
  title: string;
  rationale: string;
  spokenPrompt: string;
} {
  const def = PERMISSION_DEFINITIONS[permissionId];
  if (!def) {
    return {
      title: 'طلب إذن',
      rationale: 'يحتاج التطبيق إلى إذن للقيام بهذه العملية.',
      spokenPrompt: 'التطبيق يحتاج إلى إذن لمتابعة هذا الإجراء.',
    };
  }

  const title = `إذن ${def.nameArabic}`;
  const rationale = def.descriptionArabic;
  const spokenPrompt = `يحتاج سند إلى ${def.nameArabic} لمتابعة طلبك: ${def.descriptionArabic}. هل توافق على منح هذا الإذن؟`;

  return {
    title,
    rationale,
    spokenPrompt,
  };
}
