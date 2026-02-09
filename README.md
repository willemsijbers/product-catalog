# Everest Product Catalog

A modern product catalog system built with Next.js and Express, demonstrating seamless product and product line creation with support for complex pricing models.

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blue)](https://claude.ai)

## Features

- **Seamless Product Creation**: Create products with multiple product lines in a single, intuitive interface
- **V5 Architecture**: Based on Everest Product Catalog V5 data model
- **Commit/Overage Patterns**: Support for usage-based billing with parent-child line relationships
- **Multiple Price Models**: Flat, per-unit, tiered, volume, and rate card pricing
- **Modern Stack**: Next.js 15, React 19, Tailwind CSS, Shadcn UI components

## Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI**: Tailwind CSS + Shadcn UI components
- **Language**: TypeScript
- **Styling**: Responsive, modern design

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **API**: RESTful endpoints

## Architecture

The system implements a 7-entity V5 data model:
1. **Product** - Core product information
2. **ProductLine** - Billable components (recurring, one-time, usage)
3. **RateCardEntry** - Usage-based pricing structures
4. **BundleComponent** - Product bundles
5. **PriceBook** - Price list containers
6. **PriceBookEntryHeader** - Price book metadata
7. **PriceBookEntry** - Actual prices

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd product-catalog
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

1. **Start the backend server** (Terminal 1)
   ```bash
   npm start
   ```
   Backend runs on http://localhost:3000

2. **Start the frontend dev server** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on http://localhost:3001

3. **Access the application**
   - Product Creation: http://localhost:3001/products/create
   - API Documentation: http://localhost:3000/api

## Usage

### Creating a Product

1. Navigate to http://localhost:3001/products/create
2. Fill in product details (code, name, description, dates)
3. Click "Add Line" to create product lines
4. Configure each line:
   - Set line name and type (recurring/one-time/usage)
   - Choose price model
   - For recurring lines: Toggle "Has Usage Component" for commit/overage
   - For usage lines: Select parent line for commit/overage pattern
5. Click "Create Product" to save

### API Endpoints

**Products**
- `GET /api/products` - List all products
- `GET /api/products/:productNumber` - Get product details
- `GET /api/products/:productNumber/full` - Get product with all lines
- `POST /api/products/batch` - Create product with product lines
- `PUT /api/products/:productNumber` - Update product
- `DELETE /api/products/:productNumber` - Delete product

**Product Lines**
- `GET /api/product-lines` - List all product lines
- `GET /api/product-lines/:productLineNumber` - Get product line details
- `POST /api/product-lines` - Create product line
- `PUT /api/product-lines/:productLineNumber` - Update product line
- `DELETE /api/product-lines/:productLineNumber` - Delete product line

## Project Structure

```
product-catalog/
├── frontend/                # Next.js frontend application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # Shadcn UI components
│   │   └── types/          # TypeScript type definitions
│   └── package.json
├── models/                 # Database models
│   ├── Product.js
│   ├── ProductLine.js
│   ├── RateCardEntry.js
│   └── ...
├── routes/                 # API routes
│   └── api.js
├── database/               # Database schemas and migrations
│   ├── schema.sql
│   └── seed.sql
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   └── DESIGN_REFERENCE.md
├── server.js               # Express server
└── package.json
```

## Database Schema

The application uses SQLite with a V5 schema that includes:
- Foreign key constraints
- Check constraints for data validation
- Indexes for optimized queries
- Support for commit/overage patterns
- Multi-currency and multi-entity support

## Development

### Built with Claude Code
This project was developed using Claude Code, demonstrating AI-native development practices for rapid prototyping and full-stack implementation.

### Key Patterns
- **Seamless UX**: Single-page product creation with inline expandable forms
- **V5 Architecture**: Direct Product → ProductLine relationships
- **Commit/Overage**: `hasUsage` flag + `parentLine` FK pattern
- **Transaction Safety**: Batch creation endpoint uses database transactions

## License

MIT

## Acknowledgments

- Built for Everest ERP system demonstration
- Designed with Figma inspiration, implemented with Claude Code
- Demonstrates AI-native development workflow

---

**Built with [Claude Code](https://claude.ai) | 2026**
