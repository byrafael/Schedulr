/**
 * Admin User IDs
 *
 * This array contains Clerk user IDs that have admin access.
 * Add user IDs here to grant admin privileges.
 */
export const ADMIN_USER_IDS: string[] = [
  // Add Clerk user IDs here, e.g.:
  // "user_2abc123def456",
  "user_37rDCIE3wIJqCrq7tu6NJsb1LXa",
];

/**
 * Check if a user ID has admin privileges
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}
