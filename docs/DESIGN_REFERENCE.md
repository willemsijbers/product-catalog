# Product Catalog - Design Reference

## Design Philosophy

Based on Figma designs reviewed: [Product Catalog Design System](https://www.figma.com/design/ZvUffJsTRLA0qUvnE5cThD/Product-Catalog)

This prototype is inspired by the UI/UX patterns observed in the design system, implementing similar patterns with clean, functional code.

## UI/UX Patterns Observed

### Layout Structure
- **Clean, table-based views** for product listings
- **Clear visual hierarchy** with consistent spacing
- **Card-based components** for product details
- **Form-based configuration** for product setup

### Key Screens/Views
1. **Product List/Grid** - Browse and filter products
2. **Product Detail** - Individual product configuration
3. **Pricing Display** - Clear pricing breakdowns
4. **Configuration Forms** - Product setup and options

### Design Principles

#### Visual Hierarchy
- Clear headings and sections
- Consistent typography scale
- Proper spacing and alignment
- Visual separation between content blocks

#### Data Display
- Structured tables for product listings
- Clear labels and values
- Status indicators and badges
- Action buttons appropriately placed

#### Forms & Inputs
- Clear form labels
- Validation feedback
- Logical grouping of fields
- Progressive disclosure for complex options

## Color System (Inferred)

```css
/* Primary Colors */
--primary: #2563eb;      /* Primary actions */
--primary-dark: #1e40af; /* Hover states */

/* Neutral Colors */
--gray-50: #f9fafb;      /* Backgrounds */
--gray-100: #f3f4f6;     /* Light backgrounds */
--gray-200: #e5e7eb;     /* Borders */
--gray-600: #4b5563;     /* Secondary text */
--gray-900: #111827;     /* Primary text */

/* Semantic Colors */
--success: #10b981;      /* Success states */
--warning: #f59e0b;      /* Warnings */
--error: #ef4444;        /* Errors */
--info: #3b82f6;         /* Information */
```

## Typography

```css
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* Type Scale */
--text-xs: 0.75rem;      /* 12px - Small labels */
--text-sm: 0.875rem;     /* 14px - Secondary text */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.125rem;     /* 18px - Large body */
--text-xl: 1.25rem;      /* 20px - Small headings */
--text-2xl: 1.5rem;      /* 24px - Medium headings */
--text-3xl: 1.875rem;    /* 30px - Large headings */
```

## Spacing System

```css
/* Consistent spacing scale */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
```

## Component Patterns

### Product Card
- Thumbnail/icon
- Product name (prominent)
- Product code/SKU (secondary)
- Pricing information
- Status indicators
- Quick actions

### Pricing Display
- Clear price breakdown
- Multiple pricing tiers
- Usage-based components
- One-time fees
- Recurring charges

### Configuration Forms
- Logical field grouping
- Clear section headers
- Inline validation
- Help text and tooltips
- Progressive disclosure for advanced options

## Data Patterns

### Product Structure
```javascript
{
  id: "prod_001",
  name: "Product Name",
  code: "SKU-001",
  category: "category",
  pricing: {
    subscription: { monthly: 99, annual: 950 },
    usage: { metric: "API calls", rate: 0.001 },
    oneTime: { setup: 500 }
  },
  features: [],
  configuration: {}
}
```

## Implementation Notes

This prototype:
- ✅ Implements similar UI/UX patterns from the design system
- ✅ Maintains clean visual hierarchy
- ✅ Uses consistent spacing and typography
- ✅ Focuses on complex business logic validation
- ✅ Built with Claude Code for rapid prototyping

**Note**: This is a functional prototype inspired by observed patterns, not a pixel-perfect reproduction of proprietary designs.
