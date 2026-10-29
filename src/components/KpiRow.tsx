import React from 'react';
import { CheckCircle, AlertTriangle, Route, Flame, Gauge } from 'lucide-react';

interface KpiRowProps {
  disponiveis: number;
  empenhadas: number;
  totalSaidas: number;
  totalOcorrencias: number;
  kmTotal: number;
}

export const KpiRow: React.FC<KpiRowProps> = ({
  disponiveis,
  empenhadas,
  totalSaidas,
  totalOcorrencias,
  kmTotal
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {/* Disponíveis */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center gap-3.5 shadow-xs">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900 leading-tight">{disponiveis}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Viaturas Disponíveis
          </div>
        </div>
      </div>

      {/* Em Ocorrência / Rua */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center gap-3.5 shadow-xs">
        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900 leading-tight">{empenhadas}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Em Ocorrência / Rua
          </div>
        </div>
      </div>

      {/* Número de Saídas */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center gap-3.5 shadow-xs">
        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
          <Route className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900 leading-tight">{totalSaidas}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Número de Saídas
          </div>
        </div>
      </div>

      {/* Número de Ocorrências */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center gap-3.5 shadow-xs">
        <div className="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center border border-red-100">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-red-700 leading-tight">{totalOcorrencias}</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Ocorrências Atendidas
          </div>
        </div>
      </div>

      {/* KM Rodados */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center gap-3.5 shadow-xs">
        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
          <Gauge className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-slate-900 leading-tight">
            {kmTotal.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-slate-500">km</span>
          </div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            KM Rodados (Período)
          </div>
        </div>
      </div>
    </div>
  );
};
