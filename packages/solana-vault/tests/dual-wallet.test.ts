import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { ProfitLocker } from "../target/types/profit_locker";
import { assert } from "chai";

describe("profit-locker", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ProfitLocker as Program<ProfitLocker>;
  const provider = anchor.getProvider();

  const owner = anchor.web3.Keypair.generate();
  const secondOwner = anchor.web3.Keypair.generate();

  const [vault, _] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.publicKey.toBuffer()],
    program.programId
  );

  it("Initializes the vault", async () => {
    await provider.connection.requestAirdrop(owner.publicKey, 1000000000);
    await program.methods
      .initializeVault()
      .accounts({
        vault,
        user: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const vaultAccount = await program.account.vaultState.fetch(vault);
    assert.ok(vaultAccount.owner.equals(owner.publicKey));
  });

  it("Adds a second owner", async () => {
    await program.methods
      .addSecondOwner()
      .accounts({
        vault,
        owner: owner.publicKey,
        secondOwner: secondOwner.publicKey,
      })
      .signers([owner])
      .rpc();

    const vaultAccount = await program.account.vaultState.fetch(vault);
    assert.ok(vaultAccount.secondOwner.equals(secondOwner.publicKey));
  });

  it("Locks funds", async () => {
    const amount = new anchor.BN(100000000); // 0.1 SOL
    const duration = new anchor.BN(1); // 1 second

    await program.methods
      .lockFunds(amount, duration)
      .accounts({
        vault,
        user: owner.publicKey,
        owner: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const vaultAccount = await program.account.vaultState.fetch(vault);
    assert.ok(vaultAccount.lockedAmount.eq(amount));
  });

  describe("Dual withdrawal flow", () => {
    it("Initiates a withdrawal", async () => {
      const amount = new anchor.BN(50000000); // 0.05 SOL

      await program.methods
        .initiateWithdrawal(amount)
        .accounts({
          vault,
          initiator: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const vaultAccount = await program.account.vaultState.fetch(vault);
      const proposal = vaultAccount.withdrawalProposal;
      assert.ok(proposal.amount.eq(amount));
      assert.ok(proposal.initiator.equals(owner.publicKey));
      assert.notOk(proposal.approved);
    });

    it("Approves a withdrawal", async () => {
      await program.methods
        .approveWithdrawal()
        .accounts({
          vault,
          approver: secondOwner.publicKey,
        })
        .signers([secondOwner])
        .rpc();

      const vaultAccount = await program.account.vaultState.fetch(vault);
      const proposal = vaultAccount.withdrawalProposal;
      assert.ok(proposal.approved);
    });

    it("Executes a withdrawal", async () => {
      // wait for the lock to expire
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const beforeBalance = await provider.connection.getBalance(owner.publicKey);

      await program.methods
        .executeWithdrawal()
        .accounts({
          vault,
          user: owner.publicKey,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc();

      const afterBalance = await provider.connection.getBalance(owner.publicKey);
      assert.isAbove(afterBalance, beforeBalance);

      const vaultAccount = await program.account.vaultState.fetch(vault);
      assert.ok(vaultAccount.withdrawalProposal === null);
    });
  });
});
