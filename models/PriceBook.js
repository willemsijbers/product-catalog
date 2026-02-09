class PriceBook {
    constructor(db) {
        this.db = db;
    }

    // Get all price books
    getAll(callback) {
        const sql = 'SELECT * FROM PriceBook WHERE isActive = 1 ORDER BY priceBookName';
        this.db.all(sql, [], callback);
    }

    // Get price book by number
    getById(priceBookNumber, callback) {
        const sql = 'SELECT * FROM PriceBook WHERE priceBookNumber = ?';
        this.db.get(sql, [priceBookNumber], callback);
    }

    // Get standard price book
    getStandard(callback) {
        const sql = 'SELECT * FROM PriceBook WHERE isStandard = 1 AND isActive = 1';
        this.db.get(sql, [], callback);
    }

    // Create price book
    create(priceBook, callback) {
        const sql = `
            INSERT INTO PriceBook (
                priceBookNumber, priceBookName, isStandard, description, isActive
            )
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            priceBook.priceBookNumber,
            priceBook.priceBookName,
            priceBook.isStandard || 0,
            priceBook.description || null,
            priceBook.isActive !== undefined ? priceBook.isActive : 1
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { priceBookNumber: priceBook.priceBookNumber });
        });
    }

    // Update price book
    update(priceBookNumber, priceBook, callback) {
        const sql = `
            UPDATE PriceBook
            SET priceBookName = ?, isStandard = ?, description = ?,
                isActive = ?, modifiedDate = CURRENT_TIMESTAMP
            WHERE priceBookNumber = ?
        `;
        const params = [
            priceBook.priceBookName,
            priceBook.isStandard || 0,
            priceBook.description || null,
            priceBook.isActive !== undefined ? priceBook.isActive : 1,
            priceBookNumber
        ];
        this.db.run(sql, params, function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Delete price book
    delete(priceBookNumber, callback) {
        const sql = 'DELETE FROM PriceBook WHERE priceBookNumber = ?';
        this.db.run(sql, [priceBookNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }

    // Soft delete
    softDelete(priceBookNumber, callback) {
        const sql = 'UPDATE PriceBook SET isActive = 0, modifiedDate = CURRENT_TIMESTAMP WHERE priceBookNumber = ?';
        this.db.run(sql, [priceBookNumber], function(err) {
            callback(err, { changes: this.changes });
        });
    }
}

module.exports = PriceBook;
