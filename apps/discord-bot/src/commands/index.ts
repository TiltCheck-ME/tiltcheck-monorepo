/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Bot Command Index
 *
 * Safety & community bot — tilt monitoring, link scanning, casino trust, reports
 *
 * Commands:
 * - /tiltcheck - Tilt monitoring and cooldown
 * - /suslink   - Link scanning, promo management, scam detection
 * - /casino    - Casino trust scores and info
 * - /buddy     - Accountability buddy system
 * - /report    - Report suspicious activity
 * - /setstate  - Set user state (mod)
 * - /ping      - Bot status check
 * - /help      - Help and command info
 */

export { tiltcheck } from './tiltcheck.js';
export { tip } from './tip.js';
export { dad } from './dad.js';
export { poker } from './poker.js';
// Single-entry UX: everything routes through /tiltcheck now.

