# QADemo - E-Commerce Testing Platform

A production-grade e-commerce application specifically designed for practicing and learning automated testing with tools like **Playwright**, **Selenium**, **Cypress**, and other test automation frameworks.

Built with modern technologies: React, Hono, and Cloudflare Workers with Static Assets + D1 + R2 + KV.

## 🚀 Live Demo

**URL**: https://qademo.com

### Test Accounts

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `standard_user` | `standard123` | User | Normal user with full access |
| `locked_user` | `locked123` | User | Account is locked (login fails) |
| `admin_user` | `$Admin<ddmmyyyy>` | Admin | Full admin access + dashboard (dynamic: `$Admin` + `DDMMYYYY`) |

---

## 🎯 Why Use QADemo for Automation Practice?

QADemo is purpose-built for QA engineers and developers learning test automation. Unlike production apps with CAPTCHAs and rate limits, QADemo provides:

### ✅ Automation-Friendly Features

- **No CAPTCHA** - Practice freely without solving puzzles
- **No Rate Limiting** - Run tests as fast as you need
- **Predictable Test Data** - Pre-seeded users and products
- **Stable Selectors** - Consistent HTML structure for reliable locators with `data-testid`
- **REST API** - Full API access for API automation and hybrid testing
- **Multiple User Roles** - Test different permission levels (Customer & Admin)
- **Real Payment Flow** - Simulated checkout with test card (`4242 4242 4242 4242`)
- **State Persistence** - Cart and auth state survive page reloads
- **No Re-render Issues** - Stable elements for reliable automation
- **Monitoring Integration** - Sentry for error tracking and logging (practice observability testing)

### 🧪 Test Scenarios You Can Practice

| Category | Scenarios |
|----------|-----------|
| **Authentication** | Login/logout, invalid credentials, locked account, session persistence, Basic Auth |
| **Product Browsing** | Search/filter products, view details, check availability via API |
| **Shopping Cart** | Add/remove items, update quantities, cart persistence across reloads |
| **Checkout Flow** | Form validation, credit card formatting, order placement via UI & API |
| **Order Management** | View order history, order details, order status tracking via API |
| **Admin Features** | Dashboard stats, product CRUD, stock updates via API, order status management |
| **API Testing** | REST API endpoints for products, orders, and admin operations |
| **Hybrid Testing** | Combine UI and API testing (e.g., create order via UI, verify via API) |
| **Responsive Design** | Mobile menu, breakpoint testing, touch interactions |
| **Error Handling** | Network errors, validation errors, edge cases |
| **Observability** | Sentry integration for error monitoring, logging, and performance tracking |

---

## 🔌 REST API for Automation Testing

QADemo provides a comprehensive REST API for API-based automation testing. All endpoints support both **Bearer Token** and **Basic Authentication**.

### Quick Example

```bash
# Get product availability
curl https://qademo.com/api/products/id/1

# Get user orders (with Basic Auth - no login needed!)
curl https://qademo.com/api/orders \
  -H "Authorization: Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=="

# Admin: Update product stock
curl -X PATCH https://qademo.com/api/admin/products/1/stock \
  -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  -H "Content-Type: application/json" \
  -d '{"stock": 100}'
```

### Available Endpoints

#### Public APIs (No Authentication)
- `GET /api/products` - List all products with stock info
- `GET /api/products/:slug` - Get product details
- `GET /api/products/id/:id` - Check product availability
- `POST /api/auth/login` - Login and get access token

#### User APIs (Authentication Required)
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details and status
- `POST /api/orders` - Place order (checkout)

