# KRouter

Simple express like router for koajs. Lets get it ready for production use.

## Install

`npm i @robotmayo/krouter`

## Features

- Express inspired routing
- Nested/"child" routers
- Async/Await ready

## Quick Start

```javascript
import KRouter from "@robotmayo/krouter";
import * as Koa from "koa";
const app = new Koa();
const router = new KRouter();

router
.use((ctx, next) => {
  // do something on every route
  return next();
})
.get("/", ctx => {
  ctx.body = "Home Page";
})
.post("/new", (ctx, next) => {
  if(ctx.isAuthorized) return next()
  ctx.status = 401
},
ctx => {
  const data = await someAsyncProcess()
  ctx.body = data
});
app.use(router.middleware());
```

## Api

`new KRouter([opts])`

Create a router instance

| Parameter     | Required | Type   | Description                                                      |
| ------------- | -------- | ------ | ---------------------------------------------------------------- |
| [opts]        | False    | object |                                                                  |
| [opts.prefix] | False    | string | Prefix to prepend to all routes declared in this router instance |

```javascript
import KRouter from "@robotmayo/krouter";
import * as Koa from "koa";
const app = new Koa();
const router = new KRouter();
router.get("/bear", (ctx, next) => {
  // middleware called on /bear
});
// or with a prefix
const prefixedRouter = new Router({ prefix: "/api" });
prefixedRouter.get("/posts", (ctx, next) => {
  // middleware called on /api/posts
});
app.use(router.middleware()).use(prefixedRouter.middleware());
```

`router.[verb](path|...middleware)`

Where verb is `use|get|put|post|del|delete|patch|options`

Mount middleware with with the specific method and optionally a path. The only exception is `use` will run on any method.

| Parameter    | Required | Type                               | Description                      |
| ------------ | -------- | ---------------------------------- | -------------------------------- |
| [path]       | False    | string                             |                                  |
| [middleware] | False    | koa middleware \| koa middleware[] | Upon match, run these middleware |

```javascript
import KRouter from "@robotmayo/krouter";
import * as Koa from "koa";
const app = new Koa();
const router = new KRouter();

router
  .use((ctx, next) => {
    // do something will always be called
    next();
  })
  .get("/tape", (ctx, next) => {
    // do stuff. only called on GET /tape
    ctx.body = 100;
  });
```

`router.mount(childRouter)`

Mount a router inside another one. Similiar to nested/child router.

| Parameter   | Required | Type    | Description                              |
| ----------- | -------- | ------- | ---------------------------------------- |
| childRouter | True     | KRouter | Mount the child inside the parent router |

When mounting routers the mounted router will take on the prefix of the parent router.

Example

```javascript
import KRouter from "@robotmayo/krouter";
import * as Koa from "koa";
const app = new Koa();
const router = new KRouter({ prefix: "/api" });
const child = new KRouter({ prefix: "/posts" });

child.get("/:id", (ctx, next) => {
  // do stuff
});
router.mount(child);
// now the child will respond to /api/posts/:id
app.use(router.middleware());
```

## Developing

The code is written in typescript so you will need to know it. Install the dependencies with `npm i` then you can transpile with `npm build`. `npm build:watch` to auto build on changes to speed up development.

## Test

Simply run `npm run test`.

## Why?

I only recently started using koa and naturually wanted a router for it. I originally used/expirmented with koa-router but this (https://github.com/ZijianHe/koa-router/issues/462) is a big problem for me. I prefer my routing to be as determinstic as possible. Most importantly I simply thought it would be fun to write a simple router. 😃
