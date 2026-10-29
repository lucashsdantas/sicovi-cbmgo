import React, { useState, useEffect } from 'react';
import { EscalaItem, ViaturaItem } from '../types/sicovi';
import { X, Save, SkipForward, Users, Car, UserPlus, Search, Check } from 'lucide-react';
import { formatarNomeMilitarLimpo } from '../services/storageService';

interface EscalaModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaturas: ViaturaItem[];
  escalas: EscalaItem[];
  militares: string[];
  onSaveEscala: (escala: EscalaItem, andNext?: boolean) => void;
  onOpenRegisterMilitary: (initialName?: string) => void;
}

export const EscalaModal: React.FC<EscalaModalProps> = ({
  isOpen,
  onClose,
  viaturas,
  escalas,
  militares,
  onSaveEscala,
  onOpenRegisterMilitary
}) => {
  const [selectedViatura, setSelectedViatura] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'resgate' | 'incendio' | 'adm'>('todas');
  const [condutor, setCondutor] = useState<string>('');
  const [combatentes, setCombatentes] = useState<string[]>([]);
  const [militarSearch, setMilitarSearch] = useState<string>('');
  const [novoMilitarAvulso, setNovoMilitarAvulso] = useState<string>('');

  useEffect(() => {
    if (isOpen && viaturas.length > 0) {
      if (!selectedViatura || !viaturas.some(v => v.prefixo === selectedViatura)) {
        loadViatura(viaturas[0].prefixo);
      }
    }
  }, [isOpen, viaturas]);

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

  const loadViatura = (vtrNome: string) => {
    setSelectedViatura(vtrNome);
    const match = escalas.find(e => e.viatura.trim().toUpperCase() === vtrNome.trim().toUpperCase());
    if (match) {
      setCondutor(match.condutor || '');
      setCombatentes(match.equipe ? match.equipe.split(',').map(s => s.trim()).filter(Boolean) : []);
    } else {
      setCondutor('');
      setCombatentes([]);
    }
  };

  const currentVtrObj = viaturas.find(v => v.prefixo === selectedViatura);
  const catNome = (currentVtrObj?.categoria || 'GERAL').toUpperCase();

  const isResgate = catNome === 'RESGATE' || selectedViatura.startsWith('UR');
  const isIncendio = ['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(catNome) || selectedViatura.startsWith('ABT');

  const roleLabel = isResgate
    ? 'Socorristas / Auxiliares'
    : isIncendio
    ? 'Combatentes / Linhas'
    : 'Guarnição / Auxiliares';

  const handleAssignCondutor = (militarNome: string) => {
    const limpo = formatarNomeMilitarLimpo(militarNome);
    if (condutor === limpo) {
      setCondutor('');
    } else {
      setCondutor(limpo);
      setCombatentes(prev => prev.filter(m => m !== limpo));
    }
  };

  const handleToggleCombatente = (militarNome: string) => {
    const limpo = formatarNomeMilitarLimpo(militarNome);
    if (condutor === limpo) setCondutor('');
    if (combatentes.includes(limpo)) {
      setCombatentes(prev => prev.filter(m => m !== limpo));
    } else {
      setCombatentes(prev => [...prev, limpo]);
    }
  };

  const handleSave = (andNext = false) => {
    if (!selectedViatura) return;
    onSaveEscala(
      {
        viatura: selectedViatura,
        condutor: condutor.trim(),
        equipe: combatentes.join(', ').trim()
      },
      andNext
    );

    if (andNext) {
      const idx = viaturas.findIndex(v => v.prefixo === selectedViatura);
      const nextIdx = (idx + 1) % viaturas.length;
      loadViatura(viaturas[nextIdx].prefixo);
    }
  };

  const filteredViaturasStrip = viaturas.filter(v => {
    const c = (v.categoria || '').toUpperCase();
    if (categoriaFiltro === 'resgate') return c === 'RESGATE' || v.prefixo.startsWith('UR');
    if (categoriaFiltro === 'incendio') return ['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(c) || v.prefixo.startsWith('ABT');
    if (categoriaFiltro === 'adm') return c !== 'RESGATE' && !['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(c) && !v.prefixo.startsWith('UR') && !v.prefixo.startsWith('ABT');
    return true;
  });

  const filteredMilitares = militares.filter(m =>
    m.toLowerCase().includes(militarSearch.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 overflow-y-auto flex justify-center items-start">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2.5 font-black text-sm">
            <span className="material-symbols-outlined text-amber-400">badge</span>
            <span>Escala Diária de Guarnições • CBMGO (Salva no Banco de Dados)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Step 1: Vehicle Strip */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-700" />
                <span>1. Selecione a Viatura da Frota para Escalar:</span>
              </div>

              {/* Category chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('todas')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    categoriaFiltro === 'todas'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('resgate')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    categoriaFiltro === 'resgate'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  🚑 Resgate
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('incendio')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    categoriaFiltro === 'incendio'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  🚒 Incêndio
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaFiltro('adm')}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    categoriaFiltro === 'adm'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  🚙 Apoio / Adm
                </button>
              </div>
            </div>

            {/* Horizontal pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filteredViaturasStrip.map(v => {
                const isSelected = selectedViatura === v.prefixo;
                const match = escalas.find(e => e.viatura.trim().toUpperCase() === v.prefixo.trim().toUpperCase());
                const temCondutor = Boolean(match?.condutor);
                const qtdEquipe = match?.equipe ? match.equipe.split(',').filter(Boolean).length : 0;

                let badgeLabel = 'Sem Escala';
                let badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                if (temCondutor && qtdEquipe > 0) {
                  badgeLabel = `Completa (${1 + qtdEquipe} mil.)`;
                  badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                } else if (temCondutor || qtdEquipe > 0) {
                  badgeLabel = temCondutor ? 'Só Condutor' : `${qtdEquipe} Equipe`;
                  badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                }

                return (
                  <button
                    key={v.prefixo}
                    type="button"
                    onClick={() => loadViatura(v.prefixo)}
                    className={`flex flex-col text-left px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-extrabold text-xs">{v.prefixo}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${badgeStyle}`}>
                      {badgeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Main Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Left 3 cols: Selected Vehicle slots */}
            <div className="lg:col-span-3 flex flex-col gap-3.5">
              {/* Banner */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 leading-tight">{selectedViatura}</div>
                    <div className="text-[11px] text-slate-500 font-bold uppercase">{catNome}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {currentVtrObj?.status || 'DISPONÍVEL'}
                </span>
              </div>

              {/* Slot Condutor */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 border-l-4 border-l-blue-600 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-900">
                    <span>Condutor da Viatura</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                      1 Militar
                    </span>
                  </div>
                  {condutor && (
                    <button
                      type="button"
                      onClick={() => setCondutor('')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                    >
                      × Remover
                    </button>
                  )}
                </div>

                {condutor ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-bold text-xs text-blue-900">{condutor}</span>
                    <button
                      type="button"
                      onClick={() => setCondutor('')}
                      className="text-slate-400 hover:text-rose-700 font-bold text-sm"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    Nenhum condutor definido. <strong>Clique em [🚗 Condutor]</strong> na lista ao lado.
                  </div>
                )}
              </div>

              {/* Slot Guarnição / Combatentes */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 border-l-4 border-l-red-700 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-900">
                    <span>{roleLabel}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                      {combatentes.length} Militar(es)
                    </span>
                  </div>
                  {combatentes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCombatentes([])}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                    >
                      × Limpar Todos
                    </button>
                  )}
                </div>

                {combatentes.length === 0 ? (
                  <div className="p-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    Nenhum militar na equipe. <strong>Clique em [+ Equipe]</strong> na lista ao lado.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {combatentes.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        <span className="font-bold text-xs text-emerald-900">{m}</span>
                        <button
                          type="button"
                          onClick={() => setCombatentes(prev => prev.filter(item => item !== m))}
                          className="text-slate-400 hover:text-rose-700 font-bold text-sm"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Gravar Escala no BD</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Salvar e avançar para próxima viatura"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Próxima Vtr</span>
                </button>
              </div>
            </div>

            {/* Right 2 cols: Military Roster */}
            <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700">
                  2. Banco de Militares (1 Clique para Escalar):
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={militarSearch}
                  onChange={e => setMilitarSearch(e.target.value)}
                  placeholder="Filtrar por nome ou graduação..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Roster list */}
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                {filteredMilitares.map(m => {
                  const isCond = condutor === m;
                  const isComb = combatentes.includes(m);

                  return (
                    <div
                      key={m}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="font-bold text-slate-800">{m}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAssignCondutor(m)}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                            isCond
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isCond ? '✓ Condutor' : '🚗 Condutor'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCombatente(m)}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                            isComb
                              ? 'bg-red-700 text-white border-red-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isComb ? '✓ Na Equipe' : '+ Equipe'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fast registration */}
              <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-600">Militar Novo na OBM?</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={novoMilitarAvulso}
                    onChange={e => setNovoMilitarAvulso(e.target.value)}
                    placeholder="Ex: Cb Souza..."
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRegisterMilitary(novoMilitarAvulso);
                      setNovoMilitarAvulso('');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Summary Cards - Apenas viaturas cadastradas */}
          <div className="pt-3 border-t border-slate-200">
            <div className="text-xs font-black uppercase text-slate-700 mb-2.5">
              3. Quadro Geral das Escalas ({viaturas.length} Viaturas Cadastradas)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto">
              {viaturas.map(vtr => {
                const esc = escalas.find(e => e.viatura.trim().toUpperCase() === vtr.prefixo.trim().toUpperCase());
                const isSelected = selectedViatura === vtr.prefixo;
                const condutorNome = esc?.condutor || '';
                const equipeNomes = esc?.equipe || '';
                return (
                  <button
                    key={vtr.prefixo}
                    type="button"
                    onClick={() => loadViatura(vtr.prefixo)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900">{vtr.prefixo}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        condutorNome
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {condutorNome ? 'Escalado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-blue-700 truncate">
                      🚗 {condutorNome || 'Sem Condutor'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      🧑‍🚒 {equipeNomes || 'Sem equipe'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
