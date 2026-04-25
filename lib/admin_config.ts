/**
 * Shared admin configuration utilities.
 * This file can be used in both Client and Server components.
 */

export function getAdminEmails(): string[] {
  // Prioritize ADMIN_ACCESS (server-only) then NEXT_PUBLIC_ADMIN_ACCESS (client/server)
  const adminAccess = process.env.ADMIN_ACCESS || process.env.NEXT_PUBLIC_ADMIN_ACCESS || '';
    
  return adminAccess
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}
