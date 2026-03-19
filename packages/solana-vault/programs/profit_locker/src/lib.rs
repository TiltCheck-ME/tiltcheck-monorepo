use anchor_lang::prelude::*;

// Replace with a real program ID upon deployment
declare_id!("T1LtCheckRngLocker1111111111111111111111111");

#[program]
pub mod profit_locker {
    use super::*;

    /// Initialize a new non-custodial vault for the user.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.locked_amount = 0;
        vault.unlock_timestamp = 0;
        vault.bump = ctx.bumps.vault;
        msg!("Tactical Vault Initialized for: {}", vault.owner);
        Ok(())
    }

    /// Lock funds into the vault for a specified duration to prevent "tilt" returning.
    pub fn lock_funds(ctx: Context<LockFunds>, amount: u64, duration_seconds: i64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        require!(amount > 0, VaultError::InvalidAmount);
        
        // Transfer SOL from user to the PDA vault
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let current_time = Clock::get()?.unix_timestamp;
        
        // If there's already an active lock, we extend the lock or keep the furthest one.
        let new_unlock_time = current_time.checked_add(duration_seconds).unwrap();
        if new_unlock_time > vault.unlock_timestamp {
            vault.unlock_timestamp = new_unlock_time;
        }

        vault.locked_amount = vault.locked_amount.checked_add(amount).unwrap();
        
        msg!("Bag Secured. {} lamports locked until timestamp {}", amount, vault.unlock_timestamp);
        Ok(())
    }

    /// Withdraw funds back to the user's wallet, but ONLY if the lock has expired.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        // The core constraint: NO early withdrawals allowed. Saves degens from themselves.
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= vault.unlock_timestamp, VaultError::FundsLocked);
        require!(vault.locked_amount >= amount, VaultError::InsufficientFunds);
        
        vault.locked_amount = vault.locked_amount.checked_sub(amount).unwrap();

        // Perform the PDA sign and transfer
        let vault_bump = vault.bump;
        let owner_key = vault.owner;
        let seeds = &[
            b"vault",
            owner_key.as_ref(),
            &[vault_bump]
        ];
        let signer = &[&seeds[..]];

        **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount;

        msg!("Cooldown complete. {} lamports released.", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 1, // Discriminator + Pubkey + locked_amount + unlock_timestamp + bump
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockFunds<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: We are just transferring SOL here
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump,
        has_one = owner
    )]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Must match the vault owner
    pub owner: AccountInfo<'info>,
}

#[account]
pub struct VaultState {
    pub owner: Pubkey,
    pub locked_amount: u64,
    pub unlock_timestamp: i64,
    pub bump: u8,
}

#[error_code]
pub enum VaultError {
    #[msg("You cannot lock zero amount.")]
    InvalidAmount,
    #[msg("Funds are still locked. Time to touch grass.")]
    FundsLocked,
    #[msg("Insufficient funds in the vault.")]
    InsufficientFunds,
}
