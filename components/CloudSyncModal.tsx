
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';

interface Props {
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const CloudSyncModal: React.FC<Props> = ({ onClose, onSyncSuccess }) => {
  const { supabaseUser, session } = useAuth();
  const { uploadBackup, downloadBackup, syncStatus } = useSync();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supabaseUser && session.isUnlocked && syncStatus.status === 'idle') {
      handleAction('upload', true); 
    }
  }, [supabaseUser, session.isUnlocked, syncStatus.status]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (authMode === 'signup') {
        // Chamada signUp correta v2
        const { error: sbError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (sbError) throw sbError;
        setSuccessMsg("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        // Chamada signInWithPassword correta v2
        const { error: sbError } = await supabase.auth.signInWithPassword({ email, password });
        if (sbError) throw sbError;
        setSuccessMsg("Logado com sucesso!");
        setTimeout(() => handleAction('download'), 500);
      }
    } catch (err: any) {
      setError(err.message || "Erro de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type: 'upload' | 'download', silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    
    try {
      if (type === 'upload') {
        await uploadBackup();
        if (!silent) setSuccessMsg("Nuvem atualizada!");
      } else {
        const result = await downloadBackup();
        if (result) {
          if (!silent) setSuccessMsg("Cofre restaurado!");
          if (onSyncSuccess) onSyncSuccess();
        } else if (!silent) {
          setSuccessMsg("Nenhum backup encontrado.");
        }
      }
    } catch (err: any) {
      if (!silent) setError(err.message || "Falha na sincronização.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition p-2">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight uppercase">Sincronização Nuvem</h2>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">
            {supabaseUser ? `ATIVO: ${supabaseUser.email}` : "Backup Zero-Knowledge"}
          </p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-xs mb-6 text-center">{error}</div>}
        {successMsg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-2xl text-xs mb-6 text-center">{successMsg}</div>}

        {!supabaseUser ? (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="flex bg-black/40 p-1 rounded-xl mb-4 border border-slate-800">
              <button type="button" onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-xs font-black rounded-lg transition ${authMode === 'login' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>LOGIN</button>
              <button type="button" onClick={() => setAuthMode('signup')} className={`flex-1 py-2 text-xs font-black rounded-lg transition ${authMode === 'signup' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>CADASTRAR</button>
            </div>
            <input 
              type="email" placeholder="E-mail" required
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-600 transition"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input 
              type="password" placeholder="Senha Cloud" required
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-600 transition"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            <button 
              disabled={loading}
              className="w-full bg-orange-700 hover:bg-orange-600 text-white py-4 rounded-2xl font-black transition flex justify-center items-center gap-2 shadow-xl shadow-orange-950/20"
            >
              {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {authMode === 'login' ? 'ENTRAR E SINCRONIZAR' : 'CRIAR CONTA CLOUD'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => handleAction('upload')} disabled={loading} className="w-full bg-orange-700 hover:bg-orange-600 text-white py-4 rounded-2xl font-black transition">ENVIAR PARA NUVEM</button>
              <button onClick={() => handleAction('download')} disabled={loading} className="w-full border border-slate-700 text-slate-300 py-4 rounded-2xl font-black transition">BAIXAR DA NUVEM</button>
            </div>
            <button onClick={() => { supabase.auth.signOut(); onClose(); }} className="w-full text-slate-500 text-[10px] font-black hover:text-red-500 transition uppercase tracking-widest mt-4">DESCONECTAR CONTA</button>
          </div>
        )}
      </div>
    </div>
  );
};
