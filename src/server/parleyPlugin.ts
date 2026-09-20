import { handleCreation } from './creatorService';
import type { Plugin, ViteDevServer } from 'vite';
import { handleGameEdit, getParleyConfig, type GameEditRequest } from './parleyService';

/**
 * Vite plugin that adds internal API route handlers to the local dev server (port 5175).
 * Routes handled:
 * - POST /api/edit-game (or /api/game-edit): Edits game state, mechanics, and textures via MIT's Parley API.
 * - GET /api/parley/health: Returns API status and configured model.
 */
interface MiddlewareReq {
  headers?: Record<string,string | undefined>;
  url?: string;
  method?: string;
  on(event: string, listener: (...args: any[]) => void): void;
  destroy?(): void;
}

interface MiddlewareRes {
  statusCode: number;
  headersSent?: boolean;
  setHeader(name: string, value: string | number): void;
  end(chunk?: string): void;
}

export function parleyApiPlugin(): Plugin {
  return {
    name: 'gameforge-parley-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (rawReq, rawRes, next) => {
        const req = rawReq as unknown as MiddlewareReq;
        const res = rawRes as unknown as MiddlewareRes;
        const url = req.url ? req.url.split('?')[0] : '';

        // Health check endpoint
        if (url === '/api/parley/health' && req.method === 'GET') {
          try {
            const config = getParleyConfig();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                hasKey: Boolean(config.apiKey),
                baseUrl: config.baseUrl,
                model: config.model,
              })
            );
          } catch (err) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
          return;
        }

        // Game edit endpoint
        if ((url === '/api/edit-game' || url === '/api/game-edit' || url === '/api/creations') && req.method === 'POST') {
          let rawBody = '';
          let rejected = false;
          const origin = req.headers?.origin;
          if (origin && new URL(origin).host !== req.headers?.host) { res.statusCode = 403; res.end(JSON.stringify({ok:false,error:'Cross-origin creation requests are not allowed.'})); return; }
          req.on('data', (chunk: unknown) => {
            if (rejected) return;
            rawBody += String(chunk);
            // Guard against excessively large payloads (> 5MB)
            if (rawBody.length > 128 * 1024) {
              res.setHeader('Content-Type', 'application/json');
              rejected = true;
              res.statusCode = 413;
              res.end(JSON.stringify({ ok: false, error: 'Payload too large.' }));
              req.destroy?.();
            }
          });

          req.on('end', async () => {
            if (rejected) return;
            try {
              let requestData: GameEditRequest;
              try {
                requestData = JSON.parse(rawBody || '{}');
              } catch (parseErr) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: `Malformed JSON in request body: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
                  })
                );
                return;
              }

              const result = url === '/api/creations' ? await handleCreation(requestData) : await handleGameEdit(requestData);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.statusCode || (result.ok ? 200 : 500);
              res.end(JSON.stringify(result));
            } catch (err) {
              // Dev server resilience: always return a JSON error instead of crashing
              
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  ok: false,
                  error: `Internal server error in GameForge API handler: ${err instanceof Error ? err.message : String(err)}`,
                })
              );
            }
          });

          req.on('error', (err: unknown) => {
            void err;
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: 'Request connection error.' }));
            }
          });

          return;
        }

        // Pass through to next Vite middleware
        next();
      });
    },
  };
}

export default parleyApiPlugin;
