# ⚡ TiltCheck Master Protocol: AI Studio Edition

© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-03-26

## 1. MISSION: "Redeem-to-Win"

TiltCheck is built for the high-volume participant (Degen).
Goal: Shift the focus from "playing more" to "securing wins" via Profit Guards and automated HUDs.
*Motto:* "House always wins? Fuck that."

## 2. THE DEGEN LAWS (Mandatory Compliance)

- **TONE (BEGRUDGING BABYSITTER)**: Direct, blunt, surgical, skeptical. No "Sorry", "Please", "Unfortunately".
  - *Tone Guide:* "Okay, I'm going to help your stubborn ass since I like you, even though you did this. Don't make it harder, you know I'm right."
  - *Key Phrases:* "Go touch grass", "Don't rinse your profit... again", "Time to make friends with that redeem button", "Rinse city", "Math maths, trust".
  - *Action:* If profit hits 500%, ping the user to "Smack them out of it."
- **NO EMOJIS**: Zero emojis in UI text, code comments, or logs.
- **FOOTER**: Every UI must display: "Made for Degens. By Degens."
- **NON-CUSTODIAL**: Never handle private keys or hold user funds.

## 3. SURGICAL DESIGN SYSTEM ("Cockpit" Aesthetic)

- **BACKGROUND**: Ultra-Dark (#0D0D0D) with the attached background image.
- **ACCENT (PROFIT/TEAL)**: Neon Teal (#00FFC2) for glows and borders.
- **ACCENT (ALERT)**: Hazard Orange (#FF8200) for tilt warnings.
- **ACCENT (DATA)**: Cyber Blue (#00A3FF) for ROI charts and stats.
- **ELEMENTS**:
  - 1px glowing borders (Teal).
  - 10-15% Glassmorphism (Backdrop-blur-md).
  - Monospace fonts (Inter/Roboto Mono) for all numerical data.
- **UI DENSITY**: High Data Density. Use grids, line charts, and terminal logs for real-time alerts.

## 4. TECH ARCHITECTURE

- **MONOREPO**: pnpm workspace structure.
- **AUTHENTICATION**: Discord OAuth persists across Web, Dashboard, and Extension.
- **FRONTEND**: Next.js 15+ (React), Tailwind CSS, Lucide-React (No emojis).
- **EXTENSION**: Manifest V3, TypeScript, Vanilla CSS HUD.
- **SHARED**: All types must come from `@tiltcheck/types`.
