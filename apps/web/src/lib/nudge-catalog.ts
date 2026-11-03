/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-01 */

import catalog from '@/data/nudges.json';

export type NudgeItem = {
  fire: string;
  text: string;
};

export type NudgeGroup = {
  id: string;
  when: string;
  items: NudgeItem[];
};

export type NudgeAlso = {
  href: string;
  label: string;
  title: string;
  body: string;
};

export type NudgeCatalog = {
  eyebrow: string;
  title: string;
  lede: string;
  metaDescription: string;
  honesty: string;
  groups: NudgeGroup[];
  also?: NudgeAlso[];
};

export const NUDGE_CATALOG = catalog as NudgeCatalog;
