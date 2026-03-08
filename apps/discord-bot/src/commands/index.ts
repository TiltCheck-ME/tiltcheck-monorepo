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
 *   - /tiltcheck link scan - Link scanning
 *   - /tiltcheck casino    - Casino trust scores and info
 *   - /tiltcheck buddy     - Accountability buddy system
 *   - /tiltcheck report    - Report suspicious activity
 *   - /tiltcheck setstate  - Set user state context
 */

export { tiltcheck } from './tiltcheck.js';
export { tip } from './tip.js';
export { dad } from './dad.js';
export { poker } from './poker.js';
// Single-entry UX: everything routes through /tiltcheck now.

