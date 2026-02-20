const express = require('express');
const router = express.Router();

// Import models
const Product = require('../models/Product');
const ProductLine = require('../models/ProductLine');
const RateCardEntry = require('../models/RateCardEntry');
const BundleComponent = require('../models/BundleComponent');
const PriceBook = require('../models/PriceBook');
const PriceBookEntryHeader = require('../models/PriceBookEntryHeader');
const PriceBookEntry = require('../models/PriceBookEntry');

// Initialize models with database
router.use((req, res, next) => {
    const db = req.app.get('db');
    req.models = {
        product: new Product(db),
        productLine: new ProductLine(db),
        rateCardEntry: new RateCardEntry(db),
        bundleComponent: new BundleComponent(db),
        priceBook: new PriceBook(db),
        priceBookEntryHeader: new PriceBookEntryHeader(db),
        priceBookEntry: new PriceBookEntry(db)
    };
    next();
});

// ===== PRODUCT ROUTES =====
router.get('/products', (req, res) => {
    req.models.product.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/products/:productNumber/lines', (req, res) => {
    req.models.productLine.getByProductNumber(req.params.productNumber, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/products/:productNumber', (req, res) => {
    req.models.product.getById(req.params.productNumber, (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Fetch product lines for this product
        const db = req.app.get('db');
        const sql = 'SELECT * FROM ProductLine WHERE productNumber = ? ORDER BY productLineNumber';
        db.all(sql, [req.params.productNumber], (err, productLines) => {
            if (err) return res.status(500).json({ error: err.message });

            if (!productLines || productLines.length === 0) {
                return res.json({
                    ...product,
                    productLines: []
                });
            }

            // Fetch rate card entries for each product line
            let completed = 0;
            const linesWithRateCards = productLines.map(line => ({ ...line, rateCardEntries: [] }));

            productLines.forEach((line, index) => {
                const rateCardSql = 'SELECT * FROM RateCardEntry WHERE productLineId = ? ORDER BY rateCardEntryNumber';
                db.all(rateCardSql, [line.productLineNumber], (err, rateCards) => {
                    if (!err && rateCards) {
                        linesWithRateCards[index].rateCardEntries = rateCards;
                    }

                    completed++;
                    if (completed === productLines.length) {
                        res.json({
                            ...product,
                            productLines: linesWithRateCards
                        });
                    }
                });
            });
        });
    });
});

router.get('/products/:productNumber/full', (req, res) => {
    req.models.product.getFull(req.params.productNumber, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    });
});

router.post('/products', (req, res) => {
    req.models.product.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/products/:productNumber', (req, res) => {
    req.models.product.update(req.params.productNumber, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    });
});

router.delete('/products/:productNumber', (req, res) => {
    req.models.product.delete(req.params.productNumber, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    });
});

