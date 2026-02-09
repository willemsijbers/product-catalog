const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'database', 'catalog.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const seedPath = path.join(__dirname, 'database', 'seed.sql');

    // Check if database exists and has tables
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Product'", (err, row) => {
        if (err) {
            console.error('Error checking database:', err);
            return;
        }

        if (!row) {
            console.log('Initializing database...');

            // Read and execute schema
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Error creating schema:', err);
                    return;
                }
                console.log('Schema created successfully');

                // Read and execute seed data
                const seed = fs.readFileSync(seedPath, 'utf8');
                db.exec(seed, (err) => {
                    if (err) {
                        console.error('Error seeding database:', err);
                        return;
                    }
                    console.log('Database seeded successfully');
                });
            });
        } else {
            console.log('Database already initialized');
        }
    });
}

initializeDatabase();

// Make database available to routes
app.set('db', db);

// Import routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`Product Catalog API server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\nDatabase connection closed');
        }
        process.exit(0);
    });
});

module.exports = app;
