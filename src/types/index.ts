import type {
  RequestLocals,
  ServiceConfiguration,
  ServiceLocals,
  ServiceRouter,
} from '@gasbuddy/service';
import type { Session } from 'express-session';
import type { CookieOptions } from 'express-serve-static-core';
import type { RedisSessionOptions } from '@gasbuddy/redis-session';
import type { Redis, RedisOptions } from 'ioredis';

export interface WebAppServiceLocals extends ServiceLocals {
  redis: Redis;
}

export interface WebAppRequestLocals<SessionType extends Session = Session> extends RequestLocals {
  // It's cleaner to put this here
  session: SessionType;
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

export type WebAppRouter<
  SessionType extends Session = Session,
  SLocals extends WebAppServiceLocals = WebAppServiceLocals,
  RLocals extends WebAppRequestLocals = WebAppRequestLocals<SessionType>,
> = ServiceRouter<SLocals, RLocals>;
