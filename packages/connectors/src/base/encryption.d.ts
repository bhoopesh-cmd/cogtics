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
export declare class LocalTokenEncryptor implements TokenEncryptor {
    private readonly key;
    constructor(encryptionKey: string);
    encrypt(plaintext: string): Promise<string>;
    decrypt(ciphertext: string): Promise<string>;
}
/**
 * KMS-based encryption stub (implement with actual KMS SDK in production)
 */
export declare class KmsTokenEncryptor implements TokenEncryptor {
    constructor(_kmsKeyId: string);
    encrypt(_plaintext: string): Promise<string>;
    decrypt(_ciphertext: string): Promise<string>;
}
/**
 * Initialize the token encryptor based on configuration
 */
export declare function initializeEncryptor(config: {
    mode: 'local' | 'kms';
    key?: string;
    kmsKeyId?: string;
}): void;
/**
 * Get the initialized encryptor
 */
export declare function getEncryptor(): TokenEncryptor;
/**
 * Encrypt a token
 */
export declare function encryptToken(token: string): Promise<string>;
/**
 * Decrypt a token
 */
export declare function decryptToken(encryptedToken: string): Promise<string>;
/**
 * Generate a random encryption key for development
 */
export declare function generateEncryptionKey(): string;
//# sourceMappingURL=encryption.d.ts.map