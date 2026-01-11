# QADemo REST API Documentation

**Version:** 1.0  
**Base URL:** `https://qademo.com/api` (or `http://localhost:8788/api` for local)  
**Date:** January 11, 2026

---

## Table of Contents

1. [Quick Start (3 Minutes)](#quick-start-3-minutes)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Public Endpoints](#public-endpoints)
6. [Authenticated Endpoints](#authenticated-endpoints)
7. [Admin Endpoints](#admin-endpoints)
8. [Common Test Scenarios](#common-test-scenarios)
9. [Example Automation Scripts](#example-automation-scripts)
10. [Quick Reference](#quick-reference-summary)

---

## Quick Start (3 Minutes)

### Option 1: Using Bearer Token

```bash
# Step 1: Login
curl -X POST https://qademo.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"standard_user","password":"password123"}'

# Step 2: Copy the accessToken from response and use it
curl -X GET https://qademo.com/api/orders \
  -H "Authorization: Bearer <paste-token-here>"
```

### Option 2: Using Basic Auth (Easier!)

```bash
# One step - no login needed!
curl -X GET https://qademo.com/api/orders \
  -H "Authorization: Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=="
```

### Pre-Generated Basic Auth Tokens

| Username      | Password     | Basic Auth Token                         | Type     |
|---------------|--------------|------------------------------------------|----------|
| standard_user | password123  | `c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw==`   | Customer |
| problem_user  | password123  | `cHJvYmxlbV91c2VyOnBhc3N3b3JkMTIz`       | Customer |
| admin         | admin123     | `YWRtaW46YWRtaW4xMjM=`                   | Admin    |

**Generate your own:**
```bash
echo -n "username:password" | base64
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Public Endpoints](#public-endpoints)
5. [Authenticated Endpoints](#authenticated-endpoints)
6. [Admin Endpoints](#admin-endpoints)
7. [Example Automation Scripts](#example-automation-scripts)

---

## Authentication

### Overview

The QADemo API uses **JWT (JSON Web Tokens)** for authentication. All protected endpoints require a valid access token in the `Authorization` header.

### Getting an Access Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "standard_user",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "standard_user",
      "email": "user@example.com",
      "userType": "customer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using the Access Token

Include the access token in all protected API requests:

```http
GET /api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Basic Authentication Alternative

For automation testing, you can also use **HTTP Basic Authentication**. The API will automatically convert it to a token:

```http
GET /api/orders
Authorization: Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw==
```

> **Note:** Base64 encode `username:password` for Basic Auth  
> Example: `standard_user:password123` → `c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw==`

### Token Expiration

- **Access Token:** Expires in 15 minutes
- **Refresh Token:** Expires in 7 days

Use the refresh token to get a new access token:

**Endpoint:** `POST /api/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test Credentials

| Username          | Password     | Type     | Purpose                          |
|-------------------|--------------|----------|----------------------------------|
| `standard_user`   | `password123`| Customer | Standard user for testing        |
| `problem_user`    | `password123`| Customer | User with order issues           |
| `locked_user`     | `password123`| Customer | Locked account (login fails)     |
| `admin`           | `admin123`   | Admin    | Full admin access                |

---

## Response Format

All API responses follow this standard structure:

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": { /* optional metadata */ }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional field-level errors */ }
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning               | Description                                    |
|------|-----------------------|------------------------------------------------|
| 200  | OK                    | Request successful                             |
| 201  | Created               | Resource created successfully                  |
| 400  | Bad Request           | Validation error or malformed request          |
| 401  | Unauthorized          | Missing or invalid authentication              |
| 403  | Forbidden             | Insufficient permissions                       |
| 404  | Not Found             | Resource not found                             |
| 500  | Internal Server Error | Server error                                   |

### Common Error Codes

| Code              | Description                                    |
|-------------------|------------------------------------------------|
| `VALIDATION_ERROR`| Invalid input data                             |
| `UNAUTHORIZED`    | Missing or invalid token                       |
| `FORBIDDEN`       | Admin access required                          |
| `NOT_FOUND`       | Resource not found                             |
| `OUT_OF_STOCK`    | Product out of stock                           |
| `CART_EMPTY`      | Cart is empty (checkout failed)                |
| `INVALID_CREDENTIALS` | Wrong username/password                    |

---

## Public Endpoints

### 1. Get All Products

**Endpoint:** `GET /api/products`

**Description:** List all active products with stock information

**Auth Required:** No

**Request:**
```bash
curl -X GET https://qademo.com/api/products
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "slug": "wireless-headphones",
      "description": "Premium noise-cancelling headphones",
      "price": 199.99,
      "stock": 50,
      "imageUrl": "/api/images/headphones.jpg",
      "imageKey": "headphones.jpg",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 42
  }
}
```

### 2. Get Single Product

**Endpoint:** `GET /api/products/:slug`

**Description:** Get detailed product information by slug

**Auth Required:** No

**Request:**
```bash
curl -X GET https://qademo.com/api/products/wireless-headphones
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "description": "Premium noise-cancelling headphones with 30-hour battery life",
    "price": 199.99,
    "stock": 50,
    "imageUrl": "/api/images/headphones.jpg",
    "imageKey": "headphones.jpg",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Get Product by ID

**Endpoint:** `GET /api/products/id/:id`

**Description:** Get product information by product ID

**Auth Required:** No

**Request:**
```bash
curl -X GET https://qademo.com/api/products/id/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "price": 199.99,
    "stock": 50
  }
}
```

### 4. Check Product Availability

**Endpoint:** `GET /api/products/id/:id`

**Description:** Check if a product is in stock

**Auth Required:** No

**Request:**
```bash
curl -X GET https://qademo.com/api/products/id/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Wireless Headphones",
    "stock": 50,
    "isActive": true
  }
}
```

**Automation Check:**
```javascript
const response = await fetch('https://qademo.com/api/products/id/1');
const { data } = await response.json();

if (data.stock > 0 && data.isActive) {
  console.log(`Product available: ${data.stock} units in stock`);
} else {
  console.log('Product out of stock or inactive');
}
```

### 5. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive access token

**Auth Required:** No

**Request:**
```bash
curl -X POST https://qademo.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "standard_user",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "standard_user",
      "email": "user@example.com",
      "userType": "customer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Authenticated Endpoints

All endpoints in this section require authentication via `Authorization: Bearer <token>` header.

### 1. Get User Orders

**Endpoint:** `GET /api/orders`

**Description:** List all orders for the authenticated user

**Auth Required:** Yes (Customer or Admin)

**Request:**
```bash
curl -X GET https://qademo.com/api/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 2,
      "totalAmount": 299.97,
      "status": "pending",
      "shippingFirstName": "John",
      "shippingLastName": "Doe",
      "shippingAddress": "123 Main St, City, State 12345",
      "paymentLastFour": "4242",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### 2. Get Order Details

**Endpoint:** `GET /api/orders/:id`

**Description:** Get detailed order information including items

**Auth Required:** Yes (Customer can only see their own orders, Admin can see all)

**Request:**
```bash
curl -X GET https://qademo.com/api/orders/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 2,
    "totalAmount": 299.97,
    "status": "pending",
    "shippingFirstName": "John",
    "shippingLastName": "Doe",
    "shippingAddress": "123 Main St, City, State 12345",
    "paymentLastFour": "4242",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "items": [
      {
        "id": 1,
        "orderId": 1,
        "productId": 1,
        "productName": "Wireless Headphones",
        "quantity": 1,
        "unitPrice": 199.99
      }
    ]
  }
}
```

### 3. Get Order Status

**Endpoint:** `GET /api/orders/:id`

**Description:** Get the current status of an order

**Auth Required:** Yes

**Request:**
```bash
curl -X GET https://qademo.com/api/orders/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "processing",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

**Possible Order Statuses:**
- `pending` - Order placed, awaiting processing
- `processing` - Order is being processed
- `shipped` - Order has been shipped
- `delivered` - Order has been delivered
- `cancelled` - Order was cancelled

### 4. Place Order (Checkout)

**Endpoint:** `POST /api/orders`

**Description:** Create a new order from cart items

**Auth Required:** Yes

**Headers Required:**
- `Authorization: Bearer <token>`
- `X-Session-ID: <session-uuid>` (required for cart access)

**Request:**
```bash
curl -X POST https://qademo.com/api/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping": {
      "firstName": "John",
      "lastName": "Doe",
      "address": "123 Main St, City, State 12345"
    },
    "payment": {
      "cardNumber": "4242424242424242",
      "expiry": "12/26",
      "cvv": "123",
      "nameOnCard": "John Doe"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 2,
    "totalAmount": 199.99,
    "status": "pending",
    "shippingFirstName": "John",
    "shippingLastName": "Doe",
    "shippingAddress": "123 Main St, City, State 12345",
    "paymentLastFour": "4242",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Test Card Numbers:**
- `4242424242424242` - Success
- `4000000000000002` - Card declined (triggers validation error)

---

## Admin Endpoints

All endpoints in this section require **Admin** authentication.

### 1. Get All Products (Admin)

**Endpoint:** `GET /api/admin/products`

**Description:** List all products including inactive ones

**Auth Required:** Yes (Admin only)

**Request:**
```bash
curl -X GET https://qademo.com/api/admin/products \
  -H "Authorization: Bearer <admin-token>"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Wireless Headphones",
      "slug": "wireless-headphones",
      "price": 199.99,
      "stock": 50,
      "isActive": true
    }
  ],
  "meta": {
    "total": 42
  }
}
```

### 2. Update Product Stock

**Endpoint:** `PATCH /api/admin/products/:id/stock`

**Description:** Update the stock level of a product

**Auth Required:** Yes (Admin only)

**Request:**
```bash
curl -X PATCH https://qademo.com/api/admin/products/1/stock \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "stock": 100
  }
}
```

### 3. Get All Orders (Admin)

**Endpoint:** `GET /api/admin/orders`

**Description:** List all orders from all users

**Auth Required:** Yes (Admin only)

**Request:**
```bash
curl -X GET https://qademo.com/api/admin/orders \
  -H "Authorization: Bearer <admin-token>"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 2,
      "username": "standard_user",
      "totalAmount": 299.97,
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### 4. Get Order Details (Admin)

**Endpoint:** `GET /api/admin/orders/:id`

**Description:** Get detailed order information for any user

**Auth Required:** Yes (Admin only)

**Request:**
```bash
curl -X GET https://qademo.com/api/admin/orders/1 \
  -H "Authorization: Bearer <admin-token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 2,
    "username": "standard_user",
    "totalAmount": 299.97,
    "status": "processing",
    "items": [
      {
        "id": 1,
        "productId": 1,
        "productName": "Wireless Headphones",
        "quantity": 1,
        "unitPrice": 199.99
      }
    ]
  }
}
```

### 5. Update Order Status

**Endpoint:** `PATCH /api/admin/orders/:id/status`

**Description:** Update the status of an order

**Auth Required:** Yes (Admin only)

**Request:**
```bash
curl -X PATCH https://qademo.com/api/admin/orders/1/status \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "shipped"
  }
}
```

**Valid Status Values:**
- `pending`
- `processing`
- `shipped`
- `delivered`
- `cancelled`

### 6. Get Dashboard Stats

**Endpoint:** `GET /api/admin/stats`

**Description:** Get dashboard statistics

**Auth Required:** Yes (Admin only)

**Request:**
```bash
curl -X GET https://qademo.com/api/admin/stats \
  -H "Authorization: Bearer <admin-token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "counts": {
      "products": 42,
      "orders": 156,
      "users": 25,
      "pendingOrders": 12
    },
    "recentOrders": [
      {
        "id": 1,
        "totalAmount": 299.97,
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z",
        "username": "standard_user"
      }
    ],
    "lowStockProducts": [
      {
        "id": 5,
        "name": "USB Cable",
        "stock": 3
      }
    ]
  }
}
```

---

## Common Test Scenarios

These scenarios demonstrate the most frequently used API operations for automation testing.

### Scenario 1: Check Product Availability

```bash
# No authentication needed
curl https://qademo.com/api/products/id/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Wireless Headphones",
    "stock": 50,
    "isActive": true
  }
}
```

**Automation Check:**
```python
import requests

