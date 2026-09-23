import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import serverless from 'serverless-http';
import { app } from '../../apiApp';

const serverlessHandler = serverless(app, {
  binary: ['audio/mpeg', 'audio/mp3', 'application/octet-stream'],
});

/**
 * Netlify may pass either the original `/api/...` path or
 * `/.netlify/functions/api/...` depending on redirect style.
 * Normalize so Express routes at `/api/*` always match.
 */
function normalizeApiPath(event: HandlerEvent): void {
  const fnPrefix = '/.netlify/functions/api';
  const rawPath = (event as HandlerEvent & { rawPath?: string }).rawPath;
  const current = rawPath || event.path || '';

  if (current.startsWith(fnPrefix)) {
    const rest = current.slice(fnPrefix.length);
    const normalized = rest
      ? `/api${rest.startsWith('/') ? rest : `/${rest}`}`
      : '/api';
    event.path = normalized;
    if (rawPath) {
      (event as HandlerEvent & { rawPath: string }).rawPath = normalized;
    }
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  normalizeApiPath(event);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return serverlessHandler(event as any, context as any);
};
