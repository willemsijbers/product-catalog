# Product Catalog UI Guide

## Accessing the Application

1. Start the server:
   ```bash
   cd product-catalog
   npm start
   ```

2. Open your browser to: `http://localhost:3000`

## User Interface Overview

### Main Components

1. **Header** - Shows application title and description
2. **Navigation Bar** - Buttons to switch between entity types
3. **Content Area** - Displays data tables and forms
4. **Search Bar** - Filter records in real-time
5. **Create Button** - Open form to create new records
6. **Action Buttons** - Edit and Delete buttons for each record

## Working with Entities

### Viewing Data

1. Click on any entity button in the navigation bar (e.g., "Products")
2. The table will display all active records for that entity
3. Use the search bar to filter records by any field

### Creating Records

1. Click the "Create New" button in the top-right corner
2. A modal form will appear
3. Fill in the required fields (marked with *)
4. Select values from dropdowns for:
   - Foreign keys (e.g., select a Product when creating an Offering)
   - Enums (e.g., select Line Type: Recurring, OneTime, or Usage)
5. Use checkboxes for boolean fields (e.g., Is Bundle, Is Active)
6. Click "Save" to create the record

### Editing Records

1. Click the "Edit" button (green) next to any record
2. The form will open with current values pre-populated
3. Make your changes
4. Click "Save" to update the record
5. Note: ID fields are read-only and cannot be changed

### Deleting Records

1. Click the "Delete" button (red) next to any record
2. A confirmation dialog will appear
3. Click "OK" to permanently delete the record
4. Warning: This will also delete related records due to CASCADE constraints

## Entity-Specific Guides

### Products

**Fields:**
- Product ID* - Unique identifier (e.g., P-1, P-2)
- Product Name* - Display name
- Product Code* - Unique code
- Product Family - Select from: Video, Image, Audio, Document, Other
- Description - Optional text description
- Is Bundle - Check if this product is a bundle
- Is Active - Check to make product active

**Example:** Flow Video (P-1), Flow Image (P-2), Flow Bundle (P-3)

### Product Offerings

**Fields:**
- Offering ID* - Unique identifier (e.g., OFF-1)
- Offering Name* - Display name
- Offering Code* - Unique code
- Product* - Select parent product from dropdown
- Description - Optional text
- Effective Start/End Date - Optional date range
- Is Active - Check to make active

**Important:** Each offering must be linked to a product

### Product Lines

**Fields:**
- Line ID* - Unique identifier (e.g., LINE-1)
- Line Name* - Display name
- Line Code* - Unique code
- Product* - Select parent product
- Line Type* - Select: Recurring, OneTime, or Usage
- Price Model* - Select: FlatFee, PerUnit, Tiered, or Volume
- Unit of Measure - e.g., Month, GB, Minutes
- Description - Optional text
- Is Active - Check to make active

**Important:** Usage-based lines require Rate Card Entries

### Product Offering Lines

**Fields:**
- Offering Line ID* - Unique identifier (e.g., OL-1)
- Offering* - Select parent offering
- Product Line* - Select product line to include
- Line Sequence - Order in offering (optional)
- Quantity Dependency - Independent or Dependent
- Is Optional - Check if line is optional
- Default/Min/Max Quantity - Optional quantity constraints
- Is Active - Check to make active

**Purpose:** Links product lines to offerings

### Rate Card Entries

**Fields:**
- Rate Card Entry ID* - Unique identifier (e.g., RC-1)
- Product Line* - Select usage-based product line
- Usage Type* - Select: Minutes, Gigabytes, API_Calls, Transactions, Users, Other
- Tier Start* - Start of pricing tier (e.g., 0)
- Tier End - End of tier (leave empty for unlimited)
- Unit Price* - Price per unit (e.g., 0.10)
- Currency - Default: USD
- Effective Start/End Date - Optional date range
- Is Active - Check to make active

**Example Tiered Pricing:**
- Tier 1: 0-100 GB @ $0.10/GB
- Tier 2: 100-500 GB @ $0.08/GB
- Tier 3: 500+ GB @ $0.05/GB

### Bundle Components

**Fields:**
- Component ID* - Unique identifier (e.g., BC-1)
- Bundle Product* - Select bundle product
- Bundle Offering* - Select bundle's offering
- Component Product* - Select component product
- Component Offering Line* - Select offering line from component
- Allocation % - Revenue allocation percentage (0-100)
- Quantity - Default: 1
- Is Required - Check if component is required
- Effective Start/End Date - Optional date range
- Is Active - Check to make active

**Purpose:** Define which products are included in a bundle

**Example:** Flow Bundle (P-3) contains Flow Video and Flow Image components

### Price Books

**Fields:**
- Price Book ID* - Unique identifier (e.g., PB-1)
- Price Book Name* - Display name
- Price Book Code* - Unique code
- Description - Optional text
- Currency - Default: USD
- Effective Start/End Date - Optional date range
- Is Active - Check to make active

