// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import { BaseSensor } from '../core/Sensor.js';
import { StakeSensor } from './StakeSensor.js';
import { RooSensor } from './RooSensor.js';
import { BcGameSensor } from './BcGameSensor.js';
import { GenericCasinoSensor } from './GenericCasinoSensor.js';

type SensorConstructor = new () => BaseSensor;

// Maps hostname substrings to their dedicated sensor class
const SENSOR_MAP: Array<{ pattern: string; factory: () => BaseSensor }> = [
  { pattern: 'stake.com', factory: () => new StakeSensor(false) },
  { pattern: 'stake.us', factory: () => new StakeSensor(true) },
  { pattern: 'roobet.com', factory: () => new RooSensor() },
  { pattern: 'bc.game', factory: () => new BcGameSensor() },
];

export class SensorRegistry {
  private static instance: SensorRegistry | null = null;
  private activeSensor: BaseSensor | null = null;

  static getInstance(): SensorRegistry {
    if (!SensorRegistry.instance) {
      SensorRegistry.instance = new SensorRegistry();
    }
    return SensorRegistry.instance;
  }

  private constructor() {}

  /**
   * Returns the best sensor for the current hostname.
   * Falls back to GenericCasinoSensor for unknown sites.
   */
  getSensorForHost(hostname: string): BaseSensor {
    const match = SENSOR_MAP.find(entry => hostname.includes(entry.pattern));
    if (match) return match.factory();
    return new GenericCasinoSensor(hostname);
  }

  /**
   * Returns the casino ID for a given hostname, or null if not a recognized casino.
   */
  getCasinoId(hostname: string): string | null {
    const match = SENSOR_MAP.find(entry => hostname.includes(entry.pattern));
    return match ? match.pattern : null;
  }

  isKnownCasino(hostname: string): boolean {
    return SENSOR_MAP.some(entry => hostname.includes(entry.pattern));
  }

  getActiveSensor(): BaseSensor | null {
    return this.activeSensor;
  }

  setActiveSensor(sensor: BaseSensor): void {
    if (this.activeSensor) {
      this.activeSensor.stop();
    }
    this.activeSensor = sensor;
  }

  stopAll(): void {
    this.activeSensor?.stop();
    this.activeSensor = null;
  }
}
