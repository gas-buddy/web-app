import type {
  RequestLocals,
  ServiceConfiguration,
  ServiceLocals,
} from '@gasbuddy/service';
import type { CookieOptions } from 'express-serve-static-core';
import type { RedisSessionOptions } from '@gasbuddy/redis-session';
import type { Redis, RedisOptions } from 'ioredis';

export interface WebAppServiceLocals extends ServiceLocals {
  redis: Redis;
}

export interface WebAppRequestLocals extends RequestLocals {
}

export interface CsrfConfiguration {
  action?: 'block' | 'warn'; // Empty means "ignore CSRF protection"
  // List of include/exclude paths for CSRF protection
  exclude?: Array<string | RegExp>,
  include?: Array<string | RegExp>,
  headerAndCookieName?: string;
  autoAssignCookie?: boolean;
  cookie?: CookieOptions;
}

export interface WebAppConfiguration extends ServiceConfiguration {
  redis?: RedisOptions;
  session?: RedisSessionOptions;
  security?: {
    csrf?: CsrfConfiguration;
  },
}
