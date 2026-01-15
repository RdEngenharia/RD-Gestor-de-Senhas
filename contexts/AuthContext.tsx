
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  deriveKey, 
  hashPassword, 
  generateRecoveryKey, 
  generateVaultKey, 
  wrapVaultKey, 
  unwrapVaultKey,
  bufferToBase64
} from '../lib/crypto';
import { db } from '../lib/db';
import { UserSession } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: UserSession;
  supabaseUser: Session['user'] | null;
  login: (password: string) => Promise<void>;
  signup: (password: string) => Promise<string>;
  recover: (recoveryKey: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  enableBiometry: () => Promise<void>;
  loginWithBiometry: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isVaultConfigured: boolean;
  isBiometryAvailable: boolean;
  hasBiometryEnrolled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession>({
    userId: '',
    masterKey: null,
    isUnlocked: false
  });
  const [tempVaultKey, setTempVaultKey] = useState<CryptoKey | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<Session['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVaultConfigured, setIsVaultConfigured] = useState(false);
  const [isBiometryAvailable, setIsBiometryAvailable] = useState(false);
  const [hasBiometryEnrolled, setHasBiometryEnrolled] = useState(false);

  useEffect(() => {
    const init = async () => {
      const verifier = await db.settings.get('verifier');
      const biometry = await db.settings.get('wrappedByBiometry');
      
      setIsVaultConfigured(!!verifier);
      setHasBiometryEnrolled(!!biometry);
      
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsBiometryAvailable(available);
      }

      const { data: { session: sbSession } } = await supabase.auth.getSession();
      setSupabaseUser(sbSession?.user ?? null);
      if (sbSession?.user) {
        setSession(prev => ({ ...prev, userId: sbSession.user.id }));
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const signup = async (password: string) => {
    const derivationSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const verifierSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const recoverySalt = window.crypto.getRandomValues(new Uint8Array(16));
    
    const vaultKey = await generateVaultKey();
    const recoveryKeyStr = generateRecoveryKey();
    
    const masterKey = await deriveKey(password, derivationSalt);
    const recoveryMasterKey = await deriveKey(recoveryKeyStr, recoverySalt);
    
    const wrappedByPassword = await wrapVaultKey(vaultKey, masterKey);
    const wrappedByRecovery = await wrapVaultKey(vaultKey, recoveryMasterKey);
    const verifierHash = await hashPassword(password, verifierSalt);

    await db.settings.bulkPut([
      { key: 'verifier', value: verifierHash },
      { key: 'derivationSalt', value: derivationSalt },
      { key: 'verifierSalt', value: verifierSalt },
      { key: 'recoverySalt', value: recoverySalt },
      { key: 'wrappedByPassword', value: wrappedByPassword },
      { key: 'wrappedByRecovery', value: wrappedByRecovery }
    ]);

    setIsVaultConfigured(true);
    return recoveryKeyStr;
  };

  const login = async (password: string) => {
    const derivationSalt = await db.settings.get('derivationSalt');
    const verifierSalt = await db.settings.get('verifierSalt');
    const verifier = await db.settings.get('verifier');
    const wrappedByPassword = await db.settings.get('wrappedByPassword');

    if (!verifier || !derivationSalt || !verifierSalt || !wrappedByPassword) {
      throw new Error("Cofre corrompido ou incompleto.");
    }

    const inputHash = await hashPassword(password, verifierSalt.value);
    if (inputHash !== verifier.value) throw new Error("Senha Mestra Incorreta");

    const masterKey = await deriveKey(password, derivationSalt.value);
    const vaultKey = await unwrapVaultKey(wrappedByPassword.value, masterKey);
    
    setSession(prev => ({ ...prev, masterKey: vaultKey, isUnlocked: true }));
  };

  const enableBiometry = async () => {
    if (!session.masterKey) throw new Error("Desbloqueie o cofre primeiro.");
    
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "RD Gestor de Senhas" },
        user: {
          id: userId,
          name: supabaseUser?.email || "Local User",
          displayName: supabaseUser?.email || "Local User"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { userVerification: "required" },
        timeout: 60000
      }
    });

    if (credential) {
      const deviceSalt = window.crypto.getRandomValues(new Uint8Array(16));
      const deviceSecret = bufferToBase64(window.crypto.getRandomValues(new Uint8Array(32)));
      const deviceKey = await deriveKey(deviceSecret, deviceSalt);
      
      const wrappedByBiometry = await wrapVaultKey(session.masterKey, deviceKey);

      await db.settings.bulkPut([
        { key: 'biometrySecret', value: deviceSecret },
        { key: 'biometrySalt', value: deviceSalt },
        { key: 'wrappedByBiometry', value: wrappedByBiometry }
      ]);
      
      setHasBiometryEnrolled(true);
    }
  };

  const loginWithBiometry = async () => {
    const secret = await db.settings.get('biometrySecret');
    const salt = await db.settings.get('biometrySalt');
    const wrapped = await db.settings.get('wrappedByBiometry');

    if (!secret || !salt || !wrapped) throw new Error("Biometria não cadastrada.");

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: "required"
      }
    });

    if (assertion) {
      const deviceKey = await deriveKey(secret.value, salt.value);
      const vaultKey = await unwrapVaultKey(wrapped.value, deviceKey);
      
      setSession(prev => ({ ...prev, masterKey: vaultKey, isUnlocked: true }));
    }
  };

  const recover = async (recoveryKey: string) => {
    const recoverySalt = await db.settings.get('recoverySalt');
    const wrappedByRecovery = await db.settings.get('wrappedByRecovery');
    if (!recoverySalt || !wrappedByRecovery) throw new Error("Recuperação indisponível.");
    const recoveryMasterKey = await deriveKey(recoveryKey, recoverySalt.value);
    const vaultKey = await unwrapVaultKey(wrappedByRecovery.value, recoveryMasterKey);
    setTempVaultKey(vaultKey);
  };

  const resetPassword = async (newPassword: string) => {
    if (!tempVaultKey) throw new Error("Sessão expirada.");
    const derivationSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const verifierSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const masterKey = await deriveKey(newPassword, derivationSalt);
    const wrappedByPassword = await wrapVaultKey(tempVaultKey, masterKey);
    const verifierHash = await hashPassword(newPassword, verifierSalt);
    await db.settings.bulkPut([
      { key: 'verifier', value: verifierHash },
      { key: 'derivationSalt', value: derivationSalt },
      { key: 'verifierSalt', value: verifierSalt },
      { key: 'wrappedByPassword', value: wrappedByPassword }
    ]);
    setSession(prev => ({ ...prev, masterKey: tempVaultKey, isUnlocked: true }));
    setTempVaultKey(null);
  };

  const logout = () => {
    setSession({ userId: session.userId, masterKey: null, isUnlocked: false });
    setTempVaultKey(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, supabaseUser, login, signup, recover, resetPassword, 
      enableBiometry, loginWithBiometry, logout, 
      isLoading, isVaultConfigured, isBiometryAvailable, hasBiometryEnrolled 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
