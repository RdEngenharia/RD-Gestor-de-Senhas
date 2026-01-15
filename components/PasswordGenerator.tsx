
import React, { useState } from 'react';

export const PasswordGenerator: React.FC<{ onUse: (pwd: string) => void }> = ({ onUse }) => {
  const [length, setLength] = useState(16);
  const [generated, setGenerated] = useState('');

  const generate = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let retVal = "";
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; ++i) {
      retVal += charset.charAt(bytes[i] % charset.length);
    }
    setGenerated(retVal);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Gerador de Senha</h3>
      <div className="flex gap-2 items-center">
        <input 
          type="range" min="8" max="64" value={length} 
          onChange={(e) => setLength(parseInt(e.target.value))}
          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
        />
        <span className="mono text-orange-500">{length}</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-black p-2 rounded border border-slate-700 mono break-all min-h-[40px] flex items-center text-sm">
          {generated || 'Cliquem em gerar...'}
        </div>
        <button 
          onClick={generate}
          className="px-3 py-2 bg-orange-700 hover:bg-orange-600 rounded text-sm font-medium transition text-white"
        >
          Gerar
        </button>
      </div>
      {generated && (
        <button 
          onClick={() => onUse(generated)}
          className="w-full py-2 border border-orange-600 text-orange-500 hover:bg-orange-600 hover:text-white rounded text-sm font-medium transition"
        >
          Usar esta senha
        </button>
      )}
    </div>
  );
};