response = requests.get('https://qademo.com/api/products/id/1')
product = response.json()['data']

assert product['stock'] > 0, "Product out of stock!"
assert product['isActive'], "Product is inactive!"
print(f"✓ Product available: {product['stock']} units")
```

---

### Scenario 2: Get All Products with Quantities

```bash
curl https://qademo.com/api/products
```

**Automation Check:**
```javascript
const response = await fetch('https://qademo.com/api/products');
const { data } = await response.json();

// Verify all products have stock information
data.forEach(product => {
  console.log(`${product.name}: ${product.stock} units @ $${product.price}`);
  assert(product.stock >= 0, 'Stock must be non-negative');
});
```

---

### Scenario 3: Get User's Order List

```bash
curl https://qademo.com/api/orders \
  -H "Authorization: Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=="
```

**Automation Check:**
```python
import requests

headers = {'Authorization': 'Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=='}
response = requests.get('https://qademo.com/api/orders', headers=headers)
orders = response.json()['data']

print(f"User has {len(orders)} orders")
if orders:
    latest = orders[0]
    print(f"Latest order: #{latest['id']} - {latest['status']}")
```

---

### Scenario 4: Monitor Order Status

```bash
curl https://qademo.com/api/orders/42 \
  -H "Authorization: Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=="
```

**Automation - Poll for Status Changes:**
```python
import time
import requests

