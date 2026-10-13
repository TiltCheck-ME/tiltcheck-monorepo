// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
use anchor_lang::prelude::*;

/// A wallet's self-exclusion for a specific scope/target.
/// Multiple PDAs can exist per wallet: one per (scope, target_id) pair.
#[account]
#[derive(InitSpace)]
pub struct Lock {
    pub owner: Pubkey,
    /// 0 = all, 1 = category, 2 = game.
    pub scope: u8,
    /// sha256 of "provider:game_slug" or "category:slug". Zeroed for SCOPE_ALL.
    pub target_id: [u8; 32],
    /// Unix seconds. Lock is active while now <= end_time.
    pub end_time: i64,
    pub created_at: i64,
    pub bump: u8,
}
