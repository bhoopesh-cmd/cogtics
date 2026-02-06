import './setup-env.js'; // Must be first to load env vars for local dev
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from workspace root before importing anything else
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

// Start health server for Docker/k8s health checks (Phase 3)
import { startHealthServer } from './health-server.js';
startHealthServer();

// Now import and start the worker
import './worker.js';
