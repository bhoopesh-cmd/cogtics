import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Token encryptor interface for pluggable encryption backends
 */
export interface TokenEncryptor {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

/**
 * Local AES-256-GCM encryption for development
 */
export class LocalTokenEncryptor implements TokenEncryptor {
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    // Derive a 32-byte key from the provided key using scrypt
    if (encryptionKey.length === 64) {
      // Already a 32-byte hex key
      this.key = Buffer.from(encryptionKey, 'hex');
    } else {
      // Derive key from passphrase
      const salt = Buffer.alloc(SALT_LENGTH, 0); // Fixed salt for deterministic derivation
      this.key = scryptSync(encryptionKey, salt, 32);
    }
  }

  async encrypt(plaintext: string): Promise<string> {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  async decrypt(ciphertext: string): Promise<string> {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0]!, 'base64');
    const authTag = Buffer.from(parts[1]!, 'base64');
    const encrypted = Buffer.from(parts[2]!, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}

/**
 * KMS-based encryption stub (implement with actual KMS SDK in production)
 */
export class KmsTokenEncryptor implements TokenEncryptor {
  constructor(_kmsKeyId: string) {
    // In production, initialize AWS KMS or GCP KMS client here
  }

  async encrypt(_plaintext: string): Promise<string> {
    throw new Error('KMS encryption not implemented - use local mode for development');
  }

  async decrypt(_ciphertext: string): Promise<string> {
    throw new Error('KMS decryption not implemented - use local mode for development');
  }
}

let encryptor: TokenEncryptor | null = null;

/**
 * Initialize the token encryptor based on configuration
 */
export function initializeEncryptor(config: {
  mode: 'local' | 'kms';
  key?: string;
  kmsKeyId?: string;
}): void {
  if (config.mode === 'local') {
    if (!config.key) {
      throw new Error('TOKEN_ENCRYPTION_KEY is required for local encryption mode');
    }
    encryptor = new LocalTokenEncryptor(config.key);
  } else if (config.mode === 'kms') {
    if (!config.kmsKeyId) {
      throw new Error('KMS_KEY_ID is required for KMS encryption mode');
    }
    encryptor = new KmsTokenEncryptor(config.kmsKeyId);
  }
}

/**
 * Get the initialized encryptor
 */
export function getEncryptor(): TokenEncryptor {
  if (!encryptor) {
    throw new Error('Token encryptor not initialized. Call initializeEncryptor first.');
  }
  return encryptor;
}

/**
 * Encrypt a token
 */
export async function encryptToken(token: string): Promise<string> {
  return getEncryptor().encrypt(token);
}

/**
 * Decrypt a token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  return getEncryptor().decrypt(encryptedToken);
}

/**
 * Generate a random encryption key for development
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

