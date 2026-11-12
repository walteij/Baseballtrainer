import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z, ZodError, type ZodType } from 'zod';
import pino from 'pino';
import { AppError } from './errors/AppError.js';
import { BadRequestError } from './errors/errorTypes.js';
import { authorizeRequest, type AuthenticatedUser } from './auth.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export async function body<T>(req: HttpRequest, schema: ZodType<T>): Promise<T> {
  let value: unknown;
  try { value = await req.json(); } catch { throw new BadRequestError('Request body must be valid JSON'); }
  return schema.parse(value);
}
export function query<T>(req: HttpRequest, schema: ZodType<T>): T {
  const raw: Record<string, string> = {};
  for (const [key, value] of req.query) {
    if (key in raw) throw new BadRequestError(`Duplicate query parameter: ${key}`);
    raw[key] = value;
  }
  return schema.parse(raw);
}
export const emptyQuery = z.object({}).strict();
export function respond(status: number, jsonBody: unknown): HttpResponseInit { return { status, jsonBody }; }
export function required<T>(value: T | null | undefined, resource: string, id: string): T {
  if (value == null) throw new AppError('NOT_FOUND', `${resource} '${id}' was not found`, 404);
  return value;
}
export function register(name: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', route: string, action: (req: HttpRequest, user: AuthenticatedUser) => Promise<HttpResponseInit>): void {
  app.http(name, { methods: [method], authLevel: 'anonymous', route, handler: async (req: HttpRequest, context: InvocationContext) => {
    const started = Date.now();
    let response: HttpResponseInit;
    try { const user = await authorizeRequest(req); response = await action(req, user); }
    catch (error) {
      if (error instanceof ZodError || (error instanceof Error && error.name === 'ZodError' && Array.isArray((error as ZodError).issues))) {
        const issues = (error as ZodError).issues;
        response = respond(422, { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: { issues: issues.map(i => ({ field: i.path.join('.'), message: i.message })) } } });
      }
      else if (error instanceof AppError) {
        if (error.status === 503) logger.error({ functionName: name, code: error.code, message: error.message }, 'Service unavailable');
        response = respond(error.status, { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
        if (error.status === 401) response.headers = { 'www-authenticate': 'Bearer' };
      }
      else { logger.error({ err: error, functionName: name }, 'Unhandled request error'); response = respond(500, { error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } }); }
    }
    logger.info({ method, route, status: response.status, durationMs: Date.now() - started, invocationId: context.invocationId }, 'request completed');
    return response;
  } });
}
