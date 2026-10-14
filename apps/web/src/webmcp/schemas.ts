const emptyInput = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

const productIdentifier = {
  productId: {
    type: 'number',
    description: 'Numeric product id from search_products.',
  },
  slug: {
    type: 'string',
    description: 'Product URL slug, such as wireless-headphones.',
  },
  name: {
    type: 'string',
    description: 'Product name. An exact name is preferred when several products share similar words.',
  },
} as const;

export const searchProductsSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Words to match against the product name, slug, or description. Omit to list the catalog.',
    },
    maxPrice: {
      type: 'number',
      description: 'Highest price in USD to include.',
    },
    inStockOnly: {
      type: 'boolean',
      description: 'When true, only products with stock above zero are returned.',
    },
  },
  additionalProperties: false,
} as const;

export const productLookupSchema = {
  type: 'object',
  properties: productIdentifier,
  additionalProperties: false,
} as const;

export const addToCartSchema = {
  type: 'object',
  properties: {
    ...productIdentifier,
    quantity: {
      type: 'number',
      description: 'How many units to add. Defaults to 1.',
    },
  },
  additionalProperties: false,
} as const;

export const setCartQuantitySchema = {
  type: 'object',
  properties: {
    ...productIdentifier,
    quantity: {
      type: 'number',
      description: 'The new quantity for this product. Use 0 to remove it from the cart.',
    },
  },
  required: ['quantity'],
  additionalProperties: false,
} as const;

export const openPageSchema = {
  type: 'object',
  properties: {
    page: {
      type: 'string',
      enum: ['home', 'catalog', 'product', 'cart', 'checkout', 'login', 'signup', 'orders', 'order', 'admin'],
      description: 'Store page to open for the shopper.',
    },
    slug: {
      type: 'string',
      description: 'Product slug. Required when page is product.',
    },
    orderId: {
      type: 'number',
      description: 'Order id. Required when page is order.',
    },
  },
  required: ['page'],
  additionalProperties: false,
} as const;

export const signInSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', description: 'Account username or email.' },
    password: { type: 'string', description: 'Account password.' },
  },
  required: ['username', 'password'],
  additionalProperties: false,
} as const;

export const createAccountSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', description: 'Email address for the new account.' },
    phone: { type: 'string', description: 'Phone number with at least 7 digits.' },
    password: {
      type: 'string',
      description: 'At least 8 characters, including one uppercase letter and one number.',
    },
    username: {
      type: 'string',
      description: 'Optional username. Letters, numbers, underscores, and hyphens only.',
    },
  },
  required: ['email', 'phone', 'password'],
  additionalProperties: false,
} as const;

export const orderIdSchema = {
  type: 'object',
  properties: {
    orderId: { type: 'number', description: 'Numeric order id.' },
  },
  required: ['orderId'],
  additionalProperties: false,
} as const;

export const placeOrderSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string', description: 'Shipping first name.' },
    lastName: { type: 'string', description: 'Shipping last name.' },
    address: { type: 'string', description: 'Shipping street address.' },
    cardNumber: {
      type: 'string',
      description: 'Card number, with or without spaces. The published QADemo test card is 4242 4242 4242 4242.',
    },
    expiryDate: { type: 'string', description: 'Expiry as MM/YY. A future month is required.' },
    cvv: { type: 'string', description: '3 or 4 digit card security code.' },
    cardholderName: { type: 'string', description: 'Name printed on the card.' },
  },
  required: ['firstName', 'lastName', 'address', 'cardNumber', 'expiryDate', 'cvv', 'cardholderName'],
  additionalProperties: false,
} as const;

export const stockSchema = {
  type: 'object',
  properties: {
    productId: { type: 'number', description: 'Product id whose stock will change.' },
    stock: { type: 'number', description: 'New available quantity. Use 0 when the product is sold out.' },
  },
  required: ['productId', 'stock'],
  additionalProperties: false,
} as const;

export const orderStatusSchema = {
  type: 'object',
  properties: {
    orderId: { type: 'number', description: 'Order id to update.' },
    status: {
      type: 'string',
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      description: 'New fulfillment status.',
    },
  },
  required: ['orderId', 'status'],
  additionalProperties: false,
} as const;

export const sessionSchema = emptyInput;
export const cartSchema = emptyInput;
export const clearCartSchema = emptyInput;
export const ordersSchema = emptyInput;
export const statsSchema = emptyInput;
