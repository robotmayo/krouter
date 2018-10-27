import test from "ava";
import * as supertest from "supertest";
import * as Koa from "koa";
import KRouter from "./";
import * as http from "http";
import Layer from "./layer";
import StdError from "@robotmayo/stderror";

function listen(app: Koa) {
  return new Promise((resolve, reject) => {
    let server: http.Server;
    server = app
      .listen(0)
      .once("error", reject)
      .once("listening", () => {
        server.removeListener("error", reject);
        resolve(server);
      });
  });
}

type verb = "get" | "put" | "post" | "patch" | "delete" | "del" | "options";
test("[verb] routing matches on verb and not path", async t => {
  const app = new Koa();
  const router = new KRouter();
  const inputs: {
    args: {
      verb: verb;
    };
    expect: {
      body: (verb: string) => string;
    };
  }[] = [
    {
      args: {
        verb: "get"
      },
      expect: {
        body: (verb: string) => `${verb} NO PATH`
      }
    }
  ];

  for (let input of inputs) {
    router[input.args.verb](function(ctx, next) {
      ctx.status = 200;
      ctx.body = `${input.args.verb} NO PATH`;
      return next();
    });
  }
  app.use(router.middleware());
  const server = await listen(app);
  const agent = supertest.agent(server);

  for (let input of inputs) {
    const res = await agent[input.args.verb]("/");
    t.is(res.status, 200);
    t.is(res.text, input.expect.body(input.args.verb));
  }
});

