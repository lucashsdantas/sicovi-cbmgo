import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Edit3, X } from 'lucide-react';

interface KmVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  warnings: string[];
  onConfirm: () => void;
}

export const KmVerificationModal: React.FC<KmVerificationModalProps> = ({
  isOpen,
  onClose,
  warnings,
  onConfirm
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-t-4 border-amber-500 border-x border-b border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2 font-black text-sm text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Atenção: Verificação de Quilometragem</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3">
          <p className="text-xs font-bold text-amber-900">
            Identificamos divergência no odômetro em relação ao histórico da viatura:
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed max-h-48 overflow-y-auto">
            <ul className="list-disc pl-5 space-y-1.5">
              {warnings.map((w, idx) => (
                <li key={idx} dangerouslySetInnerHTML={{ __html: w }} />
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-slate-500">
            Por favor, verifique se a quilometragem informada está correta antes de salvar no banco de dados.
          </p>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Verificar e Corrigir</span>
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Confirmar e Salvar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