#### Admin APIs (Admin Authentication Required)
- `GET /api/admin/products` - List all products (including inactive)
- `PATCH /api/admin/products/:id/stock` - Update product stock
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/:id` - Get order details
- `PATCH /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/stats` - Get dashboard statistics

### Basic Auth Tokens (Pre-generated)

| Username      | Token                                    |
|---------------|------------------------------------------|
| standard_user | `c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw==`   |
| admin         | `YWRtaW46YWRtaW4xMjM=`                   |

### Documentation

- **[Complete REST API Documentation](./docs/REST-API-DOCUMENTATION.md)** - Full API reference with quick start, examples, and test scenarios
- **[Postman Collection](./docs/QADemo-Postman-Collection.json)** - Ready-to-import collection for instant testing

---

## ✨ E-Commerce Features

### Customer Features
- **Product Catalog** - Browse products with images and descriptions
- **Product Details** - Detailed view with stock information
- **Shopping Cart** - Add, remove, update quantities
- **Checkout** - Shipping address and payment form with auto-formatting
- **Order History** - View all orders and their status
- **User Authentication** - Login/logout with JWT tokens

### Admin Features
- **Dashboard** - Overview stats (orders, revenue, products)
- **Product Management** - Add, edit, update stock, upload images
- **Order Management** - View all orders, update order status
- **Inventory Control** - Real-time stock updates

### UI/UX Features
- **Responsive Design** - Works on desktop, tablet, mobile
- **Modern UI** - Clean design with Tailwind CSS
- **Animations** - Smooth transitions with Framer Motion
- **Loading States** - Proper loading indicators
- **Error Handling** - User-friendly error messages
- **Form Validation** - Real-time input validation

---

## 📁 Project Structure

```
QADemo.com/
├── apps/
│   └── web/                      # Frontend + API (Cloudflare Worker)
│       ├── src/
│       │   ├── components/       # Reusable React components
│       │   │   ├── admin/        # Admin-specific components
│       │   │   ├── auth/         # Auth guards (ProtectedRoute, AdminRoute)
│       │   │   ├── layout/       # Navbar, Footer, Layout
│       │   │   ├── products/     # ProductCard, ProductGrid
│       │   │   └── ui/           # Button, Card, Input, Badge, etc.
│       │   ├── pages/            # Route page components
│       │   │   ├── HomePage.tsx
│       │   │   ├── CatalogPage.tsx
│       │   │   ├── ProductPage.tsx
│       │   │   ├── CartPage.tsx
│       │   │   ├── CheckoutPage.tsx
│       │   │   ├── OrdersPage.tsx
│       │   │   ├── OrderConfirmationPage.tsx
│       │   │   ├── LoginPage.tsx
│       │   │   └── AdminPage.tsx
│       │   ├── stores/           # Zustand state management
│       │   │   ├── authStore.ts  # User auth state
│       │   │   └── cartStore.ts  # Shopping cart state
│       │   ├── hooks/            # Custom React hooks
│       │   ├── lib/              # API client, utilities
│       │   └── worker/           # Cloudflare Worker API
│       │       ├── index.ts      # Worker entry point (Hono app)
│       │       ├── routes/       # API route handlers
│       │       ├── middleware/   # Auth, caching, error handling
│       │       ├── services/     # Business logic (password hashing)
│       │       └── types/        # TypeScript types & DB bindings
│       ├── dist/                 # Built static assets (Vite output)
│       └── wrangler.toml         # Cloudflare Workers configuration
├── packages/
│   └── shared/                   # Shared types, schemas, utilities
│       ├── types/                # TypeScript interfaces
│       ├── schemas/              # Zod validation schemas
│       └── utils/                # formatPrice, formatDate, etc.
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace config
└── turbo.json                    # Turborepo build config
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework with hooks and concurrent features |
| TypeScript | Type safety and better DX |
| Vite | Lightning-fast build tool and dev server |
| TailwindCSS | Utility-first CSS framework |
| Framer Motion | Smooth animations and transitions |
| React Router 6 | Client-side routing with lazy loading |
| React Query | Server state management and caching |
| Zustand | Lightweight client state management |
| React Hook Form | Performant form handling |
| Zod | Schema validation |

### Backend (Cloudflare Workers)
| Technology | Purpose |
|------------|---------|
| Hono | Ultrafast web framework for edge |
| Cloudflare D1 | SQLite-compatible serverless database |
| Cloudflare R2 | S3-compatible object storage (images) |
| Cloudflare KV | Key-value storage (sessions, cart) |
| Jose | JWT token generation and verification |
| Web Crypto API | Password hashing (PBKDF2) |
| Sentry | Error monitoring, performance tracing, and logging |

### Development
| Tool | Purpose |
|------|---------|
| pnpm | Fast, disk-efficient package manager |
| Turborepo | Monorepo build system with caching |
| Wrangler | Cloudflare CLI for dev and deployment |
| ESLint | Code linting |

---

## 📊 Monitoring & Observability

QADemo integrates **Sentry** for comprehensive monitoring and observability, making it easy to track errors, performance, and user behavior.

### Features

| Feature | Description |
|---------|-------------|
| **Error Monitoring** | Automatic capture of all application errors with full stack traces |
| **Performance Tracing** | 20% sample rate for request tracing and performance metrics |
| **Application Logs** | Centralized logging for authentication, orders, and admin actions |
| **Metrics & KPIs** | Business metrics tracking (orders, revenue, logins, cart operations) |
| **Security Monitoring** | Track admin logins with IP address and country/city information |
| **Product Analytics** | Monitor out-of-stock product access and user behavior |

### Logged Events (100% Capture)

| Event | Details Captured |
|-------|------------------|
| **Admin Login** | Username, IP address, country, city, user-agent |
| **Failed Admin Login** | Username, IP address (security audit) |
| **Out-of-Stock Access** | Product name, ID, user IP, country, user-agent |
| **Order Placement** | Order ID, total amount, item count, user |
| **Order Failures** | Validation errors, stock issues, payment failures |
| **Failed Login Attempts** | Username, IP address (security tracking) |
| **Locked Account Access** | Username, IP address (security audit) |

### How It Works

- **Error Tracking**: All unhandled exceptions are automatically captured
- **Breadcrumbs**: Track user actions leading up to errors
- **Performance**: 20% of requests are traced for performance insights
- **Context**: Each error includes request details, user info, and environment
- **Source Maps**: Readable stack traces with original TypeScript code

### Key Metrics Tracked

