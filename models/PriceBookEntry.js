class PriceBookEntry {
    constructor(db) {
        this.db = db;
    }

    // Get all price book entries
    getAll(callback) {
        const sql = `
            SELECT pe.*, peh.priceBookId, peh.productLineNumber
            FROM PriceBookEntry pe
            JOIN PriceBookEntryHeader peh ON pe.headerId = peh.headerNumber
            WHERE pe.isActive = 1
            ORDER BY pe.fromQuantity
        `;
        this.db.all(sql, [], callback);
    }

    // Get price book entry by number
    getById(priceBookEntryNumber, callback) {
        const sql = `
            SELECT pe.*, peh.priceBookId, peh.productLineNumber, peh.currency
            FROM PriceBookEntry pe
            JOIN PriceBookEntryHeader peh ON pe.headerId = peh.headerNumber
            WHERE pe.priceBookEntryNumber = ?
        `;
        this.db.get(sql, [priceBookEntryNumber], callback);
    }

    // Get entries by header
    getByHeaderId(headerId, callback) {
        const sql = `
            SELECT * FROM PriceBookEntry
            WHERE headerId = ? AND isActive = 1
            ORDER BY fromQuantity
        `;
        this.db.all(sql, [headerId], callback);
    }

    // Get entries by rate card entry (for structure/pricing separation)
    getByRateCardEntryId(rateCardEntryId, callback) {
        const sql = `
            SELECT pe.*, peh.priceBookId, peh.currency
            FROM PriceBookEntry pe
            JOIN PriceBookEntryHeader peh ON pe.headerId = peh.headerNumber
            WHERE pe.rateCardEntryId = ? AND pe.isActive = 1
        `;
        this.db.all(sql, [rateCardEntryId], callback);
    }

    // Create price book entry
    create(entry, callback) {
        const sql = `
            INSERT INTO PriceBookEntry (
                priceBookEntryNumber, headerId, listPrice, fromQuantity,
                rateCardEntryId, description, isActive
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            entry.priceBookEntryNumber,
            entry.headerId,
            entry.listPrice,
            entry.fromQuantity || 0,
            entry.rateCardEntryId || null,
            entry.description || null,
            entry.isActive !== undefined ? entry.isActive : 1
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { priceBookEntryNumber: entry.priceBookEntryNumber });
        });
    }

    // Update price book entry
    update(priceBookEntryNumber, entry, callback) {
        const sql = `
            UPDATE PriceBookEntry
            SET headerId = ?, listPrice = ?, fromQuantity = ?,
                rateCardEntryId = ?, description = ?, isActive = ?,
                modifiedDate = CURRENT_TIMESTAMP
            WHERE priceBookEntryNumber = ?
        `;
        const params = [
            entry.headerId,
            entry.listPrice,
            entry.fromQuantity || 0,
            entry.rateCardEntryId || null,
            entry.description || null,
            entry.isActive !== undefined ? entry.isActive : 1,
            priceBookEntryNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete price book entry
    delete(priceBookEntryNumber, callback) {
        const sql = 'DELETE FROM PriceBookEntry WHERE priceBookEntryNumber = ?';
        this.db.run(sql, [priceBookEntryNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete
    softDelete(priceBookEntryNumber, callback) {
        const sql = 'UPDATE PriceBookEntry SET isActive = 0, modifiedDate = CURRENT_TIMESTAMP WHERE priceBookEntryNumber = ?';
        this.db.run(sql, [priceBookEntryNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }
}

module.exports = PriceBookEntry;
