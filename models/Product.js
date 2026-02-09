class Product {
    constructor(db) {
        this.db = db;
    }

    // Get all products
    getAll(callback) {
        const sql = 'SELECT * FROM Product WHERE productStatus != \'retired\' ORDER BY productName';
        this.db.all(sql, [], callback);
    }

    // Get product by number
    getById(productNumber, callback) {
        const sql = 'SELECT * FROM Product WHERE productNumber = ?';
        this.db.get(sql, [productNumber], callback);
    }

    // Get product with all product lines and rate cards
    getFull(productNumber, callback) {
        const sql = `
            SELECT
                p.*,
                json_group_array(
                    DISTINCT json_object(
                        'productLineNumber', pl.productLineNumber,
                        'name', pl.name,
                        'lineType', pl.lineType,
                        'priceModel', pl.priceModel,
                        'pricingTerm', pl.pricingTerm,
                        'unitOfMeasure', pl.unitOfMeasure,
                        'hasUsage', pl.hasUsage,
                        'parentLine', pl.parentLine,
                        'isActive', pl.isActive
                    )
                ) as productLines
            FROM Product p
            LEFT JOIN ProductLine pl ON p.productNumber = pl.productNumber
            WHERE p.productNumber = ?
            GROUP BY p.productNumber
        `;
        this.db.get(sql, [productNumber], (err, row) => {
            if (err) return callback(err);
            if (row && row.productLines) {
                row.productLines = JSON.parse(row.productLines).filter(l => l.productLineNumber !== null);
            }
            callback(null, row);
        });
    }

    // Create product
    create(product, callback) {
        const sql = `
            INSERT INTO Product (
                productNumber, productName, productCode, internalDescription,
                description, effectiveStartDate, effectiveEndDate,
                productFamily, productType, productStatus,
                externalProvisioningIdRequired, isBundleProduct, isInventory
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            product.productNumber,
            product.productName,
            product.productCode,
            product.internalDescription || null,
            product.description || null,
            product.effectiveStartDate || null,
            product.effectiveEndDate || null,
            product.productFamily || null,
            product.productType || null,
            product.productStatus || 'active',
            product.externalProvisioningIdRequired || 0,
            product.isBundleProduct || 0,
            product.isInventory || 0
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { productNumber: product.productNumber });
        });
    }

    // Update product
    update(productNumber, product, callback) {
        const sql = `
            UPDATE Product
            SET productName = ?, productCode = ?, internalDescription = ?,
                description = ?, effectiveStartDate = ?, effectiveEndDate = ?,
                productFamily = ?, productType = ?, productStatus = ?,
                externalProvisioningIdRequired = ?, isBundleProduct = ?,
                isInventory = ?,
                modifiedDate = CURRENT_TIMESTAMP
            WHERE productNumber = ?
        `;
        const params = [
            product.productName,
            product.productCode,
            product.internalDescription || null,
            product.description || null,
            product.effectiveStartDate || null,
            product.effectiveEndDate || null,
            product.productFamily || null,
            product.productType || null,
            product.productStatus || 'active',
            product.externalProvisioningIdRequired || 0,
            product.isBundleProduct || 0,
            product.isInventory || 0,
            productNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete product
    delete(productNumber, callback) {
        const sql = 'DELETE FROM Product WHERE productNumber = ?';
        this.db.run(sql, [productNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete (set status to retired)
    softDelete(productNumber, callback) {
        const sql = 'UPDATE Product SET productStatus = \'retired\', modifiedDate = CURRENT_TIMESTAMP WHERE productNumber = ?';
        this.db.run(sql, [productNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }
}

module.exports = Product;
