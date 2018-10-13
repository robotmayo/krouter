import Layer from "./layer";
import * as koa from "koa";

declare module "koa" {
  interface Context {
    router?: SimpleKoaRouter;
    params?: { [key: string]: any };
  }
}

export interface RouterOpts {
  prefix?: string;
}

const defaultOpts: RouterOpts = {
  prefix: ""
};

export default class SimpleKoaRouter {
  stack: Layer[];
  opts: RouterOpts;
  constructor(opts: RouterOpts = defaultOpts) {
    this.stack = [];
    this.opts = opts;
  }
  middleware(): koa.Middleware {
    return async (ctx, next) => {
      ctx.router = this;
      for (const layer of this.stack) {
        if (!layer.match(ctx.request.url, ctx.request.method)) {
          continue;
        }
        await layer.execute(ctx);
      }
      return next();
    };
  }
  private register(path: string, method: string, fn: koa.Middleware[]) {
    if (this.opts.prefix) {
      path = this.opts.prefix + path;
    }
    const layer = new Layer(
      path === "/" && this.opts.prefix ? this.opts.prefix : path,
      fn,
      method
    );
    this.stack.push(layer);
    return this;
  }

  use(path: string | koa.Middleware, ...middleware: koa.Middleware[]) {
    if (typeof path === "string") {
      return this.register(path, "", middleware);
    }
    return this.register("(.*)", "", [path].concat(middleware));
  }

  get(path: string | koa.Middleware, ...middleware: koa.Middleware[]) {
    if (typeof path === "string") {
      return this.register(path, "GET", middleware);
    }
    return this.register("(.*)", "GET", [path].concat(middleware));
  }

  post(path: string | koa.Middleware, ...middleware: koa.Middleware[]) {
    if (typeof path === "string") {
      return this.register(path, "POST", middleware);
    }
    return this.register("(.*)", "POST", [path].concat(middleware));
  }

  put(path: string | koa.Middleware, ...middleware: koa.Middleware[]) {
    if (typeof path === "string") {
      return this.register(path, "PUT", middleware);
    }
    return this.register("(.*)", "PUT", [path].concat(middleware));
  }

  del(path: string | koa.Middleware, ...middleware: koa.Middleware[]) {
    if (typeof path === "string") {
      return this.register(path, "DELETE", middleware);
    }
    return this.register("(.*)", "DELETE", [path].concat(middleware));
  }

  patch(path: string | koa.Middleware, ...middleware: koa.Middleware[]) {
    if (typeof path === "string") {
      return this.register(path, "PATCH", middleware);
    }
    return this.register("(.*)", "PATCH", [path].concat(middleware));
  }
}