order_id = 42
auth = {'Authorization': 'Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=='}

for i in range(10):
    response = requests.get(f'https://qademo.com/api/orders/{order_id}', headers=auth)
    status = response.json()['data']['status']
    print(f"[{i+1}/10] Order status: {status}")
    
    if status in ['shipped', 'delivered']:
        print("✓ Order processed!")
        break
    
    time.sleep(2)
```

---

### Scenario 5: Update Product Stock (Admin)

```bash
curl -X PATCH https://qademo.com/api/admin/products/1/stock \
  -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  -H "Content-Type: application/json" \
  -d '{"stock": 100}'
```

**Automation Workflow:**
```python
import requests

admin_auth = {'Authorization': 'Basic YWRtaW46YWRtaW4xMjM='}

# 1. Check current stock
product = requests.get('https://qademo.com/api/products/id/1').json()['data']
print(f"Current stock: {product['stock']}")

# 2. Update stock
new_stock = product['stock'] + 50
response = requests.patch(
    'https://qademo.com/api/admin/products/1/stock',
    headers={**admin_auth, 'Content-Type': 'application/json'},
    json={'stock': new_stock}
)
print(f"✓ Stock updated to: {response.json()['data']['stock']}")

# 3. Verify change
product = requests.get('https://qademo.com/api/products/id/1').json()['data']
assert product['stock'] == new_stock, "Stock update failed!"
```

---

### Scenario 6: Update Order Status (Admin)

```bash
curl -X PATCH https://qademo.com/api/admin/orders/42/status \
  -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