// ===== PRODUCT + PRODUCT LINES BATCH CREATE =====
router.post('/products/batch', (req, res) => {
    const { productCode, name, description, effectiveStartDate, effectiveEndDate, productFamily, productType, productLines, isBundleProduct } = req.body;

    // Validate required fields
    if (!productCode || !name) {
        return res.status(400).json({ error: 'productCode and name are required' });
    }

    // Generate product number
    const productNumber = `PROD-${Date.now()}`;

    // Start transaction
    const db = req.app.get('db');
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Create product
        const productData = {
            productNumber,
            productName: name,
            productCode,
            description,
            effectiveStartDate,
            effectiveEndDate,
            productFamily,
            productType,
            productStatus: 'active',
            isBundleProduct: isBundleProduct ? 1 : 0
        };

        req.models.product.create(productData, (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: `Failed to create product: ${err.message}` });
            }

            // Create product lines if any
            if (!productLines || productLines.length === 0) {
                db.run('COMMIT');
                return res.status(201).json({
                    productNumber,
                    message: 'Product created successfully'
                });
            }

            let completed = 0;
            let hasError = false;
            const lineNumberMap = {}; // Map frontend temp IDs to actual line numbers

            // First pass: create all product lines with generated numbers
            productLines.forEach((line, index) => {
                const productLineNumber = `${productNumber}-LINE-${index + 1}`;
                lineNumberMap[`line-${index}`] = productLineNumber;

                const lineData = {
                    productLineNumber,
                    productNumber,
                    name: line.name,
                    lineType: line.lineType,
                    priceModel: line.priceModel,
                    pricingTerm: line.pricingTerm || null,
                    unitOfMeasure: line.unitOfMeasure || null,
                    hasUsage: line.hasUsage ? 1 : 0,
                    parentLine: null // Will update in second pass if needed
                };

                req.models.productLine.create(lineData, (err) => {
                    if (err && !hasError) {
                        hasError = true;
                        db.run('ROLLBACK');
                        return res.status(400).json({
                            error: `Failed to create product line: ${err.message}`
                        });
                    }

                    completed++;

                    // After all lines are created, update parent references
                    if (completed === productLines.length && !hasError) {
                        updateParentReferences();
                    }
                });
            });

            // Second pass: update parent line references
            function updateParentReferences() {
                const linesToUpdate = productLines
                    .map((line, index) => ({ line, index }))
                    .filter(({ line }) => line.parentLine);

                if (linesToUpdate.length === 0) {
                    db.run('COMMIT');
                    return res.status(201).json({
                        productNumber,
                        productLines: Object.values(lineNumberMap),
                        message: 'Product and product lines created successfully'
                    });
                }

                let updatesCompleted = 0;
                linesToUpdate.forEach(({ line, index }) => {
                    const productLineNumber = lineNumberMap[`line-${index}`];
                    const parentLineNumber = lineNumberMap[line.parentLine];

                    if (!parentLineNumber) {
                        db.run('ROLLBACK');
                        return res.status(400).json({
                            error: 'Invalid parent line reference'
                        });
                    }

                    const sql = 'UPDATE ProductLine SET parentLine = ? WHERE productLineNumber = ?';
                    db.run(sql, [parentLineNumber, productLineNumber], (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            db.run('ROLLBACK');
                            return res.status(400).json({
                                error: `Failed to update parent line: ${err.message}`
                            });
                        }

                        updatesCompleted++;
                        if (updatesCompleted === linesToUpdate.length && !hasError) {
                            createRateCardEntries();
                        }
                    });
                });
            }

            // Third pass: create rate card entries for usage lines
            function createRateCardEntries() {
                const linesWithRateCards = productLines
                    .map((line, index) => ({ line, index }))
                    .filter(({ line }) => line.rateCardEntries && line.rateCardEntries.length > 0);

                if (linesWithRateCards.length === 0) {
                    return createBundleComponents();
                }

                let rateCardCompleted = 0;
                let totalRateCards = 0;

                // Count total rate cards to create
                linesWithRateCards.forEach(({ line }) => {
                    totalRateCards += line.rateCardEntries.length;
                });

                linesWithRateCards.forEach(({ line, index }) => {
                    const productLineNumber = lineNumberMap[`line-${index}`];

                    line.rateCardEntries.forEach((entry, entryIndex) => {
                        const rateCardEntryNumber = `${productLineNumber}-RC-${entryIndex + 1}`;
                        const rateCardData = {
                            rateCardEntryNumber,
                            productLineId: productLineNumber,  // Fixed: was productLineNumber, should be productLineId
                            usageType: entry.usageType,
                            identifier: entry.identifier || null,
                            usageUnitOfMeasure: entry.usageUnitOfMeasure || null,
                            conversion: entry.conversion || null,
                            billableUnitOfMeasure: entry.billableUnitOfMeasure || null,
                            invoiceFrequency: entry.invoiceFrequency || null,
                            priceModel: entry.priceModel || null,
                            allowance: entry.allowance || null,
                            term: entry.term || null,
                            rollover: entry.rollover ? 1 : 0,
                            rolloverDuration: entry.rolloverDuration || null,
                            maximumRolloverLimit: entry.maximumRolloverLimit || null,
                            expiration: entry.expiration || null,
                        };

                        req.models.rateCardEntry.create(rateCardData, (err) => {
                            if (err && !hasError) {
                                hasError = true;
                                db.run('ROLLBACK');
                                return res.status(400).json({
                                    error: `Failed to create rate card entry: ${err.message}`
                                });
                            }

                            rateCardCompleted++;
                            if (rateCardCompleted === totalRateCards && !hasError) {
                                createBundleComponents();
                            }
                        });
                    });
                });
            }

            // Fourth pass: create bundle components if bundle product
            function createBundleComponents() {
                const { bundleComponents, isBundleProduct } = req.body;

                if (!isBundleProduct || !bundleComponents || bundleComponents.length === 0) {
                    db.run('COMMIT');
                    return res.status(201).json({
                        productNumber,
                        productLines: Object.values(lineNumberMap),
                        message: 'Product and product lines created successfully'
                    });
                }

                let componentsCreated = 0;
                bundleComponents.forEach((component, index) => {
                    // Map bundleProductLineIndex to actual productLineNumber
                    const bundleProductLineNumber = lineNumberMap[`line-${component.bundleProductLineIndex}`];

                    if (!bundleProductLineNumber) {
                        if (!hasError) {
                            hasError = true;
                            db.run('ROLLBACK');
                            return res.status(400).json({
                                error: 'Invalid bundle product line reference'
                            });
                        }
                        return;
                    }

                    const bundleComponentNumber = `${productNumber}-BC-${index + 1}`;
                    const componentData = {
                        bundleComponentNumber,
                        bundleProductLine: bundleProductLineNumber,
                        componentProductLine: component.componentProductLineNumber,
                        componentPricingLevel: component.componentPricingLevel,
                        productLineType: component.productLineType,
                        componentQuantity: component.componentQuantity || 1,
                        quantityDependency: component.quantityDependency || null,
                        allocationPercentage: component.allocationPercentage || null,
                        discountPercentage: component.discountPercentage || null,
                        isOptional: component.isOptional ? 1 : 0,
                        description: component.description || null
                    };

                    req.models.bundleComponent.create(componentData, (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            db.run('ROLLBACK');
                            return res.status(400).json({
                                error: `Failed to create bundle component: ${err.message}`
                            });
                        }

                        componentsCreated++;
                        if (componentsCreated === bundleComponents.length && !hasError) {
                            db.run('COMMIT');
                            return res.status(201).json({
                                productNumber,
                                productLines: Object.values(lineNumberMap),
                                bundleComponentsCreated: componentsCreated,
                                message: 'Product, product lines, and bundle components created successfully'
                            });
                        }
                    });
                });
            }
        });
    });
});

