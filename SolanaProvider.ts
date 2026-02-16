import { Connection, PublicKey, Transaction, TransactionInstruction, clusterApiUrl } from '@solana/web3.js';

export class SolanaProvider {
  private connection: Connection;
  // The standard SPL Memo Program ID
  private memoProgramId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb");

  constructor(endpoint?: string) {
    // Default to mainnet-beta if no endpoint provided
    this.connection = new Connection(endpoint || clusterApiUrl('mainnet-beta'));
  }

  /**
   * Fetches the latest finalized blockhash from Solana.
   * In the "Double Provably Fair" system, this acts as the public, immutable "Salt".
   */
  async getLatestBlockHash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash('finalized');
    return blockhash;
  }

  /**
   * Sends a "Commitment Memo" to the Solana blockchain.
   * This creates an immutable on-chain record of the player's intent and seed
   * BEFORE the game result is revealed.
   * 
   * @param wallet - The user's wallet adapter (must expose sendTransaction)
   * @param discordId - The user's Discord ID
   * @param clientSeed - The user's client seed
   * @param gameId - Unique identifier for the specific game round
   */
  async sendCommitmentMemo(
    wallet: any, 
    discordId: string, 
    clientSeed: string, 
    gameId: string
  ): Promise<string> {
    if (!wallet || !wallet.publicKey) throw new Error("Wallet not connected");

    // Format: TILTCHECK:COMMIT:<DiscordID>:<Seed>:<GameID>
    const memoContent = `TILTCHECK:COMMIT:${discordId}:${clientSeed}:${gameId}`;
    
    // Create the Memo Instruction
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      programId: this.memoProgramId,
      data: new TextEncoder().encode(memoContent),
    });

    const transaction = new Transaction().add(instruction);
    
    // Get fresh blockhash for the transaction itself
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign and send using the wallet adapter
    const signature = await wallet.sendTransaction(transaction, this.connection);
    
    return signature;
  }
}