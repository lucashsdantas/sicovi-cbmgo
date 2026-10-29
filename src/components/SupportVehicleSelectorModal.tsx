import React, { useState, useEffect } from 'react';
import { X, Search, Check, CheckSquare, Square } from 'lucide-react';

interface SupportVehicleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableVehicles: string[];
  alreadyAddedVehicles: string[];
  onConfirm: (selectedPrefixos: string[]) => void;
  getUltimoKm: (prefixo: string) => number | null;
}

export const SupportVehicleSelectorModal: React.FC<SupportVehicleSelectorModalProps> = ({
  isOpen,
  onClose,
  availableVehicles,
  alreadyAddedVehicles,
  onConfirm,
  getUltimoKm
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedList, setSelectedList] = useState<string[]>([]);

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

  const validVehicles = availableVehicles.filter(
    v => !alreadyAddedVehicles.includes(v.trim().toUpperCase())
  );

  const filtered = validVehicles.filter(v =>
    v.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const toggleSelect = (prefixo: string) => {
    const upper = prefixo.trim().toUpperCase();
    if (selectedList.includes(upper)) {
      setSelectedList(selectedList.filter(item => item !== upper));
    } else {
      setSelectedList([...selectedList, upper]);
    }
  };

  const selectAll = () => {
    setSelectedList(filtered.map(v => v.trim().toUpperCase()));
  };

  const clearAll = () => {
    setSelectedList([]);
  };

  const handleConfirm = () => {
    onConfirm(selectedList);
    onClose();
    setSelectedList([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2 font-black text-sm">
            <span className="material-symbols-outlined text-amber-400">add_to_queue</span>
            <span>Selecionar Viaturas em Apoio</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
              Seleção Múltipla
            </span>
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
          <p className="text-xs text-slate-600">
            Selecione uma ou mais viaturas da frota para acompanhar esta ocorrência em comboio:
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filtrar viatura (ex: UR, ABT, ASA)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-bold text-[11px]"
              >
                Marcar Todas ({filtered.length})
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded font-bold text-[11px]"
              >
                Limpar
              </button>
            </div>
            <span className="font-extrabold bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">
              {selectedList.length} selecionada(s)
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="col-span-2 text-center py-6 text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                Nenhuma viatura disponível encontrada.
              </div>
            ) : (
              filtered.map(v => {
                const upper = v.trim().toUpperCase();
                const isSelected = selectedList.includes(upper);
                const ultKm = getUltimoKm(upper);

                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleSelect(v)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-900">{upper}</span>
                        {isSelected && (
                          <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-1 rounded">
                            APOIO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {ultKm !== null ? `Último: ${ultKm.toLocaleString('pt-BR')} km` : 'Sem km prévio'}
                      </span>
                    </div>
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-[11px] text-slate-500">
              {selectedList.length > 0 ? `${selectedList.length} viatura(s) selecionada(s)` : 'Selecione uma ou mais'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={selectedList.length === 0}
                onClick={handleConfirm}
                className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Adicionar ({selectedList.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
