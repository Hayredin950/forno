# Forno - Full-Stack Pizza Delivery Platform

React 19 + Vite frontend with Express 5 + MongoDB backend, integrated with Razorpay payments.

---

## Project Structure

```
forno-fullstack/
├── frontend/        # React 19 + Vite + TailwindCSS + TypeScript
└── backend/         # Express 5 + MongoDB + Mongoose + Razorpay
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install          # or: pnpm install / yarn install
cp .env.example .env
# Edit .env with your credentials (see below)
npm run dev          # starts on http://localhost:5000
```

**On first run, seed the database:**
```bash
npm run seed
```

This creates:
- 6 preset pizzas with images
- 18 ingredients (bases, sauces, cheeses, veggies)
- 1 admin account: `admin@forno.com` / `Admin@123`

### 2. Frontend Setup

```bash
cd frontend
npm install          # or: pnpm install / yarn install
npm run dev          # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`.

Open **http://localhost:5173** in your browser.

---

## Environment Variables (backend/.env)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_USER_SECRET` | ✅ | Secret for user JWT tokens (32+ chars) |
| `JWT_ADMIN_SECRET` | ✅ | Secret for admin JWT tokens (32+ chars) |
| `RAZORPAY_KEY_ID` | ✅ | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Your Razorpay Key Secret |
| `PORT` | ❌ | API port (default: 5000) |
| `NODE_ENV` | ❌ | `development` or `production` (default: development) |
| `SKIP_EMAIL_VERIFICATION` | ❌ | `true` skips email verification on register (default in dev) |
| `CLIENT_URL` | ❌ | Comma-separated allowed CORS origins |
| `SMTP_*` | ❌ | SMTP settings (only needed when email verification is ON) |

### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Add your IP (or `0.0.0.0/0` for any IP) under **Network Access**
4. Create a database user under **Database Access**
5. Get the connection string and set it as `MONGO_URI`

### Razorpay Setup

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Use **Test Mode** for development
3. Copy **Key ID** and **Key Secret** from Settings → API Keys

---

## Features

### User-facing
- **Menu** — Browse preset pizzas with filters (veg/non-veg/spicy/bestseller)
- **Custom Builder** — Build pizzas step-by-step (base → sauce → cheese → veggies)
- **Cart** — Stored in browser localStorage
- **Checkout** — Razorpay payment widget (test mode ready)
- **Order Tracking** — Real-time status (Received → Kitchen → Delivery → Done)
- **Orders History** — View all past orders

### Admin Panel (`/admin/login`)
- **Dashboard** — Live stats (orders, pending, low-stock)
- **Inventory** — Adjust stock levels, set alert thresholds
- **Orders** — View all orders, update status
- **Analytics** — Charts for orders, revenue, popular pizzas

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@forno.com | Admin@123 |
| User | Register via `/register` | your choice |

> **Note:** In development mode (`NODE_ENV=development`), users are auto-verified on registration — no email required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6, TailwindCSS 3 |
| Animations | Framer Motion 12 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Routing | React Router 7 |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (separate user/admin secrets) |
| Payments | Razorpay |
| Security | Helmet, express-rate-limit, express-mongo-sanitize, bcrypt |
| Logging | Pino + pino-http |

---

## Production Deployment

1. Build the frontend: `npm run build` → serves from `dist/`
2. Build the backend: `npm run build` → serves from `dist/index.mjs`
3. Set `NODE_ENV=production` and `SKIP_EMAIL_VERIFICATION=false`
4. Configure SMTP credentials for email verification
5. Set `CLIENT_URL` to your production domain
6. Optionally serve the frontend `dist/` folder via Express as static files or a CDN

---

## API Reference

All endpoints prefixed with `/api`

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login → returns JWT |
| POST | `/auth/admin/login` | Admin login → returns JWT |
| GET | `/auth/verify-email/:token` | Verify email address |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password/:token` | Reset password |

### Pizzas
| Method | Endpoint | Description |
|---|---|---|
| GET | `/pizzas` | List all pizzas |
| GET | `/pizzas/ingredients` | List all ingredients (for custom builder) |

### Orders (User, requires Bearer token)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders` | Create order from cart |
| POST | `/orders/:id/payment` | Initiate Razorpay payment |
| POST | `/orders/:id/verify-payment` | Verify payment signature |
| GET | `/orders/my-orders` | Get current user's orders |
| GET | `/orders/:id/status` | Get order status |

### Admin (requires Admin Bearer token)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/orders` | List all orders (paginated) |
| PATCH | `/admin/orders/:id/status` | Update order status |
| GET | `/admin/inventory` | List all ingredients |
| PATCH | `/admin/inventory/:id` | Adjust stock (set/increment/decrement) |
| PATCH | `/admin/inventory/:id/threshold` | Update low-stock alert threshold |
