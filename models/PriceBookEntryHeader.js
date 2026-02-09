class PriceBookEntryHeader {
    constructor(db) {
        this.db = db;
    }

    // Get all price book entry headers
    getAll(callback) {
        const sql = `
            SELECT peh.*, pb.priceBookName, pl.name as productLineName
            FROM PriceBookEntryHeader peh
            JOIN PriceBook pb ON peh.priceBookId = pb.priceBookNumber
            JOIN ProductLine pl ON peh.productLineNumber = pl.productLineNumber
            WHERE peh.isActive = 1
        `;
        this.db.all(sql, [], callback);
    }

    // Get price book entry header by number
    getById(headerNumber, callback) {
        const sql = `
            SELECT peh.*, pb.priceBookName, pl.name as productLineName
            FROM PriceBookEntryHeader peh
            JOIN PriceBook pb ON peh.priceBookId = pb.priceBookNumber
            JOIN ProductLine pl ON peh.productLineNumber = pl.productLineNumber
            WHERE peh.headerNumber = ?
        `;
        this.db.get(sql, [headerNumber], callback);
    }

    // Get headers by price book
    getByPriceBookId(priceBookId, callback) {
        const sql = `
            SELECT peh.*, pl.name as productLineName
            FROM PriceBookEntryHeader peh
            JOIN ProductLine pl ON peh.productLineNumber = pl.productLineNumber
            WHERE peh.priceBookId = ? AND peh.isActive = 1
        `;
        this.db.all(sql, [priceBookId], callback);
    }

    // Get headers by product line
    getByProductLineNumber(productLineNumber, callback) {
        const sql = `
            SELECT peh.*, pb.priceBookName
            FROM PriceBookEntryHeader peh
            JOIN PriceBook pb ON peh.priceBookId = pb.priceBookNumber
            WHERE peh.productLineNumber = ? AND peh.isActive = 1
        `;
        this.db.all(sql, [productLineNumber], callback);
    }

    // Create price book entry header
    create(header, callback) {
        const sql = `
            INSERT INTO PriceBookEntryHeader (
                headerNumber, priceBookId, productLineNumber, currency,
                validFrom, description, isActive
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            header.headerNumber,
            header.priceBookId,
            header.productLineNumber,
            header.currency || 'USD',
            header.validFrom || null,
            header.description || null,
            header.isActive !== undefined ? header.isActive : 1
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { headerNumber: header.headerNumber });
        });
    }

    // Update price book entry header
    update(headerNumber, header, callback) {
        const sql = `
            UPDATE PriceBookEntryHeader
            SET priceBookId = ?, productLineNumber = ?, currency = ?,
                validFrom = ?, description = ?, isActive = ?,
                modifiedDate = CURRENT_TIMESTAMP
            WHERE headerNumber = ?
        `;
        const params = [
            header.priceBookId,
            header.productLineNumber,
            header.currency || 'USD',
            header.validFrom || null,
            header.description || null,
            header.isActive !== undefined ? header.isActive : 1,
            headerNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete price book entry header
    delete(headerNumber, callback) {
        const sql = 'DELETE FROM PriceBookEntryHeader WHERE headerNumber = ?';
        this.db.run(sql, [headerNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete
    softDelete(headerNumber, callback) {
        const sql = 'UPDATE PriceBookEntryHeader SET isActive = 0, modifiedDate = CURRENT_TIMESTAMP WHERE headerNumber = ?';
        this.db.run(sql, [headerNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }
}

module.exports = PriceBookEntryHeader;
