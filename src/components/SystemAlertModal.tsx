import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export type AlertModalType = 'info' | 'warning' | 'error' | 'success' | 'confirm' | 'danger';

export interface SystemAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string | React.ReactNode;
  type?: AlertModalType;
  confirmText?: string;
  cancelText?: string;
}

export const SystemAlertModal: React.FC<SystemAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancelar'
}) => {
  const isConfirm = type === 'confirm' || type === 'danger' || Boolean(onConfirm);

  useEffect(() => {
    if (!isOpen) return;

    if (type === 'error' || type === 'danger') {
      soundEffects.playError();
    } else if (type === 'warning') {
      soundEffects.playWarning();
    } else if (type === 'success') {
      soundEffects.playSuccess();
    } else {
      soundEffects.playClick();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (onConfirm) {
          onConfirm();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, type, onClose, onConfirm]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'error':
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              SICOVI &bull; Comunicação do Sistema
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex items-start gap-4">
          {renderIcon()}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5 leading-snug">{title}</h3>
            <div className="text-xs text-slate-600 leading-relaxed font-medium">
              {typeof message === 'string' ? <p>{message}</p> : message}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          {isConfirm && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition-all ${
              type === 'danger'
                ? 'bg-rose-700 hover:bg-rose-800'
                : type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-red-800 hover:bg-red-900'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
