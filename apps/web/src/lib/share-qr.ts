/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

export const AUTOVAULT_SHARE_SCRIPT_PATH = '/userscripts/tiltcheck-autovault-share.user.js';
export const AUTOVAULT_SHARE_PAGE_PATH = '/tools/auto-vault/share';
export const AUTOVAULT_SHARE_SCRIPT_PRODUCTION =
  'https://tiltcheck.me/userscripts/tiltcheck-autovault-share.user.js';
export const AUTOVAULT_SHARE_PAGE_PRODUCTION = 'https://tiltcheck.me/tools/auto-vault/share';

/** QR image via public API — encodes install page or direct script URL. */
export function buildShareQrImageUrl(data: string, size = 280): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    margin: '12',
    ecc: 'M',
    color: '17c3b2',
    bgcolor: '0a0c10',
    data,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

export function resolveShareUrls(
  origin?: string,
  options?: { qrOrigin?: string }
): { pageUrl: string; scriptUrl: string; qrPageUrl: string; qrScriptUrl: string } {
  if (!origin) {
    return {
      pageUrl: '',
      scriptUrl: '',
      qrPageUrl: '',
      qrScriptUrl: '',
    };
  }
  const base = origin.replace(/\/$/, '');
  const qrBase = options?.qrOrigin?.replace(/\/$/, '') || base;
  return {
    pageUrl: `${base}${AUTOVAULT_SHARE_PAGE_PATH}`,
    scriptUrl: `${base}${AUTOVAULT_SHARE_SCRIPT_PATH}`,
    qrPageUrl: `${qrBase}${AUTOVAULT_SHARE_PAGE_PATH}`,
    qrScriptUrl: `${qrBase}${AUTOVAULT_SHARE_SCRIPT_PATH}`,
  };
}
