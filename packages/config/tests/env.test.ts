import { describe, it, expect } from 'vitest';
import {
  validateEnv,
  getJWTConfig,
  getServiceJWTConfig,
  getDiscordConfig,
  getDatabaseConfig,
  getSupabaseConfig,
  getServerConfig,
  getCookieConfig,
  validateAllConfig,
  createPartialValidator,
  getAPIConfig,
  getDashboardConfig,
  getJustTheTipConfig,
  getBotConfig,
  jwtConfigSchema,
  serviceJwtConfigSchema,
  discordConfigSchema,
  databaseConfigSchema,
  supabaseConfigSchema,
  serverConfigSchema,
  cookieConfigSchema,
  fullConfigSchema,
} from '../src/env';

describe('Config Package - Environment Validation', () => {
  describe('validateEnv', () => {
    it('should validate valid JWT config', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(32),
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_EXPIRES_IN: '7d',
      };

      const result = validateEnv(jwtConfigSchema, env);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should fail with short JWT secret', () => {
      const env = {
        JWT_SECRET: 'tooshort',
      };

      const result = validateEnv(jwtConfigSchema, env);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.includes('at least 32 characters'))).toBe(true);
    });

    it('should use defaults for JWT config', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(32),
      };

      const result = validateEnv(jwtConfigSchema, env);

      expect(result.success).toBe(true);
      expect(result.data?.JWT_ISSUER).toBe('tiltcheck.me');
      expect(result.data?.JWT_AUDIENCE).toBe('tiltcheck.me');
      expect(result.data?.JWT_EXPIRES_IN).toBe('7d');
    });
  });

  describe('getJWTConfig', () => {
    it('should return valid JWT config', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(32),
      };

      const config = getJWTConfig(env);

      expect(config.JWT_SECRET).toBe('a'.repeat(32));
      expect(config.JWT_ISSUER).toBe('tiltcheck.me');
    });

    it('should throw on invalid JWT config', () => {
      const env = {
        JWT_SECRET: 'short',
      };

      expect(() => getJWTConfig(env)).toThrow('JWT config validation failed');
    });
  });

  describe('getServiceJWTConfig', () => {
    it('should return valid service JWT config', () => {
      const env = {
        SERVICE_JWT_SECRET: 'b'.repeat(32),
        SERVICE_ID: 'test-service',
        ALLOWED_SERVICES: 'service1,service2,service3',
      };

      const config = getServiceJWTConfig(env);

      expect(config.SERVICE_JWT_SECRET).toBe('b'.repeat(32));
      expect(config.SERVICE_ID).toBe('test-service');
      expect(config.ALLOWED_SERVICES).toEqual(['service1', 'service2', 'service3']);
    });

    it('should parse ALLOWED_SERVICES correctly', () => {
      const env = {
        SERVICE_JWT_SECRET: 'b'.repeat(32),
        SERVICE_ID: 'test-service',
        ALLOWED_SERVICES: '',
      };

      const config = getServiceJWTConfig(env);

      expect(config.ALLOWED_SERVICES).toEqual([]);
    });

    it('should throw on invalid service JWT config', () => {
      const env = {
        SERVICE_JWT_SECRET: 'short',
        SERVICE_ID: '',
      };

      expect(() => getServiceJWTConfig(env)).toThrow('Service JWT config validation failed');
    });
  });

  describe('getDiscordConfig', () => {
    it('should return valid Discord config', () => {
      const env = {
        DISCORD_CLIENT_ID: '123456789',
        DISCORD_CLIENT_SECRET: 'secret123',
        DISCORD_REDIRECT_URI: 'https://example.com/callback',
        DISCORD_BOT_TOKEN: 'bot-token',
      };

      const config = getDiscordConfig(env);

      expect(config.DISCORD_CLIENT_ID).toBe('123456789');
      expect(config.DISCORD_CLIENT_SECRET).toBe('secret123');
      expect(config.DISCORD_REDIRECT_URI).toBe('https://example.com/callback');
      expect(config.DISCORD_BOT_TOKEN).toBe('bot-token');
    });

    it('should allow optional bot token', () => {
      const env = {
        DISCORD_CLIENT_ID: '123456789',
        DISCORD_CLIENT_SECRET: 'secret123',
        DISCORD_REDIRECT_URI: 'https://example.com/callback',
      };

      const config = getDiscordConfig(env);

      expect(config.DISCORD_BOT_TOKEN).toBeUndefined();
    });

    it('should throw on invalid redirect URI', () => {
      const env = {
        DISCORD_CLIENT_ID: '123456789',
        DISCORD_CLIENT_SECRET: 'secret123',
        DISCORD_REDIRECT_URI: 'not-a-url',
      };

      expect(() => getDiscordConfig(env)).toThrow('Discord config validation failed');
    });
  });

  describe('getDatabaseConfig', () => {
    it('should return valid database config', () => {
      const env = {
        NEON_DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        DATABASE_SSL: 'true',
        DATABASE_POOL_SIZE: '20',
      };

      const config = getDatabaseConfig(env);

      expect(config.NEON_DATABASE_URL).toBe('postgresql://user:pass@host:5432/db');
      expect(config.DATABASE_SSL).toBe(true);
      expect(config.DATABASE_POOL_SIZE).toBe(20);
    });

    it('should use defaults for database config', () => {
      const env = {
        NEON_DATABASE_URL: 'postgres://user:pass@host:5432/db',
      };

      const config = getDatabaseConfig(env);

      expect(config.DATABASE_SSL).toBe(true);
      expect(config.DATABASE_POOL_SIZE).toBe(10);
    });

    it('should accept postgres:// protocol', () => {
      const env = {
        NEON_DATABASE_URL: 'postgres://user:pass@host:5432/db',
      };

      const config = getDatabaseConfig(env);

      expect(config.NEON_DATABASE_URL).toBe('postgres://user:pass@host:5432/db');
    });

    it('should throw on invalid database URL', () => {
      const env = {
        NEON_DATABASE_URL: 'http://invalid-url',
      };

      expect(() => getDatabaseConfig(env)).toThrow('Database config validation failed');
    });
  });

  describe('getSupabaseConfig', () => {
    it('should return valid Supabase config when both provided', () => {
      const env = {
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key-123',
      };

      const config = getSupabaseConfig(env);

      expect(config.SUPABASE_URL).toBe('https://project.supabase.co');
      expect(config.SUPABASE_ANON_KEY).toBe('anon-key-123');
    });

    it('should allow both to be undefined', () => {
      const env = {};

      const config = getSupabaseConfig(env);

      expect(config.SUPABASE_URL).toBeUndefined();
      expect(config.SUPABASE_ANON_KEY).toBeUndefined();
    });

    it('should throw when only URL provided', () => {
      const env = {
        SUPABASE_URL: 'https://project.supabase.co',
      };

      expect(() => getSupabaseConfig(env)).toThrow('Supabase config validation failed');
    });

    it('should throw when only key provided', () => {
      const env = {
        SUPABASE_ANON_KEY: 'anon-key-123',
      };

      expect(() => getSupabaseConfig(env)).toThrow('Supabase config validation failed');
    });
  });

  describe('getServerConfig', () => {
    it('should return valid server config', () => {
      const env = {
        PORT: '8080',
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
      };

      const config = getServerConfig(env);

      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('127.0.0.1');
      expect(config.NODE_ENV).toBe('production');
      expect(config.LOG_LEVEL).toBe('warn');
    });

    it('should use defaults for server config', () => {
      const env = {};

      const config = getServerConfig(env);

      expect(config.PORT).toBe(3000);
      expect(config.HOST).toBe('0.0.0.0');
      expect(config.NODE_ENV).toBe('development');
      expect(config.LOG_LEVEL).toBe('info');
    });

    it('should parse PORT as integer', () => {
      const env = {
        PORT: 'not-a-number',
      };

      const config = getServerConfig(env);

      expect(config.PORT).toBe(3000); // Falls back to default
    });
  });

  describe('getCookieConfig', () => {
    it('should return valid cookie config', () => {
      const env = {
        SESSION_COOKIE_NAME: 'my_session',
        COOKIE_DOMAIN: '.example.com',
        COOKIE_SECURE: 'true',
        COOKIE_MAX_AGE: '86400',
      };

      const config = getCookieConfig(env);

      expect(config.SESSION_COOKIE_NAME).toBe('my_session');
      expect(config.COOKIE_DOMAIN).toBe('.example.com');
      expect(config.COOKIE_SECURE).toBe(true);
      expect(config.COOKIE_MAX_AGE).toBe(86400);
    });

    it('should use defaults for cookie config', () => {
      const env = {};

      const config = getCookieConfig(env);

      expect(config.SESSION_COOKIE_NAME).toBe('tiltcheck_session');
      expect(config.COOKIE_DOMAIN).toBe('.tiltcheck.me');
      expect(config.COOKIE_SECURE).toBe(true);
      expect(config.COOKIE_MAX_AGE).toBe(604800);
    });

    it('should parse COOKIE_SECURE as boolean', () => {
      const env = {
        COOKIE_SECURE: 'false',
      };

      const config = getCookieConfig(env);

      expect(config.COOKIE_SECURE).toBe(false);
    });
  });

  describe('validateAllConfig', () => {
    it('should validate full config successfully', () => {
      const env = {
        JWT_SECRET: 'a'.repeat(32),
        SERVICE_JWT_SECRET: 'b'.repeat(32),
        SERVICE_ID: 'test-service',
        DISCORD_CLIENT_ID: '123456789',
        DISCORD_CLIENT_SECRET: 'secret123',
        DISCORD_REDIRECT_URI: 'https://example.com/callback',
        NEON_DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      };

      const result = validateAllConfig(env);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail with missing required fields', () => {
      const env = {
        JWT_SECRET: 'short',
      };

      const result = validateAllConfig(env);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('createPartialValidator', () => {
    it('should create a validator for specific keys', () => {
      const validator = createPartialValidator(['PORT', 'HOST']);
      const env = {
        PORT: '8080',
        HOST: '127.0.0.1',
      };

      const config = validator(env);

      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('127.0.0.1');
    });

    it('should throw on invalid partial config', () => {
      const validator = createPartialValidator(['NODE_ENV']);
      const env = {
        NODE_ENV: 'invalid-env',
      };

      expect(() => validator(env)).toThrow('Config validation failed');
    });

    it('should use process.env when env not provided', () => {
      const validator = createPartialValidator(['PORT']);
      
      // This should not throw as it will use defaults from process.env
      const config = validator();
      expect(config.PORT).toBeDefined();
    });
  });

  describe('Convenience Config Functions', () => {
    const validEnv = {
      JWT_SECRET: 'a'.repeat(32),
      SERVICE_JWT_SECRET: 'b'.repeat(32),
      SERVICE_ID: 'test-service',
      DISCORD_CLIENT_ID: '123456789',
      DISCORD_CLIENT_SECRET: 'secret123',
      DISCORD_REDIRECT_URI: 'https://example.com/callback',
      NEON_DATABASE_URL: 'postgresql://user:pass@host:5432/db',
    };

    describe('getAPIConfig', () => {
      it('should return all config for API service', () => {
        const config = getAPIConfig(validEnv);

        expect(config.jwt).toBeDefined();
        expect(config.serviceJwt).toBeDefined();
        expect(config.discord).toBeDefined();
        expect(config.database).toBeDefined();
        expect(config.server).toBeDefined();
        expect(config.cookie).toBeDefined();
      });
    });

    describe('getDashboardConfig', () => {
      it('should return config for Dashboard service', () => {
        const config = getDashboardConfig(validEnv);

        expect(config.jwt).toBeDefined();
        expect(config.database).toBeDefined();
        expect(config.server).toBeDefined();
        expect(config.cookie).toBeDefined();
      });
    });

    describe('getJustTheTipConfig', () => {
      it('should return config for JustTheTip service', () => {
        const config = getJustTheTipConfig(validEnv);

        expect(config.jwt).toBeDefined();
        expect(config.discord).toBeDefined();
        expect(config.database).toBeDefined();
        expect(config.server).toBeDefined();
        expect(config.cookie).toBeDefined();
      });
    });

    describe('getBotConfig', () => {
      it('should return config for Bot service', () => {
        const config = getBotConfig(validEnv);

        expect(config.serviceJwt).toBeDefined();
        expect(config.discord).toBeDefined();
        expect(config.server).toBeDefined();
      });
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should handle empty strings in ALLOWED_SERVICES', () => {
      const result = validateEnv(serviceJwtConfigSchema, {
        SERVICE_JWT_SECRET: 'b'.repeat(32),
        SERVICE_ID: 'test',
        ALLOWED_SERVICES: ',,,',
      });

      expect(result.success).toBe(true);
      expect(result.data?.ALLOWED_SERVICES).toEqual([]);
    });

    it('should split ALLOWED_SERVICES by comma', () => {
      const result = validateEnv(serviceJwtConfigSchema, {
        SERVICE_JWT_SECRET: 'b'.repeat(32),
        SERVICE_ID: 'test',
        ALLOWED_SERVICES: 'service1,service2,service3',
      });

      expect(result.success).toBe(true);
      expect(result.data?.ALLOWED_SERVICES).toEqual(['service1', 'service2', 'service3']);
    });

    it('should handle all NODE_ENV values', () => {
      const envs = ['development', 'production', 'test'];
      
      for (const env of envs) {
        const result = validateEnv(serverConfigSchema, { NODE_ENV: env });
        expect(result.success).toBe(true);
        expect(result.data?.NODE_ENV).toBe(env);
      }
    });

    it('should handle all LOG_LEVEL values', () => {
      const levels = ['debug', 'info', 'warn', 'error'];
      
      for (const level of levels) {
        const result = validateEnv(serverConfigSchema, { LOG_LEVEL: level });
        expect(result.success).toBe(true);
        expect(result.data?.LOG_LEVEL).toBe(level);
      }
    });
  });
});
