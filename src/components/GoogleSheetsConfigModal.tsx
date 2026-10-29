import React, { useState } from 'react';
import { X, Database, Save, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface GoogleSheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const GoogleSheetsConfigModal: React.FC<GoogleSheetsConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [url, setUrl] = useState(storageService.getScriptUrl());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.setScriptUrl(url.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-700">
          <div className="flex items-center gap-2 font-black text-sm">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Conexão com Planilha Google Sheets</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            O SICOVI já opera 100% de forma autônoma e com persistência local. Caso queira sincronizar diretamente com a sua planilha oficial Google Sheets em tempo real via Google Apps Script, insira a URL do seu Web App abaixo:
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL do Web App (Google Apps Script):
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-red-700"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Deixe em branco para usar o armazenamento local de alta velocidade.
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex flex-col gap-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-700" />
              <span>Como implantar o Google Apps Script sem violações:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-800">
              <li>No editor do Google Sheets, abra <em>Extensões &gt; Apps Script</em>.</li>
              <li>Cole o <code>Code.gs</code> corrigido (consulte o botão <strong>Guia de Diretrizes</strong>).</li>
              <li>Clique em <strong>Implantar &gt; Nova implantação</strong>.</li>
              <li>Tipo: <strong>App da Web</strong> | Executar como: <strong>Eu</strong> | Quem tem acesso: <strong>Qualquer pessoa</strong>.</li>
              <li>Copie a URL gerada e cole no campo acima.</li>
            </ol>
          </div>

          {savedSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Configuração salva com sucesso!</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Conexão</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
