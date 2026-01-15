
import Dexie, { Table } from 'dexie';
import { VaultItem } from '../types';

export interface Setting {
  key: string;
  value: any;
}

/**
 * VaultDatabase gerencia o armazenamento local usando IndexedDB via Dexie.
 */
export class VaultDatabase extends Dexie {
  passwords!: Table<VaultItem>;
  settings!: Table<Setting>;

  constructor() {
    super('RDVault');
    // Versão 3 para refletir a mudança de nome da tabela
    this.version(3).stores({
      passwords: '++id, title, updatedAt',
      settings: 'key'
    });
  }
}

export const db = new VaultDatabase();
