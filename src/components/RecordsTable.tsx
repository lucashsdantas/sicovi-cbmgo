import React from 'react';
import { RegistroDespacho } from '../types/sicovi';
import { Edit, Trash2, FilterX, Check, AlertCircle, Clock } from 'lucide-react';

interface ColumnFilters {
  id: string;
  viatura: string;
  condutor: string;
  equipe: string;
  destino: string;
  bairro: string;
  rai: string;
  natureza: string;
  operador: string;
}

interface RecordsTableProps {
  registros: RegistroDespacho[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEdit: (registro: RegistroDespacho) => void;
  onDelete: (id: number | string) => void;
  columnFilters: ColumnFilters;
  onColumnFilterChange: (col: keyof ColumnFilters, val: string) => void;
  onClearColumnFilters: () => void;
  recentlySavedId: number | string | null;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  registros,
  currentPage,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  columnFilters,
  onColumnFilterChange,
  onClearColumnFilters,
  recentlySavedId
}) => {
  const totalPages = Math.ceil(registros.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = registros.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto overflow-y-auto max-h-[640px] relative">
        <table className="w-full min-w-[1280px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 sticky top-0 z-20">
              <th className="py-2.5 px-3 text-center w-[70px]">ID</th>
              <th className="py-2.5 px-3 text-center w-[100px]">Viatura</th>
              <th className="py-2.5 px-3 text-left min-w-[130px]">Condutor</th>
              <th className="py-2.5 px-3 text-left min-w-[180px]">Equipe</th>
              <th className="py-2.5 px-3 text-left min-w-[150px]">Destino</th>
              <th className="py-2.5 px-3 text-left min-w-[110px]">Bairro</th>
              <th className="py-2.5 px-3 text-center w-[90px]">RAI</th>
              <th className="py-2.5 px-3 text-left min-w-[130px]">Natureza</th>
              <th className="py-2.5 px-3 text-center w-[110px]">Saída</th>
              <th className="py-2.5 px-3 text-center w-[80px]">Km S.</th>
              <th className="py-2.5 px-3 text-center w-[110px]">Chegada</th>
              <th className="py-2.5 px-3 text-center w-[80px]">Km C.</th>
              <th className="py-2.5 px-3 text-center w-[85px]">KM Rod.</th>
              <th className="py-2.5 px-3 text-center w-[90px]">Op.</th>
              <th className="py-2.5 px-3 text-center w-[90px]">Ações</th>
            </tr>
            {/* Per-column filter inputs */}
            <tr className="bg-slate-50 border-b-2 border-slate-200 sticky top-[37px] z-10">
              <th className="p-1">
                <input
                  type="text"
                  placeholder="ID..."
                  value={columnFilters.id}
                  onChange={e => onColumnFilterChange('id', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Vtr..."
                  value={columnFilters.viatura}
                  onChange={e => onColumnFilterChange('viatura', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Condutor..."
                  value={columnFilters.condutor}
                  onChange={e => onColumnFilterChange('condutor', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Equipe..."
                  value={columnFilters.equipe}
                  onChange={e => onColumnFilterChange('equipe', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Destino..."
                  value={columnFilters.destino}
                  onChange={e => onColumnFilterChange('destino', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Bairro..."
                  value={columnFilters.bairro}
                  onChange={e => onColumnFilterChange('bairro', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="RAI..."
                  value={columnFilters.rai}
                  onChange={e => onColumnFilterChange('rai', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Natureza..."
                  value={columnFilters.natureza}
                  onChange={e => onColumnFilterChange('natureza', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1"></th>
              <th className="p-1"></th>
              <th className="p-1"></th>
              <th className="p-1"></th>
              <th className="p-1"></th>
              <th className="p-1">
                <input
                  type="text"
                  placeholder="Op..."
                  value={columnFilters.operador}
                  onChange={e => onColumnFilterChange('operador', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-slate-300 rounded bg-white text-slate-800 font-normal focus:outline-none focus:border-red-700"
                />
              </th>
              <th className="p-1 text-center">
                <button
                  type="button"
                  onClick={onClearColumnFilters}
                  className="px-2 py-1 bg-slate-200 hover:bg-red-50 hover:text-red-700 rounded text-slate-600 transition-colors"
                  title="Limpar todos os filtros por coluna"
                >
                  <FilterX className="w-3.5 h-3.5 inline" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-10 text-slate-400 font-medium">
                  Nenhum registro encontrado no banco de dados.
                </td>
              </tr>
            ) : (
              paginatedItems.map(linha => {
                const isRecent = recentlySavedId !== null && String(linha.id) === String(recentlySavedId);
                const kmS = Number(linha.kmSaida);
                const kmC = Number(linha.kmChegada);
                let kmRodado = '---';
                if (!isNaN(kmS) && !isNaN(kmC) && kmC >= kmS) {
                  kmRodado = `${kmC - kmS} km`;
                }

                const emAberto = !linha.chegada || String(linha.chegada).trim() === '';
                const destNorm = (linha.destino || '').trim().toUpperCase();
                const isOcorr = destNorm === 'OCORRÊNCIA' || destNorm === 'OCORRENCIA';

                return (
                  <tr
                    key={linha.id}
                    onDoubleClick={() => onEdit(linha)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isRecent ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{linha.id}</span>
                        {isRecent && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded border border-emerald-300">
                            SALVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-extrabold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        {linha.viatura}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 min-w-[130px]">
                      {linha.condutor}
                    </td>
                    <td className="py-2 px-3 text-slate-600 min-w-[180px] break-words" title={linha.equipe}>
                      {linha.equipe || '---'}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 min-w-[150px]">
                      {linha.destino}
                    </td>
                    <td className="py-2 px-3 text-slate-600 min-w-[110px]">
                      {linha.bairro || '---'}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                        {linha.rai || '---'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 min-w-[130px] break-words">
                      {linha.natureza || '---'}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap font-medium text-slate-700">
                      {linha.saida}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap font-bold text-slate-800">
                      {linha.kmSaida !== '' ? linha.kmSaida : '---'}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {emAberto ? (
                        isOcorr ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            Em ocorrência
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Em deslocamento
                          </span>
                        )
                      ) : (
                        <span className="font-medium text-slate-700">{linha.chegada}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap font-bold text-slate-800">
                      {linha.kmChegada !== '' ? linha.kmChegada : '---'}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap font-black text-emerald-700">
                      {kmRodado}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap text-slate-500 font-medium">
                      {linha.operador}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onEdit(linha);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Editar Registro / Lançar Retorno"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(linha.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap text-xs">
        <span className="text-slate-600 font-medium">
          Exibindo {registros.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, registros.length)} de{' '}
          <strong className="text-slate-900">{registros.length}</strong> registros
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Anterior
          </button>
          <span className="font-bold text-slate-800 px-2">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Próximo →
          </button>
        </div>
      </div>
    </div>
  );
};
