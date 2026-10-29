import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import { formatarNomeMilitarLimpo } from '../services/storageService';
import { SystemAlertModal } from './SystemAlertModal';
import { soundEffects } from '../utils/soundEffects';

interface MilitaryRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onRegister: (nome: string) => void;
}

export const MilitaryRegisterModal: React.FC<MilitaryRegisterModalProps> = ({
  isOpen,
  onClose,
  initialName = '',
  onRegister
}) => {
  const [nome, setNome] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNome(initialName || '');
    }
  }, [isOpen, initialName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (alertInfo?.isOpen) {
          setAlertInfo(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, alertInfo, onClose]);

  if (!isOpen) return null;

  const prefixRank = (prefix: string) => {
    soundEffects.playClick();
    let raw = nome.replace(/^(?:Sd|Cb|3º Sgt|2º Sgt|1º Sgt|Sgt|SubTen|2º Ten|1º Ten|Ten|Cap|Maj|Cel)\s+/i, '');
    setNome(prefix + raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limpo = formatarNomeMilitarLimpo(nome);
    if (!limpo || limpo.length < 2) {
      setAlertInfo({
        isOpen: true,
        title: 'Dados Incompletos',
        message: 'Por favor, informe a graduação e o nome de guerra do militar para prosseguir.'
      });
      return;
    }
    soundEffects.playSuccess();
    onRegister(limpo);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-emerald-600">
            <div className="flex items-center gap-2 font-black text-sm">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>Cadastrar Militar na Planilha</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Adicione um novo militar à relação oficial da OBM (Aba <strong>MILITARES</strong>). Ele ficará disponível permanentemente para seleção nas viaturas e escalas de serviço.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Graduação e Nome de Guerra <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Cb Costa, Sd Souza, 1º Sgt Almeida..."
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
                Atalhos de Posto / Graduação:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Sd ', 'Cb ', '3º Sgt ', '2º Sgt ', '1º Sgt ', 'SubTen ', '2º Ten ', '1º Ten ', 'Cap '].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => prefixRank(p)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                  >
                    {p.trim()}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Gravar Militar</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {alertInfo && (
        <SystemAlertModal
          isOpen={alertInfo.isOpen}
          onClose={() => setAlertInfo(null)}
          title={alertInfo.title}
          message={alertInfo.message}
          type="warning"
        />
      )}
    </>
  );
};
