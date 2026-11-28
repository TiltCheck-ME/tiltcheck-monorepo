/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-27 */

/**
 * Where the TiltCheck controls are mounted.
 * The action popup closes on any tab switch. The side panel stays in the
 * window chrome, so swapping tabs does not dismiss it.
 */

export type ExtensionSurface = 'popup' | 'window' | 'sidepanel';

export interface SidePanelContext {
  documentUrl?: string;
}

export interface CurrentWindowInfo {
  type?: string;
}

export function surfaceFromLocation(search: string): ExtensionSurface | null {
  const mode = new URLSearchParams(search).get('mode');
  if (mode === 'window') return 'window';
  if (mode === 'sidepanel') return 'sidepanel';
  return null;
}

export async function resolveExtensionSurface(
  search: string,
  href: string,
  getContexts?: (filter: { contextTypes: string[] }) => Promise<SidePanelContext[]>,
  getCurrentWindow?: () => Promise<CurrentWindowInfo | null | undefined>,
): Promise<ExtensionSurface> {
  const fromQuery = surfaceFromLocation(search);
  if (fromQuery) return fromQuery;

  // runtime.getContexts arrived in Chrome 116. The side panel itself is Chrome 114.
  if (getContexts) {
    try {
      const contexts = await getContexts({ contextTypes: ['SIDE_PANEL'] });
      if (contexts.some((ctx) => ctx.documentUrl === href)) return 'sidepanel';
    } catch {
      // Fall through. A missing or throwing context API is not proof this is a popup.
    }
  }

  // Action popups are window type "popup" and close on a tab switch.
  // The side panel is part of the normal browser window, including on Chrome 114-115.
  if (getCurrentWindow) {
    try {
      const win = await getCurrentWindow();
      if (win?.type === 'normal') return 'sidepanel';
    } catch {
      return 'popup';
    }
  }

  return 'popup';
}
