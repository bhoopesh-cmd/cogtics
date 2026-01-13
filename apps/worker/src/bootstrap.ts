import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from workspace root before importing anything else
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

// Now import and start the worker
await import('./worker.js');
