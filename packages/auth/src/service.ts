/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @tiltcheck/auth - Service-to-Service Token Module
 * Secure communication between internal services
 */

import type { 
  ServiceTokenConfig, 
  ServiceTokenPayload, 
  ServiceVerifyResult 
} from './types.js';
import { createToken, verifyToken, type JWTConfig } from './jwt.js';

/**
 * Create a service-to-service token
 */
export async function createServiceToken(
  targetService: string,
  config: ServiceTokenConfig,
  context?: Record<string, unknown>
): Promise<string> {
  // Validate target service is allowed
  if (!config.allowedServices.includes(targetService)) {
    throw new Error(`Service ${config.serviceId} is not allowed to communicate with ${targetService}`);
  }
  
  const jwtConfig: JWTConfig = {
    secret: config.secret,
    issuer: config.serviceId,
    audience: targetService,
    expiresIn: config.expiresIn,
  };
  
  return createToken(
    {
      sub: config.serviceId,
      type: 'service',
      serviceId: config.serviceId,
      targetService,
      context,
    },
    jwtConfig
  );
}

/**
 * Verify a service-to-service token
 */
export async function verifyServiceToken(
  token: string,
  config: ServiceTokenConfig
): Promise<ServiceVerifyResult> {
  const jwtConfig: JWTConfig = {
    secret: config.secret,
    issuer: '', // We'll check this manually
    audience: config.serviceId, // This service is the audience
    expiresIn: config.expiresIn,
  };
  
  const result = await verifyToken(token, jwtConfig);
  
  if (!result.valid || !result.payload) {
    return {
      valid: false,
      error: result.error || 'Invalid service token',
    };
  }
  
  // Verify the token is a service token
  if (result.payload.type !== 'service') {
    return {
      valid: false,
      error: 'Not a service token',
    };
  }
  
  const serviceId = result.payload.serviceId as string;
  const targetService = result.payload.targetService as string;
  
  // Verify the calling service is allowed
  if (!config.allowedServices.includes(serviceId)) {
    return {
      valid: false,
      error: `Service ${serviceId} is not allowed to communicate with this service`,
    };
  }
  
  // Verify target service matches this service
  if (targetService !== config.serviceId) {
    return {
      valid: false,
      error: 'Token not intended for this service',
    };
  }
  
  return {
    valid: true,
    serviceId,
    targetService,
    context: result.payload.context as Record<string, unknown> | undefined,
  };
}

/**
 * Create service token header for requests
 */
export async function createServiceAuthHeader(
  targetService: string,
  config: ServiceTokenConfig,
  context?: Record<string, unknown>
): Promise<{ Authorization: string }> {
  const token = await createServiceToken(targetService, config, context);
  return { Authorization: `Service ${token}` };
}

/**
 * Extract service token from Authorization header
 */
export function extractServiceToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  if (authHeader.startsWith('Service ')) {
    return authHeader.substring(8);
  }
  
  return null;
}

/**
 * Verify service token from Authorization header
 */
export async function verifyServiceAuthHeader(
  authHeader: string | undefined,
  config: ServiceTokenConfig
): Promise<ServiceVerifyResult> {
  const token = extractServiceToken(authHeader);
  
  if (!token) {
    return {
      valid: false,
      error: 'No service token provided',
    };
  }
  
  return verifyServiceToken(token, config);
}

/**
 * Service registry for known services
 */
export const SERVICES = {
  API: 'api',
  DASHBOARD: 'dashboard',
  JUSTTHETIP: 'justthetip',
  BOT: 'bot',
  WORKER: 'worker',
} as const;

export type ServiceName = typeof SERVICES[keyof typeof SERVICES];

/**
 * Create a service token config from environment
 */
export function createServiceConfigFromEnv(
  serviceId: string,
  allowedServices?: string[]
): ServiceTokenConfig {
  const secret = process.env.SERVICE_JWT_SECRET;
  
  if (!secret) {
    throw new Error('SERVICE_JWT_SECRET environment variable is required');
  }
  
  return {
    secret,
    serviceId,
    allowedServices: allowedServices || Object.values(SERVICES),
    expiresIn: '5m', // Short-lived service tokens
  };
}

export type { ServiceTokenConfig, ServiceTokenPayload, ServiceVerifyResult };
