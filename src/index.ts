import Layer from "./layer";
import * as koa from "koa";

declare module "koa" {
  interface Context {
    router?: KRouter;
    params?: { [key: string]: any };
  }
}

export interface RouterOpts {
  prefix?: string;
}

const defaultOpts: RouterOpts = {
  prefix: ""
};

export default class KRouter {
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

  private register(path: string, method: string, router: KRouter): KRouter;
  private register(
    path: string,
    method: string,
    middleware: koa.Middleware[]
  ): KRouter;
  private register(
    path: string,
    method: string,
    fn: koa.Middleware[] | KRouter
  ) {
    if (this.opts.prefix) {
      // if they set a prefix and use / as a path
      // that usually means they want the root to match prefix/ and prefix(no slash)
      if (path === "/") {
        path = "";
      }
      path = this.opts.prefix + path;
    }
    if (fn instanceof KRouter) {
      const newLayers = fn.stack.map(layer => {
        let newPath = layer.path;
        if (newPath === "") newPath = "/";
        if (newPath === "/") {
          if (path.endsWith("/")) {
            newPath = path + newPath;
          } else {
            newPath = path + "/" + newPath;
          }
          return new Layer(newPath, layer.stack.slice(), layer.method);
        }
        if (newPath.startsWith("/")) {
          if (path.endsWith("/")) {
            newPath = path + newPath.slice(1);
          } else {
            newPath = path + newPath;
          }
        } else {
          if (path.endsWith("/")) {
            newPath = path + newPath;
          } else {
            newPath = path + "/" + newPath;
          }
        }
        return new Layer(newPath, layer.stack.slice(), layer.method);
      });
      this.stack = this.stack.concat(newLayers);
      return this;
    }
    const layer = new Layer(
      path === "/" && this.opts.prefix ? this.opts.prefix : path,
      fn,
      method
    );
    this.stack.push(layer);
    return this;
  }
  use(path: string, ...middleware: koa.Middleware[]): KRouter;
  use(...middleware: koa.Middleware[]): KRouter;
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

  mount(router: KRouter): KRouter;
  mount(path: string, router: KRouter): KRouter;
  mount(path: string | KRouter, router?: KRouter): KRouter {
    if (typeof path === "string") {
      return this.register(path, "", router);
    }
    return this.register("", "", path);
  }
}
