import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Check if dotenv is loaded by index.js, but load it here just in case this file is imported in isolation.
// However, index.js usually handles dotenv config.
// Since we can't assume index.js has run, we'll try to load .env from the server directory.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable in server/.env');
}

if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable in server/.env');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
