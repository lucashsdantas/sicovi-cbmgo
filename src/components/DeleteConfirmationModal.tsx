import React, { useEffect } from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: number | string | null;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  recordId,
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

  if (!isOpen || recordId === null) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-rose-600">
          <div className="flex items-center gap-2 font-black text-sm text-rose-300">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Confirmar Exclusão</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3 border border-rose-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-800 mb-5 leading-relaxed">
            Deseja realmente excluir o registro <strong>#{recordId}</strong> do banco de dados?
          </p>

          <div className="flex gap-2.5 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
