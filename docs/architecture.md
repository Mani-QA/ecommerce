# QADemo architecture

QADemo is a single Cloudflare Worker that serves a React storefront and a Hono API. The browser keeps the cart and session in sync with that API. WebMCP tools call the same client used by the pages, so an agent and a person share one cart and one signed-in account.

## Runtime

```
Browser
  React SPA (Vite build)
    pages, Zustand stores, React Query
    WebMCP tools on document.modelContext
        |
        | same-origin /api
        v
Cloudflare Worker (Hono)
  /api/*  -> route handlers
  /*      -> Workers static assets (the SPA)
        |
        +-- D1      products, users, orders
        +-- KV      cart and session records
        +-- R2      product images
```

One worker owns both surfaces. The asset binding is `ASSETS` and the static directory is `dist`. API routes are mounted under `/api`.

## Frontend

| Piece | Role |
|-------|------|
| React Router | Public pages, plus protected checkout, orders, and admin routes |
| Zustand `authStore` | Signed-in user. The access token stays in the API client memory, not in the tool results |
| Zustand `cartStore` | Cart lines persisted for reloads, then refreshed from the server |
| React Query | Catalog, product, order, and admin caches |
| WebMCP | Agent-facing tools registered for the life of the page |

`main.tsx` calls `installWebMCP()` before the first render. The polyfill does nothing when Chrome already provides `document.modelContext`, and it does nothing outside a secure context. `StoreAgentTools` is mounted inside the router so tools can move the shopper to the page that shows a result.

Tools are grouped by job:

| Module | Tools |
|--------|-------|
| `catalog.ts` | `search_products`, `get_product` |
| `cart.ts` | `get_cart`, `add_to_cart`, `set_cart_quantity`, `clear_cart` |
| `account.ts` | `get_session`, `sign_in`, `sign_out`, `create_account` |
| `orders.ts` | `list_orders`, `get_order`, `place_order` |
| `navigation.ts` | `open_page` |
| `admin.ts` | `get_store_stats`, `update_stock`, `update_order_status` |

Customer tools stay registered on every route. Admin tools use `enabled` and are removed when the signed-in user is not an admin. Registration uses `useWebMCP`, which aborts the browser registration when the component unmounts. There is no separate `unregisterTool` call.

Each tool has a JSON Schema for the agent and a Zod parse in the handler. Schema limits are hints. The handler rejects missing identifiers, bad quantities, invalid cards, empty carts, and unsigned requests with a code and a message the agent can correct. Handlers pass the execution `AbortSignal` through to `fetch`.

After a cart or order change, the handler writes the Zustand cart and invalidates the React Query caches, then `open_page` or `place_order` navigates to the screen a person would use to confirm the result.

## API

Handlers live in `apps/web/src/worker/routes` and return:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "", "message": "" } }
```

| Area | Storage | Auth |
|------|---------|------|
| Products | D1 | Public reads. Writes require an admin |
| Cart | KV keyed by `X-Session-ID` | Session header |
| Orders | D1 | Signed-in user. Admins can read an order they do not own |
| Images | R2 | Public reads. Admin uploads |
| Sessions | KV refresh tokens, JWT access token | Bearer or Basic |

Checkout validates the card with the Luhn check, decrements stock, and deletes the KV cart. The WebMCP `place_order` tool is marked `consequentialHint: true` so the browser can ask the person to confirm. Its result includes `paymentLastFour` and omits the card number, CVV, access token, and client IP.

## Security boundaries

- Tool handlers call the existing API. They do not open a second path to D1 or KV.
- Admin tools check the role again inside the handler, in addition to hiding the tool.
- Checkout, order history, and the admin page refuse to navigate until the session is allowed to see them.
- Account and order tools set `untrustedContentHint` because usernames and shipping details are shopper-supplied text.
- Secrets stay in Worker bindings. The SPA does not receive `JWT_SECRET`.

## Local development

`pnpm --filter @qademo/web dev` serves the SPA on port 5173 and proxies `/api` to Wrangler on port 8787. `installWebMCP()` runs on `http://localhost` because localhost is a secure context.

Deploy with `pnpm --filter @qademo/web deploy`. That builds the SPA into `dist` and publishes the worker with its assets. Production traffic is HTTPS, which WebMCP requires.
