/**
 * Default technician avatar — single source of truth.
 *
 * Used everywhere a technician picture is displayed so that technicians
 * without a photo get the same harmonized placeholder instead of
 * ad-hoc initials / Camera / User icons.
 */
export const DEFAULT_TECHNICIAN_AVATAR = '/avatars/technician-default.svg';

/** Returns the technician avatar URL or the default placeholder. */
export function technicianAvatarUrl(url?: string | null): string {
  const u = url?.trim();
  return u ? u : DEFAULT_TECHNICIAN_AVATAR;
}

/**
 * Attach to <img onError> to swap a broken technician photo for the default.
 * Guards against infinite loops if the default itself fails to load.
 */
export function onTechnicianAvatarError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.endsWith(DEFAULT_TECHNICIAN_AVATAR)) {
    img.src = DEFAULT_TECHNICIAN_AVATAR;
  }
}
