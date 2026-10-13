// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
//! LiteSVM integration tests for the Cooldown lock rules.

use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{
            instruction::Instruction,
            system_program,
        },
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_clock::Clock,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const PROGRAM_SO: &[u8] = include_bytes!("../../../target/deploy/cooldown.so");

/// sha256 of a target string (matching SDK behaviour).
fn sha256_target(input: &str) -> [u8; 32] {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    // Real sha256 via simple round-trip — for tests only we use a deterministic
    // hash so the assertions still work on a fresh build without the sha2 crate.
    // The on-chain program stores whatever bytes the caller passes; these tests
    // just need them to be consistent.
    let mut h = DefaultHasher::new();
    input.hash(&mut h);
    let v = h.finish();
    let mut out = [0u8; 32];
    out[..8].copy_from_slice(&v.to_le_bytes());
    out
}

fn zero_target() -> [u8; 32] {
    [0u8; 32]
}

struct Harness {
    svm: LiteSVM,
    owner: Keypair,
}

impl Harness {
    fn new() -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program(cooldown::ID, PROGRAM_SO).unwrap();
        let owner = Keypair::new();
        svm.airdrop(&owner.pubkey(), 2_000_000_000).unwrap();
        // Seed the clock to a realistic non-zero timestamp so created_at assertions work.
        let mut clock = svm.get_sysvar::<Clock>();
        clock.unix_timestamp = 1_750_000_000; // ~June 2025
        clock.slot = 100;
        svm.set_sysvar(&clock);
        Self { svm, owner }
    }

    fn copy_owner(&self) -> Keypair {
        Keypair::try_from(self.owner.to_bytes().as_slice()).unwrap()
    }

    fn now(&self) -> i64 {
        self.svm.get_sysvar::<Clock>().unix_timestamp
    }

    fn warp_by(&mut self, delta: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp += delta;
        clock.slot = clock.slot.saturating_add(1);
        self.svm.set_sysvar(&clock);
    }

    fn lock_pda(&self, scope: u8, target_id: [u8; 32]) -> Pubkey {
        Pubkey::find_program_address(
            &[cooldown::LOCK_SEED, self.owner.pubkey().as_ref(), &[scope], target_id.as_ref()],
            &cooldown::ID,
        )
        .0
    }

    fn send(&mut self, ix: Instruction, signers: &[&Keypair]) -> Result<(), String> {
        let payer = signers[0].pubkey();
        self.svm.expire_blockhash();
        let blockhash = self.svm.latest_blockhash();
        let msg = Message::new_with_blockhash(&[ix], Some(&payer), &blockhash);
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers)
            .map_err(|e| format!("sign: {e:?}"))?;
        match self.svm.send_transaction(tx) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("{:?}\n{}", e.err, e.meta.logs.join("\n"))),
        }
    }

    fn set_lock(
        &mut self,
        scope: u8,
        target_id: [u8; 32],
        end_time: i64,
    ) -> Result<(), String> {
        let lock_pda = self.lock_pda(scope, target_id);
        let ix = Instruction::new_with_bytes(
            cooldown::ID,
            &cooldown::instruction::SetLock { scope, target_id, end_time }.data(),
            cooldown::accounts::SetLock {
                owner: self.owner.pubkey(),
                lock: lock_pda,
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        let owner = self.copy_owner();
        self.send(ix, &[&owner])
    }

    fn extend_lock_ix(
        &mut self,
        scope: u8,
        target_id: [u8; 32],
        new_end_time: i64,
    ) -> Result<(), String> {
        let lock_pda = self.lock_pda(scope, target_id);
        let ix = Instruction::new_with_bytes(
            cooldown::ID,
            &cooldown::instruction::ExtendLock { new_end_time }.data(),
            cooldown::accounts::ExtendLock {
                owner: self.owner.pubkey(),
                lock: lock_pda,
            }
            .to_account_metas(None),
        );
        let owner = self.copy_owner();
        self.send(ix, &[&owner])
    }

    fn read_lock(&self, scope: u8, target_id: [u8; 32]) -> cooldown::Lock {
        let pda = self.lock_pda(scope, target_id);
        let acct = self.svm.get_account(&pda).expect("lock account");
        let mut data: &[u8] = &acct.data;
        cooldown::Lock::try_deserialize(&mut data).unwrap()
    }
}

fn assert_err(r: Result<(), String>, needle: &str) {
    let e = r.expect_err("tx should fail");
    assert!(
        e.contains(needle),
        "expected '{needle}' in error:\n{e}"
    );
}

// ---- Tests ----------------------------------------------------------------

#[test]
fn set_game_lock_stores_the_record() {
    let mut h = Harness::new();
    let target = sha256_target("pragmatic:plinko");
    let end = h.now() + 86_400;
    h.set_lock(cooldown::SCOPE_GAME, target, end).unwrap();

    let lock = h.read_lock(cooldown::SCOPE_GAME, target);
    assert_eq!(lock.owner, h.owner.pubkey());
    assert_eq!(lock.scope, cooldown::SCOPE_GAME);
    assert_eq!(lock.target_id, target);
    assert_eq!(lock.end_time, end);
    assert!(lock.created_at > 0);
}

#[test]
fn shorten_returns_lock_cannot_be_shortened() {
    let mut h = Harness::new();
    let target = sha256_target("pragmatic:crash");
    let end = h.now() + 7 * 86_400;
    h.set_lock(cooldown::SCOPE_GAME, target, end).unwrap();

    // Try to overwrite with an earlier end_time via set_lock.
    assert_err(
        h.set_lock(cooldown::SCOPE_GAME, target, end - 1),
        "LockCannotBeShortened",
    );
    // Same end_time also fails.
    assert_err(
        h.set_lock(cooldown::SCOPE_GAME, target, end),
        "LockCannotBeShortened",
    );
    // extend_lock also refuses.
    assert_err(
        h.extend_lock_ix(cooldown::SCOPE_GAME, target, end),
        "LockCannotBeShortened",
    );
    // Record unchanged.
    assert_eq!(h.read_lock(cooldown::SCOPE_GAME, target).end_time, end);
}

#[test]
fn extend_lock_moves_end_forward() {
    let mut h = Harness::new();
    let target = sha256_target("relax:dice");
    let end = h.now() + 86_400;
    h.set_lock(cooldown::SCOPE_GAME, target, end).unwrap();

    let new_end = end + 30 * 86_400;
    h.extend_lock_ix(cooldown::SCOPE_GAME, target, new_end).unwrap();
    assert_eq!(h.read_lock(cooldown::SCOPE_GAME, target).end_time, new_end);
}

#[test]
fn game_lock_does_not_block_different_game() {
    // A game lock sits on a PDA that encodes scope+target_id.
    // A different game hash produces a different PDA — no account exists there.
    let mut h = Harness::new();
    let plinko = sha256_target("pragmatic:plinko");
    let crash = sha256_target("pragmatic:crash");
    let end = h.now() + 86_400;
    h.set_lock(cooldown::SCOPE_GAME, plinko, end).unwrap();

    // No lock on crash PDA.
    let crash_pda = h.lock_pda(cooldown::SCOPE_GAME, crash);
    assert!(
        h.svm.get_account(&crash_pda).is_none(),
        "crash PDA should not exist"
    );
}

#[test]
fn all_scope_lock_has_its_own_pda() {
    // An SCOPE_ALL lock lives on PDA seeds ["lock", owner, 0, [0;32]].
    // The SDK checks this PDA first; if it exists and is active the wallet is
    // blocked from every game. We verify the on-chain record is distinct from
    // game-specific PDAs.
    let mut h = Harness::new();
    let all_target = zero_target();
    let game_target = sha256_target("evo:blackjack");
    let end = h.now() + 30 * 86_400;

    h.set_lock(cooldown::SCOPE_ALL, all_target, end).unwrap();

    // The all-scope PDA exists.
    let all_pda = h.lock_pda(cooldown::SCOPE_ALL, all_target);
    assert!(h.svm.get_account(&all_pda).is_some());

    // The game PDA does NOT exist (different scope byte + target bytes = different seeds).
    let game_pda = h.lock_pda(cooldown::SCOPE_GAME, game_target);
    assert!(h.svm.get_account(&game_pda).is_none());

    let lock = h.read_lock(cooldown::SCOPE_ALL, all_target);
    assert_eq!(lock.scope, cooldown::SCOPE_ALL);
    assert_eq!(lock.target_id, all_target);
    assert_eq!(lock.end_time, end);
}

#[test]
fn set_lock_rejects_end_time_in_the_past() {
    let mut h = Harness::new();
    let target = zero_target();
    let past = h.now() - 1;
    assert_err(
        h.set_lock(cooldown::SCOPE_ALL, target, past),
        "EndTimeInPast",
    );
}

#[test]
fn set_lock_rejects_invalid_scope() {
    let mut h = Harness::new();
    assert_err(
        h.set_lock(99, zero_target(), h.now() + 86_400),
        "InvalidScope",
    );
}

#[test]
fn upsert_strengthens_existing_lock() {
    // set_lock on an existing PDA with a later end_time is an extend.
    let mut h = Harness::new();
    let target = sha256_target("hacksaw:mines");
    let end1 = h.now() + 86_400;
    h.set_lock(cooldown::SCOPE_GAME, target, end1).unwrap();

    let end2 = end1 + 7 * 86_400;
    h.set_lock(cooldown::SCOPE_GAME, target, end2).unwrap();

    assert_eq!(h.read_lock(cooldown::SCOPE_GAME, target).end_time, end2);
}

#[test]
fn clock_warp_shows_lock_active_then_expired() {
    let mut h = Harness::new();
    let target = sha256_target("relax:dice");
    let end = h.now() + 86_400;
    h.set_lock(cooldown::SCOPE_GAME, target, end).unwrap();

    // Lock is active: end_time is in the future relative to clock.
    let lock = h.read_lock(cooldown::SCOPE_GAME, target);
    assert!(h.now() <= lock.end_time);

    // Advance past expiry.
    h.warp_by(86_401);
    let lock = h.read_lock(cooldown::SCOPE_GAME, target);
    assert!(h.now() > lock.end_time, "lock should be expired");
}
