import * as koa from "koa";
import * as pathToRegexp from "path-to-regexp";
import * as compose from "koa-compose";
import pathMatch from "./path-match";
import StdError from "@robotmayo/stderror";

export default class Layer {
  path: string;
  matchedPath: string | null;
  regex: RegExp;
  keys: pathToRegexp.Key[] = [];
  params: { [key: string]: any } | null;
  method: string;
  stack: koa.Middleware[];
  middleware: compose.ComposedMiddleware<koa.Context>;

  extractor: (
    path: string
  ) => {
    params: {
      [key: string]: any;
    };
    matches: boolean;
  };
  constructor(path: string, middleware: koa.Middleware[], method: string) {
    this.path = path;
    this.matchedPath = null;
    const { re, keys, extractor } = pathMatch(path);
    this.regex = re;
    this.keys = keys;
    this.extractor = extractor;
    this.stack = middleware;
    this.stack.forEach(m => {
      if (typeof m !== "function") {
        throw new StdError(
          "krouter middleware must be a function",
          "VALIDATION_ERR",
          { badLayerFn: m }
        );
      }
    });
    this.middleware = compose(this.stack);
    this.method = method;
    this.params = null;
  }

  match(path: string, method: string) {
    if (this.method && this.method != method) return false;
    const matchData = this.extractor(path);
    if (!matchData.matches) {
      this.params = null;
      return false;
    }
    this.matchedPath = path;
    this.params = matchData.params;
    return true;
  }

  async execute(ctx: koa.Context) {
    ctx.params = this.params;
    ctx.matchedPath = this.matchedPath;
    await this.middleware(ctx);
  }
}