| Metric Category | Examples |
|-----------------|----------|
| **Authentication** | Login success/failure rates, admin access tracking |
| **Products** | Product views, out-of-stock access, popular products |
| **Orders** | Orders placed, revenue, order processing time (p95/p99) |
| **Cart** | Items added/removed, cart abandonment rate |
| **Admin** | Stock updates, order status changes, admin productivity |

### Accessing Sentry

- **Issues**: https://sentry.io/issues/ - View captured errors
- **Logs**: https://sentry.io/explore/logs/ - Application logs
- **Metrics**: https://sentry.io/metrics/ - Business KPIs and performance metrics
- **Performance**: https://sentry.io/performance/ - Monitor traces and request timing
- **Release Tracking**: Each deployment creates a new release with version ID

This makes QADemo ideal for testing monitoring and observability integrations in your automation frameworks.

---

## 🏃 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Cloudflare account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/QADemo.com.git
cd QADemo.com

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

This starts a local server at `http://localhost:8787` with:
- Full Worker functionality
- Local D1 database
- Local R2 storage
- Local KV store

---

## 🚀 Deployment

### Quick Deploy

```bash
# Fast deployment (frontend build + wrangler deploy)
pnpm run deploy:fast

# Full deployment (with TypeScript checks)
pnpm run deploy
```

### First-Time Setup

1. **Create Cloudflare Resources:**

```bash
cd apps/web

# D1 Database
wrangler d1 create qademo-db

# R2 Bucket
wrangler r2 bucket create qademo-images

# KV Namespace
wrangler kv namespace create KV_SESSIONS
```

2. **Update `wrangler.toml`** with the generated IDs.

3. **Set Secrets:**

```bash
# JWT Secret for authentication
wrangler secret put JWT_SECRET
# Enter a secure random string

# Sentry DSN for monitoring (optional)
wrangler secret put SENTRY_DSN
# Enter your Sentry DSN from https://sentry.io/
```

4. **Initialize Database:**

```bash
wrangler d1 execute qademo-db --file=./schema.sql
```

5. **Deploy:**

```bash
pnpm run deploy
```

---

## 📖 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/logout` | Logout (invalidate tokens) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:slug` | Get product by slug |
| POST | `/api/products` | Create product (admin) |
| PATCH | `/api/admin/products/:id` | Update product (admin) |
| DELETE | `/api/admin/products/:id` | Delete product (admin) |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get current cart |
| POST | `/api/cart/items` | Add item to cart |
| PATCH | `/api/cart/items/:id` | Update item quantity |
| DELETE | `/api/cart/items/:id` | Remove item from cart |
| DELETE | `/api/cart` | Clear entire cart |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create new order |
| GET | `/api/orders` | List user's orders |
| GET | `/api/orders/:id` | Get order details |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/products` | All products with full details |
| GET | `/api/admin/orders` | All orders |
| PATCH | `/api/admin/orders/:id/status` | Update order status |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/images` | Upload image to R2 |
| GET | `/api/images/:key` | Get image by key |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health check |

---

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Global Network                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │   Static Assets   │    │      Cloudflare Worker           │  │
│  │   (React SPA)     │    │      (Hono API Server)           │  │
│  │                   │    │                                   │  │
│  │  • HTML/CSS/JS    │◄──►│  • /api/* routes                 │  │
│  │  • Images         │    │  • JWT Authentication            │  │
│  │  • Fonts          │    │  • Request validation            │  │
│  │                   │    │  • Business logic                │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                     │                            │
│           ┌────────────────────────┼────────────────────────┐   │
│           │                        │                         │   │
│           ▼                        ▼                         ▼   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   Cloudflare D1  │    │  Cloudflare KV  │    │ Cloudflare R2│ │
│  │   (SQLite DB)    │    │  (Sessions)     │    │ (Images)     │ │
│  │                  │    │                 │    │              │ │
│  │  • Users         │    │  • Cart data    │    │  • Product   │ │
│  │  • Products      │    │  • Session      │    │    images    │ │
│  │  • Orders        │    │    tokens       │    │              │ │
│  │  • Order Items   │    │                 │    │              │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Workers over Pages** | Unified deployment, full feature access, better local dev |
| **Hono Framework** | Ultrafast, Express-like API, native Workers support |
| **D1 for Database** | SQLite at the edge, zero cold starts, automatic replication |
| **KV for Sessions** | Sub-millisecond reads, perfect for session/cart data |
| **R2 for Images** | S3-compatible, no egress fees, global distribution |
| **Zustand for State** | Minimal bundle size, simple API, persistence support |
| **React Query** | Automatic caching, background refetching, optimistic updates |

---

## 🤝 Contributing

This project is designed for educational purposes. Feel free to:

1. Fork the repository
2. Add new test scenarios
3. Improve documentation
4. Submit pull requests

---

## 📝 License

MIT License - feel free to use this project for learning and practice.

---

## 🙏 Acknowledgments

Built as a testing playground inspired by [SauceDemo](https://www.saucedemo.com/) - designed to provide a more feature-rich and modern testing environment for QA engineers.
