# Changelog

## 1.1.0 - 2026-10-14

### Added
- Admin inventory can be filtered by product name and by the date a product was added, and sorted by that date or by name.
- Admins can select products and delete them in bulk. Products that belong to an order are deactivated so order history stays intact. Other selected products are permanently deleted.
- `GET /api/admin/products` accepts `name`, `from`, `to`, `sort`, `direction`, and `page`.
- `POST /api/admin/products/bulk-delete` deletes up to 500 selected products, or up to 1,000 products matching a name or created-date filter.
