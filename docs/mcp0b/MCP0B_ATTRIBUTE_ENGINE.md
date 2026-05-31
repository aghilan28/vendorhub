# MCP-0B.3 — Attribute Engine

Source: `lib/catalog/attributes.ts`.

## Registry + templates
`ATTRIBUTE_TEMPLATES` defines per-family attribute sets (27 families). Each
`AttributeDef`: `{ key, label, type, required, unit?, options?, filterable, searchable }`.

Examples (as mandated):
- **Mobiles**: RAM (GB, required), Storage (GB, required), Battery (mAh),
  Display (in), Color (searchable).
- **Fashion**: Size (enum, required), Color (required, searchable), Material, Fit.
- **Groceries**: Brand, Weight (g, required), Best-before, Vegetarian.

## Inheritance
`templateForCategory(slug)` resolves a category to its family template, so
subcategories inherit the family's attributes (`smartphones` → `mobiles` family).

## Validation
`validateAttributes(category, values)` → `{ ok, errors[], warnings[] }`:
- required-missing → error (`missing_required_attribute:<key>`);
- numeric/unit type mismatch → error;
- enum value outside options → warning (`unexpected_option:<key>`).

## Governance / filters
`filterableAttributes(category)` exposes the facets search uses. Templates are the
governance contract every ingested/created product is validated against.

Verified by tests: mobiles/fashion templates, required + enum validation, facets.
