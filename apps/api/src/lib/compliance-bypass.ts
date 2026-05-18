/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */

import { ValidationError } from '@tiltcheck/error-factory';

export function isComplianceBypassEnvAllowed(): boolean {
  const flag = process.env.COMPLIANCE_BYPASS_ALLOWED?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function rolesMaySetComplianceBypass(roles: string[] | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.includes('admin') || roles.includes('compliance_tester');
}

export function assertComplianceBypassWrite(
  requested: boolean | undefined,
  roles: string[] | undefined,
): void {
  if (requested !== true) return;
  if (!isComplianceBypassEnvAllowed()) {
    throw new ValidationError('complianceBypass is disabled in this environment');
  }
  if (!rolesMaySetComplianceBypass(roles)) {
    throw new ValidationError('complianceBypass requires admin or compliance_tester role');
  }
}

export function sanitizeComplianceBypassForClient(
  stored: boolean | null | undefined,
  roles: string[] | undefined,
): boolean {
  if (stored !== true) return false;
  return rolesMaySetComplianceBypass(roles);
}
