
export interface VaultItem {
  id?: number;
  title: string;
  username: string;
  password: string; // Encrypted in DB
  url?: string;
  notes?: string;
  updatedAt: number;
}

export interface EncryptedVault {
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface UserSession {
  userId: string;
  masterKey: CryptoKey | null;
  isUnlocked: boolean;
}

export interface SyncStatus {
  lastSynced: number | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
}
