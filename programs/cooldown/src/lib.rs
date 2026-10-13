// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("7guGrKGy9BoTDe7kC9ng5Yn9B1Ykaa7uAp6e4TRZYeB2");

#[program]
pub mod cooldown {
    use super::*;

    /// Create or strengthen a self-exclusion lock for a scope/target.
    /// Upsert: if the PDA already exists, new_end_time must be > current end_time.
    pub fn set_lock(
        ctx: Context<SetLock>,
        scope: u8,
        target_id: [u8; 32],
        end_time: i64,
    ) -> Result<()> {
        instructions::set_lock::handle_set_lock(ctx, scope, target_id, end_time)
    }

    /// Extend an existing lock. new_end_time must be > current end_time.
    pub fn extend_lock(ctx: Context<ExtendLock>, new_end_time: i64) -> Result<()> {
        instructions::extend_lock::handle_extend_lock(ctx, new_end_time)
    }
}
