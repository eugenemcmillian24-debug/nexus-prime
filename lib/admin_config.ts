/**
 * Shared admin configuration utilities.
 * This file can be used in both Client and Server components.
 */

export function getAdminEmails(): string[] {
  // Use NEXT_PUBLIC_ prefix for client-side access. 
  // In server environments, process.env.ADMIN_ACCESS will also be checked.
  const adminAccess = 
    (typeof process !== 'undefined' ? process.env.ADMIN_ACCESS : '') || 
    process.env.NEXT_PUBLIC_ADMIN_ACCESS || 
    '';
    
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
