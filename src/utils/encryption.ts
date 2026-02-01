/**
 * Encryption utility for securing API keys using Web Crypto API.
 *
 * Uses AES-GCM (Galois/Counter Mode) encryption which provides both
 * confidentiality and authenticity. Each encryption operation uses
 * a random IV (Initialization Vector) to ensure the same plaintext
 * produces different ciphertext each time.
 *
 * @example
 * ```typescript
 * // Generate a key (store this securely)
 * const key = await generateEncryptionKey();
 *
 * // Encrypt an API key
 * const encrypted = await encrypt('sk-my-api-key', key);
 *
 * // Decrypt when needed
 * const decrypted = await decrypt(encrypted, key);
 * ```
 */

/** AES-GCM algorithm configuration */
const ALGORITHM = 'AES-GCM';

/** Key length in bits (256-bit for strong security) */
const KEY_LENGTH = 256;

/** IV length in bytes (96 bits / 12 bytes is recommended for GCM) */
const IV_LENGTH = 12;

/**
 * Generates a new encryption key for AES-GCM encryption.
 *
 * The key is extractable to allow storage and can be used for
 * both encryption and decryption operations.
 *
 * @returns Promise resolving to a CryptoKey for AES-GCM operations
 *
 * @example
 * ```typescript
 * const key = await generateEncryptionKey();
 * // Store the exported key securely for later use
 * const exported = await crypto.subtle.exportKey('raw', key);
 * ```
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable - allows exporting the key
    ['encrypt', 'decrypt']
  );
}

/**
 * Imports a raw key buffer as a CryptoKey for AES-GCM operations.
 *
 * Use this to restore a previously exported key from storage.
 *
 * @param keyBuffer - The raw key data as ArrayBuffer or Uint8Array
 * @returns Promise resolving to a CryptoKey
 *
 * @example
 * ```typescript
 * const storedKey = localStorage.getItem('encryption_key');
 * const keyBuffer = base64ToArrayBuffer(storedKey);
 * const key = await importEncryptionKey(keyBuffer);
 * ```
 */
export async function importEncryptionKey(
  keyBuffer: ArrayBuffer | Uint8Array
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM encryption.
 *
 * The function generates a random IV for each encryption operation,
 * ensuring that the same plaintext produces different ciphertext.
 * The IV is prepended to the ciphertext in the output.
 *
 * Output format: base64(IV + ciphertext)
 *
 * @param plaintext - The string to encrypt
 * @param key - The CryptoKey to use for encryption
 * @returns Promise resolving to base64-encoded encrypted string (IV + ciphertext)
 *
 * @throws Error if encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = await encrypt('sk-my-api-key', key);
 * // encrypted is a base64 string safe for storage
 * ```
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  // Generate random IV for this encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    plaintextBytes
  );

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Encode as base64 for safe storage
  return arrayBufferToBase64(combined);
}

/**
 * Decrypts a base64-encoded ciphertext string using AES-GCM decryption.
 *
 * Expects the input format: base64(IV + ciphertext)
 * The IV is extracted from the first 12 bytes of the decoded data.
 *
 * @param ciphertext - The base64-encoded encrypted string (IV + ciphertext)
 * @param key - The CryptoKey to use for decryption (must match encryption key)
 * @returns Promise resolving to the decrypted plaintext string
 *
 * @throws Error if decryption fails (wrong key, corrupted data, or tampered ciphertext)
 *
 * @example
 * ```typescript
 * const decrypted = await decrypt(encryptedApiKey, key);
 * // decrypted is the original API key string
 * ```
 */
export async function decrypt(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  // Decode from base64
  const combined = base64ToArrayBuffer(ciphertext);

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);

  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    encryptedData
  );

  // Decode bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64 string.
 *
 * @param buffer - The buffer to convert
 * @returns Base64-encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 *
 * @param base64 - The base64 string to convert
 * @returns Uint8Array of decoded bytes
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