// ===== PRODUCT LINE ROUTES =====
router.get('/product-lines', (req, res) => {
    req.models.productLine.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/product-lines/:productLineNumber', (req, res) => {
    req.models.productLine.getById(req.params.productLineNumber, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Product line not found' });
        res.json(row);
    });
});

router.get('/commit-overage-structures', (req, res) => {
    req.models.productLine.getCommitOverageStructures((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/product-lines', (req, res) => {
    req.models.productLine.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/product-lines/:productLineNumber', (req, res) => {
    req.models.productLine.update(req.params.productLineNumber, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Product line not found' });
        res.json({ message: 'Product line updated successfully' });
    });
});

router.delete('/product-lines/:productLineNumber', (req, res) => {
    req.models.productLine.delete(req.params.productLineNumber, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Product line not found' });
        res.json({ message: 'Product line deleted successfully' });
    });
});

// ===== RATE CARD ENTRY ROUTES =====
router.get('/rate-cards', (req, res) => {
    req.models.rateCardEntry.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/rate-cards/:rateCardEntryNumber', (req, res) => {
    req.models.rateCardEntry.getById(req.params.rateCardEntryNumber, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Rate card entry not found' });
        res.json(row);
    });
});

router.post('/rate-cards', (req, res) => {
    req.models.rateCardEntry.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/rate-cards/:rateCardEntryNumber', (req, res) => {
    req.models.rateCardEntry.update(req.params.rateCardEntryNumber, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Rate card entry not found' });
        res.json({ message: 'Rate card entry updated successfully' });
    });
});

