
import React, { useState } from 'react';
import { VaultItem } from '../types';
import { PasswordGenerator } from './PasswordGenerator';

interface Props {
  onSave: (item: Partial<VaultItem>) => void;
  onCancel: () => void;
  initialData?: VaultItem;
}

export const VaultItemForm: React.FC<Props> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<VaultItem>>(initialData || {
    title: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updatedAt: Date.now() });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-6 text-white">
          {initialData ? 'Editar Item' : 'Novo Item do Cofre'}
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Título</label>
              <input 
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-600 outline-none"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Google, Netflix..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Usuário / Email</label>
              <input 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-600 outline-none"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Senha</label>
              <input 
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-600 outline-none mono"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">URL</label>
              <input 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-600 outline-none"
                value={formData.url}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
             <PasswordGenerator onUse={(pwd) => setFormData(prev => ({...prev, password: pwd}))} />
             <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Notas</label>
                <textarea 
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-600 outline-none resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-6 py-2 text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-2 bg-orange-700 hover:bg-orange-600 rounded-lg font-semibold text-white shadow-lg transition"
            >
              Salvar no Cofre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
