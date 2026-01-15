
import { useState, useCallback } from 'react';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { encryptData, decryptData } from '../lib/crypto';
import { useAuth } from '../contexts/AuthContext';
import { SyncStatus } from '../types';

export const useSync = () => {
  const { session } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    status: 'idle'
  });

  const uploadBackup = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!session.masterKey || !user) {
      console.warn("Sync: Chave mestra ou usuário ausente.");
      return false;
    }

    try {
      setSyncStatus(prev => ({ ...prev, status: 'syncing' }));

      // Coleta dados da nova tabela 'passwords'
      const passwords = await db.passwords.toArray();
      const settings = await db.settings.toArray();
      
      const persistentSettings = settings.filter(s => 
        !['biometrySecret'].includes(s.key) 
      );

      const fullPayload = {
        items: passwords, // Mantido como 'items' no JSON para compatibilidade de decodificação
        settings: persistentSettings,
        version: '3.0-core',
        timestamp: Date.now()
      };

      const jsonData = JSON.stringify(fullPayload);
      const { ciphertext, iv } = await encryptData(jsonData, session.masterKey);

      // Upsert garantindo colunas 'encrypted_blob' e 'salt'
      const { error } = await supabase
        .from('backups')
        .upsert({
          user_id: user.id,
          encrypted_blob: JSON.stringify({ ciphertext, iv }),
          salt: "RD-VAULT-V3-CORE",
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSyncStatus({ lastSynced: Date.now(), status: 'success' });
      return true;
    } catch (error: any) {
      console.error('Erro no Upload:', error);
      setSyncStatus({ lastSynced: null, status: 'error' });
      throw error;
    }
  }, [session]);

  const downloadBackup = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!session.masterKey || !user) throw new Error("Não autenticado.");

    try {
      setSyncStatus(prev => ({ ...prev, status: 'syncing' }));

      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      const { ciphertext, iv } = JSON.parse(data.encrypted_blob);
      const decryptedData = await decryptData(ciphertext, iv, session.masterKey);
      const payload = JSON.parse(decryptedData);

      await db.transaction('rw', [db.passwords, db.settings], async () => {
        if (payload.items) {
          await db.passwords.clear();
          await db.passwords.bulkAdd(payload.items);
        }
        if (payload.settings) {
          for (const setting of payload.settings) {
            await db.settings.put(setting);
          }
        }
      });

      setSyncStatus({ lastSynced: Date.now(), status: 'success' });
      return true;
    } catch (error: any) {
      console.error('Erro no Download:', error);
      setSyncStatus({ lastSynced: null, status: 'error' });
      throw error;
    }
  }, [session]);

  return { syncStatus, uploadBackup, downloadBackup };
};
