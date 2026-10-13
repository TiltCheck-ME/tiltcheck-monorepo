// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
use anchor_lang::prelude::*;

#[event]
pub struct LockSet {
    pub owner: Pubkey,
    pub scope: u8,
    pub target_id: [u8; 32],
    pub end_time: i64,
}

#[event]
pub struct LockExtended {
    pub owner: Pubkey,
    pub scope: u8,
    pub target_id: [u8; 32],
    pub new_end_time: i64,
}
