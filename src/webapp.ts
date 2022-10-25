import path from 'path';
import Redis from 'ioredis';
import type { RequestHandler } from 'express';
import { Service } from '@gasbuddy/service';
import createRedisMiddleware, { sessionWasFetchedOrSaved } from '@gasbuddy/redis-session';
import type { WebAppRequestLocals, WebAppServiceLocals } from './index';

export function useWebApp<
  SLocals extends WebAppServiceLocals = WebAppServiceLocals,
  RLocals extends WebAppRequestLocals = WebAppRequestLocals,
>(baseService?: Service<SLocals, RLocals>): Service<SLocals, RLocals> {
  let sessionMiddleware: RequestHandler | undefined;
  return {
    ...baseService,
    configure(startOptions, options) {
      const baseConfig = baseService?.configure?.(startOptions, options);
      // The expectation is that you pass in directories such that any values in the first
      // get overridden if the same value is in a subsequent entry. So that means our
      // gb-services defaults need to go "before" any existing
      const configurationDirectories = [
        ...(baseConfig?.configurationDirectories ?? []),
        path.resolve(__dirname, '../config'),
        ...(options.configurationDirectories ?? []),
      ];
      const projectConfig = path.resolve(startOptions.rootDirectory, 'config');
      if (!configurationDirectories.includes(projectConfig)) {
        configurationDirectories.push(projectConfig);
      }

      return {
        ...baseConfig,
        configurationDirectories,
      };
    },
    async start(app) {
      await baseService?.start(app);

      const redis = new Redis(app.locals.config.get('redis'));
      sessionMiddleware = createRedisMiddleware({
        ...app.locals.config.get('session'),
        store: {
          ...app.locals.config.get('session:store'),
          redis,
        },
      });
      app.locals.redis = redis;
    },
    async stop(app) {
      await baseService?.stop?.(app);
      await app.locals.redis.disconnect();
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
      if (res.locals && req.session) {
        res.locals.session = req.session;
      }
      return baseService?.onRequest?.(req, res);
    },
  };
}
