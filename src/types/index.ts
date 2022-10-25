import type {
  RequestLocals,
  ServiceConfiguration,
  ServiceLocals,
  ServiceRouter,
} from '@gasbuddy/service';
import type { Session } from 'express-session';
import type { RedisSessionOptions } from '@gasbuddy/redis-session';
import type { Redis, RedisOptions } from 'ioredis';

export interface WebAppServiceLocals extends ServiceLocals {
  redis: Redis;
}

export interface WebAppRequestLocals<SessionType extends Session = Session> extends RequestLocals {
  // It's cleaner to put this here
  session: SessionType;
}

export interface WebAppConfiguration extends ServiceConfiguration {
  redis?: RedisOptions;
  session?: RedisSessionOptions;
}

export type WebAppRouter<
  SessionType extends Session = Session,
  SLocals extends WebAppServiceLocals = WebAppServiceLocals,
  RLocals extends WebAppRequestLocals = WebAppRequestLocals<SessionType>,
> = ServiceRouter<SLocals, RLocals>;
