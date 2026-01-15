/**
 * Zero-Knowledge Cryptography Module
 * Baseado em Web Crypto API
 */

const PBKDF2_ITERATIONS = 600000;
const AES_ALGO = "AES-GCM";
const KEY_LEN = 256;

export function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hashBuffer = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return bufferToBase64(hashBuffer);
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: AES_ALGO, length: KEY_LEN },
    true, // Must be extractable for wrapping
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

// Gera uma chave AES aleatória para ser a Vault Key definitiva
export async function generateVaultKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: AES_ALGO, length: KEY_LEN },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = enc.encode(data);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: AES_ALGO, iv: iv },
    key,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const encryptedBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: AES_ALGO, iv: new Uint8Array(ivBuffer) },
    key,
    encryptedBuffer
  );

  return dec.decode(decrypted);
}

export function generateRecoveryKey(): string {
  const array = new Uint8Array(24); // 24 bytes para maior entropia
  window.crypto.getRandomValues(array);
  return bufferToBase64(array.buffer).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32).toUpperCase();
}

// Encapsula uma chave usando outra chave (Wrapping)
export async function wrapVaultKey(vaultKey: CryptoKey, masterKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: AES_ALGO, iv: iv },
    masterKey,
    await window.crypto.subtle.exportKey("raw", vaultKey)
  );
  
  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer)
  };
}

// Desencapsula uma chave
export async function unwrapVaultKey(wrappedData: { ciphertext: string; iv: string }, masterKey: CryptoKey): Promise<CryptoKey> {
  const decrypted = await window.crypto.subtle.decrypt(
    { name: AES_ALGO, iv: new Uint8Array(base64ToBuffer(wrappedData.iv)) },
    masterKey,
    base64ToBuffer(wrappedData.ciphertext)
  );

  return window.crypto.subtle.importKey(
    "raw",
    decrypted,
    { name: AES_ALGO, length: KEY_LEN },
    true,
    ["encrypt", "decrypt"]
  );
}