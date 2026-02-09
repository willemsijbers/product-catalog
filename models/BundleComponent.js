class BundleComponent {
    constructor(db) {
        this.db = db;
    }

    // Get all bundle components
    getAll(callback) {
        const sql = `
            SELECT bc.*,
                   bpl.name as bundleLineName,
                   cpl.name as componentLineName,
                   bp.productName as bundleProductName,
                   cp.productName as componentProductName
            FROM BundleComponent bc
            JOIN ProductLine bpl ON bc.bundleProductLine = bpl.productLineNumber
            JOIN ProductLine cpl ON bc.componentProductLine = cpl.productLineNumber
            JOIN Product bp ON bpl.productNumber = bp.productNumber
            JOIN Product cp ON cpl.productNumber = cp.productNumber
            WHERE bc.isActive = 1
        `;
        this.db.all(sql, [], callback);
    }

    // Get bundle component by number
    getById(bundleComponentNumber, callback) {
        const sql = `
            SELECT bc.*,
                   bpl.name as bundleLineName,
                   cpl.name as componentLineName,
                   bp.productName as bundleProductName,
                   cp.productName as componentProductName
            FROM BundleComponent bc
            JOIN ProductLine bpl ON bc.bundleProductLine = bpl.productLineNumber
            JOIN ProductLine cpl ON bc.componentProductLine = cpl.productLineNumber
            JOIN Product bp ON bpl.productNumber = bp.productNumber
            JOIN Product cp ON cpl.productNumber = cp.productNumber
            WHERE bc.bundleComponentNumber = ?
        `;
        this.db.get(sql, [bundleComponentNumber], callback);
    }

    // Get bundle components by bundle product line
    getByBundleProductLine(bundleProductLine, callback) {
        const sql = `
            SELECT bc.*,
                   cpl.name as componentLineName,
                   cpl.lineType,
                   cpl.priceModel,
                   p.productName as componentProductName
            FROM BundleComponent bc
            JOIN ProductLine cpl ON bc.componentProductLine = cpl.productLineNumber
            JOIN Product p ON cpl.productNumber = p.productNumber
            WHERE bc.bundleProductLine = ? AND bc.isActive = 1
        `;
        this.db.all(sql, [bundleProductLine], callback);
    }

    // Create bundle component
    create(component, callback) {
        const sql = `
            INSERT INTO BundleComponent (
                bundleComponentNumber, bundleProductLine, componentProductLine,
                componentPricingLevel, productLineType, componentQuantity,
                quantityDependency, allocationPercentage, discountPercentage,
                overrideRateCardId, isOptional, description, isActive
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            component.bundleComponentNumber,
            component.bundleProductLine,
            component.componentProductLine,
            component.componentPricingLevel,
            component.productLineType,
            component.componentQuantity || 1,
            component.quantityDependency || null,
            component.allocationPercentage || null,
            component.discountPercentage || null,
            component.overrideRateCardId || null,
            component.isOptional || 0,
            component.description || null,
            component.isActive !== undefined ? component.isActive : 1
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { bundleComponentNumber: component.bundleComponentNumber });
        });
    }

    // Update bundle component
    update(bundleComponentNumber, component, callback) {
        const sql = `
            UPDATE BundleComponent
            SET bundleProductLine = ?, componentProductLine = ?,
                componentPricingLevel = ?, productLineType = ?,
                componentQuantity = ?, quantityDependency = ?,
                allocationPercentage = ?, discountPercentage = ?,
                overrideRateCardId = ?, isOptional = ?,
                description = ?, isActive = ?,
                modifiedDate = CURRENT_TIMESTAMP
            WHERE bundleComponentNumber = ?
        `;
        const params = [
            component.bundleProductLine,
            component.componentProductLine,
            component.componentPricingLevel,
            component.productLineType,
            component.componentQuantity || 1,
            component.quantityDependency || null,
            component.allocationPercentage || null,
            component.discountPercentage || null,
            component.overrideRateCardId || null,
            component.isOptional || 0,
            component.description || null,
            component.isActive !== undefined ? component.isActive : 1,
            bundleComponentNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete bundle component
    delete(bundleComponentNumber, callback) {
        const sql = 'DELETE FROM BundleComponent WHERE bundleComponentNumber = ?';
        this.db.run(sql, [bundleComponentNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete
    softDelete(bundleComponentNumber, callback) {
        const sql = 'UPDATE BundleComponent SET isActive = 0, modifiedDate = CURRENT_TIMESTAMP WHERE bundleComponentNumber = ?';
        this.db.run(sql, [bundleComponentNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }
}

module.exports = BundleComponent;
