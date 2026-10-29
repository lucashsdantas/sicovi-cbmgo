import React from 'react';
import { LogOut, KeyRound, ShieldCheck, Smartphone, QrCode } from 'lucide-react';

interface HeaderProps {
  operador: string;
  activeTab: 'operacional' | 'estatisticas';
  onTabChange: (tab: 'operacional' | 'estatisticas') => void;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  onOpenManagerial?: () => void;
  onSwitchToMobile?: () => void;
  onOpenQrCodes?: () => void;
  isSyncing: boolean;
  syncProgress: number;
}

export const Header: React.FC<HeaderProps> = ({
  operador,
  activeTab,
  onTabChange,
  onLogout,
  onOpenChangePassword,
  onOpenManagerial,
  onSwitchToMobile,
  onOpenQrCodes,
  isSyncing,
  syncProgress
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-[98%] mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Brand Section with CBMGO Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/cbmgo-logo.png"
            alt="CBMGO"
            className="h-10 w-auto object-contain"
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = 'https://i.imgur.com/6K44gs7.png';
            }}
          />
          <div className="flex flex-col">
            <div className="text-xl font-extrabold text-red-800 tracking-tight leading-tight">
              SICOVI
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Controle Operacional de Viaturas &bull; CBMGO
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => onTabChange('operacional')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'operacional'
                ? 'bg-white text-red-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>Despacho &amp; Registros</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('estatisticas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'estatisticas'
                ? 'bg-white text-red-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            <span>Totais &amp; Evolução KM</span>
          </button>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Live Sync Badge */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-600">
            <span
              className={`w-2 h-2 rounded-full ${
                isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizado'}</span>
          </div>

          {/* Botão de QR Codes para Viaturas */}
          {onOpenQrCodes && (
            <button
              type="button"
              onClick={onOpenQrCodes}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Gerar e imprimir QR Codes das viaturas"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">QR Codes</span>
            </button>
          )}

          {/* Botão de Alternar para Versão Mobile */}
          {onSwitchToMobile && (
            <button
              type="button"
              onClick={onSwitchToMobile}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Abrir versão Mobile para a viatura"
            >
              <Smartphone className="w-3.5 h-3.5 text-red-700" />
              <span className="hidden sm:inline">Modo Viatura (Mobile)</span>
            </button>
          )}

          {/* Operator Badge with Change Password and Logout */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Operador</span>
              <span className="text-xs font-bold text-slate-800 leading-tight">{operador}</span>
            </div>

            {onOpenManagerial && (
              <button
                type="button"
                onClick={onOpenManagerial}
                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-1 cursor-pointer"
                title="Painel Gerencial / Administração"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenChangePassword}
              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Mudar minha senha de operador"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sync progress line */}
      <div className="h-0.5 w-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
          style={{ width: `${syncProgress}%` }}
        />
      </div>
    </header>
  );
};