**Purpose:** Container for pricing entries

### Price Book Entry Headers

**Fields:**
- Entry Header ID* - Unique identifier (e.g., PEH-1)
- Price Book* - Select parent price book
- Offering Line* - Select offering line to price
- Pricing Term - Monthly, Quarterly, Annual, OneTime, Usage
- Invoice Frequency - Monthly, Quarterly, Annual, OneTime, Usage
- Effective Start/End Date - Optional date range
- Is Active - Check to make active

**Purpose:** Link price books to offering lines with pricing terms

### Price Book Entries

**Fields:**
- Entry ID* - Unique identifier (e.g., PE-1)
- Entry Header* - Select parent entry header
- Rate Card Entry - Optional link to rate card (for usage pricing)
- Tier Start/End - Optional pricing tiers
- Unit Price* - Price per unit
- List Price - Original price before discount
- Discount % - Discount percentage (0-100)
- Effective Start/End Date - Optional date range
- Is Active - Check to make active

**Purpose:** Individual pricing entries within a price book

## Common Workflows

### Creating a New Product with Offering

1. Click "Products" → "Create New"
2. Enter product details → Save
3. Click "Offerings" → "Create New"
4. Select the product you just created → Save
5. Click "Product Lines" → "Create New"
6. Select the product → Enter line details → Save
7. Click "Offering Lines" → "Create New"
8. Select the offering and product line → Save

### Setting Up Usage-Based Pricing

1. Create Product Line with Line Type = "Usage"
2. Create Rate Card Entries for tiered pricing:
   - Entry 1: Tier 0-100, Price $0.10
   - Entry 2: Tier 100-500, Price $0.08
   - Entry 3: Tier 500+, Price $0.05
3. Link to offering via Offering Line
4. Create Price Book Entry referencing the rate cards

### Creating a Bundle

1. Create bundle product with Is Bundle = checked
2. Create offering for the bundle
3. Create component products (if not exists)
4. Create offering lines for bundle's offering (referencing component lines)
5. Create Bundle Components:
   - Set Bundle Product and Offering
   - Select Component Product and Offering Line
   - Set Allocation % for revenue distribution

## Tips and Best Practices

### ID Naming Conventions
- Products: P-1, P-2, P-3
- Offerings: OFF-1, OFF-2, OFF-3
- Lines: LINE-1, LINE-2, LINE-3
- Offering Lines: OL-1, OL-2, OL-3
- Rate Cards: RC-1, RC-2, RC-3
- Bundles: BC-1, BC-2, BC-3
- Price Books: PB-1, PB-2
- Price Book Headers: PEH-1, PEH-2
- Price Book Entries: PE-1, PE-2

### Required Relationships
- Offerings require a Product
- Offering Lines require an Offering and Product Line
- Product Lines require a Product
- Rate Cards require a Product Line (usage-based)
- Bundle Components require all 4 references (bundle product, bundle offering, component product, component offering line)
- Price Book Headers require a Price Book and Offering Line
- Price Book Entries require an Entry Header

### Data Validation
- IDs must be unique across the entity
- Codes must be unique within entity type
- Allocation percentages must be 0-100
- Discount percentages must be 0-100
- Foreign key references must exist
- Enum values must match predefined options

### Cascading Deletes
Be careful when deleting records - related records will also be deleted:
- Deleting a Product deletes its Offerings, Lines, and Bundle Components
- Deleting an Offering deletes its Offering Lines
- Deleting a Price Book deletes its Headers and Entries

### Search Tips
- Search works across all displayed fields
- Search is case-insensitive
- Partial matches are supported
- Use specific terms for better results

## Keyboard Shortcuts

- **Enter** - Submit form when focused on input field
- **Escape** - Close modal (if browser supports)
- **Tab** - Navigate between form fields

## Troubleshooting

### Modal Won't Close
- Click the X button in the top-right
- Click "Cancel" button
- Click outside the modal area

### Dropdown Shows No Options
- Ensure related entities exist first
- Example: Create Products before creating Offerings

### Save Button Not Working
- Check that all required fields (marked with *) are filled
- Check browser console for error messages
- Verify foreign key references exist

### Record Not Appearing in List
- Check if it's marked as inactive (isActive = 0)
- Check if you're viewing the correct entity type
- Try refreshing the page

## Browser Console

For debugging, open browser console:
- Chrome/Edge: Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
- Firefox: Press F12 or Ctrl+Shift+K (Cmd+Option+K on Mac)
- Safari: Enable Developer menu in Preferences, then press Cmd+Option+I

## Support

If you encounter issues:
1. Check the server is running (`npm start`)
2. Check browser console for errors
3. Verify database file exists: `database/catalog.db`
4. Try resetting the database (delete catalog.db and restart server)
