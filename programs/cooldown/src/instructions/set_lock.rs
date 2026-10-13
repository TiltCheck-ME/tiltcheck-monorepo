// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
use anchor_lang::prelude::*;

use crate::constants::{LOCK_SEED, MAX_SCOPE};
use crate::error::CooldownError;
use crate::events::LockSet;
use crate::state::Lock;

#[derive(Accounts)]
#[instruction(scope: u8, target_id: [u8; 32])]
pub struct SetLock<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + Lock::INIT_SPACE,
        seeds = [LOCK_SEED, owner.key().as_ref(), &[scope], target_id.as_ref()],
        bump
    )]
    pub lock: Account<'info, Lock>,
    pub system_program: Program<'info, System>,
}

pub fn handle_set_lock(
    ctx: Context<SetLock>,
    scope: u8,
    target_id: [u8; 32],
    end_time: i64,
) -> Result<()> {
    require!(scope <= MAX_SCOPE, CooldownError::InvalidScope);
    let now = Clock::get()?.unix_timestamp;
    require!(end_time > now, CooldownError::EndTimeInPast);

    let lock = &mut ctx.accounts.lock;

    // Upsert guard: if already initialised, new end_time must be strictly greater.
    let already_exists = lock.owner != Pubkey::default();
    if already_exists && end_time <= lock.end_time {
        return err!(CooldownError::LockCannotBeShortened);
    }

    lock.owner = ctx.accounts.owner.key();
    lock.scope = scope;
    lock.target_id = target_id;
    lock.end_time = end_time;
    if lock.created_at == 0 {
        lock.created_at = now;
    }
    lock.bump = ctx.bumps.lock;

    emit!(LockSet {
        owner: lock.owner,
        scope: lock.scope,
        target_id: lock.target_id,
        end_time: lock.end_time,
    });
    Ok(())
}
