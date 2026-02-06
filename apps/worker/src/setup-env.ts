import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve path to root .env file
// Use import.meta.url compatible logic
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');

// Load .env file
// dotenv silently fails if file is not found (safe for production where env vars are injected)
config({ path: envPath });
