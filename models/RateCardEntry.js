class RateCardEntry {
    constructor(db) {
        this.db = db;
    }

    // Get all rate card entries
    getAll(callback) {
        const sql = `
            SELECT rce.*, pl.name as lineName, pl.productNumber
            FROM RateCardEntry rce
            JOIN ProductLine pl ON rce.productLineId = pl.productLineNumber
            WHERE rce.isActive = 1
            ORDER BY rce.productLineId, rce.usageType
        `;
        this.db.all(sql, [], callback);
    }

    // Get rate card entry by number
    getById(rateCardEntryNumber, callback) {
        const sql = `
            SELECT rce.*, pl.name as lineName, pl.productNumber
            FROM RateCardEntry rce
            JOIN ProductLine pl ON rce.productLineId = pl.productLineNumber
            WHERE rce.rateCardEntryNumber = ?
        `;
        this.db.get(sql, [rateCardEntryNumber], callback);
    }

    // Get rate card entries by product line
    getByProductLineId(productLineId, callback) {
        const sql = `
            SELECT * FROM RateCardEntry
            WHERE productLineId = ? AND isActive = 1
            ORDER BY usageType, identifier
        `;
        this.db.all(sql, [productLineId], callback);
    }

    // Create rate card entry
    create(rateCard, callback) {
        const sql = `
            INSERT INTO RateCardEntry (
                rateCardEntryNumber, productLineId, identifier, usageType,
                usageUnitOfMeasure, conversion, billableUnitOfMeasure,
                invoiceFrequency, priceModel, allowance, term,
                rollover, rolloverDuration, maximumRolloverLimit,
                expiration, description, isActive
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            rateCard.rateCardEntryNumber,
            rateCard.productLineId,
            rateCard.identifier || null,
            rateCard.usageType,
            rateCard.usageUnitOfMeasure || null,
            rateCard.conversion || null,
            rateCard.billableUnitOfMeasure || null,
            rateCard.invoiceFrequency || null,
            rateCard.priceModel || null,
            rateCard.allowance || null,
            rateCard.term || null,
            rateCard.rollover || 0,
            rateCard.rolloverDuration || null,
            rateCard.maximumRolloverLimit || null,
            rateCard.expiration || null,
            rateCard.description || null,
            rateCard.isActive !== undefined ? rateCard.isActive : 1
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { rateCardEntryNumber: rateCard.rateCardEntryNumber });
        });
    }

    // Update rate card entry
    update(rateCardEntryNumber, rateCard, callback) {
        const sql = `
            UPDATE RateCardEntry
            SET productLineId = ?, identifier = ?, usageType = ?,
                usageUnitOfMeasure = ?, conversion = ?, billableUnitOfMeasure = ?,
                invoiceFrequency = ?, priceModel = ?, allowance = ?, term = ?,
                rollover = ?, rolloverDuration = ?, maximumRolloverLimit = ?,
                expiration = ?, description = ?, isActive = ?,
                modifiedDate = CURRENT_TIMESTAMP
            WHERE rateCardEntryNumber = ?
        `;
        const params = [
            rateCard.productLineId,
            rateCard.identifier || null,
            rateCard.usageType,
            rateCard.usageUnitOfMeasure || null,
            rateCard.conversion || null,
            rateCard.billableUnitOfMeasure || null,
            rateCard.invoiceFrequency || null,
            rateCard.priceModel || null,
            rateCard.allowance || null,
            rateCard.term || null,
            rateCard.rollover || 0,
            rateCard.rolloverDuration || null,
            rateCard.maximumRolloverLimit || null,
            rateCard.expiration || null,
            rateCard.description || null,
            rateCard.isActive !== undefined ? rateCard.isActive : 1,
            rateCardEntryNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete rate card entry
    delete(rateCardEntryNumber, callback) {
        const sql = 'DELETE FROM RateCardEntry WHERE rateCardEntryNumber = ?';
        this.db.run(sql, [rateCardEntryNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete
    softDelete(rateCardEntryNumber, callback) {
        const sql = 'UPDATE RateCardEntry SET isActive = 0, modifiedDate = CURRENT_TIMESTAMP WHERE rateCardEntryNumber = ?';
        this.db.run(sql, [rateCardEntryNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }
}

module.exports = RateCardEntry;
