/* Copyright (c) 2026 TiltCheck. All rights reserved. */

/**
 * Discord SKU and Entitlement Types
 */

export enum SKUType {
  DURABLE = 2,
  CONSUMABLE = 3,
  SUBSCRIPTION = 5,
}

export interface DiscordSKU {
  id: string;
  type: SKUType;
  name: string;
  description: string;
  price?: number;
}

export interface DiscordEntitlement {
  id: string;
  sku_id: string;
  application_id: string;
  user_id: string;
  promotion_id?: string;
  type: number;
  deleted: boolean;
  gift_code_flags?: number;
  consumed: boolean;
}

export const DISCORD_API_BASE = 'https://discord.com/api/v10';

export interface ShopConfig {
  applicationId: string;
  botToken: string;
}
