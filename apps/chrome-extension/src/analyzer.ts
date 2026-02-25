/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { FairnessService } from '../../../packages/utils/src/FairnessService';

export interface GameResult {
  value: number; // The normalized result (0.0 - 1.0)
  rawHash?: string; // Optional: if the casino displays the hash directly
}

export interface CommitmentData {
  blockHash: string;
  discordId: string;
  clientSeed: string;
}

export class Analyzer {
  private fairness: FairnessService;

  constructor() {
    this.fairness = new FairnessService();
  }

  /**
   * Watches the DOM for a specific element to appear that contains the game result.
   * Useful for SPAs where the result appears dynamically after the bet.
   * 
   * @param selector - CSS selector for the result element
   * @param parser - Function to extract the GameResult from the DOM element
   * @param timeoutMs - Max time to wait for result
   */
  async waitForResult(
    selector: string,
    parser: (element: Element) => GameResult,
    timeoutMs: number = 10000
  ): Promise<GameResult> {
    return new Promise((resolve, reject) => {
      // 1. Check if element already exists
      const existingEl = document.querySelector(selector);
      if (existingEl) {
        resolve(parser(existingEl));
        return;
      }

      // 2. Setup Observer
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(parser(element));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true // Some casinos update data attributes
      });

      // 3. Timeout safety
      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timeout waiting for game result"));
      }, timeoutMs);
    });
  }

  /**
   * Verifies if the scraped result matches the commitment.
   */
  async verify(
    result: GameResult,
    commitment: CommitmentData
  ): Promise<{ isValid: boolean; expectedHash: string }> {
    // Calculate what the hash SHOULD be based on Solana Block + User Seed
    const expectedHash = await this.fairness.generateHash(
      commitment.blockHash,
      commitment.discordId,
      commitment.clientSeed
    );

    // If casino exposes the hash, compare directly (Strongest Proof)
    if (result.rawHash) {
      return { isValid: result.rawHash === expectedHash, expectedHash };
    }

    // Otherwise, compare the derived float value (Weak Proof, subject to rounding)
    const expectedFloat = this.fairness.hashToFloat(expectedHash);
    
    // Use a small epsilon for float comparison
    const epsilon = 0.00001;
    const isValid = Math.abs(expectedFloat - result.value) < epsilon;

    return { isValid, expectedHash };
  }
}