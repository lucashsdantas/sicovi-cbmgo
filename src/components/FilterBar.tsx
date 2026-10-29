import React from 'react';
import { Search, X, FileText, Table, Clock, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  buscaGeral: string;
  onBuscaGeralChange: (val: string) => void;
  dataInicio: string;
  onDataInicioChange: (val: string) => void;
  dataFim: string;
  onDataFimChange: (val: string) => void;
  presetAtivo: '24h' | 'hoje' | '7d' | 'tudo' | string;
  onPresetChange: (preset: '24h' | 'hoje' | '7d' | 'tudo') => void;
  apenasEmAberto: boolean;
  onApenasEmAbertoToggle: () => void;
  onGerarPdf: () => void;
  onExportarCsv: () => void;
  onAtualizarDados?: () => void;
  onLimparFiltros?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  buscaGeral,
  onBuscaGeralChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  presetAtivo,
  onPresetChange,
  apenasEmAberto,
  onApenasEmAbertoToggle,
  onGerarPdf,
  onExportarCsv,
  onAtualizarDados,
  onLimparFiltros
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3.5 flex-wrap">
        {/* Search input */}
        <div className="flex-1 min-w-[260px] relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={buscaGeral}
            onChange={e => onBuscaGeralChange(e.target.value)}
            placeholder="Pesquisar por viatura, condutor, destino, RAI ou operador..."
            className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:border-red-700 transition-colors"
          />
          {buscaGeral && (
            <button
              type="button"
              onClick={() => onBuscaGeralChange('')}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date inputs & Actions buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">De:</span>
            <input
              type="datetime-local"
              value={dataInicio}
              onChange={e => onDataInicioChange(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-red-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Até:</span>
            <input
              type="datetime-local"
              value={dataFim}
              onChange={e => onDataFimChange(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-red-700"
            />
          </div>

          {/* Action buttons: Atualizar Dados & Limpar Filtros */}
          {onAtualizarDados && (
            <button
              type="button"
              onClick={onAtualizarDados}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-900 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
              title="Sincronizar e atualizar registros do banco de dados sem alterar seus filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Atualizar Dados</span>
            </button>
          )}

          {onLimparFiltros && (
            <button
              type="button"
              onClick={onLimparFiltros}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Limpar todos os filtros da tabela e restaurar visualização padrão"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpar Filtros</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGerarPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-400 transition-colors cursor-pointer"
            title="Exportar dados filtrados em formato PDF oficial com brasão e layout CBMGO"
          >
            <FileText className="w-4 h-4 text-red-700" />
            <span>Gerar PDF</span>
          </button>

          <button
            type="button"
            onClick={onExportarCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs hover:border-slate-400 transition-colors cursor-pointer"
            title="Exportar tabela em formato CSV para Excel"
          >
            <Table className="w-4 h-4 text-emerald-700" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Preset Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Atalhos:</span>
        <button
          type="button"
          onClick={() => onPresetChange('24h')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            presetAtivo === '24h'
              ? 'bg-red-800 border-red-800 text-white shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Últimas 24 Horas
        </button>
        <button
          type="button"
          onClick={() => onPresetChange('hoje')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            presetAtivo === 'hoje'
              ? 'bg-red-800 border-red-800 text-white shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => onPresetChange('7d')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            presetAtivo === '7d'
              ? 'bg-red-800 border-red-800 text-white shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Últimos 7 Dias
        </button>
        <button
          type="button"
          onClick={() => onPresetChange('tudo')}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            presetAtivo === 'tudo'
              ? 'bg-red-800 border-red-800 text-white shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todo o Histórico
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onApenasEmAbertoToggle}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            apenasEmAberto
              ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Apenas Em Aberto (Sem Retorno)</span>
        </button>
      </div>
    </div>
  );
};
