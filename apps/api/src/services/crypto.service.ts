import * as crypto from 'crypto';
import { config } from '../config/env';

export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor() {
    const key = config.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive a consistent key from the environment variable
    this.encryptionKey = crypto.scryptSync(key, 'salt', this.keyLength);
  }

  /**
   * Encrypt a string value
   */
  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('utmify-meta-ads', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv + tag + encrypted data
      const result = iv.toString('hex') + tag.toString('hex') + encrypted;
      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a string value
   */
  decrypt(encryptedData: string): string {
    try {
      // Extract iv, tag, and encrypted data
      const ivHex = encryptedData.slice(0, this.ivLength * 2);
      const tagHex = encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2);
      const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
      
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('utmify-meta-ads', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a secure random string
   */
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a string using SHA-256
   */
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Verify if encrypted data is valid
   */
  isValidEncryptedData(encryptedData: string): boolean {
    try {
      // Check minimum length (iv + tag + some data)
      const minLength = (this.ivLength + this.tagLength) * 2 + 2;
      if (encryptedData.length < minLength) {
        return false;
      }
      
      // Try to decrypt (will throw if invalid)
      this.decrypt(encryptedData);
      return true;
    } catch {
      return false;
    }
  }
}