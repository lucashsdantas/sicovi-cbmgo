import React from 'react';
import { Users, PlusCircle, Radio } from 'lucide-react';

interface CommandHubProps {
  onOpenEscala: () => void;
  onOpenNovoDespacho: () => void;
}

export const CommandHub: React.FC<CommandHubProps> = ({ onOpenEscala, onOpenNovoDespacho }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-center gap-4 flex-wrap shadow-xs">
      <div className="flex items-center justify-center gap-4 flex-wrap w-full">
        {/* Botão Escalar Equipes */}
        <button
          type="button"
          onClick={onOpenEscala}
          title="Configurar escala de condutores e guarnições do plantão"
          className="group relative inline-flex items-center gap-3.5 px-6 py-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all border border-slate-700 overflow-hidden"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-black tracking-tight leading-tight group-hover:text-amber-300 transition-colors">
              Escalar Equipes
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Guarnições do Plantão
            </span>
          </div>
        </button>

        {/* Botão Novo Despacho */}
        <button
          type="button"
          onClick={onOpenNovoDespacho}
          title="Registrar saída operacional ou despacho imediato de viatura"
          className="group relative inline-flex items-center gap-3.5 px-6 py-3 rounded-xl bg-gradient-to-br from-red-700 to-red-800 text-white font-bold cursor-pointer shadow-md shadow-red-700/20 hover:shadow-lg hover:shadow-red-700/30 hover:-translate-y-0.5 active:scale-98 transition-all border border-red-600 overflow-hidden"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center border border-white/30">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-black tracking-tight leading-tight">
              Novo Despacho
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-100">
              Registrar Saída de Viatura
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
