import { StorageService } from './packages/utils/src/storage/minio-client.ts';
import { config } from 'dotenv';

config();

async function test() {
    console.log('Testing Storage Service...');
    try {
        const storage = new StorageService();
        // Test presigned URL generation (no network call)
        const url = await storage.getPresignedUploadUrl('test-file.txt', 'text/plain');
        console.log('Generated Presigned URL:', url);

        // Check if file exists (manual verification)
        if (process.argv[2]) {
            const key = process.argv[2];
            console.log(`Checking existence of ${key}...`);
            const exists = await storage.exists(key);
            console.log(`File ${key} exists: ${exists}`);
        }

        console.log('✅ Storage Service initialized successfully');
    } catch (err) {
        console.error('❌ Failed:', err);
    }
}

test();