test("[verb] matches on path", async t => {
  interface testInput {
    args: {
      injectMiddleware(router: KRouter): void;
      usePath: string;
      verb: verb;
    };
    name: string;
    expect: {
      status: number;
    };
  }
  const inputs: testInput[] = [
    {
      args: {
        injectMiddleware(router) {
          router.get("/the-get-path", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/the-get-path",
        verb: "get"
      },
      name: "get will match",
      expect: {
        status: 200
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.get("/the-get-path-doesnt-exist", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/thisisthewrongpath",
        verb: "get"
      },
      name: "get will not match",
      expect: {
        status: 404
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.post("/the-post-path", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/the-post-path",
        verb: "post"
      },
      name: "post will match",
      expect: {
        status: 200
      }
    },
    {
      args: {
        injectMiddleware(router) {},
        usePath: "/thisisthewrongpath",
        verb: "post"
      },
      name: "post will not match",
      expect: {
        status: 404
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.put("/the-put-path", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/the-put-path",
        verb: "put"
      },
      name: "put will match",
      expect: {
        status: 200
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.put("/the-put-path-nomatch", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/thisisthewrongpath",
        verb: "put"
      },
      name: "put will not match",
      expect: {
        status: 404
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.del("/the-del-path", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/the-del-path",
        verb: "delete"
      },
      name: "del will match",
      expect: {
        status: 200
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.del("/the-del-path-nomatch", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/thisisthewrongpath",
        verb: "delete"
      },
      name: "del will not match",
      expect: {
        status: 404
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.patch("/the-patch-path", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/the-patch-path",
        verb: "patch"
      },
      name: "patch will match",
      expect: {
        status: 200
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.patch("/the-patch-path-nomatch", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/thisisthewrongpath",
        verb: "patch"
      },
      name: "patch will not match",
      expect: {
        status: 404
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.options("/the-options-path", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/the-options-path",
        verb: "options"
      },
      name: "options will match",
      expect: {
        status: 200
      }
    },
    {
      args: {
        injectMiddleware(router) {
          router.options("/the-options-path-nomatch", (ctx, next) => {
            ctx.status = 200;
            return next();
          });
        },
        usePath: "/thisisthewrongpath",
        verb: "options"
      },
      name: "options will not match",
      expect: {
        status: 404
      }
    }
  ];
  const app = new Koa();
  const router = new KRouter();
  for (let input of inputs) {
    input.args.injectMiddleware(router);
  }

  app.use(router.middleware());
  const server = await listen(app);
  const agent = supertest.agent(server);

  for (let input of inputs) {
    const res = await agent[input.args.verb](input.args.usePath);
    t.is(res.status, input.expect.status, input.name);
  }
});

test("mounted routers work", async t => {
  const app = new Koa();
  const router = new KRouter();
  const subRouter = new KRouter();
  subRouter.get("/posts", (ctx, next) => {
    ctx.body = "Im the subrouter";
  });
  router.mount(subRouter);
  app.use(router.middleware());
  const server = await listen(app);
  const res = await supertest(server).get("/posts");
  t.is(res.status, 200);
  t.is(res.text, "Im the subrouter");
});

test("mounted routers on a path", async t => {
  const app = new Koa();
  const router = new KRouter();
  const subRouter = new KRouter();
  subRouter.get("/posts", (ctx, next) => {
    ctx.body = "Im the subrouter";
  });
  router.mount("/api", subRouter);
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/posts");
  t.is(res.status, 404);
  res = await supertest(server).get("/api/posts");
  t.is(res.status, 200);
  t.is(res.text, "Im the subrouter");
});

test("mounted routers on a path with a prefix", async t => {
  const app = new Koa();
  const router = new KRouter({ prefix: "/api" });
  const subRouter = new KRouter();
  subRouter.get("/posts", (ctx, next) => {
    ctx.body = "Im the subrouter";
  });
  router.mount(subRouter);
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/posts");
  t.is(res.status, 404);
  res = await supertest(server).get("/api/posts");
  t.is(res.status, 200);
  t.is(res.text, "Im the subrouter");
});

test("mounted routers with a prefix on a path with a prefix", async t => {
  const app = new Koa();
  const router = new KRouter({ prefix: "/api" });
  const subRouter = new KRouter({ prefix: "/posts" });
  subRouter.get("/", (ctx, next) => {
    ctx.body = "Im the subrouter";
  });
  router.mount(subRouter);
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/posts");
  t.is(res.status, 404);
  res = await supertest(server).get("/api/posts");
  t.is(res.status, 200);
  t.is(res.text, "Im the subrouter");
});

test("layer throws if middleware is not a function", t => {
  const err: StdError = t.throws(
    () => new Layer("/", ["NOT A FN" as any], "GET"),
    StdError
  );
  t.is(err.message, "krouter middleware must be a function");
  t.is(err.code, "VALIDATION_ERR");
  t.deepEqual(err.context, { badLayerFn: "NOT A FN" });
});

test("handles paths with query params", async t => {
  const app = new Koa();
  const router = new KRouter();
  router.get("/posts", ctx => {
    ctx.status = 200;
  });
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/posts?page=2&limit=100");
  t.is(res.status, 200);
});

test("use middleware is always called", async t => {
  const app = new Koa();
  const router = new KRouter();
  router
    .use((ctx: Koa.Context & { n: number }, next) => {
      ctx.n = 0;
      return next();
    })
    .use((ctx: Koa.Context & { n: number }, next) => {
      ctx.n++;
      return next();
    })
    .get("/increment", (ctx: Koa.Context & { n: number }, next) => {
      ctx.n++;
      ctx.status = 200;
      return next();
    })
    .use((ctx: Koa.Context & { n: number }, next) => {
      if (ctx.status !== 200) {
        // if you set the body koa anoyingly sets the status to 200
        // if the middleware hasnt set it to 200 yet then we set it to 404
        ctx.status = 404;
      }
      ctx.body = ctx.n;
    });
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/nonexistent");
  t.is(res.status, 404);
  t.is(res.text, "1");
  res = await supertest(server).get("/increment");
  t.is(res.status, 200);
  t.is(res.text, "2");
});

test("zero and one or more are handled properly", async t => {
  const app = new Koa();
  const router = new KRouter();
  router.get("/bar/:foo*", ctx => {
    ctx.status = 200;
    ctx.body = ctx.params;
  });
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/bar/first/second/third");
  t.is(res.body.foo[0], "first");
  t.is(res.body.foo[1], "second");
  t.is(res.body.foo[2], "third");

  const oneMoreApp = new Koa();
  const oneMoreRouter = new KRouter();
  oneMoreRouter.get("/:foo+", ctx => {
    ctx.status = 200;
    ctx.body = ctx.params;
  });
  oneMoreApp.use(oneMoreRouter.middleware());
  const oneMoreServer = await listen(oneMoreApp);
  res = await supertest(oneMoreServer).get("/");
  t.is(Object.keys(res.body).length, 0);
  res = await supertest(oneMoreServer).get("/herc/ham");
  t.is(res.body.foo[0], "herc");
  t.is(res.body.foo[1], "ham");
});

test("params are merged on multiple passed matches", async t => {
  const app = new Koa();
  const router = new KRouter();
  router
    .get("/api/:user*", (ctx, next) => {
      ctx.body = { user: ctx.params.user[0] };
      return next();
    })
    .get("/api/:user/:imageid", (ctx, next) => {
      ctx.body.imageid = parseInt(ctx.params.imageid, 10);
    });
  app.use(router.middleware());
  const server = await listen(app);
  let res = await supertest(server).get("/api/robotmayo/1234");
  t.deepEqual(res.body, { user: "robotmayo", imageid: 1234 });
});
