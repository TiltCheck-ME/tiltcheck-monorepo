/* Copyright (c) 2026 TiltCheck. All rights reserved. */

/**
 * FairnessService
 * Core component of the TiltCheck "Check Yourself" Ecosystem.
 *
 * Implements the "Double Provably Fair" logic where the source of truth
 * is externalized to Solana Block Hashes and Discord Metadata.
 *
 * Math: Result = HMAC_SHA256(Solana_Block_Hash, Discord_ID + Client_Seed + Nonce)
 */
export class FairnessService {
  /**
   * Generates a provably fair HMAC-SHA256 hash (The 4-Key Lock).
   * 
   * Formula: R = HMAC_SHA256(Solana_Block_Hash, Discord_ID + Client_Seed + Nonce)
   */
  async generateHash(
    solanaBlockHash: string,
    discordId: string,
    clientSeed: string,
    nonce: number = 0
  ): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(solanaBlockHash);
    const messageData = encoder.encode(`${discordId}${clientSeed}:${nonce}`);

    // Use globalThis.crypto for cross-environment compatibility
    const cryptoObj = globalThis.crypto as any;
    const subtle = cryptoObj.subtle || cryptoObj.webcrypto?.subtle;

    if (!subtle) {
      throw new Error('WebCrypto subtle is not available in this environment');
    }

    const key = await subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await subtle.sign(
      'HMAC',
      key,
      messageData
    );

    return this.bufferToHex(signature as ArrayBuffer);
  }

  /**
   * Converts a hex hash into a normalized float (0.00000000 to 1.00000000).
   */
  hashToFloat(hexHash: string): number {
    const subHash = hexHash.substring(0, 8);
    const intValue = parseInt(subHash, 16);
    return intValue / 0xffffffff;
  }

  /**
   * Calculates a standard Dice result (0.00 to 100.00).
   */
  getDiceResult(float: number): number {
    return Math.floor(float * 10001) / 100;
  }

  /**
   * Calculates a Limbo/Crash multiplier.
   */
  getLimboResult(float: number, houseEdge: number = 0.01): number {
    if (float === 1) return 1000000;
    const multiplier = (1 - houseEdge) / (1 - float);
    return Math.floor(multiplier * 100) / 100;
  }

  /**
   * Calculates Plinko path directions.
   */
  getPlinkoPath(hexHash: string, rows: number): number[] {
    const directions: number[] = [];
    for (let i = 0; i < rows * 2; i += 2) {
      const byte = parseInt(hexHash.substring(i, i + 2), 16);
      directions.push(byte % 2);
    }
    return directions;
  }

  /**
   * Verifies standard casino game fairness using server seed, client seed, and nonce.
   */
  async verifyCasinoResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serverSeed);
    const messageData = encoder.encode(`${clientSeed}:${nonce}`);

    const cryptoObj = globalThis.crypto as any;
    const subtle = cryptoObj.subtle || cryptoObj.webcrypto?.subtle;

    const key = await subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await subtle.sign(
      'HMAC',
      key,
      messageData
    );

    return this.bufferToHex(signature as ArrayBuffer);
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
