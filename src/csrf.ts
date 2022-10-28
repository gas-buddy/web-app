import { RequestWithApp, ResponseFromApp, ServiceError } from '@gasbuddy/service';
import crypto from 'crypto';

import type { CsrfConfiguration } from './index';

const DEFAULT_COOKIE_NAME = '_csrf';
const RES_COOKIE_PROP = Symbol('CSRF initial request property');

function matches(rules: string | RegExp | Array<string | RegExp>, url: string) {
  if (Array.isArray(rules)) {
    if (rules.find((rule) => matches(rule, url))) {
      return true;
    }
  }
  if (rules instanceof RegExp) {
    return rules.test(url);
  }
  return rules === url;
}

function shouldValidate(
  url: string,
  exclude?: Array<string | RegExp>,
  include?: Array<string | RegExp>,
) {
  if (exclude) {
    if (matches(exclude, url)) {
      return false;
    }
  }
  if (include) {
    if (!matches(include, url)) {
      return false;
    }
  }
  return true;
}

export function assignCsrfCookie(
  config: CsrfConfiguration,
  req: RequestWithApp,
  res: ResponseFromApp,
) {
  // 1 is a "version number" in case we want to change this at some point
  const cookie = `1.${crypto.randomBytes(12).toString('base64')}`;
  res?.cookie(config.headerAndCookieName || DEFAULT_COOKIE_NAME, cookie, config.cookie || {});
  (res.locals as any)[RES_COOKIE_PROP] = cookie;
}

export function isValidCsrf(
  config: CsrfConfiguration,
  req: RequestWithApp,
  res: ResponseFromApp,
  // If you pull the expected value from somewhere else (like session), you can pass it in here
  referenceValue?: string,
) {
  // Assign the cookie
  if (config.autoAssignCookie) {
    if (!req.cookies || !req.cookies[config.headerAndCookieName || DEFAULT_COOKIE_NAME]) {
      assignCsrfCookie(config, req, res);
    }
  }

  // Does this method need validation?
  if (
    req.method.toLowerCase() === 'get'
    || req.method.toLowerCase() === 'head'
    || !shouldValidate(req.originalUrl, config.exclude, config.include)
  ) {
    return true;
  }

  // Do validation
  const name = config.headerAndCookieName || DEFAULT_COOKIE_NAME;
  const header = req.headers[name];
  const headerValue = Array.isArray(header) ? header[0] : header;
  const csrfValue = headerValue || (req.body?.[name] as string | undefined);

  const expectedValue = referenceValue || req.cookies?.[name];

  if (
    (expectedValue && csrfValue === expectedValue)
    || (csrfValue && decodeURIComponent(csrfValue) === decodeURIComponent(expectedValue))
  ) {
    return true;
  }

  req.app.locals.logger.debug('CSRF validation failed');
  return false;
}

export function validateCsrf(config: CsrfConfiguration, req: RequestWithApp, res: ResponseFromApp) {
  const isValid = isValidCsrf(config, req, res);
  if (!isValid) {
    if (config.action === 'block') {
      throw new ServiceError(req.app, 'Request validation failed', {
        status: 400,
        domain: 'http',
        code: 'validation',
      });
    } else if (config.action === 'warn') {
      req.app.locals.logger.warn('CSRF validation failed');
    }
  }
}

export function getCsrf(req: RequestWithApp) {
  const cookie = req.cookies?.[req.app.locals.config.get('security:csrf').headerAndCookieName || DEFAULT_COOKIE_NAME];
  return cookie || (req.res?.locals as any)[RES_COOKIE_PROP];
}
