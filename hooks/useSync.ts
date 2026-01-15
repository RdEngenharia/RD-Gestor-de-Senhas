
import { useState, useCallback } from 'react';
import { db } from '../lib/db';
import { db_cloud, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
    const user = auth.currentUser;
    
    if (!session.masterKey || !user) {
      console.warn("Sync: Chave mestra ou usuário ausente.");
      return false;
    }

    try {
      setSyncStatus(prev => ({ ...prev, status: 'syncing' }));

      const passwords = await db.passwords.toArray();
      const settings = await db.settings.toArray();
      
      const persistentSettings = settings.filter(s => 
        !['biometrySecret'].includes(s.key) 
      );

      const fullPayload = {
        items: passwords,
        settings: persistentSettings,
        version: '3.0-firebase',
        timestamp: Date.now()
      };

      const jsonData = JSON.stringify(fullPayload);
      const { ciphertext, iv } = await encryptData(jsonData, session.masterKey);

      // Sincronização via Firestore
      const backupRef = doc(db_cloud, 'backups', user.uid);
      await setDoc(backupRef, {
        encrypted_blob: JSON.stringify({ ciphertext, iv }),
        salt: "RD-VAULT-V3-FIREBASE",
        updated_at: new Date().toISOString()
      }, { merge: true });

      setSyncStatus({ lastSynced: Date.now(), status: 'success' });
      return true;
    } catch (error: any) {
      console.error('Erro no Upload Firebase:', error);
      setSyncStatus({ lastSynced: null, status: 'error' });
      throw error;
    }
  }, [session]);

  const downloadBackup = useCallback(async () => {
    const user = auth.currentUser;
    if (!session.masterKey || !user) throw new Error("Não autenticado.");

    try {
      setSyncStatus(prev => ({ ...prev, status: 'syncing' }));

      const backupRef = doc(db_cloud, 'backups', user.uid);
      const docSnap = await getDoc(backupRef);

      if (!docSnap.exists()) return false;
      const data = docSnap.data();

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
      console.error('Erro no Download Firebase:', error);
      setSyncStatus({ lastSynced: null, status: 'error' });
      throw error;
    }
  }, [session]);

  return { syncStatus, uploadBackup, downloadBackup };
};