router.delete('/rate-cards/:rateCardEntryNumber', (req, res) => {
    req.models.rateCardEntry.delete(req.params.rateCardEntryNumber, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Rate card entry not found' });
        res.json({ message: 'Rate card entry deleted successfully' });
    });
});

// ===== BUNDLE COMPONENT ROUTES =====
router.get('/bundles', (req, res) => {
    req.models.bundleComponent.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/bundles/:id', (req, res) => {
    req.models.bundleComponent.getById(req.params.id, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Bundle component not found' });
        res.json(row);
    });
});

router.get('/bundles/:productNumber/components', (req, res) => {
    req.models.bundleComponent.getByBundleProductNumber(req.params.productNumber, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/bundles', (req, res) => {
    req.models.bundleComponent.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/bundles/:id', (req, res) => {
    req.models.bundleComponent.update(req.params.id, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Bundle component not found' });
        res.json({ message: 'Bundle component updated successfully' });
    });
});

router.delete('/bundles/:id', (req, res) => {
    req.models.bundleComponent.delete(req.params.id, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Bundle component not found' });
        res.json({ message: 'Bundle component deleted successfully' });
    });
});

// ===== PRICE BOOK ROUTES =====
router.get('/price-books', (req, res) => {
    req.models.priceBook.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/price-books/:priceBookNumber', (req, res) => {
    req.models.priceBook.getById(req.params.priceBookNumber, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Price book not found' });
        res.json(row);
    });
});

router.post('/price-books', (req, res) => {
    req.models.priceBook.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/price-books/:priceBookNumber', (req, res) => {
    req.models.priceBook.update(req.params.priceBookNumber, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Price book not found' });
        res.json({ message: 'Price book updated successfully' });
    });
});

router.delete('/price-books/:priceBookNumber', (req, res) => {
    req.models.priceBook.delete(req.params.priceBookNumber, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Price book not found' });
        res.json({ message: 'Price book deleted successfully' });
    });
});

// ===== PRICE BOOK ENTRY HEADER ROUTES =====
router.get('/price-book-headers', (req, res) => {
    req.models.priceBookEntryHeader.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/price-book-headers/:headerNumber', (req, res) => {
    req.models.priceBookEntryHeader.getById(req.params.headerNumber, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Price book entry header not found' });
        res.json(row);
    });
});

router.post('/price-book-headers', (req, res) => {
    req.models.priceBookEntryHeader.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/price-book-headers/:headerNumber', (req, res) => {
    req.models.priceBookEntryHeader.update(req.params.headerNumber, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Price book entry header not found' });
        res.json({ message: 'Price book entry header updated successfully' });
    });
});

router.delete('/price-book-headers/:headerNumber', (req, res) => {
    req.models.priceBookEntryHeader.delete(req.params.headerNumber, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Price book entry header not found' });
        res.json({ message: 'Price book entry header deleted successfully' });
    });
});

// ===== PRICE BOOK ENTRY ROUTES =====
router.get('/price-book-entries', (req, res) => {
    req.models.priceBookEntry.getAll((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.get('/price-book-entries/:priceBookEntryNumber', (req, res) => {
    req.models.priceBookEntry.getById(req.params.priceBookEntryNumber, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Price book entry not found' });
        res.json(row);
    });
});

router.post('/price-book-entries', (req, res) => {
    req.models.priceBookEntry.create(req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json(result);
    });
});

router.put('/price-book-entries/:priceBookEntryNumber', (req, res) => {
    req.models.priceBookEntry.update(req.params.priceBookEntryNumber, req.body, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Price book entry not found' });
        res.json({ message: 'Price book entry updated successfully' });
    });
});

router.delete('/price-book-entries/:priceBookEntryNumber', (req, res) => {
    req.models.priceBookEntry.delete(req.params.priceBookEntryNumber, (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        if (result.changes === 0) return res.status(404).json({ error: 'Price book entry not found' });
        res.json({ message: 'Price book entry deleted successfully' });
    });
});

// ===== CHECK IF PRODUCT HAS PRICING =====
router.get('/products/:productNumber/has-pricing', (req, res) => {
    const { productNumber } = req.params;
    const db = req.app.get('db');

    const sql = `
        SELECT COUNT(*) as count
        FROM PriceBookEntryHeader h
        INNER JOIN ProductLine pl ON h.productLineNumber = pl.productLineNumber
        WHERE pl.productNumber = ?
    `;

    db.get(sql, [productNumber], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ hasPricing: row.count > 0 });
    });
});

