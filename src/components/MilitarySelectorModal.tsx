import React, { useState, useEffect } from 'react';
import { X, Search, Check, UserPlus, Users } from 'lucide-react';
import { formatarNomeMilitarLimpo } from '../services/storageService';

interface MilitarySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetField: string;
  militares: string[];
  initialValue: string;
  onConfirm: (targetField: string, value: string) => void;
  onOpenRegisterModal: () => void;
}

export const MilitarySelectorModal: React.FC<MilitarySelectorModalProps> = ({
  isOpen,
  onClose,
  targetField,
  militares,
  initialValue,
  onConfirm,
  onOpenRegisterModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedList, setSelectedList] = useState<string[]>([]);
  const isCondutor = targetField.toLowerCase().includes('condutor');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (initialValue && initialValue.trim()) {
        if (isCondutor) {
          setSelectedList([formatarNomeMilitarLimpo(initialValue.trim())]);
        } else {
          const arr = initialValue
            .split(',')
            .map(s => formatarNomeMilitarLimpo(s.trim()))
            .filter(Boolean);
          setSelectedList(arr);
        }
      } else {
        setSelectedList([]);
      }
    }
  }, [isOpen, initialValue, isCondutor]);

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

  const normalizar = (txt: string) =>
    (txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[º°ª\.]/g, '')
      .toLowerCase()
      .trim();

  const filtered = militares.filter(m => {
    if (!searchTerm.trim()) return true;
    const norm = normalizar(m);
    const searchTerms = normalizar(searchTerm).split(/\s+/).filter(Boolean);
    return searchTerms.every(term => norm.includes(term));
  });

  const toggleSelect = (nome: string) => {
    const limpo = formatarNomeMilitarLimpo(nome);
    if (isCondutor) {
      setSelectedList([limpo]);
    } else {
      if (selectedList.includes(limpo)) {
        setSelectedList(selectedList.filter(item => item !== limpo));
      } else {
        setSelectedList([...selectedList, limpo]);
      }
    }
  };

  const removeMilitar = (nome: string) => {
    setSelectedList(selectedList.filter(item => item !== nome));
  };

  const selectAllVisible = () => {
    const set = new Set([...selectedList, ...filtered]);
    setSelectedList(Array.from(set));
  };

  const clearAll = () => {
    setSelectedList([]);
  };

  const handleConfirm = () => {
    const val = isCondutor ? selectedList[0] || '' : selectedList.join(', ');
    onConfirm(targetField, val);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2 font-black text-sm">
            <span className="material-symbols-outlined text-red-500">
              {isCondutor ? 'airline_seat_recline_normal' : 'group_add'}
            </span>
            <span>{isCondutor ? 'Selecionar Condutor da Viatura' : 'Selecionar Guarnição / Militares'}</span>
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
          {/* Search bar and Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar militar por nome ou graduação (ex: Cb, Sgt, Costa)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-red-700"
              />
            </div>
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Cadastrar Militar</span>
            </button>
            {!isCondutor && (
              <>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  Limpar
                </button>
              </>
            )}
          </div>

          {/* Selected tray */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase mb-1">
              <span>Militares Selecionados ({selectedList.length}):</span>
              <span className="font-normal text-slate-400">
                {isCondutor ? 'Selecione 1 condutor' : 'Clique no militar para selecionar'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl min-h-[44px] items-center">
              {selectedList.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Nenhum militar selecionado ainda.</span>
              ) : (
                selectedList.map(m => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <span>{m}</span>
                    <button
                      type="button"
                      onClick={() => removeMilitar(m)}
                      className="text-slate-400 hover:text-red-700 font-bold ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Military Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-8 text-xs text-slate-400 italic">
                Nenhum militar encontrado com esse termo.
              </div>
            ) : (
              filtered.map(nome => {
                const limpo = formatarNomeMilitarLimpo(nome);
                const isSelected = selectedList.includes(limpo);

                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => toggleSelect(nome)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 border-red-600 shadow-xs ring-1 ring-red-600'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">{limpo}</span>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] ${
                        isSelected ? 'bg-red-700' : 'border border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">
              Destino: <strong className="text-red-800">{isCondutor ? 'Condutor' : 'Guarnição'}</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Inserir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
