# Functional Requirements Document (FRD)
## QADemo - E-Commerce Testing Platform

**Version:** 1.0  
**Last Updated:** January 7, 2026  
**Application URL:** https://qademo.com

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Roles & Test Accounts](#2-user-roles--test-accounts)
3. [Authentication Module](#3-authentication-module)
4. [Product Catalog Module](#4-product-catalog-module)
5. [Shopping Cart Module](#5-shopping-cart-module)
6. [Checkout Module](#6-checkout-module)
7. [Order Management Module](#7-order-management-module)
8. [Admin Dashboard Module](#8-admin-dashboard-module)
9. [Navigation & Layout](#9-navigation--layout)
10. [Error Handling](#10-error-handling)
11. [API Reference](#11-api-reference)
12. [Validation Rules](#12-validation-rules)

---

## 1. Overview

### 1.1 Purpose
QADemo is a production-grade e-commerce application designed specifically for practicing and learning automated testing. It provides a complete e-commerce flow including product browsing, cart management, checkout, and admin functionality.

### 1.2 Key Characteristics
- **No CAPTCHA** - Automation-friendly
- **No Rate Limiting** - Run tests freely
- **Predictable Test Data** - Pre-seeded users and products
- **Stable Selectors** - Consistent HTML structure
- **Real API Backend** - Practice API testing

---

## 2. User Roles & Test Accounts

### 2.1 User Types

| User Type | Description | Permissions |
|-----------|-------------|-------------|
| `standard` | Regular customer | Browse products, manage cart, checkout, view own orders |
| `locked` | Locked account | Cannot login (blocked) |
| `admin` | Administrator | All standard permissions + admin dashboard access |

### 2.2 Pre-configured Test Accounts

| Username | Password | User Type | Expected Behavior |
|----------|----------|-----------|-------------------|
| `standard_user` | `standard123` | standard | Successful login, redirects to catalog |
| `locked_user` | `locked123` | locked | Login fails with "Account is locked" error |
| `admin_user` | `admin123` | admin | Successful login, Admin link visible in navbar |

---

## 3. Authentication Module

### 3.1 Login Page (`/login`)

#### FR-AUTH-001: Login Form Display
- **Description:** Login page displays username and password input fields
- **Acceptance Criteria:**
  - Username field with label "Username"
  - Password field with label "Password" (masked input)
  - "Sign In" button
  - Test credentials helper section displayed below form
  - "Back to Home" link at bottom

#### FR-AUTH-002: Standard User Login
- **Description:** Standard user can login successfully
- **Precondition:** User is on login page
- **Input:** Username: `standard_user`, Password: `standard123`
- **Expected Result:**
  - Login succeeds
  - User redirected to `/catalog` (or previous protected page)
  - Username displayed in navbar
  - Access token stored in browser

#### FR-AUTH-003: Locked User Login Rejection
- **Description:** Locked user cannot login
- **Precondition:** User is on login page
- **Input:** Username: `locked_user`, Password: `locked123`
- **Expected Result:**
  - Login fails
  - Error message displayed: "Account is locked"
  - User remains on login page

#### FR-AUTH-004: Invalid Credentials Rejection
- **Description:** Invalid credentials are rejected
- **Precondition:** User is on login page
- **Input:** Any invalid username/password combination
- **Expected Result:**
  - Login fails
  - Error message displayed: "Invalid username or password"
  - User remains on login page

#### FR-AUTH-005: Admin User Login
- **Description:** Admin user can login and access admin features
- **Precondition:** User is on login page
- **Input:** Username: `admin_user`, Password: `admin123`
- **Expected Result:**
  - Login succeeds
  - User redirected to catalog
  - "Admin" button visible in navbar
  - User can access `/admin` page

#### FR-AUTH-006: Test Credential Quick Fill
- **Description:** Clicking test credential button fills form
- **Precondition:** User is on login page
- **Action:** Click on any test credential row (e.g., "Standard User")
- **Expected Result:**
  - Username field populated with corresponding username
  - Password field populated with corresponding password

#### FR-AUTH-007: Logout Functionality
- **Description:** Logged-in user can logout
- **Precondition:** User is authenticated
- **Action:** Click logout button (icon) in navbar
- **Expected Result:**
  - User session cleared
  - User redirected to home page
  - "Sign In" button appears in navbar
  - Cart state persisted (if applicable)

#### FR-AUTH-008: Session Persistence
- **Description:** User session persists across page refresh
- **Precondition:** User is authenticated
- **Action:** Refresh the browser page
- **Expected Result:**
  - User remains logged in
  - Username still displayed in navbar

#### FR-AUTH-009: Protected Route Redirect
- **Description:** Unauthenticated users redirected to login for protected routes
- **Precondition:** User is not logged in
- **Action:** Navigate directly to `/checkout` or `/orders`
- **Expected Result:**
  - User redirected to `/login`
  - After login, user redirected to originally requested page

---

## 4. Product Catalog Module

### 4.1 Home Page (`/`)

#### FR-PROD-001: Home Page Hero Section
- **Description:** Home page displays hero section with call-to-action
- **Acceptance Criteria:**
  - QADemo logo and branding
  - Welcome message
  - "Shop Now" or "Browse Products" button (for guests)
  - Button navigates to `/catalog`

#### FR-PROD-002: Featured Products Display
- **Description:** Home page displays featured products
- **Acceptance Criteria:**
  - Grid of product cards
  - Each card shows: image, name, price, "Add" button
  - Clicking product navigates to product detail page

### 4.2 Catalog Page (`/catalog`)

#### FR-PROD-003: Product Listing
- **Description:** Catalog page displays all active products
- **Acceptance Criteria:**
  - Grid layout of product cards
  - Products sorted alphabetically by name
  - Each product card displays:
    - Product image
    - Product name (clickable)
    - Product description (truncated)
    - Price (formatted as $XX.XX)
    - "Add" button (or "In Cart" if already added)
    - Stock status badge if low stock or out of stock

#### FR-PROD-004: Low Stock Indicator
- **Description:** Products with low stock display warning
- **Precondition:** Product has stock < 10 and stock > 0
- **Expected Result:**
  - "Low Stock" badge displayed on product card

#### FR-PROD-005: Out of Stock Indicator
- **Description:** Products with zero stock display indicator
- **Precondition:** Product has stock = 0
- **Expected Result:**
  - "Out of Stock" badge displayed on product card
  - "Add" button disabled

#### FR-PROD-006: Add to Cart from Catalog
- **Description:** User can add product to cart from catalog
- **Precondition:** Product is in stock
- **Action:** Click "Add" button on product card
- **Expected Result:**
  - Product added to cart with quantity 1
  - Button changes to "In Cart" (green checkmark)
  - Cart badge in navbar updates to show item count
  - "X" button appears to remove item

#### FR-PROD-007: In Cart Button Navigation
- **Description:** "In Cart" button navigates to cart page
- **Precondition:** Product is already in cart
- **Action:** Click "In Cart" button
- **Expected Result:**
  - User navigated to `/cart`

#### FR-PROD-008: Remove from Cart via X Button
- **Description:** Remove item from cart using X button on product card
- **Precondition:** Product is in cart
- **Action:** Click "X" button next to "In Cart" button
- **Expected Result:**
  - Product removed from cart
  - Button reverts to "Add"
  - Cart badge updates

### 4.3 Product Detail Page (`/products/:slug`)

#### FR-PROD-009: Product Detail Display
- **Description:** Product detail page shows complete product information
- **Acceptance Criteria:**
  - Large product image
  - Product name
  - Full product description
  - Price (formatted)
  - Stock availability
  - "Add to Cart" button
  - "Back to Products" link

#### FR-PROD-010: Add to Cart from Detail Page
- **Description:** User can add product to cart from detail page
- **Precondition:** Product is in stock
- **Action:** Click "Add to Cart" button
- **Expected Result:**
  - Product added to cart
  - Button state updates
  - Cart badge updates

#### FR-PROD-011: Product Not Found
- **Description:** Invalid product slug shows 404 page
- **Action:** Navigate to `/products/invalid-product-slug`
- **Expected Result:**
  - 404 Not Found page displayed
  - Link to return to catalog

---

## 5. Shopping Cart Module

### 5.1 Cart Page (`/cart`)

#### FR-CART-001: Empty Cart Display
- **Description:** Empty cart shows appropriate message
- **Precondition:** Cart is empty
- **Expected Result:**
  - "Your cart is empty" message
  - Shopping bag icon
  - "Continue Shopping" button linking to catalog

#### FR-CART-002: Cart Items Display
- **Description:** Cart page displays all cart items
- **Precondition:** Cart has items
- **Expected Result:**
  - List of cart items with:
    - Product image
    - Product name (clickable)
    - Product description
    - Unit price
    - Quantity selector (- / count / +)
    - Subtotal per item
    - Remove (trash) button
  - "Clear Cart" button in header

#### FR-CART-003: Increase Quantity
- **Description:** User can increase item quantity
- **Precondition:** Cart has item with quantity < stock
- **Action:** Click "+" button
- **Expected Result:**
  - Quantity increased by 1
  - Subtotal updated
  - Cart total updated

#### FR-CART-004: Decrease Quantity
- **Description:** User can decrease item quantity
- **Precondition:** Cart has item with quantity > 1
- **Action:** Click "-" button
- **Expected Result:**
  - Quantity decreased by 1
  - Subtotal updated
  - Cart total updated

#### FR-CART-005: Minimum Quantity Constraint
- **Description:** Quantity cannot go below 1 using minus button
- **Precondition:** Cart item has quantity = 1
- **Expected Result:**
  - "-" button disabled
  - User must use trash icon to remove item

#### FR-CART-006: Maximum Quantity Constraint
- **Description:** Quantity cannot exceed available stock
- **Precondition:** Cart item quantity = product stock
- **Expected Result:**
  - "+" button disabled
  - Attempting to exceed stock shows error

#### FR-CART-007: Remove Single Item
- **Description:** User can remove single item from cart
- **Action:** Click trash icon on cart item
- **Expected Result:**
  - Item removed from cart
  - Cart total updated
  - If last item, empty cart message shown

#### FR-CART-008: Clear Entire Cart
- **Description:** User can clear all items from cart
- **Action:** Click "Clear Cart" button
- **Expected Result:**
  - All items removed
  - Empty cart message displayed
  - Cart badge shows 0 or disappears

#### FR-CART-009: Cart Order Summary
- **Description:** Cart displays order summary
- **Acceptance Criteria:**
  - Subtotal
  - Shipping (shows "Free")
  - Total amount
  - "Proceed to Checkout" button
  - "Continue Shopping" link

#### FR-CART-010: Proceed to Checkout (Authenticated)
- **Description:** Authenticated user can proceed to checkout
- **Precondition:** User logged in, cart has items
- **Action:** Click "Proceed to Checkout"
- **Expected Result:**
  - User navigated to `/checkout`

#### FR-CART-011: Proceed to Checkout (Unauthenticated)
- **Description:** Unauthenticated user redirected to login
- **Precondition:** User NOT logged in, cart has items
- **Action:** Click "Proceed to Checkout"
- **Expected Result:**
  - User redirected to `/login`
  - After login, redirected to `/checkout`
  - Cart items preserved

#### FR-CART-012: Cart Persistence
- **Description:** Cart persists across sessions
- **Action:** Add items to cart, close browser, reopen
- **Expected Result:**
  - Cart items still present

---

## 6. Checkout Module

### 6.1 Checkout Page (`/checkout`)

#### FR-CHK-001: Checkout Page Access
- **Description:** Only authenticated users can access checkout
- **Precondition:** User not logged in
- **Action:** Navigate to `/checkout`
- **Expected Result:**
  - Redirected to `/login`

#### FR-CHK-002: Empty Cart Redirect
- **Description:** Checkout with empty cart shows message
- **Precondition:** User logged in, cart empty
- **Action:** Navigate to `/checkout`
- **Expected Result:**
  - "Your cart is empty" message
  - "Continue Shopping" button

#### FR-CHK-003: Checkout Form Display
- **Description:** Checkout page displays shipping and payment forms
- **Precondition:** User logged in, cart has items
- **Acceptance Criteria:**
  - Shipping Information section:
    - First Name field
    - Last Name field
    - Shipping Address textarea
  - Payment Information section:
    - Card Number field (placeholder: 4242 4242 4242 4242)
    - Expiry Date field (format: MM/YY)
    - CVV field (3-4 digits)
    - Name on Card field
  - Order Summary (right side):
    - List of cart items with images
    - Subtotal, Shipping (Free), Total
  - "Place Order" button with total amount

#### FR-CHK-004: Credit Card Number Formatting
- **Description:** Card number auto-formats as user types
- **Input:** `4242424242424242`
- **Expected Result:**
  - Field displays: `4242 4242 4242 4242`
  - Only numeric input accepted

#### FR-CHK-005: Expiry Date Formatting
- **Description:** Expiry date auto-formats as user types
- **Input:** `1226`
- **Expected Result:**
  - Field displays: `12/26`
  - Only numeric input accepted

#### FR-CHK-006: CVV Input Validation
- **Description:** CVV only accepts 3-4 numeric digits
- **Input:** `abc123def`
- **Expected Result:**
  - Field displays: `123`
  - Non-numeric characters rejected

#### FR-CHK-007: Required Field Validation
- **Description:** All checkout fields are required
- **Action:** Submit form with empty fields
- **Expected Result:**
  - Validation errors displayed for each empty field
  - Form not submitted

#### FR-CHK-008: Valid Card Number Validation (Luhn)
- **Description:** Card number validated using Luhn algorithm
- **Input:** Invalid card number (e.g., `1234567890123456`)
- **Expected Result:**
  - Error: "Invalid card number. Please check and try again."
  - Form not submitted

#### FR-CHK-009: Successful Order Placement
- **Description:** Valid checkout creates order
- **Precondition:** User logged in, cart has items
- **Action:** Fill all fields correctly, click "Place Order"
- **Expected Result:**
  - Order created successfully
  - Cart cleared
  - User redirected to `/orders/:orderId`
  - Order confirmation page displayed

#### FR-CHK-010: Test Card Number
- **Description:** Test card number works for checkout
- **Valid Test Card:** `4242 4242 4242 4242`
- **Any valid expiry:** Future date in MM/YY format
- **Any CVV:** 3-4 digits
- **Expected Result:** Order placed successfully

---

## 7. Order Management Module

### 7.1 Orders Page (`/orders`)

#### FR-ORD-001: Orders Page Access
- **Description:** Only authenticated users can view orders
- **Precondition:** User not logged in
- **Action:** Navigate to `/orders`
- **Expected Result:**
  - Redirected to `/login`

#### FR-ORD-002: Orders List Display
- **Description:** Orders page displays user's order history
- **Precondition:** User logged in, has orders
- **Acceptance Criteria:**
  - Page title: "My Orders"
  - List of orders showing:
    - Order ID (#)
    - Order status badge
    - Order date
    - Total amount
    - Customer name
  - Each order is clickable

#### FR-ORD-003: Empty Orders State
- **Description:** Shows message when no orders exist
- **Precondition:** User logged in, no orders
- **Expected Result:**
  - "No orders yet!" message
  - "Start Shopping" button

#### FR-ORD-004: Navigate to Order Detail
- **Description:** Clicking order navigates to detail page
- **Action:** Click on an order in the list
- **Expected Result:**
  - User navigated to `/orders/:id`

#### FR-ORD-005: Username Navigation to Orders
- **Description:** Clicking username in navbar navigates to orders
- **Precondition:** User logged in
- **Action:** Click on username in navigation bar
- **Expected Result:**
  - User navigated to `/orders`

### 7.2 Order Confirmation/Detail Page (`/orders/:id`)

#### FR-ORD-006: Order Confirmation Display
- **Description:** Order confirmation page shows order details
- **Acceptance Criteria:**
  - "Order Confirmed!" or order status message
  - Order ID
  - Order status with badge
  - Shipping address
  - Payment info (last 4 digits only)
  - List of ordered items with:
    - Product name
    - Quantity
    - Unit price
    - Subtotal
  - Order total

#### FR-ORD-007: Order Status Display
- **Description:** Order status displayed correctly
- **Possible Statuses:**
  - `pending` - Yellow badge
  - `processing` - Blue badge
  - `shipped` - Blue badge
  - `delivered` - Green badge
  - `cancelled` - Red badge

#### FR-ORD-008: Order Access Control
- **Description:** Users can only view their own orders
- **Precondition:** User A logged in
- **Action:** Navigate to order belonging to User B
- **Expected Result:**
  - 404 Not Found error
  - (Admin users can view all orders)

---

## 8. Admin Dashboard Module

### 8.1 Admin Access

#### FR-ADM-001: Admin Access Control
- **Description:** Only admin users can access admin dashboard
- **Precondition:** Standard user logged in
- **Action:** Navigate to `/admin`
- **Expected Result:**
  - Redirected to home page or access denied

#### FR-ADM-002: Admin Link Visibility
- **Description:** Admin link only visible to admin users
- **Precondition:** Standard user logged in
- **Expected Result:**
  - "Admin" button NOT visible in navbar

- **Precondition:** Admin user logged in
- **Expected Result:**
  - "Admin" button visible in navbar

### 8.2 Admin Dashboard (`/admin`)

#### FR-ADM-003: Dashboard Tabs
- **Description:** Admin dashboard has three tabs
- **Tabs:**
  - Overview (default)
  - Products
  - Orders

#### FR-ADM-004: Overview Tab - Statistics
- **Description:** Overview tab displays key metrics
- **Acceptance Criteria:**
  - Products count (active products)
  - Orders count (total orders)
  - Users count (total users)
  - Pending orders count

#### FR-ADM-005: Overview Tab - Low Stock Alert
- **Description:** Shows products with stock < 10
- **Acceptance Criteria:**
  - Product name
  - Current stock level
  - Badge color: Yellow for low stock, Red for zero

#### FR-ADM-006: Overview Tab - Recent Orders
- **Description:** Shows 5 most recent orders
- **Acceptance Criteria:**
  - Order ID
  - Username
  - Total amount
  - Status badge

### 8.3 Products Tab

#### FR-ADM-007: Product Inventory Table
- **Description:** Products tab shows all products
- **Acceptance Criteria:**
  - Table columns: Product (image + name), Price, Stock, Status, Actions
  - Includes inactive products
  - Stock shown as editable input

#### FR-ADM-008: Update Product Stock
- **Description:** Admin can update product stock inline
- **Action:** Change stock number in input, blur field
- **Expected Result:**
  - Stock updated in database
  - Change persists on refresh

#### FR-ADM-009: Add New Product
- **Description:** Admin can add new product
- **Action:** Click "Add Product" button
- **Expected Result:**
  - Modal opens with product form:
    - Name (required)
    - Description
    - Price (required, positive number)
    - Stock (required, non-negative integer)
    - Active toggle
    - Image upload option

#### FR-ADM-010: Edit Product
- **Description:** Admin can edit existing product
- **Action:** Click "Edit" button on product row
- **Expected Result:**
  - Modal opens pre-filled with product data
  - Can update any field
  - Save updates the product

#### FR-ADM-011: Product Image Upload
- **Description:** Admin can upload product image
- **Acceptance Criteria:**
  - Image preview shown after selection
  - Supported formats: JPEG, PNG, WebP, GIF
  - Max file size: 5MB
  - Image stored in R2, URL linked to product

#### FR-ADM-012: Deactivate/Activate Product
- **Description:** Admin can toggle product active status
- **Precondition:** Product exists
- **Action:** Toggle "Active" switch in edit modal
- **Expected Result:**
  - Status badge updates (Active/Inactive)
  - Inactive products not shown in catalog

### 8.4 Orders Tab

#### FR-ADM-013: Order History Table
- **Description:** Orders tab shows all orders
- **Acceptance Criteria:**
  - Table columns: Order ID, Customer (username), Date, Total, Status
  - Ordered by date (newest first)

#### FR-ADM-014: Update Order Status
- **Description:** Admin can update order status
- **Action:** Select new status from dropdown
- **Expected Result:**
  - Order status updated immediately
  - Status options: Pending, Processing, Shipped, Delivered, Cancelled

---

## 9. Navigation & Layout

### 9.1 Navigation Bar

#### FR-NAV-001: Logo Navigation
- **Description:** Clicking logo navigates to home
- **Action:** Click QA Demo logo
- **Expected Result:**
  - User navigated to `/`

#### FR-NAV-002: Products Link
- **Description:** Products link navigates to catalog
- **Action:** Click "Products" link
- **Expected Result:**
  - User navigated to `/catalog`

#### FR-NAV-003: Cart Icon with Badge
- **Description:** Cart icon shows item count
- **Precondition:** Cart has items
- **Expected Result:**
  - Cart icon displays badge with item count
  - Clicking icon navigates to `/cart`

#### FR-NAV-004: Sign In Button (Guest)
- **Description:** Sign In button shown for guests
- **Precondition:** User not logged in
- **Expected Result:**
  - "Sign In" button visible
  - Clicking navigates to `/login`

#### FR-NAV-005: User Menu (Authenticated)
- **Description:** Authenticated user sees username and logout
- **Precondition:** User logged in
- **Expected Result:**
  - Username displayed (clickable, links to orders)
  - Logout icon button
  - No "Sign In" button

#### FR-NAV-006: Mobile Menu
- **Description:** Mobile menu works on small screens
- **Precondition:** Viewport < 768px
- **Action:** Click hamburger menu icon
- **Expected Result:**
  - Mobile menu slides in
  - Contains all navigation links
  - "My Orders" link (if authenticated)

### 9.2 Footer

#### FR-NAV-007: Footer Links
- **Description:** Footer contains relevant links
- **Acceptance Criteria:**
  - Products link
  - Sign In link (only if not authenticated)
  - Cart link

---

## 10. Error Handling

### 10.1 API Error Responses

#### FR-ERR-001: Validation Error Response
- **HTTP Status:** 400
- **Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fieldName": ["error message"]
    }
  }
}
```

#### FR-ERR-002: Unauthorized Error Response
- **HTTP Status:** 401
- **Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  }
}
```

#### FR-ERR-003: Forbidden Error Response
- **HTTP Status:** 403
- **Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden"
  }
}
```

#### FR-ERR-004: Not Found Error Response
- **HTTP Status:** 404
- **Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

#### FR-ERR-005: Account Locked Error
- **HTTP Status:** 403
- **Trigger:** Login with locked_user
- **Response:**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account is locked"
  }
}
```

#### FR-ERR-006: Invalid Credentials Error
- **HTTP Status:** 401
- **Trigger:** Login with wrong password
- **Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

#### FR-ERR-007: Out of Stock Error
- **HTTP Status:** 400
- **Trigger:** Add more items than available stock
- **Response:**
```json
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Product Name is out of stock"
  }
}
```

#### FR-ERR-008: Cart Empty Error
- **HTTP Status:** 400
- **Trigger:** Place order with empty cart
- **Response:**
```json
{
  "success": false,
  "error": {
    "code": "CART_EMPTY",
    "message": "Cart is empty"
  }
}
```

### 10.2 UI Error States

#### FR-ERR-009: 404 Page
- **Description:** Invalid routes show 404 page
- **Acceptance Criteria:**
  - "Page Not Found" message
  - Link to return home

---

## 11. API Reference

### 11.1 Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login` | No | Login with username/password |
| POST | `/api/auth/logout` | No | Logout (clear session) |
| POST | `/api/auth/refresh` | No | Refresh access token |
| GET | `/api/auth/me` | Yes | Get current user profile |

### 11.2 Product Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/products` | No | List all active products |
| GET | `/api/products/:slug` | No | Get product by slug |
| GET | `/api/products/id/:id` | No | Get product by ID |
| POST | `/api/products` | Admin | Create new product |
| PATCH | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Soft delete product |

### 11.3 Cart Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/cart` | Session* | Get current cart |
| POST | `/api/cart/items` | Session* | Add item to cart |
| PATCH | `/api/cart/items/:productId` | Session* | Update item quantity |
| DELETE | `/api/cart/items/:productId` | Session* | Remove item from cart |
| DELETE | `/api/cart` | Session* | Clear entire cart |

*Requires `X-Session-ID` header

### 11.4 Order Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/orders` | Yes | List user's orders |
| GET | `/api/orders/:id` | Yes | Get order details |
| POST | `/api/orders` | Yes | Create new order (checkout) |

### 11.5 Admin Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/admin/products` | Admin | All products (inc. inactive) |
| PATCH | `/api/admin/products/:id/stock` | Admin | Update product stock |
| GET | `/api/admin/orders` | Admin | All orders |
| GET | `/api/admin/orders/:id` | Admin | Order details |
| PATCH | `/api/admin/orders/:id/status` | Admin | Update order status |

### 11.6 Image Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/images/:key` | No | Get image by key |
| POST | `/api/images` | Admin | Upload new image |
| DELETE | `/api/images/:key` | Admin | Delete image |

---

## 12. Validation Rules

### 12.1 Login Form

| Field | Rules |
|-------|-------|
| username | Required, non-empty string |
| password | Required, non-empty string |

### 12.2 Checkout - Shipping

| Field | Rules |
|-------|-------|
| firstName | Required, 1-100 characters |
| lastName | Required, 1-100 characters |
| address | Required, 1-500 characters |

### 12.3 Checkout - Payment

| Field | Rules |
|-------|-------|
| cardNumber | Required, 13-19 digits, must pass Luhn validation |
| expiryDate | Required, format MM/YY |
| cvv | Required, 3-4 digits |
| cardholderName | Required, non-empty |

### 12.4 Product (Admin)

| Field | Rules |
|-------|-------|
| name | Required, 1-255 characters, unique |
| description | Optional, max 1000 characters |
| price | Required, positive number |
| stock | Required, integer >= 0 |
| isActive | Boolean, default true |

### 12.5 Cart

| Field | Rules |
|-------|-------|
| productId | Required, positive integer |
| quantity | Required, integer 1-99, cannot exceed stock |

---

## Appendix A: Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Appendix B: Responsive Breakpoints

| Breakpoint | Width |
|------------|-------|
| Mobile | < 640px |
| Tablet | 640px - 1024px |
| Desktop | > 1024px |

---

**Document End**

