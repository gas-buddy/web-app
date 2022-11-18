import path from 'path';
import Redis from 'ioredis';
import { insertConfigurationBefore, Service } from '@gasbuddy/service';
import createRedisMiddleware, { RedisSessionOptions, sessionWasFetchedOrSaved } from '@gasbuddy/redis-session';
import type { RequestHandler } from 'express';
import { validateCsrf } from './csrf';

import type { CsrfConfiguration, WebAppRequestLocals, WebAppServiceLocals } from './types';

export function useWebApp<
  SLocals extends WebAppServiceLocals = WebAppServiceLocals,
  RLocals extends WebAppRequestLocals = WebAppRequestLocals,
>(baseService?: Service<SLocals, RLocals>): Service<SLocals, RLocals> {
  let sessionMiddleware: RequestHandler | undefined;
  let csrf: CsrfConfiguration;

  return {
    ...baseService,
    configure(startOptions, options) {
      // The expectation is that you pass in directories such that any values in the first
      // get overridden if the same value is in a subsequent entry. So that means our
      // gb-services defaults need to go "before" any existing
      const baseConfig = baseService?.configure?.(startOptions, options);
      const configurationDirectories = insertConfigurationBefore(
        baseConfig?.configurationDirectories,
        path.resolve(__dirname, '../config'),
        path.resolve(startOptions.rootDirectory, 'config'),
      );

      return {
        ...baseConfig,
        configurationDirectories,
      };
    },
    async start(app) {
      await baseService?.start(app);

      const sessionConfig = app.locals.config.get('session') as RedisSessionOptions;
      const redis = new Redis(app.locals.config.get('redis'));
      redis.on('error', (err) => {
        app.locals.logger.error(err, 'Redis error');
      });
      sessionMiddleware = createRedisMiddleware({
        ...sessionConfig,
        store: {
          ...sessionConfig.store,
          redis,
        },
      });
      app.locals.redis = redis;
      csrf = app.locals.config.get('security:csrf');
      if (csrf && !csrf?.cookie?.domain && sessionConfig.cookie?.domain) {
        csrf.cookie = csrf.cookie || {};
        csrf.cookie.domain = sessionConfig.cookie.domain;
      }
    },
    async stop(app) {
      app.locals.logger.debug('@gasbuddy/web-app stopping');
      await baseService?.stop?.(app);
      try {
        await app.locals.redis?.quit();
        app.locals.redis?.disconnect();
      } catch (error) {
        app.locals.logger.error(error, 'Redis disconnect error');
      }
    },
    getLogFields(req, values) {
      baseService?.getLogFields?.(req, values);
      if (req.session?.id && sessionWasFetchedOrSaved(req)) {
        values.sid = req.session.id;
      }
    },
    async onRequest(req, res) {
      const error = await new Promise((resolve) => {
        sessionMiddleware!(req, res, resolve);
      });
      if (error) {
        throw error as Error;
      }
      return baseService?.onRequest?.(req, res);
    },
    authorize(req, res) {
      if (csrf?.action === 'warn' || csrf?.action === 'block') {
        validateCsrf(csrf, req, res);
      }
      return baseService?.authorize?.(req, res) || true;
    },
  };
}
