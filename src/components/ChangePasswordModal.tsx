import React, { useState, useEffect } from 'react';
import { X, KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { storageService } from '../services/storageService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  operadorPadrao?: string;
  operadores: string[];
  onSuccess: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  operadorPadrao = '',
  operadores,
  onSuccess
}) => {
  const [usuario, setUsuario] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUsuario(operadorPadrao || (operadores.length > 0 ? operadores[0] : ''));
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setErrorMsg('');
      setMostrarSenhas(false);
    }
  }, [isOpen, operadorPadrao, operadores]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!usuario.trim()) {
      setErrorMsg('Selecione ou informe o militar operador.');
      return;
    }

    if (!senhaAtual) {
      setErrorMsg('Informe a senha atual.');
      return;
    }

    if (!novaSenha) {
      setErrorMsg('Informe a nova senha.');
      return;
    }

    if (novaSenha.length < 4) {
      setErrorMsg('A nova senha deve possuir no mínimo 4 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErrorMsg('A confirmação da nova senha não confere.');
      return;
    }

    const res = storageService.alterarSenha(usuario, senhaAtual, novaSenha);
    if (!res.success) {
      setErrorMsg(res.mensagem);
      return;
    }

    onSuccess(res.mensagem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2 font-black text-sm">
            <KeyRound className="w-5 h-5 text-red-500" />
            <span>Alterar Senha do Operador</span>
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
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Militar / Operador:
            </label>
            <select
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-red-700"
            >
              {operadores.map(op => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Senha Atual:
            </label>
            <input
              type={mostrarSenhas ? 'text' : 'password'}
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nova Senha:
            </label>
            <input
              type={mostrarSenhas ? 'text' : 'password'}
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirmar Nova Senha:
            </label>
            <input
              type={mostrarSenhas ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-red-700"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <button
              type="button"
              onClick={() => setMostrarSenhas(!mostrarSenhas)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {mostrarSenhas ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{mostrarSenhas ? 'Ocultar senhas' : 'Ver senhas digitadas'}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Gravar Nova Senha</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
