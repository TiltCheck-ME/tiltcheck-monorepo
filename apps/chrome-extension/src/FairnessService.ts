/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * FairnessService
 * Core component of the TiltCheck "Check Yourself" Ecosystem.
 *
 * Implements the "Double Provably Fair" logic where the source of truth
 * is externalized to Solana Block Hashes and Discord Metadata.
 *
 * Math: Result = HMAC_SHA256(Solana_Block_Hash, Discord_ID + Client_Seed)
 */
export class FairnessService {
  /**
   * Generates a provably fair HMAC-SHA256 hash.
   *
   * @param solanaBlockHash - The Solana Block Hash (acts as the Salt/Key for entropy)
   * @param discordId - The User's Discord ID (Snowflake)
   * @param clientSeed - The user-controlled client seed (Player Soul)
   * @returns The resulting hex string of the HMAC
   */
  async generateHash(
    solanaBlockHash: string,
    discordId: string,
    clientSeed: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    
    // The Solana Block Hash is used as the Key (Salt)
    const keyData = encoder.encode(solanaBlockHash);
    
    // The Message combines the User Identity and their chosen Seed
    const messageData = encoder.encode(`${discordId}${clientSeed}`);

    // Import key for HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      messageData
    );

    return this.bufferToHex(signature);
  }

  /**
   * Converts a hex hash into a normalized float (0.0 to 1.0).
   * Useful for determining game outcomes (e.g. dice rolls, win/loss).
   * 
   * Standard implementation: Takes the first 4 bytes (32 bits) of the hash.
   */
  hashToFloat(hexHash: string): number {
    // Take first 8 hex characters (4 bytes)
    const subHash = hexHash.substring(0, 8);
    const intValue = parseInt(subHash, 16);
    
    // Divide by 2^32 to get a float between 0 and 1
    return intValue / 0xffffffff;
  }

  /**
   * Calculates a standard Dice result (0.00 to 100.00).
   * Used by Stake, BC.Game, etc.
   * 
   * Logic: Float * 10001 / 100
   */
  getDiceResult(float: number): number {
    // Standard implementation for 0-100 dice
    // Results in 0.00 to 100.00 range
    return Math.floor(float * 10001) / 100;
  }

  /**
   * Calculates a Limbo/Crash multiplier.
   * 
   * Logic: 0.99 / (1 - float)
   * This creates the exponential distribution required for crash games.
   * 
   * @param float - The normalized float (0.0 to 1.0)
   * @param houseEdge - The house edge (default 0.01 / 1%)
   */
  getLimboResult(float: number, houseEdge: number = 0.01): number {
    // Avoid division by zero
    if (float === 1) return 1000000; // Cap at max payout
    
    // Calculate multiplier
    const multiplier = (1 - houseEdge) / (1 - float);
    
    // Standard floor to 2 decimals
    return Math.floor(multiplier * 100) / 100;
  }

  /**
   * Calculates Plinko path directions.
   * Plinko requires multiple random decisions (one per row).
   * 
   * @param hexHash - The full HMAC hash
   * @param rows - Number of rows (8-16 usually)
   * @returns Array of 0 (Left) and 1 (Right)
   */
  getPlinkoPath(hexHash: string, rows: number): number[] {
    const directions: number[] = [];
    // We take 2-character chunks (1 byte) from the hex string
    // If byte < 128 => Left (0), else => Right (1)
    for (let i = 0; i < rows * 2; i += 2) {
      const byte = parseInt(hexHash.substr(i, 2), 16);
      directions.push(byte % 2); // 0 or 1
    }
    return directions;
  }

  /**
   * Verifies if a reported result matches the "Double Provably Fair" inputs.
   * Used by the Browser Extension to detect fraud.
   * 
   * @param reportedHash - The hash reported by the casino/house
   * @param solanaBlockHash - The Solana Block Hash used for the bet
   * @param discordId - The User's Discord ID
   * @param clientSeed - The User's Client Seed
   */
  async verify(
    reportedHash: string,
    solanaBlockHash: string,
    discordId: string,
    clientSeed: string
  ): Promise<boolean> {
    const calculatedHash = await this.generateHash(solanaBlockHash, discordId, clientSeed);
    return calculatedHash === reportedHash;
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}