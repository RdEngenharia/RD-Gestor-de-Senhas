
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const AuthPage: React.FC = () => {
  const { login, signup, recover, resetPassword, loginWithBiometry, isVaultConfigured, isBiometryAvailable, hasBiometryEnrolled } = useAuth();
  const [password, setPassword] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [recoveryKeyGenerated, setRecoveryKeyGenerated] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isVaultConfigured) {
      setMode('signup');
    } else if (mode === 'signup') {
      setMode('login');
    }
  }, [isVaultConfigured]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const key = await signup(password);
        setRecoveryKeyGenerated(key);
      } else if (mode === 'login') {
        await login(password);
      } else if (mode === 'forgot') {
        await recover(recoveryKeyInput);
        setMode('reset');
      } else if (mode === 'reset') {
        await resetPassword(password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    try {
      await loginWithBiometry();
    } catch (err: any) {
      setErrorMsg("Falha na biometria: " + (err.message || "Usuário cancelou."));
    }
  };

  if (recoveryKeyGenerated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl text-center">
          <div className="bg-orange-700/10 border border-orange-700/50 p-4 rounded-xl mb-6 text-left">
            <h2 className="text-orange-600 font-bold mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              SALVE SUA CHAVE AGORA
            </h2>
            <p className="text-orange-200/80 text-sm">
              Se esquecer sua Senha Mestra, essa é a <strong>única</strong> salvação. Sem ela, seus dados serão perdidos para sempre.
            </p>
          </div>
          
          <div className="bg-black p-4 rounded-xl border border-slate-700 mono text-xl text-orange-500 break-all mb-8 select-all cursor-pointer">
            {recoveryKeyGenerated}
          </div>

          <button 
            onClick={() => login(password)} 
            className="w-full bg-orange-700 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold transition shadow-xl"
          >
            Chave Salva, Acessar Cofre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="bg-orange-700 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-700/20">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tighter">RD <span className="text-orange-600">Gestor de Senhas</span></h1>
          <p className="text-slate-500 italic text-sm">Criptografia AES-256 local.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          {isBiometryAvailable && hasBiometryEnrolled && mode === 'login' && (
            <div className="absolute top-4 right-4">
              <button 
                onClick={handleBiometricLogin}
                className="p-3 bg-slate-800 hover:bg-orange-700/20 border border-slate-700 hover:border-orange-600 rounded-2xl text-orange-500 transition group"
                title="Desbloqueio Biométrico"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-8.12-4.064m12.783-7.574A9.123 9.123 0 0012 11a9.123 9.123 0 00-4.663 1.276m11.326 3.309A8.918 8.918 0 0021 12a8.917 8.917 0 00-7.347-8.76" />
                </svg>
              </button>
            </div>
          )}

          {mode !== 'forgot' && mode !== 'reset' && (
            <div className="flex bg-black/50 p-1 rounded-xl mb-8 mr-12">
              <button 
                onClick={() => isVaultConfigured && setMode('login')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${mode === 'login' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 opacity-50'}`}
              >
                LOGIN
              </button>
              <button 
                onClick={() => setMode('signup')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${mode === 'signup' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}
              >
                SETUP
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">
                {mode === 'forgot' ? 'Chave de Recuperação' : mode === 'reset' ? 'Nova Senha Mestra' : 'Senha Mestra'}
              </label>
              <input 
                type={mode === 'forgot' ? 'text' : 'password'} 
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-600 transition font-medium"
                placeholder={mode === 'forgot' ? "CHAVE-DE-24-BYTES..." : "••••••••••••"}
                value={mode === 'forgot' ? recoveryKeyInput : password}
                onChange={e => mode === 'forgot' ? setRecoveryKeyInput(e.target.value) : setPassword(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="text-red-400 text-xs bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-center animate-pulse">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-orange-700 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-orange-950/20"
            >
              {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {mode === 'login' ? 'Desbloquear Cofre' : mode === 'signup' ? 'Configurar Cofre' : mode === 'forgot' ? 'Validar Chave' : 'Salvar Nova Senha'}
            </button>

            <div className="flex justify-center gap-6 mt-4">
              {mode === 'login' && (
                <button type="button" onClick={() => setMode('forgot')} className="text-slate-500 text-xs hover:text-orange-500 transition">Esqueci minha senha</button>
              )}
              {(mode === 'forgot' || mode === 'reset') && (
                <button type="button" onClick={() => setMode('login')} className="text-slate-500 text-xs hover:text-white transition underline">Voltar</button>
              )}
            </div>
          </form>
        </div>
        
        {mode === 'login' && isBiometryAvailable && !hasBiometryEnrolled && (
          <p className="mt-6 text-center text-slate-500 text-xs">
            Dica: Após entrar, você poderá ativar o desbloqueio por digital.
          </p>
        )}
      </div>
    </div>
  );
};
