// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
use anchor_lang::prelude::*;

use crate::constants::LOCK_SEED;
use crate::error::CooldownError;
use crate::events::LockExtended;
use crate::state::Lock;

#[derive(Accounts)]
pub struct ExtendLock<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [LOCK_SEED, owner.key().as_ref(), &[lock.scope], lock.target_id.as_ref()],
        bump = lock.bump,
        has_one = owner
    )]
    pub lock: Account<'info, Lock>,
}

pub fn handle_extend_lock(ctx: Context<ExtendLock>, new_end_time: i64) -> Result<()> {
    let lock = &mut ctx.accounts.lock;
    require!(new_end_time > lock.end_time, CooldownError::LockCannotBeShortened);
    lock.end_time = new_end_time;

    emit!(LockExtended {
        owner: lock.owner,
        scope: lock.scope,
        target_id: lock.target_id,
        new_end_time: lock.end_time,
    });
    Ok(())
}
