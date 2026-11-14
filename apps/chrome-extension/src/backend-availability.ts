/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
import { isBackendFeatureEnabled } from './config.js';

/**
 * Hide the parts of the popup whose backend does not exist yet and show a
 * plain note in their place. Local settings stay as they are.
 */
export function applyBackendAvailability(doc: Document = document): void {
  const toggle = (id: string, visible: boolean) => {
    const el = doc.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
  };
  const status = isBackendFeatureEnabled('serverStatus');
  toggle('tilt-block', status);
  toggle('stat-cell-pl', status);
  toggle('stat-cell-blocked', isBackendFeatureEnabled('serverExclusions'));

  const exclusions = isBackendFeatureEnabled('serverExclusions');
  toggle('server-exclusions', exclusions);
  toggle('server-exclusions-off', !exclusions);

  const vault = isBackendFeatureEnabled('vaultRules');
  toggle('vault-rules-section', vault);
  toggle('vault-stat-row', vault);
  toggle('vault-rules-off', !vault);
  const vaultTab = doc.querySelector<HTMLElement>('.tab[data-tab="vault"]');
  if (vaultTab) vaultTab.style.display = vault ? '' : 'none';
}