**Valid Status Values:** `pending` → `processing` → `shipped` → `delivered` (or `cancelled` from any state)

**Automation - Process Order Through Lifecycle:**
```python
import requests
import time

order_id = 42
admin_auth = {
    'Authorization': 'Basic YWRtaW46YWRtaW4xMjM=',
    'Content-Type': 'application/json'
}

statuses = ['processing', 'shipped', 'delivered']

for status in statuses:
    response = requests.patch(
        f'https://qademo.com/api/admin/orders/{order_id}/status',
        headers=admin_auth,
        json={'status': status}
    )
    print(f"✓ Order updated to: {status}")
    time.sleep(1)  # Simulate processing time
```

---

### Scenario 7: Complete Test Suite

```python
import requests
from base64 import b64encode

BASE_URL = "https://qademo.com/api"

def basic_auth(username, password):
    token = b64encode(f"{username}:{password}".encode()).decode()
    return f"Basic {token}"

# Setup
user_auth = {'Authorization': basic_auth("standard_user", "password123")}
admin_auth = {'Authorization': basic_auth("admin", "admin123")}

print("=== API Test Suite ===\n")

# Test 1: Product availability
print("1. Checking product availability...")
product = requests.get(f"{BASE_URL}/products/id/1").json()['data']
print(f"   ✓ {product['name']}: {product['stock']} in stock\n")

# Test 2: List all products
print("2. Getting product catalog...")
products = requests.get(f"{BASE_URL}/products").json()['data']
print(f"   ✓ Found {len(products)} products\n")

# Test 3: User orders
print("3. Getting user orders...")
orders = requests.get(f"{BASE_URL}/orders", headers=user_auth).json()['data']
print(f"   ✓ User has {len(orders)} orders\n")

# Test 4: Order details
if orders:
    order_id = orders[0]['id']
    print(f"4. Checking order {order_id}...")
    order = requests.get(f"{BASE_URL}/orders/{order_id}", headers=user_auth).json()['data']
    print(f"   ✓ Status: {order['status']}")
    print(f"   ✓ Total: ${order['totalAmount']}\n")

# Test 5: Admin - Update stock
print("5. [Admin] Updating product stock...")
response = requests.patch(
    f"{BASE_URL}/admin/products/1/stock",
    headers={**admin_auth, 'Content-Type': 'application/json'},
    json={'stock': 100}
)
print(f"   ✓ Stock updated: {response.json()['data']['stock']}\n")

# Test 6: Admin - Update order status
if orders:
    print(f"6. [Admin] Updating order {order_id} status...")
    response = requests.patch(
        f"{BASE_URL}/admin/orders/{order_id}/status",
        headers={**admin_auth, 'Content-Type': 'application/json'},
        json={'status': 'shipped'}
    )
    print(f"   ✓ Status: {response.json()['data']['status']}\n")

# Test 7: Admin - Dashboard stats
print("7. [Admin] Getting dashboard stats...")
stats = requests.get(f"{BASE_URL}/admin/stats", headers=admin_auth).json()['data']
print(f"   ✓ Products: {stats['counts']['products']}")
print(f"   ✓ Orders: {stats['counts']['orders']}")
print(f"   ✓ Pending: {stats['counts']['pendingOrders']}")

print("\n=== All Tests Passed! ===")
```

