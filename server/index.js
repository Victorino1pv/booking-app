import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json());

// Helper to read DB
const readDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

// Helper to write DB
const writeDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
};

// GET all data
app.get('/api/data', (req, res) => {
    try {
        const data = readDb();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// GET specific collection
app.get('/api/data/:key', (req, res) => {
    try {
        const { key } = req.params;
        const data = readDb();
        res.json(data[key] || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read collection' });
    }
});

// POST to update a specific collection (Full Replace for simplicity matching localStorage)
app.post('/api/data/:key', (req, res) => {
    try {
        const { key } = req.params;
        const newData = req.body; // Expecting array
        const db = readDb();

        db[key] = newData;
        writeDb(db);

        res.json({ success: true, count: newData.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Server running on port ${PORT}`);
});
