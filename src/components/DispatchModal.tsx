import React, { useState, useEffect } from 'react';
import { RegistroDespacho, ViaturaApoioItem } from '../types/sicovi';
import { formatarIsoParaInputLocal, getAgoraBrasilia, storageService } from '../services/storageService';
import { X, Save, Search, Users, PlusCircle, Trash2, Gauge, PlaneTakeoff, PlaneLanding, ShieldAlert } from 'lucide-react';
import { SystemAlertModal, AlertModalType } from './SystemAlertModal';
import { MilitarySelectorModal } from './MilitarySelectorModal';
import { soundEffects } from '../utils/soundEffects';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  registroEmEdicao: RegistroDespacho | null;
  onSave: (principal: Partial<RegistroDespacho>, apoios: ViaturaApoioItem[]) => void;
  viaturasLista: string[];
  militaresLista: string[];
  bairrosLista: string[];
  destinosLista: string[];
  operadorAtual: string;
  onOpenMilitaryPicker: (targetField: string) => void;
  onOpenVehiclePicker: (targetField: string) => void;
  onOpenSupportSelector: () => void;
  viaturasApoio: ViaturaApoioItem[];
  onRemoveViaturaApoio: (index: number) => void;
  onUpdateViaturaApoio: (index: number, campo: keyof ViaturaApoioItem, valor: any) => void;
  onAutoFillFromViatura: (viaturaPrefixo: string) => { condutor: string; equipe: string; ultimoKm: number | null };
  onOpenMilitaryRegister?: () => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  registroEmEdicao,
  onSave,
  viaturasLista,
  militaresLista,
  bairrosLista,
  destinosLista,
  operadorAtual,
  onOpenMilitaryPicker,
  onOpenVehiclePicker,
  onOpenSupportSelector,
  viaturasApoio,
  onRemoveViaturaApoio,
  onUpdateViaturaApoio,
  onAutoFillFromViatura,
  onOpenMilitaryRegister
}) => {
  const [viatura, setViatura] = useState('');
  const [condutor, setCondutor] = useState('');
  const [equipe, setEquipe] = useState('');
  const [destino, setDestino] = useState('');
  const [bairro, setBairro] = useState('');
  const [rai, setRai] = useState('');
  const [natureza, setNatureza] = useState('');
  const [naturezasHistorico, setNaturezasHistorico] = useState<string[]>([]);
  const [saida, setSaida] = useState('');
  const [kmSaida, setKmSaida] = useState<string | number>('');
  const [chegada, setChegada] = useState('');
  const [kmChegada, setKmChegada] = useState<string | number>('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: AlertModalType;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const kmChegadaInputRef = React.useRef<HTMLInputElement>(null);

  // Direct Military Selector Modal state inside DispatchModal for instant field updates
  const [isMilitaryPickerOpen, setIsMilitaryPickerOpen] = useState(false);
  const [militaryPickerTarget, setMilitaryPickerTarget] = useState<string>('condutor');
  const [militaryPickerInitialVal, setMilitaryPickerInitialVal] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setNaturezasHistorico(storageService.getNaturezasHistorico());
      if (registroEmEdicao) {
        const vtrNome = registroEmEdicao.viatura || '';
        setViatura(vtrNome);

        // Se for acionamento direto via clique na viatura disponível (id: 'PENDENTE' sem data salva):
        if (registroEmEdicao.id === 'PENDENTE' && (!registroEmEdicao.saida || registroEmEdicao.saida === '')) {
          const fuso = formatarIsoParaInputLocal(getAgoraBrasilia());
          setSaida(fuso);

          const info = onAutoFillFromViatura(vtrNome);
          setCondutor(registroEmEdicao.condutor || info.condutor || '');
          setEquipe(registroEmEdicao.equipe || info.equipe || '');
          setDestino(registroEmEdicao.destino || '');
          setBairro(registroEmEdicao.bairro || '');
          setRai(registroEmEdicao.rai || '');
          setNatureza(registroEmEdicao.natureza || '');
          setKmSaida(info.ultimoKm !== null && info.ultimoKm !== undefined ? info.ultimoKm : '');
          setChegada('');
          setKmChegada('');
        } else {
          // Edição de registro já em andamento ou fechamento de retorno
          setCondutor(registroEmEdicao.condutor || '');
          setEquipe(registroEmEdicao.equipe || '');
          setDestino(registroEmEdicao.destino || '');
          setBairro(registroEmEdicao.bairro || '');
          setRai(registroEmEdicao.rai || '');
          setNatureza(registroEmEdicao.natureza || '');
          setSaida(formatarIsoParaInputLocal(registroEmEdicao.saida));
          setKmSaida(registroEmEdicao.kmSaida !== undefined ? registroEmEdicao.kmSaida : '');

          // Caso a viatura esteja fora da OBM (sem chegada registrada), preenche automaticamente a data/hora atual:
          const estaFora = !registroEmEdicao.chegada || String(registroEmEdicao.chegada).trim() === '' || String(registroEmEdicao.chegada).toUpperCase() === 'EM ABERTO';
          if (estaFora) {
            const fuso = formatarIsoParaInputLocal(getAgoraBrasilia());
            setChegada(fuso);
            setKmChegada('');
            setTimeout(() => {
              kmChegadaInputRef.current?.focus();
            }, 150);
          } else {
            setChegada(formatarIsoParaInputLocal(registroEmEdicao.chegada));
            setKmChegada(registroEmEdicao.kmChegada !== undefined ? registroEmEdicao.kmChegada : '');
          }
        }
      } else {
        // Novo Despacho
        const fuso = formatarIsoParaInputLocal(getAgoraBrasilia());
        setViatura('');
        setCondutor('');
        setEquipe('');
        setDestino('');
        setBairro('');
        setRai('');
        setNatureza('');
        setSaida(fuso);
        setKmSaida('');
        setChegada('');
        setKmChegada('');
      }
    }
  }, [isOpen, registroEmEdicao]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (alertModal.isOpen) {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
        } else if (isMilitaryPickerOpen) {
          setIsMilitaryPickerOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, alertModal.isOpen, isMilitaryPickerOpen, onClose]);

  if (!isOpen) return null;

  const handleViaturaChange = (newVtr: string) => {
    setViatura(newVtr);
    setErrors(prev => ({ ...prev, viatura: false }));
    if (newVtr.trim()) {
      const info = onAutoFillFromViatura(newVtr.trim());
      if (info.condutor) setCondutor(info.condutor);
      if (info.equipe) setEquipe(info.equipe);
      if (info.ultimoKm !== null && info.ultimoKm !== undefined) {
        setKmSaida(info.ultimoKm);
      }
    }
  };

  const handleFillNowChegada = () => {
    const fuso = formatarIsoParaInputLocal(getAgoraBrasilia());
    setChegada(fuso);
    setErrors(prev => ({ ...prev, chegada: false }));
  };

  const handleOpenPickerForCondutor = () => {
    setMilitaryPickerTarget('condutor');
    setMilitaryPickerInitialVal(condutor);
    setIsMilitaryPickerOpen(true);
  };

  const handleOpenPickerForEquipe = () => {
    setMilitaryPickerTarget('equipe');
    setMilitaryPickerInitialVal(equipe);
    setIsMilitaryPickerOpen(true);
  };

  const handleOpenPickerForApoio = (field: string, initialVal: string) => {
    setMilitaryPickerTarget(field);
    setMilitaryPickerInitialVal(initialVal);
    setIsMilitaryPickerOpen(true);
  };

  const handleMilitaryConfirm = (target: string, value: string) => {
    if (target === 'condutor') {
      setCondutor(value);
      setErrors(prev => ({ ...prev, condutor: false }));
    } else if (target === 'equipe') {
      setEquipe(value);
    } else if (target.startsWith('apoio-condutor-')) {
      const idx = parseInt(target.replace('apoio-condutor-', ''), 10);
      if (!isNaN(idx)) onUpdateViaturaApoio(idx, 'condutor', value);
    } else if (target.startsWith('apoio-equipe-')) {
      const idx = parseInt(target.replace('apoio-equipe-', ''), 10);
      if (!isNaN(idx)) onUpdateViaturaApoio(idx, 'equipe', value);
    }
    setIsMilitaryPickerOpen(false);
  };

  const applyPresetDestino = (preset: string) => {
    setDestino(preset);
    setErrors(prev => ({ ...prev, destino: false }));
    if (preset === 'Abastecimento' && !natureza) setNatureza('Abastecimento de Combustível');
    else if (preset === 'A serviço da OBM' && !natureza) setNatureza('Serviço Administrativo / OBM');
  };

  const calculateDistance = () => {
    const ks = Number(kmSaida);
    const kc = Number(kmChegada);
    if (!isNaN(ks) && !isNaN(kc) && kc > ks) {
      return kc - ks;
    }
    return null;
  };

  const distance = calculateDistance();

  const executeSave = () => {
    const temChegada = Boolean(chegada && chegada.trim() !== '');
    if (temChegada) {
      soundEffects.playArrival();
    } else {
      soundEffects.playDeparture();
    }

    onSave(
      {
        id: registroEmEdicao ? registroEmEdicao.id : 'PENDENTE',
        viatura: viatura.trim().toUpperCase(),
        condutor: condutor.trim(),
        equipe: equipe.trim(),
        destino: destino.trim(),
        bairro: bairro.trim(),
        rai: rai.trim(),
        natureza: natureza.trim(),
        saida: saida,
        kmSaida: Number(kmSaida),
        chegada: chegada,
        kmChegada: kmChegada !== '' ? Number(kmChegada) : '',
        operador: operadorAtual
      },
      !registroEmEdicao ? viaturasApoio : []
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};

    if (!viatura.trim()) newErrors.viatura = true;
    if (!condutor.trim()) newErrors.condutor = true;
    if (!destino.trim()) newErrors.destino = true;
    if (!saida) newErrors.saida = true;
    if (kmSaida === '' || isNaN(Number(kmSaida))) newErrors.kmSaida = true;

    const temChegada = Boolean(chegada && chegada.trim() !== '');
    const temKmChegada = Boolean(kmChegada !== '' && !isNaN(Number(kmChegada)));

    // Validação estrita: Não é permitido fechar/salvar uma chegada apenas com o KM ou apenas com a Data/Hora
    if (temChegada || temKmChegada) {
      if (!temChegada || !temKmChegada) {
        if (!temChegada) {
          newErrors.chegada = true;
          setAlertModal({
            isOpen: true,
            title: 'Chegada Incompleta',
            message: 'Atenção: Não é permitido salvar a chegada incompleta. É obrigatório informar a Data e Hora de Chegada junto com o KM.',
            type: 'warning'
          });
        }
        if (!temKmChegada) {
          newErrors.kmChegada = true;
          setAlertModal({
            isOpen: true,
            title: 'Chegada Incompleta',
            message: 'Atenção: Não é permitido salvar a chegada incompleta. É obrigatório informar o KM de Chegada (Odômetro final) junto com o horário.',
            type: 'warning'
          });
        }
        setErrors(newErrors);
        return;
      }

      const dtS = new Date(saida);
      const dtC = new Date(chegada);
      if (dtC < dtS) {
        newErrors.chegada = true;
        setAlertModal({
          isOpen: true,
          title: 'Horário Inválido',
          message: 'A data e hora de chegada não pode ser anterior à data e hora de saída.',
          type: 'warning'
        });
        setErrors(newErrors);
        return;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setAlertModal({
        isOpen: true,
        title: 'Campos Obrigatórios',
        message: 'Preencha os campos obrigatórios destacados em vermelho antes de salvar.',
        type: 'error'
      });
      return;
    }

    // Verificação de Odômetro (KM Saída e KM Chegada)
    const ks = Number(kmSaida);
    const kc = temKmChegada ? Number(kmChegada) : null;
    const info = onAutoFillFromViatura(viatura.trim());
    const ultKm = info.ultimoKm;

    let avisoOdometro: string | null = null;

    if (ultKm !== null && ultKm > 0 && !isNaN(ks)) {
      if (ks < ultKm) {
        avisoOdometro = `O KM de saída informado (${ks.toLocaleString('pt-BR')} km) é MENOR que o último KM registrado para a viatura ${viatura.toUpperCase()} (${ultKm.toLocaleString('pt-BR')} km). Confirma que o valor informado está correto?`;
      } else if (ks - ultKm > 100) {
        avisoOdometro = `O KM de saída informado (${ks.toLocaleString('pt-BR')} km) é ${ks - ultKm} km superior ao último KM registrado (${ultKm.toLocaleString('pt-BR')} km). Confirma que este valor está correto?`;
      }
    }

    if (!avisoOdometro && kc !== null && !isNaN(ks)) {
      if (kc < ks) {
        avisoOdometro = `O KM de chegada informado (${kc.toLocaleString('pt-BR')} km) é MENOR que o KM de saída (${ks.toLocaleString('pt-BR')} km). Confirma que o odômetro final está correto?`;
      } else if (kc - ks > 100) {
        avisoOdometro = `A distância percorrida registrada nesta saída (${kc - ks} km) é superior a 100 km. Confirma que o KM de chegada (${kc.toLocaleString('pt-BR')} km) está correto?`;
      }
    }

    if (avisoOdometro) {
      setAlertModal({
        isOpen: true,
        title: 'Confirmação de Odômetro',
        message: avisoOdometro,
        type: 'confirm',
        confirmText: 'Sim, confirmar valor',
        cancelText: 'Revisar Odômetro',
        onConfirm: () => {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
          executeSave();
        }
      });
      return;
    }

    executeSave();
  };

  const equipeMembros = equipe
    ? equipe
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs overflow-y-auto p-4 flex justify-center items-start">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2.5 font-black text-base">
            <span className="material-symbols-outlined text-red-500">emergency_share</span>
            <span>
              {registroEmEdicao
                ? `Edição / Retorno do Registro #${registroEmEdicao.id}`
                : 'Novo Despacho Operacional'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-5">
          {/* Section 1: Viatura e Guarnição */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-700 text-lg">directions_car</span>
              1. Identificação da Viatura e Guarnição
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
              {/* Viatura */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Viatura <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    list="datalist-viaturas"
                    value={viatura}
                    onChange={e => handleViaturaChange(e.target.value)}
                    placeholder="Ex: UR-123"
                    className={`flex-1 px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                      errors.viatura
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-300 focus:border-red-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenVehiclePicker('viatura')}
                    className="px-2.5 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-xs font-bold transition-colors"
                    title="Buscar na lista de viaturas"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                <datalist id="datalist-viaturas">
                  {viaturasLista.map(v => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>

              {/* Condutor */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Condutor da Viatura <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    list="datalist-militares"
                    value={condutor}
                    onChange={e => {
                      setCondutor(e.target.value);
                      setErrors(prev => ({ ...prev, condutor: false }));
                    }}
                    placeholder="Nome e graduação (ex: Cb Costa)..."
                    className={`flex-1 px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                      errors.condutor
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-300 focus:border-red-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleOpenPickerForCondutor}
                    className="px-2.5 py-2 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-bold transition-colors"
                    title="Buscar militar"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                <datalist id="datalist-militares">
                  {militaresLista.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Equipe / Guarnição */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Equipe / Guarnição (Combatentes e Socorristas)
                </label>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  {equipeMembros.length} Militar(es)
                </span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={equipe}
                  onChange={e => setEquipe(e.target.value)}
                  placeholder="Ex: Cb Costa, Sd Souza (ou clique em Montar Guarnição)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-red-700"
                />
                <button
                  type="button"
                  onClick={handleOpenPickerForEquipe}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                  title="Selecionar múltiplos militares"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Montar Guarnição</span>
                </button>
              </div>

              {/* Tag preview */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {equipeMembros.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <span>{m}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...equipeMembros];
                        copy.splice(idx, 1);
                        setEquipe(copy.join(', '));
                      }}
                      className="text-slate-400 hover:text-red-700 font-black text-sm"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 1.1: Viaturas Adicionais em Apoio (Comboio / Trem de Socorro) */}
          {!registroEmEdicao && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">local_shipping</span>
                  <span>Viaturas em Apoio (Acionamento Simultâneo / Comboio)</span>
                  {viaturasApoio.length > 0 && (
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                      {viaturasApoio.length} em Apoio
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onOpenSupportSelector}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Adicionar Viatura em Apoio</span>
                </button>
              </div>
              <p className="text-[11px] text-amber-800 mb-3 leading-relaxed">
                As viaturas em apoio sairão no mesmo instante e destino. Cada uma receberá seu próprio ID consecutivo e KM no banco de dados. O retorno será lançado individualmente por viatura.
              </p>

              {viaturasApoio.length === 0 ? (
                <div className="text-center py-3 bg-white/70 border border-dashed border-amber-300 rounded-lg text-xs text-amber-800">
                  Nenhuma viatura adicional em apoio. Para comboios ou ocorrências conjuntas, clique em <strong>+ Adicionar Viatura em Apoio</strong>.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {viaturasApoio.map((vA, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-amber-300 rounded-xl p-3 shadow-2xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                            {vA.viatura}
                          </span>
                          <span className="text-xs font-bold text-slate-700">Viatura Adicional #{idx + 1}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveViaturaApoio(idx)}
                          className="flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Condutor *</label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              list="datalist-militares"
                              value={vA.condutor}
                              onChange={e => onUpdateViaturaApoio(idx, 'condutor', e.target.value)}
                              placeholder="Condutor..."
                              className="flex-1 px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenPickerForApoio(`apoio-condutor-${idx}`, vA.condutor)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700"
                              title="Buscar condutor"
                            >
                              <Search className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Equipe</label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={vA.equipe}
                              onChange={e => onUpdateViaturaApoio(idx, 'equipe', e.target.value)}
                              placeholder="Guarnição..."
                              className="flex-1 px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenPickerForApoio(`apoio-equipe-${idx}`, vA.equipe)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700"
                              title="Montar guarnição"
                            >
                              <Users className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">KM Saída *</label>
                          <input
                            type="number"
                            value={vA.kmSaida}
                            onChange={e => onUpdateViaturaApoio(idx, 'kmSaida', e.target.value)}
                            placeholder="KM Odômetro"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Destino e Ocorrência */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-700 text-lg">near_me</span>
              2. Dados do Destino e Ocorrência
            </div>

            {/* Quick chips */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3 p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500">Atalhos:</span>
              <button
                type="button"
                onClick={() => applyPresetDestino('Ocorrência')}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                🚨 Ocorrência
              </button>
              <button
                type="button"
                onClick={() => applyPresetDestino('QRF')}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                ⚡ QRF
              </button>
              <button
                type="button"
                onClick={() => applyPresetDestino('Abastecimento')}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                ⛽ Abastecimento
              </button>
              <button
                type="button"
                onClick={() => applyPresetDestino('A serviço da OBM')}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                🏢 A serviço da OBM
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Destino / Local <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  list="datalist-destinos"
                  value={destino}
                  onChange={e => {
                    setDestino(e.target.value);
                    setErrors(prev => ({ ...prev, destino: false }));
                  }}
                  placeholder="Ex: Av. Anhanguera, Q. 12..."
                  className={`w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                    errors.destino
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 focus:border-red-700'
                  }`}
                />
                <datalist id="datalist-destinos">
                  {destinosLista.map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Bairro / Setor</label>
                <input
                  type="text"
                  list="datalist-bairros"
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  placeholder="Bairro ou Setor..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-red-700"
                />
                <datalist id="datalist-bairros">
                  {bairrosLista.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Número do RAI (Ocorrência) - Primeira posição conforme solicitado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Número do RAI (Ocorrência)</label>
                <input
                  type="text"
                  value={rai}
                  onChange={e => setRai(e.target.value)}
                  placeholder="Ex: 2026-123456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-red-700"
                />
              </div>

              {/* 2. Natureza da Ocorrência - Segunda posição com Histórico Integrado no Campo (Datalist) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Natureza da Ocorrência</label>
                <input
                  type="text"
                  list="datalist-naturezas"
                  value={natureza}
                  onChange={e => setNatureza(e.target.value)}
                  placeholder="Selecione ou digite (Ex: APH Clínico, Incêndio...)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-red-700 font-medium"
                />
                <datalist id="datalist-naturezas">
                  {naturezasHistorico.map(nat => (
                    <option key={nat} value={nat} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 3: Odômetro e Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Saída */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-900 uppercase">
                <PlaneTakeoff className="w-4 h-4 text-blue-700" />
                <span>Saída Operacional</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Data e Hora de Saída <span className="text-red-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={saida}
                  onChange={e => {
                    setSaida(e.target.value);
                    setErrors(prev => ({ ...prev, saida: false }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                    errors.saida
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 focus:border-red-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  KM Saída <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={kmSaida}
                  onChange={e => {
                    setKmSaida(e.target.value);
                    setErrors(prev => ({ ...prev, kmSaida: false }));
                  }}
                  placeholder="Odômetro na saída"
                  className={`w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                    errors.kmSaida
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 focus:border-red-700'
                  }`}
                />
              </div>
            </div>

            {/* Retorno / Chegada */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-900 uppercase">
                  <PlaneLanding className="w-4 h-4 text-emerald-700" />
                  <span>Retorno / Chegada</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillNowChegada}
                  className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded text-[10px] font-bold hover:bg-emerald-50"
                >
                  Preencher Agora
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Data e Hora de Chegada</label>
                <input
                  type="datetime-local"
                  value={chegada}
                  onChange={e => {
                    setChegada(e.target.value);
                    setErrors(prev => ({ ...prev, chegada: false }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                    errors.chegada
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 focus:border-red-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">KM Chegada</label>
                <input
                  ref={kmChegadaInputRef}
                  type="number"
                  value={kmChegada}
                  onChange={e => {
                    setKmChegada(e.target.value);
                    setErrors(prev => ({ ...prev, kmChegada: false }));
                  }}
                  placeholder="Odômetro no retorno"
                  className={`w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-none ${
                    errors.kmChegada
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-300 focus:border-red-700'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Distance preview pill */}
          {distance !== null && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 w-fit">
              <Gauge className="w-4 h-4 text-red-700" />
              <span>
                Distância percorrida:{' '}
                <strong className="text-emerald-700 font-black">{distance.toLocaleString('pt-BR')}</strong> km
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-600 font-medium">
              Operador em serviço: <strong className="text-slate-900">{operadorAtual}</strong>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-md shadow-red-800/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {viaturasApoio.length > 0 && !registroEmEdicao
                    ? `Salvar Acionamento (${viaturasApoio.length + 1} Viaturas)`
                    : 'Salvar no Banco de Dados'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* System Alert & Confirmation Modal */}
      <SystemAlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText={alertModal.confirmText}
        cancelText={alertModal.cancelText}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
      />

      {/* Military Selector Modal for Conductor & Team */}
      <MilitarySelectorModal
        isOpen={isMilitaryPickerOpen}
        onClose={() => setIsMilitaryPickerOpen(false)}
        onConfirm={(target, value) => handleMilitaryConfirm(target, value)}
        targetField={militaryPickerTarget}
        initialValue={militaryPickerInitialVal}
        militares={militaresLista}
        onOpenRegisterModal={onOpenMilitaryRegister || (() => {})}
      />
    </div>
  );
};