// ===== GET PRODUCT PRICING =====
router.get('/products/:productNumber/pricing', (req, res) => {
    const { productNumber } = req.params;
    const db = req.app.get('db');

    // Get all pricing for this product
    const sql = `
        SELECT
            h.headerNumber,
            h.priceBookId,
            h.productLineNumber,
            h.currency,
            h.validFrom,
            h.description as headerDescription,
            e.priceBookEntryNumber,
            e.listPrice,
            e.fromQuantity,
            e.rateCardEntryId,
            e.description as entryDescription,
            pb.priceBookName,
            pb.isStandard
        FROM PriceBookEntryHeader h
        INNER JOIN ProductLine pl ON h.productLineNumber = pl.productLineNumber
        INNER JOIN PriceBookEntry e ON h.headerNumber = e.headerId
        INNER JOIN PriceBook pb ON h.priceBookId = pb.priceBookNumber
        WHERE pl.productNumber = ?
        ORDER BY h.headerNumber, e.fromQuantity
    `;

    db.all(sql, [productNumber], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(rows || []);
    });
});

// ===== BATCH PRICING CREATION =====
router.post('/pricing/batch', (req, res) => {
    const { productNumber, validFrom, entries } = req.body;
    const db = req.app.get('db');

    if (!productNumber || !validFrom || !entries || entries.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run('BEGIN TRANSACTION');

    let hasError = false;
    const headerMap = new Map(); // Key: productLineNumber|priceBookId|currency, Value: headerNumber

    // Group entries by productLineNumber, priceBookId, and currency
    const groupedEntries = {};
    entries.forEach(entry => {
        const key = `${entry.productLineNumber}|${entry.priceBookId}|${entry.currency}`;
        if (!groupedEntries[key]) {
            groupedEntries[key] = [];
        }
        groupedEntries[key].push(entry);
    });

    const headerKeys = Object.keys(groupedEntries);
    let headersCreated = 0;
    let entriesCreated = 0;
    const totalEntries = entries.length;

    // First pass: Create price book entry headers
    headerKeys.forEach(key => {
        const [productLineNumber, priceBookId, currency] = key.split('|');
        const headerNumber = `H-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const headerData = {
            headerNumber,
            priceBookId,
            productLineNumber,
            currency,
            validFrom,
        };

        req.models.priceBookEntryHeader.create(headerData, (err) => {
            if (err && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return res.status(400).json({
                    error: `Failed to create price book entry header: ${err.message}`
                });
            }

            headerMap.set(key, headerNumber);
            headersCreated++;

            if (headersCreated === headerKeys.length && !hasError) {
                createPriceEntries();
            }
        });
    });

    // Second pass: Create price book entries
    function createPriceEntries() {
        entries.forEach((entry, index) => {
            const key = `${entry.productLineNumber}|${entry.priceBookId}|${entry.currency}`;
            const headerNumber = headerMap.get(key);

            if (!headerNumber) {
                if (!hasError) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return res.status(400).json({
                        error: 'Invalid header mapping'
                    });
                }
                return;
            }

            const priceBookEntryNumber = `${headerNumber}-E-${index + 1}`;
            const priceData = {
                priceBookEntryNumber,
                headerId: headerNumber,
                listPrice: entry.listPrice,
                fromQuantity: entry.fromQuantity || 0,
                rateCardEntryId: entry.rateCardEntryId || null,
            };

            req.models.priceBookEntry.create(priceData, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return res.status(400).json({
                        error: `Failed to create price book entry: ${err.message}`
                    });
                }

                entriesCreated++;
                if (entriesCreated === totalEntries && !hasError) {
                    db.run('COMMIT');
                    res.status(201).json({
                        message: 'Pricing created successfully',
                        headersCreated: headerKeys.length,
                        entriesCreated: totalEntries,
                    });
                }
            });
        });
    }
});

module.exports = router;
