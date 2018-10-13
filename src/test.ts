import test from "ava";
import * as supertest from "supertest";
import * as Koa from "koa";
import SimpleKoaRouter from "./";
import * as http from "http";

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
  const router = new SimpleKoaRouter();
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
      injectMiddleware(router: SimpleKoaRouter): void;
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
  const router = new SimpleKoaRouter();
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
