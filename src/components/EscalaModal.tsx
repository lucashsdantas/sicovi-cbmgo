import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EscalaItem, ViaturaItem } from '../types/sicovi';
import {
  X,
  Save,
  SkipForward,
  Car,
  UserPlus,
  Search,
  Check,
  AlertTriangle,
  CheckCheck,
  ShieldAlert
} from 'lucide-react';
import { formatarNomeMilitarLimpo } from '../services/storageService';
import { soundEffects } from '../utils/soundEffects';

interface EscalaRascunho {
  condutor: string;
  combatentes: string[];
  modificado: boolean;
}

interface EscalaModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaturas: ViaturaItem[];
  escalas: EscalaItem[];
  militares: string[];
  onSaveEscala: (escala: EscalaItem, andNext?: boolean) => void;
  onSaveMultipleEscalas?: (escalas: EscalaItem[]) => void;
  onOpenRegisterMilitary: (initialName?: string) => void;
}

export const EscalaModal: React.FC<EscalaModalProps> = ({
  isOpen,
  onClose,
  viaturas,
  escalas,
  militares,
  onSaveEscala,
  onSaveMultipleEscalas,
  onOpenRegisterMilitary
}) => {
  const [selectedViatura, setSelectedViatura] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'resgate' | 'incendio' | 'adm'>('todas');
  const [militarSearch, setMilitarSearch] = useState<string>('');
  const [novoMilitarAvulso, setNovoMilitarAvulso] = useState<string>('');
  const [rascunhos, setRascunhos] = useState<Record<string, EscalaRascunho>>({});
  const [confirmarSaidaOpen, setConfirmarSaidaOpen] = useState(false);
  const [feedbackSalvo, setFeedbackSalvo] = useState<{ visivel: boolean; mensagem: string }>({
    visivel: false,
    mensagem: ''
  });

  // Todas as viaturas ordenadas estritamente em ordem alfabética por prefixo
  const viaturasOrdenadas = useMemo(() => {
    return [...viaturas].sort((a, b) =>
      a.prefixo.localeCompare(b.prefixo, 'pt-BR', { numeric: true, sensitivity: 'base' })
    );
  }, [viaturas]);

  // Inicializa o mapa de rascunhos quando o modal é aberto
  const prevIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      const mapa: Record<string, EscalaRascunho> = {};
      viaturasOrdenadas.forEach(v => {
        const vPref = v.prefixo.trim().toUpperCase();
        const match = escalas.find(e => e.viatura.trim().toUpperCase() === vPref);
        mapa[v.prefixo] = {
          condutor: match?.condutor ? formatarNomeMilitarLimpo(match.condutor) : '',
          combatentes: match?.equipe
            ? match.equipe
                .split(',')
                .map(s => formatarNomeMilitarLimpo(s.trim()))
                .filter(Boolean)
            : [],
          modificado: false
        };
      });
      setRascunhos(mapa);
      setConfirmarSaidaOpen(false);
      setFeedbackSalvo({ visivel: false, mensagem: '' });

      if (viaturasOrdenadas.length > 0) {
        setSelectedViatura(viaturasOrdenadas[0].prefixo);
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, viaturasOrdenadas, escalas]);

  // Lista de viaturas com alterações não salvas
  const viaturasModificadas = useMemo(() => {
    return Object.entries(rascunhos)
      .filter(([_, r]) => r.modificado)
      .map(([prefixo, r]) => ({ prefixo, ...r }));
  }, [rascunhos]);

  // Apenas viaturas escaladas (com condutor e/ou combatentes na equipe)
  const viaturasEscaladas = useMemo(() => {
    return viaturasOrdenadas.filter(vtr => {
      const rasc = rascunhos[vtr.prefixo];
      const temCondutor = Boolean(rasc?.condutor && rasc.condutor.trim());
      const temEquipe = Boolean(rasc?.combatentes && rasc.combatentes.length > 0);
      return temCondutor || temEquipe;
    });
  }, [viaturasOrdenadas, rascunhos]);

  const hasUnsavedChanges = viaturasModificadas.length > 0;

  // Tentativa de fechar: só fecha direto se não houver alterações pendentes
  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setConfirmarSaidaOpen(true);
    } else {
      onClose();
    }
  };

  // O modal só pode ser fechado clicando no ícone de fechar (X) ou apertando ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmarSaidaOpen) {
          setConfirmarSaidaOpen(false);
        } else {
          handleAttemptClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasUnsavedChanges, confirmarSaidaOpen]);

  if (!isOpen) return null;

  // Viatura atualmente selecionada e seus dados
  const currentVtrObj = viaturasOrdenadas.find(v => v.prefixo === selectedViatura) || viaturasOrdenadas[0];
  const rascunhoAtual = rascunhos[selectedViatura] || {
    condutor: '',
    combatentes: [],
    modificado: false
  };
  const condutor = rascunhoAtual.condutor;
  const combatentes = rascunhoAtual.combatentes;

  const catNome = (currentVtrObj?.categoria || 'GERAL').toUpperCase();
  const isResgate = catNome === 'RESGATE' || selectedViatura.startsWith('UR');
  const isIncendio =
    ['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(catNome) ||
    selectedViatura.startsWith('ABT');

  const roleLabel = isResgate
    ? 'Socorristas / Auxiliares'
    : isIncendio
    ? 'Combatentes / Linhas'
    : 'Guarnição / Auxiliares';

  // Atribuir ou remover condutor na viatura ativa
  const handleAssignCondutor = (militarNome: string) => {
    if (!selectedViatura) return;
    const limpo = formatarNomeMilitarLimpo(militarNome);
    setRascunhos(prev => {
      const atual = prev[selectedViatura] || { condutor: '', combatentes: [], modificado: false };
      const novoCondutor = atual.condutor === limpo ? '' : limpo;
      const novosCombatentes = atual.combatentes.filter(m => m !== limpo);
      return {
        ...prev,
        [selectedViatura]: {
          condutor: novoCondutor,
          combatentes: novosCombatentes,
          modificado: true
        }
      };
    });
    setFeedbackSalvo({ visivel: false, mensagem: '' });
  };

  // Alternar militar na equipe/guarnição da viatura ativa
  const handleToggleCombatente = (militarNome: string) => {
    if (!selectedViatura) return;
    const limpo = formatarNomeMilitarLimpo(militarNome);
    setRascunhos(prev => {
      const atual = prev[selectedViatura] || { condutor: '', combatentes: [], modificado: false };
      let novoCondutor = atual.condutor;
      if (novoCondutor === limpo) novoCondutor = '';
      let novosCombatentes = [...atual.combatentes];
      if (novosCombatentes.includes(limpo)) {
        novosCombatentes = novosCombatentes.filter(item => item !== limpo);
      } else {
        novosCombatentes.push(limpo);
      }
      return {
        ...prev,
        [selectedViatura]: {
          condutor: novoCondutor,
          combatentes: novosCombatentes,
          modificado: true
        }
      };
    });
    setFeedbackSalvo({ visivel: false, mensagem: '' });
  };

  // Salvar TODAS as viaturas escaladas / modificadas de uma só vez
  // IMPORTANTE: Não fecha o modal após o usuário clicar em salvar
  const handleGravarTodasEscalas = () => {
    const alvos =
      viaturasModificadas.length > 0
        ? viaturasModificadas
        : selectedViatura
        ? [{ prefixo: selectedViatura, ...rascunhoAtual }]
        : [];

    if (alvos.length === 0) return;

    const listaParaGravar: EscalaItem[] = alvos.map(item => ({
      viatura: item.prefixo,
      condutor: item.condutor.trim(),
      equipe: item.combatentes.join(', ').trim()
    }));

    if (onSaveMultipleEscalas) {
      onSaveMultipleEscalas(listaParaGravar);
    } else {
      listaParaGravar.forEach(item => onSaveEscala(item, false));
    }

    soundEffects.playSuccess();

    // Marca todas as viaturas gravadas como não modificadas no rascunho
    setRascunhos(prev => {
      const next = { ...prev };
      alvos.forEach(item => {
        if (next[item.prefixo]) {
          next[item.prefixo] = { ...next[item.prefixo], modificado: false };
        }
      });
      return next;
    });

    const nomes = alvos.map(a => a.prefixo).join(', ');
    setFeedbackSalvo({
      visivel: true,
      mensagem: `Escalas de ${alvos.length} viatura(s) (${nomes}) gravadas com sucesso no banco de dados!`
    });
  };

  // Salvar viatura atual (e opcionalmente avançar para a próxima)
  // IMPORTANTE: Não fecha o modal após o usuário clicar em salvar
  const handleGravarViaturaAtual = (andNext = false) => {
    if (!selectedViatura) return;
    const escalaItem: EscalaItem = {
      viatura: selectedViatura,
      condutor: rascunhoAtual.condutor.trim(),
      equipe: rascunhoAtual.combatentes.join(', ').trim()
    };

    onSaveEscala(escalaItem, false);
    soundEffects.playSuccess();

    setRascunhos(prev => ({
      ...prev,
      [selectedViatura]: { ...rascunhoAtual, modificado: false }
    }));

    setFeedbackSalvo({
      visivel: true,
      mensagem: `Escala da viatura ${selectedViatura} gravada com sucesso no banco de dados!`
    });

    if (andNext) {
      const idx = filteredViaturasStrip.findIndex(v => v.prefixo === selectedViatura);
      const nextIdx = (idx + 1) % filteredViaturasStrip.length;
      setSelectedViatura(filteredViaturasStrip[nextIdx]?.prefixo || selectedViatura);
    }
  };

  // Filtragem das viaturas para a barra superior
  const filteredViaturasStrip = viaturasOrdenadas.filter(v => {
    const c = (v.categoria || '').toUpperCase();
    if (categoriaFiltro === 'resgate') return c === 'RESGATE' || v.prefixo.startsWith('UR');
    if (categoriaFiltro === 'incendio')
      return (
        ['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(c) ||
        v.prefixo.startsWith('ABT')
      );
    if (categoriaFiltro === 'adm')
      return (
        c !== 'RESGATE' &&
        !['INCÊNDIO', 'INCENDIO', 'SALVAMENTO', 'INCÊNDIO/SALVAMENTO'].includes(c) &&
        !v.prefixo.startsWith('UR') &&
        !v.prefixo.startsWith('ABT')
      );
    return true;
  });

  // Lista de militares com filtro de busca (ordem estrita de antiguidade/cadastro preservada)
  const filteredMilitares = militares.filter(m =>
    m.toLowerCase().includes(militarSearch.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs p-4 overflow-y-auto flex justify-center items-start">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden border border-slate-200 flex flex-col">
        {/* ========================================================== */}
        {/* HEADER DO MODAL (Com ícone X explícito de fechar)          */}
        {/* ========================================================== */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2.5 font-black text-sm">
            <span className="material-symbols-outlined text-amber-400">badge</span>
            <span>Escala Diária de Guarnições • CBMGO (Salva no Banco de Dados)</span>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            title="Fechar tela de escala (ou pressione Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================== */}
        {/* BARRA DE AVISOS E STATUS DE GRAVAÇÃO                       */}
        {/* ========================================================== */}
        {hasUnsavedChanges && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>
                Você possui escala editada em{' '}
                <strong className="underline text-amber-900">
                  {viaturasModificadas.length} viatura(s)
                </strong>{' '}
                pronta para gravar no banco de dados.
              </span>
            </div>
            <button
              type="button"
              onClick={handleGravarTodasEscalas}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Gravar Todas as {viaturasModificadas.length} Viaturas no BD</span>
            </button>
          </div>
        )}

        {feedbackSalvo.visivel && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>{feedbackSalvo.mensagem}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackSalvo({ visivel: false, mensagem: '' })}
              className="text-emerald-700 hover:text-emerald-950 font-black text-sm px-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* CORPO DO MODAL                                             */}
        {/* ========================================================== */}
        <div className="p-6 flex flex-col gap-5 flex-1">
          {/* PASSO 1: FAIXA HORIZONTAL DE VIATURAS (Ordem Alfabética) */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-700" />
                <span>1. Selecione as Viaturas para Escalar (Ordem Alfabética):</span>
              </div>

              {/* Filtros de Categoria */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'todas', label: 'Todas' },
                    { id: 'resgate', label: '🚑 Resgate' },
                    { id: 'incendio', label: '🚒 Incêndio' },
                    { id: 'adm', label: '🚙 Apoio / Adm' }
                  ] as const
                ).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      categoriaFiltro === cat.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Carrossel de botões de viaturas em ordem alfabética */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {filteredViaturasStrip.map(v => {
                const isSelected = selectedViatura === v.prefixo;
                const rasc = rascunhos[v.prefixo];
                const temCondutor = Boolean(rasc?.condutor);
                const qtdEquipe = rasc?.combatentes ? rasc.combatentes.length : 0;
                const isModificado = rasc?.modificado;

                let badgeLabel = 'Sem Escala';
                let badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';

                if (isModificado) {
                  badgeLabel = `● Alterado (${temCondutor ? '1 Cond' : 'Sem Cond'}${
                    qtdEquipe > 0 ? ` + ${qtdEquipe}` : ''
                  })`;
                  badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
                } else if (temCondutor && qtdEquipe > 0) {
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
                    onClick={() => setSelectedViatura(v.prefixo)}
                    className={`flex flex-col text-left px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                        : isModificado
                        ? 'bg-amber-50/60 border-amber-400 text-slate-800'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs">{v.prefixo}</span>
                      {isModificado && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${badgeStyle}`}
                    >
                      {badgeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASSO 2: ÁREA DE TRABALHO DA VIATURA ATIVA + BANCO DE MILITARES */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Coluna Esquerda (3 colunas): Viatura Selecionada */}
            <div className="lg:col-span-3 flex flex-col gap-3.5">
              {/* Banner da Viatura Ativa */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 leading-tight">
                      {selectedViatura}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold uppercase">
                      {catNome} &bull; Ordem Alfabética
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rascunhoAtual.modificado && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                      ● Não Gravado
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {currentVtrObj?.status || 'DISPONÍVEL'}
                  </span>
                </div>
              </div>

              {/* Slot Condutor */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 border-l-4 border-l-blue-600 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-900">
                    <span>Condutor da Viatura</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                      {condutor ? '1 Militar Definido' : 'Pendente'}
                    </span>
                  </div>
                  {condutor && (
                    <button
                      type="button"
                      onClick={() => handleAssignCondutor(condutor)}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      &times; Remover
                    </button>
                  )}
                </div>

                {condutor ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="font-black text-xs text-blue-900">{condutor}</span>
                    <button
                      type="button"
                      onClick={() => handleAssignCondutor(condutor)}
                      className="text-slate-400 hover:text-rose-700 font-bold text-sm px-1 cursor-pointer"
                      title="Remover condutor"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    Nenhum condutor definido. <strong>Clique em [🚗 Condutor]</strong> na lista ao
                    lado para atribuir.
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
                      onClick={() => {
                        setRascunhos(prev => ({
                          ...prev,
                          [selectedViatura]: {
                            ...(prev[selectedViatura] || { condutor: '', combatentes: [] }),
                            combatentes: [],
                            modificado: true
                          }
                        }));
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      &times; Limpar Todos
                    </button>
                  )}
                </div>

                {combatentes.length === 0 ? (
                  <div className="p-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400">
                    Nenhum militar na equipe.{' '}
                    <strong>Clique em [+ Equipe]</strong> na lista ao lado para adicionar.
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
                          onClick={() => handleToggleCombatente(m)}
                          className="text-slate-400 hover:text-rose-700 font-bold text-sm px-1 cursor-pointer"
                          title="Remover militar da equipe"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de Gravação: Não fecha o modal após o usuário clicar em salvar */}
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleGravarTodasEscalas}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer border border-amber-500/60"
                  title="Grava todas as viaturas com escala modificada de uma só vez"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>
                    {viaturasModificadas.length > 1
                      ? `Gravar Todas as ${viaturasModificadas.length} Viaturas Alteradas`
                      : `Gravar Escala no BD`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGravarViaturaAtual(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98"
                  title="Salvar escala da viatura atual e avançar para a próxima"
                >
                  <SkipForward className="w-4 h-4 text-slate-500" />
                  <span>Salvar e Próxima Vtr</span>
                </button>
              </div>
            </div>

            {/* Coluna Direita (2 colunas): Relação de Militares por Antiguidade */}
            <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700">
                  2. Banco de Militares (Antiguidade):
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {filteredMilitares.length} de {militares.length}
                </span>
              </div>

              {/* Campo de Busca Rápida */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={militarSearch}
                  onChange={e => setMilitarSearch(e.target.value)}
                  placeholder="Filtrar por nome ou graduação..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Lista de Militares com Botões Rápidos */}
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                {filteredMilitares.map(m => {
                  const isCond = condutor === m;
                  const isComb = combatentes.includes(m);

                  return (
                    <div
                      key={m}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs hover:border-slate-300 transition-colors"
                    >
                      <span className="font-bold text-slate-800 truncate mr-2">{m}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAssignCondutor(m)}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                            isCond
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isCond ? '✓ Condutor' : '🚗 Condutor'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCombatente(m)}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                            isComb
                              ? 'bg-red-700 text-white border-red-700 shadow-xs'
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

              {/* Cadastro Rápido de Militar Novo */}
              <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-600">Militar Novo na OBM?</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={novoMilitarAvulso}
                    onChange={e => setNovoMilitarAvulso(e.target.value)}
                    placeholder="Ex: Cb Souza..."
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (novoMilitarAvulso.trim()) {
                        onOpenRegisterMilitary(novoMilitarAvulso);
                        setNovoMilitarAvulso('');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PASSO 3: QUADRO GERAL DAS ESCALAS (Apenas Viaturas Escaladas) */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-black uppercase text-slate-700">
                3. Quadro Geral das Escalas ({viaturasEscaladas.length} Viatura{viaturasEscaladas.length === 1 ? '' : 's'} Escalada{viaturasEscaladas.length === 1 ? '' : 's'})
              </div>
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleGravarTodasEscalas}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Gravar todas as {viaturasModificadas.length} alteradas</span>
                </button>
              )}
            </div>

            {viaturasEscaladas.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 font-medium">
                Nenhuma viatura escalada com motorista ou equipe no momento. Selecione uma viatura acima para definir o condutor e a equipe da guarnição.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {viaturasEscaladas.map(vtr => {
                  const rasc = rascunhos[vtr.prefixo];
                  const isSelected = selectedViatura === vtr.prefixo;
                  const condutorNome = rasc?.condutor || '';
                  const equipeNomes = rasc?.combatentes ? rasc.combatentes.join(', ') : '';
                  const isModificado = rasc?.modificado;

                  return (
                    <button
                      key={vtr.prefixo}
                      type="button"
                      onClick={() => setSelectedViatura(vtr.prefixo)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 shadow-xs ring-2 ring-amber-400/40'
                          : isModificado
                          ? 'bg-amber-50/30 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900">{vtr.prefixo}</span>
                          {isModificado && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-500"
                              title="Alteração pendente de gravação"
                            />
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isModificado
                              ? 'bg-amber-100 text-amber-900 font-black'
                              : condutorNome
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isModificado ? 'Pendente' : condutorNome ? 'Escalado' : 'Equipe'}
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
            )}
          </div>
        </div>

        {/* ========================================================== */}
        {/* MODAL DE CONFIRMAÇÃO CASO O MILITAR TENTE SAIR SEM SALVAR  */}
        {/* ========================================================== */}
        {confirmarSaidaOpen && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-500 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Alterações Não Salvas na Escala
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Você modificou a escala de{' '}
                    <strong>{viaturasModificadas.length} viatura(s)</strong> que ainda não foram
                    gravadas no banco de dados.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold leading-relaxed">
                Viaturas com alterações pendentes:{' '}
                <span className="font-extrabold underline">
                  {viaturasModificadas.map(v => v.prefixo).join(', ')}
                </span>
                .<br />
                Se você fechar a tela agora, essas alterações serão descartadas.
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmarSaidaOpen(false)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleGravarTodasEscalas();
                    setConfirmarSaidaOpen(false);
                    onClose();
                  }}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs text-center"
                >
                  Salvar e Sair
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmarSaidaOpen(false);
                    onClose();
                  }}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs text-center"
                >
                  Sair sem Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
