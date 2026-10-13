// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12

/// PDA seed for a scope/game lock.
pub const LOCK_SEED: &[u8] = b"lock";

/// Locks every gambling check for this wallet.
pub const SCOPE_ALL: u8 = 0;
/// Locks a named category (crash, slots-high-vol, etc.).
pub const SCOPE_CATEGORY: u8 = 1;
/// Locks a specific game by sha256 hash of "provider:game_slug".
pub const SCOPE_GAME: u8 = 2;

pub const MAX_SCOPE: u8 = SCOPE_GAME;
