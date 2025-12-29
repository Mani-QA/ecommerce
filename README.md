# QADemo - E-Commerce Testing Platform

A modern e-commerce testing platform built with React, Hono, and Cloudflare Workers (with Static Assets + D1 + R2 + KV).

## 🚀 Live Demo

**URL**: https://qademo-web.pages.dev

### Test Accounts
- **Standard User**: `standard_user` / `standard123`
- **Locked User**: `locked_user` / `locked123` (account locked)
- **Admin User**: `admin_user` / `admin123`

## 📁 Project Structure

```
QADemo.com/
├── apps/
│   └── web/                    # Frontend + API (Cloudflare Worker)
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── stores/         # Zustand stores
│       │   ├── hooks/          # Custom hooks
│       │   └── worker/         # Cloudflare Worker API
│       │       ├── index.ts    # Worker entry point
│       │       ├── routes/     # API route handlers
│       │       ├── middleware/ # Auth, caching, error handling
│       │       ├── services/   # Business logic services
│       │       └── types/      # TypeScript types & bindings
│       ├── e2e/                # Playwright E2E tests
│       ├── dist/               # Built static assets
│       └── wrangler.toml       # Cloudflare Workers config
├── packages/
│   └── shared/                 # Shared types, schemas, utils
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace config
└── turbo.json                  # Turborepo config
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Hono (running as Cloudflare Worker)
- **Static Assets**: Cloudflare Workers Static Assets
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Storage**: Cloudflare R2 (for product images)
- **Sessions**: Cloudflare KV
- **Authentication**: JWT (access + refresh tokens)
- **Build**: pnpm + Turborepo

## 🏃 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Cloudflare account (for deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Start local development
pnpm run dev
```

### Local Development with Wrangler

```bash
cd apps/web
pnpm run dev:worker
```

This starts a local server with the Worker and all bindings (D1, R2, KV).

## 🚀 Deployment

```bash
# Deploy to Cloudflare Workers
pnpm run deploy
```

This builds the frontend and deploys everything (static assets + Worker) to Cloudflare.

### Environment Variables

Set the following secret in Cloudflare:
```bash
wrangler secret put JWT_SECRET
```

### Bindings Required

Create the following resources before deployment:

```bash
# D1 Database
wrangler d1 create qademo-db

# R2 Bucket
wrangler r2 bucket create qademo-images

# KV Namespace
wrangler kv namespace create KV_SESSIONS
```

Update `wrangler.toml` with the generated IDs.

## 🧪 Testing

```bash
# Run unit tests
pnpm run test

# Run E2E tests
pnpm run test:e2e
```

## 📖 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/products` | List products |
| GET | `/api/products/:slug` | Get product by slug |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/items` | Add to cart |
| PATCH | `/api/cart/items/:id` | Update cart item |
| DELETE | `/api/cart/items/:id` | Remove from cart |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get order details |
| GET | `/api/admin/stats` | Admin dashboard stats |
| GET | `/api/admin/products` | Admin product list |
| GET | `/api/admin/orders` | Admin order list |

## 🔧 Architecture

This project uses **Cloudflare Workers with Static Assets** - the new unified platform that combines:

- **Static Assets**: React SPA served from Cloudflare's edge CDN
- **Worker API**: Hono-based API running on Workers runtime
- **Full bindings support**: D1, R2, KV, Durable Objects, Queues, etc.

### Why Workers over Pages?

- **Unified platform**: Single deployment for frontend + backend
- **Full feature access**: Durable Objects, Cron Triggers, Queues
- **Better local dev**: `wrangler dev` with complete bindings
- **Future-proof**: Cloudflare's recommended path forward

## 📝 License

MIT
