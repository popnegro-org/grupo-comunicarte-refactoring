export interface AdminAuthEnvironment {
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_PASSWORD_HASH?: string;
  JWT_SECRET?: string;
  ADMIN_SECRET?: string;
}

/**
 * Admin credentials are required only by protected admin routes.
 * Public routes (health, contact and the public catalog) must remain
 * bootable when the admin dashboard is intentionally disabled.
 */
export function hasAdminAuthConfiguration(env: AdminAuthEnvironment): boolean {
  return Boolean(
    env.ADMIN_USER?.trim() &&
    (env.ADMIN_PASSWORD || env.ADMIN_PASSWORD_HASH) &&
    (env.JWT_SECRET || env.ADMIN_SECRET),
  );
}
