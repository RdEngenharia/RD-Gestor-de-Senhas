
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { VaultItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../hooks/useSync';
import { VaultItemForm } from './VaultItemForm';
import { CloudSyncModal } from './CloudSyncModal';

export const Dashboard: React.FC = () => {
  const { session, supabaseUser, logout, isBiometryAvailable, hasBiometryEnrolled, enableBiometry } = useAuth();
  const { syncStatus, uploadBackup, downloadBackup } = useSync();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | undefined>();
  const [revealId, setRevealId] = useState<number | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Estado para o modal de confirmação de exclusão customizado
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const all = await db.passwords.toArray();
      setItems(all.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (err) {
      console.error("Erro ao buscar senhas:", err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (item: Partial<VaultItem>) => {
    try {
      if (editingItem?.id) {
        await db.passwords.update(editingItem.id, item);
      } else {
        await db.passwords.add(item as VaultItem);
      }
      setIsFormOpen(false);
      setEditingItem(undefined);
      await fetchItems();
      if (supabaseUser) {
        uploadBackup().catch(console.error);
      }
    } catch (e) {
      alert("Erro ao salvar senha localmente.");
    }
  };

  const executeDelete = async () => {
    if (itemToDelete === null) return;
    
    try {
      const id = itemToDelete;
      // 1. Exclusão no Banco Local
      await db.passwords.delete(id);
      
      // 2. Atualização reativa da UI
      setItems(prev => prev.filter(item => item.id !== id));
      
      // 3. Sincronização com a nuvem
      if (supabaseUser) {
        uploadBackup().catch(console.error);
      }
      
      setItemToDelete(null);
    } catch (e: any) {
      console.error("Erro ao excluir:", e);
      fetchItems();
      setItemToDelete(null);
    }
  };

  const handleForceRefresh = async () => {
    if (!supabaseUser) {
      setIsCloudModalOpen(true);
      return;
    }
    setIsRefreshing(true);
    try {
      const success = await downloadBackup();
      if (success) await fetchItems();
    } catch (e: any) {
      alert("Erro ao sincronizar: " + e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="bg-orange-700 p-2 rounded-xl shadow-lg shadow-orange-900/20">
             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight italic uppercase">RD <span className="text-orange-600">VAULT</span></h1>
        </div>

        <div className="flex items-center gap-4">
           {isBiometryAvailable && !hasBiometryEnrolled && (
             <button 
               onClick={async () => {
                 setBioLoading(true);
                 try { await enableBiometry(); alert("Biometria ativa!"); } catch (e: any) { alert("Erro biometria: " + e.message); }
                 setBioLoading(false);
               }}
               disabled={bioLoading}
               className="bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-400 hover:text-orange-500 transition uppercase tracking-widest"
             >
               {bioLoading ? 'ATIVANDO...' : 'Ativar Digital'}
             </button>
           )}
           <div className="flex bg-slate-900 rounded-full border border-slate-800 p-1 items-center">
              <button 
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className={`p-2 text-slate-400 hover:text-orange-500 transition ${isRefreshing ? 'animate-spin' : ''}`}
                title="Sincronizar Nuvem"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
              <button 
                onClick={() => setIsCloudModalOpen(true)}
                className="px-4 py-1.5 text-[10px] font-black text-orange-500 hover:text-orange-400 transition tracking-widest uppercase"
              >
                {supabaseUser ? 'Cloud ON' : 'Sync Cloud'}
              </button>
           </div>
           <button onClick={logout} className="text-slate-500 hover:text-white transition p-2 hover:bg-slate-900 rounded-full">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
           </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
             <input 
               type="text" 
               placeholder="Pesquisar no cofre..."
               className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-orange-600 transition shadow-sm font-medium text-slate-100"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
             <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
          </div>
          <button 
            onClick={() => { setEditingItem(undefined); setIsFormOpen(true); }}
            className="bg-orange-700 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black transition flex items-center justify-center gap-2 shadow-xl shadow-orange-950/20"
          >
            Nova Senha
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-32 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl">
             <p className="text-slate-500 font-medium tracking-tight">O cofre está vazio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-orange-600/50 transition-all group shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition flex gap-1 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsFormOpen(true); }} 
                      className="p-2 text-slate-500 hover:text-orange-500 bg-black/40 rounded-xl transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id!); }} 
                      className="p-2 text-slate-500 hover:text-red-400 bg-black/40 rounded-xl transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                </div>

                <div className="mb-4">
                  <div className="bg-slate-800 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-700">
                    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-1 truncate pr-16">{item.title}</h3>
                <p className="text-slate-500 text-xs mb-5 truncate font-medium uppercase tracking-wider">{item.username || 'Sem usuário'}</p>

                <div className="bg-black/40 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-2">
                    <div className="flex-1 mono text-sm overflow-hidden text-ellipsis whitespace-nowrap text-slate-300">
                      {revealId === item.id ? item.password : '••••••••••••'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setRevealId(revealId === item.id ? null : item.id!); }}
                      className="text-slate-600 hover:text-orange-500 transition"
                    >
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         {revealId === item.id ? (
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                         ) : (
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         )}
                         {!revealId && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                       </svg>
                    </button>
                </div>

                {item.url && (
                  <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center text-[10px] font-black text-orange-600 hover:text-orange-500 transition gap-2 uppercase tracking-widest">
                    Acessar Site
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão customizado */}
      {itemToDelete !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[150] backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center scale-in duration-200">
              <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Excluir Senha?</h2>
              <p className="text-slate-400 text-sm mb-8">Esta ação removerá o item permanentemente do seu cofre local e da nuvem.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition shadow-lg shadow-red-950/20"
                >
                  Excluir
                </button>
              </div>
           </div>
        </div>
      )}

      {isFormOpen && (
        <VaultItemForm 
          onSave={handleSave} 
          onCancel={() => setIsFormOpen(false)} 
          initialData={editingItem}
        />
      )}

      {isCloudModalOpen && (
        <CloudSyncModal onClose={() => setIsCloudModalOpen(false)} onSyncSuccess={fetchItems} />
      )}

      {syncStatus.status === 'syncing' && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-2xl z-[200]">
           <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
           <span className="text-xs font-black uppercase tracking-widest text-slate-300">Sync Nuvem...</span>
        </div>
      )}
    </div>
  );
};
