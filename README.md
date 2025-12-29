# QADemo - E-Commerce Testing Platform

A modern e-commerce testing platform built with React, Hono, and Cloudflare (Pages + D1 + R2 + KV).

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
│   └── web/                    # Frontend + API (Pages Functions)
│       ├── src/                # React frontend
│       ├── functions/          # Cloudflare Pages Functions (API)
│       │   └── api/
│       │       ├── [[path]].ts # Catch-all API route
│       │       └── _api/       # API routes, middleware, services
│       ├── e2e/                # Playwright E2E tests
│       └── dist/               # Built output
├── packages/
│   └── shared/                 # Shared types, schemas, utils
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # pnpm workspace config
└── turbo.json                  # Turborepo config
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Hono (as Cloudflare Pages Functions)
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
pnpm run dev:pages
```

This starts a local server with Pages Functions and bindings.

## 🚀 Deployment

```bash
# Deploy to Cloudflare Pages
pnpm run deploy
```

This builds the frontend and deploys everything (static assets + API functions) to Cloudflare Pages.

### Environment Variables

Set the following secret in Cloudflare Pages:
```bash
wrangler pages secret put JWT_SECRET --project-name=ecommerce
```

### Bindings Required
- **D1 Database**: `DB` - for storing users, products, orders
- **R2 Bucket**: `R2_BUCKET` - for product images
- **KV Namespace**: `KV_SESSIONS` - for cart sessions

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
| GET | `/api/products` | List products |
| GET | `/api/products/:slug` | Get product by slug |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart/items` | Add to cart |
| POST | `/api/orders` | Create order |
| GET | `/api/admin/stats` | Admin dashboard stats |

## 📝 License

MIT
