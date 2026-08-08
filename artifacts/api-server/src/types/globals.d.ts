// Ambient type shims for the api-server workspace package.
// These ensure the IDE works correctly when the sub-package node_modules
// have not been installed locally. On Vercel/CI, the real @types/* take precedence.

// ─── Node.js globals (fallback when @types/node is not locally installed) ────

declare var process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  version: string;
  platform: string;
  [key: string]: any;
};

declare var global: typeof globalThis & { [key: string]: any };

// ─── express module shim ──────────────────────────────────────────────────────

declare module 'express' {
  import * as http from 'http';

  export interface Request extends http.IncomingMessage {
    body: any;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    headers: Record<string, string | string[] | undefined>;
    log: { error: (obj: any, msg?: string) => void; info: (obj: any, msg?: string) => void };
    [key: string]: any;
  }

  export interface Response extends http.ServerResponse {
    json(body?: any): this;
    status(code: number): this;
    send(body?: any): this;
    set(field: string, value: string): this;
    [key: string]: any;
  }

  export interface NextFunction {
    (err?: any): void;
  }

  export interface IRouter {
    get(path: string, ...handlers: Array<(req: Request, res: Response, next?: NextFunction) => any>): this;
    post(path: string, ...handlers: Array<(req: Request, res: Response, next?: NextFunction) => any>): this;
    put(path: string, ...handlers: Array<(req: Request, res: Response, next?: NextFunction) => any>): this;
    patch(path: string, ...handlers: Array<(req: Request, res: Response, next?: NextFunction) => any>): this;
    delete(path: string, ...handlers: Array<(req: Request, res: Response, next?: NextFunction) => any>): this;
    use(...handlers: Array<any>): this;
    use(path: string, ...handlers: Array<any>): this;
  }

  export interface Router extends IRouter {}
  export function Router(): Router;

  export interface Application extends IRouter {
    listen(port: number, callback?: () => void): http.Server;
    listen(port: number, host: string, callback?: () => void): http.Server;
    set(setting: string, val: any): this;
    use(...handlers: Array<any>): this;
    use(path: string, ...handlers: Array<any>): this;
  }

  function express(): Application;
  namespace express {
    function Router(): Router;
    interface Request extends http.IncomingMessage {
      body: any;
      params: Record<string, string>;
      query: Record<string, string | string[]>;
      log: { error: (obj: any, msg?: string) => void; info: (obj: any, msg?: string) => void };
      [key: string]: any;
    }
    interface Response extends http.ServerResponse {
      json(body?: any): Response;
      status(code: number): Response;
      send(body?: any): Response;
      [key: string]: any;
    }
    interface NextFunction {
      (err?: any): void;
    }
    type Express = Application;
  }
  export type { express as Express };
  export default express;
}
