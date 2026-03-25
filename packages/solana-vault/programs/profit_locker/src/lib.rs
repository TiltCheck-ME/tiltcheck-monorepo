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
        vault.second_owner = None;
        vault.locked_amount = 0;
        vault.unlock_timestamp = 0;
        vault.bump = ctx.bumps.vault;
        vault.withdrawal_proposal = None;
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

    /// Withdraw funds back to the user's wallet, but ONLY if the lock has expired and the withdrawal has been approved.
    pub fn execute_withdrawal(ctx: Context<ExecuteWithdrawal>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        
        let proposal = vault.withdrawal_proposal.ok_or(VaultError::NoWithdrawalInitiated)?;
        require!(proposal.approved, VaultError::WithdrawalNotApproved);

        // The core constraint: NO early withdrawals allowed. Saves degens from themselves.
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= vault.unlock_timestamp, VaultError::FundsLocked);
        require!(vault.locked_amount >= proposal.amount, VaultError::InsufficientFunds);
        
        vault.locked_amount = vault.locked_amount.checked_sub(proposal.amount).unwrap();
        vault.withdrawal_proposal = None;

        // Perform the PDA sign and transfer
        let vault_bump = vault.bump;
        let owner_key = vault.owner;
        let seeds = &[
            b"vault",
            owner_key.as_ref(),
            &[vault_bump]
        ];
        let signer = &[&seeds[..]];

        **vault.to_account_info().try_borrow_mut_lamports()? -= proposal.amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += proposal.amount;

        msg!("Cooldown complete. {} lamports released.", proposal.amount);
        Ok(())
    }

    pub fn add_second_owner(ctx: Context<AddSecondOwner>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.second_owner.is_none(), VaultError::SecondOwnerAlreadyExists);
        vault.second_owner = Some(ctx.accounts.second_owner.key());
        msg!("Second owner added to the vault: {}", ctx.accounts.second_owner.key());
        Ok(())
    }

    pub fn initiate_withdrawal(ctx: Context<InitiateWithdrawal>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let initiator_key = ctx.accounts.initiator.key();

        require!(vault.owner == initiator_key || vault.second_owner == Some(initiator_key), VaultError::NotAnOwner);
        require!(vault.withdrawal_proposal.is_none(), VaultError::WithdrawalAlreadyInitiated);
        require!(vault.locked_amount >= amount, VaultError::InsufficientFunds);

        let proposal = WithdrawalProposal {
            amount,
            initiator: initiator_key,
            approved: false,
        };

        vault.withdrawal_proposal = Some(proposal);

        msg!("Withdrawal of {} lamports initiated by {}", amount, initiator_key);
        Ok(())
    }

    pub fn approve_withdrawal(ctx: Context<ApproveWithdrawal>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let approver_key = ctx.accounts.approver.key();

        let proposal = vault.withdrawal_proposal.as_mut().ok_or(VaultError::NoWithdrawalInitiated)?;

        require!(proposal.initiator != approver_key, VaultError::ApproverCannotBeInitiator);

        if vault.owner == approver_key || vault.second_owner == Some(approver_key) {
            proposal.approved = true;
            msg!("Withdrawal approved by {}", approver_key);
            Ok(())
        } else {
            Err(VaultError::NotAnOwner.into())
        }
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + (1 + 32) + 8 + 8 + 1 + (1 + 8 + 32 + 1), // Discriminator + owner + second_owner + locked_amount + unlock_timestamp + bump + withdrawal_proposal
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
pub struct ExecuteWithdrawal<'info> {
    #[account(
        mut,
        has_one = owner
    )]
    pub vault: Account<'info, VaultState>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Must match the vault owner
    pub owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AddSecondOwner<'info> {
    #[account(
        mut,
        has_one = owner,
    )]
    pub vault: Account<'info, VaultState>,
    pub owner: Signer<'info>,
    /// CHECK: The new owner to be added.
    pub second_owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitiateWithdrawal<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,
    pub initiator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveWithdrawal<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,
    pub approver: Signer<'info>,
}

#[account]
pub struct VaultState {
    pub owner: Pubkey,
    pub second_owner: Option<Pubkey>,
    pub locked_amount: u64,
    pub unlock_timestamp: i64,
    pub bump: u8,
    pub withdrawal_proposal: Option<WithdrawalProposal>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Copy)]
pub struct WithdrawalProposal {
    pub amount: u64,
    pub initiator: Pubkey,
    pub approved: bool,
}

#[error_code]
pub enum VaultError {
    #[msg("You cannot lock zero amount.")]
    InvalidAmount,
    #[msg("Funds are still locked. Time to touch grass.")]
    FundsLocked,
    #[msg("Insufficient funds in the vault.")]
    InsufficientFunds,
    #[msg("Second owner already exists.")]
    SecondOwnerAlreadyExists,
    #[msg("Signer is not an owner of the vault.")]
    NotAnOwner,
    #[msg("A withdrawal has already been initiated.")]
    WithdrawalAlreadyInitiated,
    #[msg("No withdrawal has been initiated.")]
    NoWithdrawalInitiated,
    #[msg("Approver cannot be the same as the initiator.")]
    ApproverCannotBeInitiator,
    #[msg("Withdrawal has not been approved by the second owner.")]
    WithdrawalNotApproved,
}
