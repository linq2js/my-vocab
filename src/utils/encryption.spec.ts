/**
 * Tests for encryption utility functions.
 *
 * Tests cover:
 * - Encrypting and decrypting API keys
 * - Round-trip encryption (encrypt then decrypt returns original)
 * - Different inputs produce different encrypted outputs
 * - Empty string handling
 * - Unicode character support
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt, generateEncryptionKey } from './encryption';

describe('encryption utility', () => {
  let encryptionKey: CryptoKey;

  beforeAll(async () => {
    encryptionKey = await generateEncryptionKey();
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid CryptoKey', async () => {
      const key = await generateEncryptionKey();
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should generate different keys on each call', async () => {
      const key1 = await generateEncryptionKey();
      const key2 = await generateEncryptionKey();
      
      // Export keys to compare
      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);
      
      const arr1 = new Uint8Array(exported1);
      const arr2 = new Uint8Array(exported2);
      
      // Keys should be different
      const areEqual = arr1.every((val, i) => val === arr2[i]);
      expect(areEqual).toBe(false);
    });
  });

  describe('encrypt', () => {
    it('should encrypt a string and return base64 encoded result', async () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted = await encrypt(plaintext, encryptionKey);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      // Should be base64 encoded (contains only valid base64 characters)
      expect(/^[A-Za-z0-9+/=]+$/.test(encrypted)).toBe(true);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted1 = await encrypt(plaintext, encryptionKey);
      const encrypted2 = await encrypt(plaintext, encryptionKey);
      
      // Same plaintext should produce different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', async () => {
      const encrypted = await encrypt('', encryptionKey);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'api-key-with-émojis-🔐-and-中文';
      const encrypted = await encrypt(plaintext, encryptionKey);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle long strings', async () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = await encrypt(plaintext, encryptionKey);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string back to original', async () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted = await encrypt(plaintext, encryptionKey);
      const decrypted = await decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string round-trip', async () => {
      const plaintext = '';
      const encrypted = await encrypt(plaintext, encryptionKey);
      const decrypted = await decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters round-trip', async () => {
      const plaintext = 'api-key-with-émojis-🔐-and-中文';
      const encrypted = await encrypt(plaintext, encryptionKey);
      const decrypted = await decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings round-trip', async () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = await encrypt(plaintext, encryptionKey);
      const decrypted = await decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong key', async () => {
      const plaintext = 'sk-test-api-key-12345';
      const encrypted = await encrypt(plaintext, encryptionKey);
      
      const wrongKey = await generateEncryptionKey();
      
      await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
    });

    it('should fail with invalid ciphertext', async () => {
      await expect(decrypt('invalid-ciphertext', encryptionKey)).rejects.toThrow();
    });
  });

  describe('round-trip encryption', () => {
    it('should correctly encrypt and decrypt multiple different values', async () => {
      const testValues = [
        'sk-openai-key-abc123',
        'AIzaSyB-gemini-key-xyz789',
        'Bearer token-with-special-chars!@#$%',
        '12345',
        'a',
      ];

      for (const value of testValues) {
        const encrypted = await encrypt(value, encryptionKey);
        const decrypted = await decrypt(encrypted, encryptionKey);
        expect(decrypted).toBe(value);
      }
    });
  });
});
