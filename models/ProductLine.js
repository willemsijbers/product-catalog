class ProductLine {
    constructor(db) {
        this.db = db;
    }

    // Get all product lines
    getAll(callback) {
        const sql = `
            SELECT pl.*, p.productName, p.productCode
            FROM ProductLine pl
            JOIN Product p ON pl.productNumber = p.productNumber
            ORDER BY pl.name
        `;
        this.db.all(sql, [], callback);
    }

    // Get product line by number
    getById(productLineNumber, callback) {
        const sql = `
            SELECT pl.*, p.productName, p.productCode
            FROM ProductLine pl
            JOIN Product p ON pl.productNumber = p.productNumber
            WHERE pl.productLineNumber = ?
        `;
        this.db.get(sql, [productLineNumber], callback);
    }

    // Get product lines by product number
    getByProductNumber(productNumber, callback) {
        const sql = 'SELECT * FROM ProductLine WHERE productNumber = ? ORDER BY name';
        this.db.all(sql, [productNumber], callback);
    }

    // Get product line with rate cards
    getWithRateCards(productLineNumber, callback) {
        const sql = `
            SELECT
                pl.*,
                json_group_array(
                    json_object(
                        'rateCardEntryNumber', rce.rateCardEntryNumber,
                        'identifier', rce.identifier,
                        'usageType', rce.usageType,
                        'usageUnitOfMeasure', rce.usageUnitOfMeasure,
                        'conversion', rce.conversion,
                        'billableUnitOfMeasure', rce.billableUnitOfMeasure,
                        'allowance', rce.allowance,
                        'term', rce.term,
                        'rollover', rce.rollover,
                        'rolloverDuration', rce.rolloverDuration,
                        'maximumRolloverLimit', rce.maximumRolloverLimit,
                        'expiration', rce.expiration
                    )
                ) as rateCards
            FROM ProductLine pl
            LEFT JOIN RateCardEntry rce ON pl.productLineNumber = rce.productLineId
            WHERE pl.productLineNumber = ?
            GROUP BY pl.productLineNumber
        `;
        this.db.get(sql, [productLineNumber], (err, row) => {
            if (err) return callback(err);
            if (row && row.rateCards) {
                row.rateCards = JSON.parse(row.rateCards).filter(r => r.rateCardEntryNumber !== null);
            }
            callback(null, row);
        });
    }

    // Get commit/overage structures (parent with usage children)
    getCommitOverageStructures(callback) {
        const sql = 'SELECT * FROM vw_commit_overage_structures';
        this.db.all(sql, [], callback);
    }

    // Get usage children for a parent line
    getUsageChildren(parentLineNumber, callback) {
        const sql = 'SELECT * FROM ProductLine WHERE parentLine = ?';
        this.db.all(sql, [parentLineNumber], callback);
    }

    // Create product line
    create(line, callback) {
        const sql = `
            INSERT INTO ProductLine (
                productLineNumber, productNumber, lineType, priceModel,
                pricingTerm, unitOfMeasure, hasBeenUsed, crmProductId,
                name, hasUsage, parentLine, description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            line.productLineNumber,
            line.productNumber,
            line.lineType,
            line.priceModel,
            line.pricingTerm || null,
            line.unitOfMeasure || null,
            line.hasBeenUsed || 0,
            line.crmProductId || null,
            line.name,
            line.hasUsage || 0,
            line.parentLine || null,
            line.description || null
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { productLineNumber: line.productLineNumber });
        });
    }

    // Update product line
    update(productLineNumber, line, callback) {
        const sql = `
            UPDATE ProductLine
            SET productNumber = ?, lineType = ?, priceModel = ?,
                pricingTerm = ?, unitOfMeasure = ?, hasBeenUsed = ?,
                crmProductId = ?, name = ?, hasUsage = ?, parentLine = ?,
                description = ?,
                modifiedDate = CURRENT_TIMESTAMP
            WHERE productLineNumber = ?
        `;
        const params = [
            line.productNumber,
            line.lineType,
            line.priceModel,
            line.pricingTerm || null,
            line.unitOfMeasure || null,
            line.hasBeenUsed || 0,
            line.crmProductId || null,
            line.name,
            line.hasUsage || 0,
            line.parentLine || null,
            line.description || null,
            productLineNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete product line
    delete(productLineNumber, callback) {
        const sql = 'DELETE FROM ProductLine WHERE productLineNumber = ?';
        this.db.run(sql, [productLineNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete (V5 doesn't have isActive, so this is now a hard delete)
    softDelete(productLineNumber, callback) {
        this.delete(productLineNumber, callback);
    }
}

module.exports = ProductLine;