---

## Example Automation Scripts

### Example 1: Complete Order Flow (Python + Requests)

```python
import requests
import uuid

BASE_URL = "https://qademo.com/api"
session_id = str(uuid.uuid4())

# 1. Login
login_response = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "standard_user",
    "password": "password123"
})
token = login_response.json()["data"]["accessToken"]
headers = {
    "Authorization": f"Bearer {token}",
    "X-Session-ID": session_id
}

# 2. Check product availability
product_response = requests.get(f"{BASE_URL}/products/id/1")
product = product_response.json()["data"]
print(f"Product: {product['name']}, Stock: {product['stock']}")

# 3. Add to cart (UI step - cart is managed client-side)
# Cart operations happen through the UI, which stores cart in KV

# 4. Place order
order_response = requests.post(f"{BASE_URL}/orders", headers=headers, json={
    "shipping": {
        "firstName": "John",
        "lastName": "Doe",
        "address": "123 Test St, City, State 12345"
    },
    "payment": {
        "cardNumber": "4242424242424242",
        "expiry": "12/26",
        "cvv": "123",
        "nameOnCard": "John Doe"
    }
})
order = order_response.json()["data"]
print(f"Order placed: ID {order['id']}, Status: {order['status']}")

# 5. Check order status
status_response = requests.get(f"{BASE_URL}/orders/{order['id']}", headers=headers)
order_status = status_response.json()["data"]
print(f"Order Status: {order_status['status']}")

# 6. Get all user orders
orders_response = requests.get(f"{BASE_URL}/orders", headers=headers)
all_orders = orders_response.json()["data"]
print(f"Total orders: {len(all_orders)}")
```

### Example 2: Admin Operations (JavaScript + Fetch)

```javascript
const BASE_URL = 'https://qademo.com/api';

// 1. Login as admin
const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })
});
const { accessToken } = (await loginResponse.json()).data;

const adminHeaders = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};

// 2. Get all orders
const ordersResponse = await fetch(`${BASE_URL}/admin/orders`, {
  headers: adminHeaders
});
const orders = (await ordersResponse.json()).data;
console.log(`Total orders: ${orders.length}`);

// 3. Update order status
const updateResponse = await fetch(`${BASE_URL}/admin/orders/1/status`, {
  method: 'PATCH',
  headers: adminHeaders,
  body: JSON.stringify({ status: 'shipped' })
});
console.log('Order status updated:', await updateResponse.json());

// 4. Update product stock
const stockResponse = await fetch(`${BASE_URL}/admin/products/1/stock`, {
  method: 'PATCH',
  headers: adminHeaders,
  body: JSON.stringify({ stock: 50 })
});
console.log('Stock updated:', await stockResponse.json());

// 5. Get dashboard stats
const statsResponse = await fetch(`${BASE_URL}/admin/stats`, {
  headers: adminHeaders
});
const stats = (await statsResponse.json()).data;
console.log('Pending orders:', stats.counts.pendingOrders);
console.log('Low stock products:', stats.lowStockProducts.length);
```

### Example 3: Using Basic Auth (Curl)

```bash
# Login is not needed with Basic Auth
# Encode username:password to base64
# echo -n "standard_user:password123" | base64
# Result: c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw==

# Get user orders
curl -X GET https://qademo.com/api/orders \
  -H "Authorization: Basic c3RhbmRhcmRfdXNlcjpwYXNzd29yZDEyMw=="

# Admin operations with Basic Auth
# echo -n "admin:admin123" | base64
# Result: YWRtaW46YWRtaW4xMjM=

curl -X PATCH https://qademo.com/api/admin/orders/1/status \
  -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

### Example 4: Playwright/Puppeteer API Testing

```javascript
// Playwright test example
import { test, expect } from '@playwright/test';

