import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle } from 'lucide-react';
import { ViaturaItem } from '../types/sicovi';

interface VehicleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaturas: ViaturaItem[];
  onSelect: (prefixo: string) => void;
}

export const VehicleSelectorModal: React.FC<VehicleSelectorModalProps> = ({
  isOpen,
  onClose,
  viaturas,
  onSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'resgate' | 'incendio' | 'adm'>('todas');
  const [apenasDisponiveis, setApenasDisponiveis] = useState(false);

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

  const filtered = viaturas.filter(v => {
    const nome = v.prefixo.toLowerCase();
    const busca = searchTerm.toLowerCase().trim();
    if (busca && !nome.includes(busca)) return false;

    const cat = (v.categoria || '').toUpperCase();
    if (categoriaFiltro === 'resgate' && cat !== 'RESGATE' && !v.prefixo.startsWith('UR')) return false;
    if (
      categoriaFiltro === 'incendio' &&
      !['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(cat) &&
      !v.prefixo.startsWith('ABT') &&
      !v.prefixo.startsWith('ABS')
    )
      return false;
    if (
      categoriaFiltro === 'adm' &&
      (cat === 'RESGATE' || ['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(cat))
    )
      return false;

    if (apenasDisponiveis && v.status.toUpperCase() !== 'DISPONÍVEL') return false;

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2 font-black text-sm">
            <span className="material-symbols-outlined text-red-500">directions_car</span>
            <span>Selecionar Viatura da Frota</span>
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
        <div className="p-4 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por prefixo da viatura (ex: UR, ABT, ASA)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-red-700"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Categoria:</span>
            <button
              type="button"
              onClick={() => setCategoriaFiltro('todas')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                categoriaFiltro === 'todas'
                  ? 'bg-red-800 border-red-800 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setCategoriaFiltro('resgate')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                categoriaFiltro === 'resgate'
                  ? 'bg-red-800 border-red-800 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Resgate
            </button>
            <button
              type="button"
              onClick={() => setCategoriaFiltro('incendio')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                categoriaFiltro === 'incendio'
                  ? 'bg-red-800 border-red-800 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Incêndio
            </button>
            <button
              type="button"
              onClick={() => setCategoriaFiltro('adm')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                categoriaFiltro === 'adm'
                  ? 'bg-red-800 border-red-800 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Apoio / Adm
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setApenasDisponiveis(!apenasDisponiveis)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                apenasDisponiveis
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Apenas Disponíveis</span>
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-8 text-xs text-slate-400 italic">
                Nenhuma viatura encontrada com os filtros selecionados.
              </div>
            ) : (
              filtered.map(v => {
                const s = v.status.toUpperCase();
                const isDisp = s === 'DISPONÍVEL';
                return (
                  <button
                    key={v.prefixo}
                    type="button"
                    onClick={() => {
                      onSelect(v.prefixo);
                      onClose();
                    }}
                    className="p-3 bg-white border border-slate-200 hover:border-red-700 hover:shadow-xs rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer"
                  >
                    <span className="font-black text-xs text-slate-900">{v.prefixo}</span>
                    <span
                      className={`text-[9px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded-full ${
                        isDisp
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {v.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>Clique na viatura desejada para selecionar.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
