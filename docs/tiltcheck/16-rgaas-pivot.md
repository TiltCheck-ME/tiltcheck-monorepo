# 16. RGaaS Pivot: Responsible Gaming as a Service

© 2024–2025 TiltCheck Ecosystem. All Rights Reserved.

## 16.1 Overview
TiltCheck has pivoted from a consumer-only toolset to a **Service-Oriented Model (RGaaS)**. This allows third-party platforms (casinos, betting apps, community bots) to integrate TiltCheck's harm reduction tools via a unified API.

## 16.2 Core Offerings
The RGaaS layer exposes four primary engines as services:

1.  **Tilt Detection Service**: Real-time behavioral analysis to detect "tilt" (impulsive, high-risk gambling).
2.  **Trust Scoring Service**: Dual-sided reputation scoring for both Casinos and Users (Degens).
3.  **Link Scanning Service (SusLink)**: Automated identification of scam, phishing, and predatory casino domains.
4.  **Risk Profiling**: A unified view of a user's current risk level across all behavioral signals.

## 16.3 Unified API Reference (`/api/rgaas/*`)

### 16.3.1 Tilt Detection
- **POST `/breathalyzer/evaluate`**: Analyzes betting velocity and loss streaks.
- **POST `/anti-tilt/evaluate`**: Sentiment analysis of user communications for distress signals.

### 16.3.2 Trust Scoring
- **GET `/trust/casino/:name`**: Returns a 0-100 reputation score and weighted breakdown.
- **GET `/trust/user/:id`**: Returns user trust level (`very-high` to `high-risk`) based on history.

### 16.3.3 Link Scanning
- **POST `/scan`**: Real-time analysis of a URL against the SusLink database and heuristics.

### 16.3.4 Unified Risk Profile
- **GET `/profile/:userId`**: Aggregates trust level, tilt status, and recent signals into a single recommendation.

## 16.4 Recommendation Tiers
| Tier | Action | Description |
| :--- | :--- | :--- |
| `NORMAL_PLAY` | None | User shows healthy behavioral patterns. |
| `MONITOR_CLOSELY` | Warning | Minor signals detected; increased observation recommended. |
| `INTERVENE_IMMEDIATELY` | Cooldown | High-risk behavior or active tilt; immediate intervention required. |

## 16.5 Integration Philosophy
RGaaS is designed to be **non-custodial** and **privacy-first**. We do not require real identities or private keys—only a consistent identifier (e.g., Discord ID, hashed wallet) to provide personalized harm reduction.