test('API: Complete order flow', async ({ request }) => {
  // 1. Login
  const loginResp = await request.post('/api/auth/login', {
    data: {
      username: 'standard_user',
      password: 'password123'
    }
  });
  const { accessToken } = (await loginResp.json()).data;
  
  // 2. Check product availability
  const productResp = await request.get('/api/products/id/1');
  const product = (await productResp.json()).data;
  expect(product.stock).toBeGreaterThan(0);
  
  // 3. Get user orders
  const ordersResp = await request.get('/api/orders', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  expect(ordersResp.ok()).toBeTruthy();
  
  // 4. Admin: Update order status
  const adminLoginResp = await request.post('/api/auth/login', {
    data: { username: 'admin', password: 'admin123' }
  });
  const adminToken = (await adminLoginResp.json()).data.accessToken;
  
  const updateResp = await request.patch('/api/admin/orders/1/status', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    data: { status: 'shipped' }
  });
  expect(updateResp.ok()).toBeTruthy();
});
```

---

## Postman Collection

Import the pre-configured collection for instant API testing with **automated error validation tests**:

**File:** `docs/QADemo-Postman-Collection.json`

### Features
- ✅ **8 Error Validation Tests** - Automatically verify all error scenarios
- ✅ **10 Success Scenario Tests** - Test normal operations
- ✅ **34+ Automated Assertions** - HTTP status, error codes, messages
- ✅ **Newman Compatible** - Run in CI/CD pipelines
- ✅ **Pre-configured Variables** - Basic Auth tokens, endpoints

### Quick Import
1. Open Postman
2. Click **Import** button
3. Select `docs/QADemo-Postman-Collection.json`
4. Run **"Error Validation Tests"** folder to verify all error handling

### Error Tests Included
1. Missing Authentication (401)
2. Invalid Credentials (401)
3. Admin Access Required (403)
4. Product Not Found (404)
5. Empty Cart Checkout (400)
6. Missing Required Fields (400)
7. Invalid Stock Update by Non-Admin (403)
8. Invalid Order Status Update by Non-Admin (403)

### Example Test Output
```
✓ Status is 403 Forbidden
✓ Error code is FORBIDDEN with admin message
```

**See [Postman Collection Guide](./POSTMAN-COLLECTION-GUIDE.md) for detailed usage instructions.**

---

## Quick Reference Summary

### User APIs (Authenticated)
| Method | Endpoint                | Description                   | Auth   |
|--------|-------------------------|-------------------------------|--------|
| GET    | `/api/orders`           | Get user's orders             | Bearer |
| GET    | `/api/orders/:id`       | Get specific order details    | Bearer |
| POST   | `/api/orders`           | Place new order (checkout)    | Bearer |

### Admin APIs (Admin Only)
| Method | Endpoint                        | Description                   | Auth   |
|--------|---------------------------------|-------------------------------|--------|
| GET    | `/api/admin/products`           | Get all products (incl inactive) | Bearer |
| PATCH  | `/api/admin/products/:id/stock` | Update product stock          | Bearer |
| GET    | `/api/admin/orders`             | Get all orders                | Bearer |
| GET    | `/api/admin/orders/:id`         | Get order details             | Bearer |
| PATCH  | `/api/admin/orders/:id/status`  | Update order status           | Bearer |
| GET    | `/api/admin/stats`              | Get dashboard statistics      | Bearer |

### Public APIs (No Auth)
| Method | Endpoint                | Description                   |
|--------|-------------------------|-------------------------------|
| GET    | `/api/products`         | List all active products      |
| GET    | `/api/products/:slug`   | Get product by slug           |
| GET    | `/api/products/id/:id`  | Get product by ID (availability) |
| POST   | `/api/auth/login`       | Login and get access token    |

---

## Support

For issues or questions about the REST API:
- **[Error Validations Reference](./API-ERROR-VALIDATION.md)** - Complete guide to all error scenarios and validations
- See [FRD-QADemo.md](./FRD-QADemo.md) for functional specifications
- See [AUTOMATION-IMPROVEMENTS.md](./AUTOMATION-IMPROVEMENTS.md) for UI automation guidelines

**Happy Testing!** 🚀
