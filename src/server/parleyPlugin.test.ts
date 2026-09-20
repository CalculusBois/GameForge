import { describe, it, expect, vi } from 'vitest';
import { parleyApiPlugin } from './parleyPlugin';

class SimpleEmitter {
  private listeners: Record<string, ((...args: any[]) => void)[]> = {};
  on(event: string, fn: (...args: any[]) => void) {
    (this.listeners[event] ??= []).push(fn);
  }
  emit(event: string, ...args: any[]) {
    this.listeners[event]?.forEach((fn) => fn(...args));
  }
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    end(chunk?: string) {
      if (chunk) this.body += chunk;
    },
  };
}

describe('Vite Parley API Plugin', () => {
  it('registers route handler middleware on Vite dev server', () => {
    const plugin = parleyApiPlugin();
    expect(plugin.name).toBe('gameforge-parley-api');

    let registeredMiddleware: any = null;
    const mockServer = {
      middlewares: {
        use(fn: any) {
          registeredMiddleware = fn;
        },
      },
    };

    (plugin.configureServer as any)(mockServer);
    expect(typeof registeredMiddleware).toBe('function');
  });

  it('handles GET /api/parley/health', async () => {
    const plugin = parleyApiPlugin();
    let middleware: any;
    (plugin.configureServer as any)({
      middlewares: { use: (fn: any) => (middleware = fn) },
    });

    const req = { url: '/api/parley/health', method: 'GET' };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.ok).toBe(true);
    expect(parsed.hasKey).toBe(true);
    expect(parsed.parleyModel).toBe('gpt-6-astra');
    expect(parsed.providers).toContain('local');
    expect(parsed.order).toMatch(/local synthesizer/);
    expect(typeof parsed.primary).toBe('string');
    expect(typeof parsed.model).toBe('string');
  });

  it('handles POST /api/edit-game with malformed JSON gracefully', async () => {
    const plugin = parleyApiPlugin();
    let middleware: any;
    (plugin.configureServer as any)({
      middlewares: { use: (fn: any) => (middleware = fn) },
    });

    const req = new SimpleEmitter() as any;
    req.url = '/api/edit-game';
    req.method = 'POST';

    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    req.emit('data', 'not valid json {{{');
    req.emit('end');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.body);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain('Malformed JSON');
  });

  it('passes through non-API requests to next()', async () => {
    const plugin = parleyApiPlugin();
    let middleware: any;
    (plugin.configureServer as any)({
      middlewares: { use: (fn: any) => (middleware = fn) },
    });

    const req = { url: '/index.html', method: 'GET' };
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('handles POST /api/edit-game for open-ended generative requests with 400 when prompt is empty', async () => {
    const plugin = parleyApiPlugin();
    let middleware: any;
    (plugin.configureServer as any)({
      middlewares: { use: (fn: any) => (middleware = fn) },
    });

    const req = new SimpleEmitter() as any;
    req.url = '/api/edit-game';
    req.method = 'POST';

    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res, next);

    req.emit('data', JSON.stringify({ prompt: '   ', gameType: 'open-ended' }));
    req.emit('end');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.body);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain('provide a prompt');
  });
});
