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
        server.off("error", reject);
        resolve(server);
      });
  });
}

type verb = "get" | "put" | "post" | "patch" | "del";
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
