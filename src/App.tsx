/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ViaturaItem,
  EscalaItem,
  RegistroDespacho,
  ViaturaApoioItem
} from './types/sicovi';
import {
  storageService,
  parseDateTimeFormat,
  getAgoraBrasilia,
  formatarIsoParaInputLocal,
  isDestinoOcorrencia
} from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { soundEffects } from './utils/soundEffects';
import { gerarRelatorioPdfViaturas, exportarRelatorioCsv } from './utils/pdfGenerator';
import { Header } from './components/Header';
import { KpiRow } from './components/KpiRow';
import { FleetSection } from './components/FleetSection';
import { CommandHub } from './components/CommandHub';
import { FilterBar } from './components/FilterBar';
import { RecordsTable } from './components/RecordsTable';
import { StatisticsView } from './components/StatisticsView';
import { DispatchModal } from './components/DispatchModal';
import { SupportVehicleSelectorModal } from './components/SupportVehicleSelectorModal';
import { MilitarySelectorModal } from './components/MilitarySelectorModal';
import { VehicleSelectorModal } from './components/VehicleSelectorModal';
import { EscalaModal } from './components/EscalaModal';
import { MilitaryRegisterModal } from './components/MilitaryRegisterModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { KmVerificationModal } from './components/KmVerificationModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ManagerialModal } from './components/ManagerialModal';
import { LoginScreen } from './components/LoginScreen';
import { MobileHub } from './components/mobile/MobileHub';
import { QrCodeModal } from './components/QrCodeModal';
import { SystemAlertModal } from './components/SystemAlertModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Session State - Sempre exige login explícito por usuário e senha ao abrir o sistema
  const [operador, setOperador] = useState<string | null>(null);

  // Viatura alvo vinda de escaneamento de QR Code via URL (?vtr=UR-152&ambiente=mobile)
  const [viaturaAlvoMobile, setViaturaAlvoMobile] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('vtr');
  });

  // Limpa imediatamente o parâmetro ?vtr=... da barra de endereço e do histórico do navegador
  // evitando que acessos posteriores fiquem reabrindo a viatura lida anteriormente
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('vtr')) {
          url.searchParams.delete('vtr');
          const novoSearch = url.searchParams.toString();
          const novaUrl = url.pathname + (novoSearch ? '?' + novoSearch : '');
          window.history.replaceState({}, document.title, novaUrl);
        }
      } catch {}
    }
  }, []);

  // Modo de ambiente: Desktop (Central de Operações) ou Mobile (Acesso Viatura)
  const [modoAmbiente, setModoAmbiente] = useState<'desktop' | 'mobile'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('vtr') || params.get('ambiente') === 'mobile') return 'mobile';
      if (params.get('ambiente') === 'desktop') return 'desktop';
    }
    const salvo = sessionStorage.getItem('sicovi_modo_ambiente');
    if (salvo === 'desktop' || salvo === 'mobile') return salvo;
    if (
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    ) {
      return 'mobile';
    }
    return 'desktop';
  });

  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
  const [isManagerialOpen, setIsManagerialOpen] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'operacional' | 'estatisticas'>('operacional');

  // Master Data State
  const [viaturas, setViaturas] = useState<ViaturaItem[]>(() => storageService.getViaturas());
  const [registros, setRegistros] = useState<RegistroDespacho[]>(() => storageService.getRegistros());
  const [escalas, setEscalas] = useState<EscalaItem[]>(() => storageService.getEscalas());
  const [militares, setMilitares] = useState<string[]>(() => storageService.getMilitares());
  const [bairros] = useState<string[]>(() => storageService.getBairros());
  const [destinos] = useState<string[]>(() => storageService.getDestinos());
  const [operadores, setOperadores] = useState<string[]>(() => storageService.getOperadores());

  // Filter State
  const [buscaGeral, setBuscaGeral] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [presetAtivo, setPresetAtivo] = useState<'24h' | 'hoje' | '7d' | 'tudo' | string>('24h');
  const [apenasEmAberto, setApenasEmAberto] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 40;

  const [columnFilters, setColumnFilters] = useState({
    id: '',
    viatura: '',
    condutor: '',
    equipe: '',
    destino: '',
    bairro: '',
    rai: '',
    natureza: '',
    operador: ''
  });

  // Modal States
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [registroEmEdicao, setRegistroEmEdicao] = useState<RegistroDespacho | null>(null);
  const [viaturasApoio, setViaturasApoio] = useState<ViaturaApoioItem[]>([]);

  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [isSupportSelectorOpen, setIsSupportSelectorOpen] = useState(false);

  const [isMilitarySelectorOpen, setIsMilitarySelectorOpen] = useState(false);
  const [militaryTargetField, setMilitaryTargetField] = useState('');
  const [militaryInitialValue, setMilitaryInitialValue] = useState('');

  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);
  const [vehicleTargetField, setVehicleTargetField] = useState('');

  const [isKmVerificationOpen, setIsKmVerificationOpen] = useState(false);
  const [kmWarnings, setKmWarnings] = useState<string[]>([]);
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => void) | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDeleteId, setRecordToDeleteId] = useState<number | string | null>(null);

  const [isMilitaryRegisterOpen, setIsMilitaryRegisterOpen] = useState(false);
  const [militaryRegisterInitialName, setMilitaryRegisterInitialName] = useState('');

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Status & Notification feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [recentlySavedId, setRecentlySavedId] = useState<number | string | null>(null);
  const recentlySavedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal de sucesso na gravação/salvamento no Banco de Dados
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  const [toastMessage, setToastMessage] = useState<{ title: string; text: string; type: 'success' | 'error' } | null>(null);

  // Limpa a tag "SALVO" automaticamente após exatamente 30 segundos
  const markRecentlySaved = useCallback((id: number | string) => {
    setRecentlySavedId(id);
    if (recentlySavedTimerRef.current) {
      clearTimeout(recentlySavedTimerRef.current);
    }
    recentlySavedTimerRef.current = setTimeout(() => {
      setRecentlySavedId(null);
    }, 30000); // 30 segundos
  }, []);

  const showToast = useCallback((title: string, text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Helper para atualizar dataFim para agora no fuso de Brasília (UTC-3)
  const atualizarDataFimParaAgora = useCallback(() => {
    const agoraBr = getAgoraBrasilia();
    setDataFim(formatarIsoParaInputLocal(agoraBr));
  }, []);

  const applyPresetData = useCallback((tipo: '24h' | 'hoje' | '7d' | 'tudo') => {
    setPresetAtivo(tipo);
    const agoraBr = getAgoraBrasilia();
    const fusoAgora = formatarIsoParaInputLocal(agoraBr);

    let inicio = '';
    if (tipo === '24h') {
      const d = new Date(agoraBr.getTime() - 24 * 60 * 60 * 1000);
      inicio = formatarIsoParaInputLocal(d);
    } else if (tipo === 'hoje') {
      const d = new Date(agoraBr);
      d.setHours(0, 0, 0, 0);
      inicio = formatarIsoParaInputLocal(d);
    } else if (tipo === '7d') {
      const d = new Date(agoraBr.getTime() - 7 * 24 * 60 * 60 * 1000);
      inicio = formatarIsoParaInputLocal(d);
    } else if (tipo === 'tudo') {
      inicio = '';
    }

    setDataInicio(inicio);
    setDataFim(fusoAgora);
    setCurrentPage(1);
  }, []);

  // Initialize with Central DB / Supabase sync and smart initial filter
  useEffect(() => {
    storageService.carregarDoBancoCentral().then(() => {
      const vtrs = storageService.getViaturas();
      const mils = storageService.getMilitares();
      const ops = storageService.getOperadores();
      const regs = storageService.getRegistros();

      setViaturas(vtrs);
      setMilitares(mils);
      setOperadores(ops);
      setRegistros(regs);

      const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000;
      const temRecentes = regs.some(r => {
        const dt = parseDateTimeFormat(r.saida);
        return dt && dt.getTime() >= umDiaAtras;
      });
      applyPresetData(temRecentes ? '24h' : 'tudo');

      if (isSupabaseConfigured()) {
        setIsSyncing(true);
        storageService.sincronizarComSupabase().then(res => {
          setIsSyncing(false);
          if (res.success) {
            const regsAtualizados = storageService.getRegistros();
            setViaturas(storageService.getViaturas());
            setMilitares(storageService.getMilitares());
            setOperadores(storageService.getOperadores());
            setRegistros(regsAtualizados);
            if (regsAtualizados.length > 0) {
              const temRecentesSupabase = regsAtualizados.some(r => {
                const dt = parseDateTimeFormat(r.saida);
                return dt && dt.getTime() >= umDiaAtras;
              });
              applyPresetData(temRecentesSupabase ? '24h' : 'tudo');
            }
          }
        });
      }
    });
  }, [applyPresetData]);

  // Refs para monitorar os filtros ativos no intervalo de 60 segundos sem closures defasadas
  const presetAtivoRef = useRef(presetAtivo);
  presetAtivoRef.current = presetAtivo;

  const buscaGeralRef = useRef(buscaGeral);
  buscaGeralRef.current = buscaGeral;

  const columnFiltersRef = useRef(columnFilters);
  columnFiltersRef.current = columnFilters;

  const apenasEmAbertoRef = useRef(apenasEmAberto);
  apenasEmAbertoRef.current = apenasEmAberto;

  // Sync Cycle (progress indicator a cada 60s)
  useEffect(() => {
    const isAnyModalOpen =
      isDispatchModalOpen ||
      isEscalaModalOpen ||
      isSupportSelectorOpen ||
      isMilitarySelectorOpen ||
      isVehicleSelectorOpen ||
      isKmVerificationOpen ||
      isDeleteConfirmOpen ||
      isMilitaryRegisterOpen ||
      isChangePasswordOpen;

    if (isAnyModalOpen) {
      setSyncProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          setIsSyncing(true);

          // Verifica se há algum filtro diferente do padrão "últimas 24 horas" ativo
          const temOutroFiltroAtivo =
            presetAtivoRef.current !== '24h' ||
            buscaGeralRef.current.trim() !== '' ||
            apenasEmAbertoRef.current ||
            Object.values(columnFiltersRef.current).some(v => v.trim() !== '');

          // Se apenas o filtro padrão "últimas 24 horas" estiver ativo, atualiza o filtro para a hora atual de Brasília
          if (!temOutroFiltroAtivo) {
            const agoraBr = getAgoraBrasilia();
            const fusoAgora = formatarIsoParaInputLocal(agoraBr);
            const d24h = new Date(agoraBr.getTime() - 24 * 60 * 60 * 1000);
            const fuso24h = formatarIsoParaInputLocal(d24h);
            setDataInicio(fuso24h);
            setDataFim(fusoAgora);
          }

          // Sincroniza dados no background
          if (isSupabaseConfigured()) {
            storageService.sincronizarComSupabase().then(res => {
              if (res.success) {
                setRegistros([...storageService.getRegistros()]);
                setViaturas([...storageService.getViaturas()]);
              }
            });
          } else {
            setRegistros([...storageService.getRegistros()]);
            setViaturas([...storageService.getViaturas()]);
          }

          setTimeout(() => {
            setIsSyncing(false);
          }, 600);
          return 0;
        }
        return prev + 100 / 60;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isDispatchModalOpen,
    isEscalaModalOpen,
    isSupportSelectorOpen,
    isMilitarySelectorOpen,
    isVehicleSelectorOpen,
    isKmVerificationOpen,
    isDeleteConfirmOpen,
    isMilitaryRegisterOpen,
    isChangePasswordOpen
  ]);

  // Fechamento de qualquer modal aberto ao pressionar a tecla Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (successModal.isOpen) {
          setSuccessModal(prev => ({ ...prev, isOpen: false }));
          return;
        }
        if (isKmVerificationOpen) {
          setIsKmVerificationOpen(false);
          setPendingSaveAction(null);
          return;
        }
        if (isDeleteConfirmOpen) {
          setIsDeleteConfirmOpen(false);
          return;
        }
        if (isMilitaryRegisterOpen) {
          setIsMilitaryRegisterOpen(false);
          return;
        }
        if (isMilitarySelectorOpen) {
          setIsMilitarySelectorOpen(false);
          return;
        }
        if (isVehicleSelectorOpen) {
          setIsVehicleSelectorOpen(false);
          return;
        }
        if (isSupportSelectorOpen) {
          setIsSupportSelectorOpen(false);
          return;
        }
        if (isChangePasswordOpen) {
          setIsChangePasswordOpen(false);
          return;
        }
        if (isManagerialOpen) {
          setIsManagerialOpen(false);
          return;
        }
        if (isEscalaModalOpen) {
          setIsEscalaModalOpen(false);
          return;
        }
        if (isDispatchModalOpen) {
          setIsDispatchModalOpen(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    successModal.isOpen,
    isKmVerificationOpen,
    isDeleteConfirmOpen,
    isMilitaryRegisterOpen,
    isMilitarySelectorOpen,
    isVehicleSelectorOpen,
    isSupportSelectorOpen,
    isChangePasswordOpen,
    isManagerialOpen,
    isEscalaModalOpen,
    isDispatchModalOpen
  ]);

  // Login & Logout
  const handleLogin = (selectedOp: string, ambiente: 'desktop' | 'mobile' = 'desktop') => {
    setOperador(selectedOp);
    setModoAmbiente(ambiente);
    sessionStorage.setItem('operadorLogado', selectedOp);
    sessionStorage.setItem('sicovi_modo_ambiente', ambiente);
    // Limpa a viatura predefinida do QR Code para não persistir em sessões futuras
    setViaturaAlvoMobile(null);
    atualizarDataFimParaAgora();
    showToast(
      'Acesso Concluído',
      `${ambiente === 'mobile' ? 'Condutor' : 'Operador'} ${selectedOp} autenticado no SICOVI.`
    );
  };

  const handleLogout = () => {
    setOperador(null);
    setViaturaAlvoMobile(null);
    sessionStorage.removeItem('operadorLogado');
    sessionStorage.removeItem('sicovi_modo_ambiente');
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('vtr');
        const novoSearch = url.searchParams.toString();
        const novaUrl = url.pathname + (novoSearch ? '?' + novoSearch : '');
        window.history.replaceState({}, document.title, novaUrl);
      } catch {}
    }
  };

  // KPI Calculations
  const disponiveisCount = useMemo(() => {
    return viaturas.filter(v => (v.status || '').toUpperCase() === 'DISPONÍVEL').length;
  }, [viaturas]);

  const empenhadasCount = useMemo(() => {
    return viaturas.filter(v => {
      const s = (v.status || '').toUpperCase();
      return s === 'EMPENHADA' || s === 'OCORRÊNCIA' || s === 'VISTORIA';
    }).length;
  }, [viaturas]);

  // Filtered Records for Table
  const filteredRegistros = useMemo(() => {
    // Date filter boundaries: o filtro de hora do sistema deve contemplar todos os segundos
    // daquele minuto (ex: 14:04 abrange de 14:04:00.000 até 14:04:59.999)
    let dtInicioVal: Date | null = null;
    if (dataInicio) {
      const parsedIni = parseDateTimeFormat(dataInicio);
      if (parsedIni) {
        dtInicioVal = new Date(parsedIni);
        if (dataInicio.length <= 16) {
          dtInicioVal.setSeconds(0, 0);
        }
      }
    }

    let dtFimVal: Date | null = null;
    if (dataFim) {
      const parsedFim = parseDateTimeFormat(dataFim);
      if (parsedFim) {
        dtFimVal = new Date(parsedFim);
        // Se o valor de data/hora terminar no minuto (sem segundos explícitos ou com 00), estende até o último segundo
        if (dataFim.length <= 16 || dtFimVal.getSeconds() === 0) {
          dtFimVal.setSeconds(59, 999);
        }
      }
    }

    const termoGeral = buscaGeral.toLowerCase().trim();

    return registros.filter(r => {
      if (termoGeral) {
        const matches =
          String(r.id).toLowerCase().includes(termoGeral) ||
          r.viatura.toLowerCase().includes(termoGeral) ||
          r.condutor.toLowerCase().includes(termoGeral) ||
          r.equipe.toLowerCase().includes(termoGeral) ||
          r.destino.toLowerCase().includes(termoGeral) ||
          r.bairro.toLowerCase().includes(termoGeral) ||
          r.rai.toLowerCase().includes(termoGeral) ||
          r.natureza.toLowerCase().includes(termoGeral) ||
          r.operador.toLowerCase().includes(termoGeral) ||
          (r.saida && r.saida.toLowerCase().includes(termoGeral)) ||
          (r.chegada && r.chegada.toLowerCase().includes(termoGeral));
        if (!matches) return false;
      }

      // Column filters
      if (columnFilters.id && !String(r.id).toLowerCase().includes(columnFilters.id.toLowerCase().trim())) return false;
      if (columnFilters.viatura && !r.viatura.toLowerCase().includes(columnFilters.viatura.toLowerCase().trim())) return false;
      if (columnFilters.condutor && !r.condutor.toLowerCase().includes(columnFilters.condutor.toLowerCase().trim())) return false;
      if (columnFilters.equipe && !r.equipe.toLowerCase().includes(columnFilters.equipe.toLowerCase().trim())) return false;
      if (columnFilters.destino && !r.destino.toLowerCase().includes(columnFilters.destino.toLowerCase().trim())) return false;
      if (columnFilters.bairro && !r.bairro.toLowerCase().includes(columnFilters.bairro.toLowerCase().trim())) return false;
      if (columnFilters.rai && !r.rai.toLowerCase().includes(columnFilters.rai.toLowerCase().trim())) return false;
      if (columnFilters.natureza && !r.natureza.toLowerCase().includes(columnFilters.natureza.toLowerCase().trim())) return false;
      if (columnFilters.operador && !r.operador.toLowerCase().includes(columnFilters.operador.toLowerCase().trim())) return false;

      // Status open filter
      if (apenasEmAberto && r.chegada && r.chegada.trim() !== '') return false;

      // Date filter
      if (dtInicioVal || dtFimVal) {
        const dtSaida = parseDateTimeFormat(r.saida);
        if (!dtSaida) return false;
        if (dtInicioVal && dtSaida < dtInicioVal) return false;
        if (dtFimVal && dtSaida > dtFimVal) return false;
      }

      return true;
    }).sort((a, b) => Number(b.id) - Number(a.id));
  }, [registros, buscaGeral, columnFilters, apenasEmAberto, dataInicio, dataFim]);

  const { totalKmPeriodo, totalOcorrenciasPeriodo } = useMemo(() => {
    let km = 0;
    let ocorr = 0;

    filteredRegistros.forEach(r => {
      const ks = Number(r.kmSaida);
      const kc = Number(r.kmChegada);
      if (!isNaN(ks) && !isNaN(kc) && kc >= ks) {
        km += kc - ks;
      }

      // Contador de ocorrências atendidas: considera apenas os deslocamentos cujo destino esteja como "OCORRÊNCIA, ocorrência" com ou sem acentuação
      if (isDestinoOcorrencia(r.destino)) {
        ocorr++;
      }
    });

    return { totalKmPeriodo: km, totalOcorrenciasPeriodo: ocorr };
  }, [filteredRegistros]);

  // Click on vehicle card in fleet
  const handleSelectVehicleFromFleet = (prefixo: string, status: string) => {
    const s = status.toUpperCase();
    if (s === 'DISPONÍVEL') {
      setRegistroEmEdicao({
        id: 'PENDENTE',
        viatura: prefixo,
        condutor: '',
        equipe: '',
        destino: '',
        bairro: '',
        rai: '',
        natureza: '',
        saida: '',
        kmSaida: '',
        chegada: '',
        kmChegada: '',
        operador: operador || ''
      });
      setViaturasApoio([]);
      setIsDispatchModalOpen(true);
    } else {
      // Find open record
      const openRecord = registros.find(
        r => r.viatura.trim().toUpperCase() === prefixo.trim().toUpperCase() && (!r.chegada || r.chegada.trim() === '')
      );
      if (openRecord) {
        setRegistroEmEdicao(openRecord);
        setViaturasApoio([]);
        setIsDispatchModalOpen(true);
      } else {
        setRegistroEmEdicao({
          id: 'PENDENTE',
          viatura: prefixo,
          condutor: '',
          equipe: '',
          destino: '',
          bairro: '',
          rai: '',
          natureza: '',
          saida: '',
          kmSaida: '',
          chegada: '',
          kmChegada: '',
          operador: operador || ''
        });
        setViaturasApoio([]);
        setIsDispatchModalOpen(true);
      }
    }
  };

  // Auto fill team and km for selected vehicle
  const handleAutoFillFromViatura = (vtrPrefixo: string) => {
    const vUpper = vtrPrefixo.trim().toUpperCase();
    const esc = escalas.find(e => e.viatura.trim().toUpperCase() === vUpper);
    const ultKm = storageService.getUltimoKm(vUpper);
    return {
      condutor: esc?.condutor || '',
      equipe: esc?.equipe || '',
      ultimoKm: ultKm
    };
  };

  // Dispatch Save Handling with Odometry Checks
  const executeDispatchSave = async (principal: Partial<RegistroDespacho>, apoios: ViaturaApoioItem[]) => {
    // Atualiza sempre a data/hora final para o instante corrente na gravação
    atualizarDataFimParaAgora();

    // Se for novo registro (sem ID numérico existente), garante sincronia com o maior ID da nuvem + 1
    const isNovo =
      !principal.id ||
      principal.id === 'PENDENTE' ||
      Number(principal.id) <= 0 ||
      isNaN(Number(principal.id));
    if (isNovo) {
      try {
        await storageService.obterMaiorIdNuvemAsync();
      } catch (err) {
        console.warn('Erro ao sincronizar com maior ID da nuvem:', err);
      }
    }

    const temChegada = Boolean(principal.chegada && String(principal.chegada).trim() !== '');
    if (temChegada) {
      soundEffects.playArrival();
    } else {
      soundEffects.playDeparture();
    }

    if (apoios.length > 0) {
      const res = storageService.salvarMultiplosDespachos({ principal, apoios });
      setRegistros([...res.registros]);
      setViaturas([...storageService.getViaturas()]);
      markRecentlySaved(res.ids[res.ids.length - 1]);
      setIsDispatchModalOpen(false);
      showToast(
        'Comboio Registrado!',
        `${apoios.length + 1} viaturas despachadas simultaneamente (IDs: ${res.ids.join(', ')}).`
      );
      setSuccessModal({
        isOpen: true,
        title: 'Acionamento Salvo no Banco de Dados!',
        message: `Comboio gravado com sucesso! Foram adicionadas ${apoios.length + 1} viaturas ao banco de dados (IDs gerados: #${res.ids.join(', #')}).`
      });
    } else {
      const res = storageService.salvarRegistro(principal);
      setRegistros([...res.registros]);
      setViaturas([...storageService.getViaturas()]);
      markRecentlySaved(res.id);
      setIsDispatchModalOpen(false);
      const isEdit = Boolean(registroEmEdicao && registroEmEdicao.id !== 'PENDENTE');
      showToast('Registro Salvo!', `Despacho #${res.id} gravado com sucesso no banco de dados.`);
      setSuccessModal({
        isOpen: true,
        title: 'Registro Salvo no Banco de Dados!',
        message: isEdit
          ? `As modificações da viatura ${principal.viatura || ''} (Registro #${res.id}) foram salvas com sucesso no banco de dados!`
          : `O despacho da viatura ${principal.viatura || ''} (Registro #${res.id}) foi gravado com sucesso no banco de dados!`
      });
    }
  };

  const handleSaveDispatch = (principal: Partial<RegistroDespacho>, apoios: ViaturaApoioItem[]) => {
    const warnings: string[] = [];
    const vtr = (principal.viatura || '').toUpperCase().trim();
    const ultKm = storageService.getUltimoKm(vtr, principal.id);
    const ks = Number(principal.kmSaida);
    const kc = principal.kmChegada !== '' && !isNaN(Number(principal.kmChegada)) ? Number(principal.kmChegada) : null;

    if (ultKm !== null && !isNaN(ks)) {
      if (ks < ultKm) {
        warnings.push(
          `Viatura ${vtr}: O KM de saída informado (<strong>${ks.toLocaleString('pt-BR')} km</strong>) é <strong>MENOR</strong> que o último KM registrado (${ultKm.toLocaleString('pt-BR')} km).`
        );
      } else if (ks - ultKm > 100) {
        warnings.push(
          `Viatura ${vtr}: O KM de saída informado (<strong>${ks.toLocaleString('pt-BR')} km</strong>) é mais de 100 km superior ao último KM registrado (${ultKm.toLocaleString('pt-BR')} km).`
        );
      }
    }

    if (kc !== null && !isNaN(ks)) {
      if (kc < ks) {
        warnings.push(
          `Viatura ${vtr}: O KM de chegada informado (<strong>${kc.toLocaleString('pt-BR')} km</strong>) é <strong>MENOR</strong> que o KM de saída (${ks.toLocaleString('pt-BR')} km).`
        );
      } else if (kc - ks > 100) {
        warnings.push(
          `Viatura ${vtr}: A distância percorrida informada nesta saída (<strong>${(kc - ks).toLocaleString('pt-BR')} km</strong>) é <strong>SUPERIOR a 100 km</strong>.`
        );
      }
    }

    if (warnings.length > 0) {
      soundEffects.playWarning();
      setKmWarnings(warnings);
      setPendingSaveAction(() => () => executeDispatchSave(principal, apoios));
      setIsKmVerificationOpen(true);
      return;
    }

    executeDispatchSave(principal, apoios);
  };

  // Support vehicle modal handling
  const handleConfirmSupportVehicles = (selectedPrefixos: string[]) => {
    const novos: ViaturaApoioItem[] = selectedPrefixos.map(prefixo => {
      const info = handleAutoFillFromViatura(prefixo);
      return {
        viatura: prefixo,
        condutor: info.condutor,
        equipe: info.equipe,
        kmSaida: info.ultimoKm !== null ? info.ultimoKm : ''
      };
    });
    setViaturasApoio(prev => [...prev, ...novos]);
  };

  // Escala Save Handling
  const handleSaveEscala = (escala: EscalaItem) => {
    const updated = storageService.salvarEscala(escala);
    setEscalas([...updated]);
    showToast('Escala Gravada!', `Escala da viatura ${escala.viatura} gravada com sucesso.`);
    setSuccessModal({
      isOpen: true,
      title: 'Escala Salva no Banco de Dados!',
      message: `A escala operacional da viatura ${escala.viatura} (Condutor: ${escala.condutor}) foi salva com sucesso no banco de dados!`
    });
    // Não fecha o modal após o usuário clicar em salvar
  };

  const handleSaveMultipleEscalas = (novasEscalas: EscalaItem[]) => {
    const updated = storageService.salvarMultiplasEscalas(novasEscalas);
    setEscalas([...updated]);
    const nomes = novasEscalas.map(e => e.viatura).join(', ');
    showToast('Escalas Gravadas!', `${novasEscalas.length} viatura(s) escalada(s) com sucesso.`);
    setSuccessModal({
      isOpen: true,
      title: 'Escalas Salvas no Banco de Dados!',
      message: `As escalas de ${novasEscalas.length} viatura(s) (${nomes}) foram gravadas com sucesso no banco de dados!`
    });
    // Não fecha o modal após o usuário clicar em salvar
  };

  // Military Register Handling
  const handleRegisterMilitary = (nome: string) => {
    const updated = storageService.cadastrarMilitar(nome);
    setMilitares([...updated]);
    showToast('Militar Cadastrado!', `Militar "${nome}" gravado na relação oficial da OBM.`);
    setSuccessModal({
      isOpen: true,
      title: 'Militar Salvo no Banco de Dados!',
      message: `O militar "${nome}" foi cadastrado e inserido com sucesso na base de dados oficial!`
    });
  };

  // Delete Record Handling
  const handleConfirmDelete = () => {
    if (recordToDeleteId === null) return;
    const updated = storageService.excluirRegistro(recordToDeleteId);
    setRegistros([...updated]);
    setIsDeleteConfirmOpen(false);
    setRecordToDeleteId(null);
    showToast('Registro Excluído', `Registro #${recordToDeleteId} removido do banco de dados.`);
  };

  if (!operador) {
    return (
      <>
        <LoginScreen
          operadores={operadores}
          militares={militares}
          viaturaPredefinida={viaturaAlvoMobile}
          onLogin={handleLogin}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenManagerial={() => setIsManagerialOpen(true)}
        />
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          operadores={operadores}
          onSuccess={msg => showToast('Senha Atualizada', msg)}
        />
        <ManagerialModal
          isOpen={isManagerialOpen}
          onClose={() => setIsManagerialOpen(false)}
          viaturas={viaturas}
          militares={militares}
          operadores={operadores}
          onViaturasChange={setViaturas}
          onMilitaresChange={mils => {
            setMilitares(mils);
            setOperadores(storageService.getOperadores());
          }}
          onRegistrosChange={() => {
            setRegistros(storageService.getRegistros());
            setViaturas(storageService.getViaturas());
            showToast('Banco Atualizado', 'Planilha de despachos importada com sucesso!');
          }}
          onOperadoresChange={ops => {
            setOperadores(ops);
            setMilitares(storageService.getMilitares());
            showToast('Operadores Atualizados', 'Lista de operadores e senhas importada com sucesso!');
          }}
          onBairrosChange={() => {
            showToast('Bairros Atualizados', 'Lista de bairros/cidades importada com sucesso!');
          }}
          onOpenQrCodes={() => setIsQrCodeModalOpen(true)}
        />
      </>
    );
  }

  // Ambiente Mobile: Interface dedicada e otimizada para condutores na viatura
  if (operador && modoAmbiente === 'mobile') {
    return (
      <MobileHub
        condutor={operador}
        viaturas={viaturas}
        registros={registros}
        militares={militares}
        bairros={bairros}
        viaturaPredefinida={viaturaAlvoMobile}
        onRefreshData={() => {
          setRegistros([...storageService.getRegistros()]);
          setViaturas([...storageService.getViaturas()]);
        }}
        onLogout={handleLogout}
        onSwitchToDesktop={() => {
          setModoAmbiente('desktop');
          sessionStorage.setItem('sicovi_modo_ambiente', 'desktop');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top-3 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-black">{toastMessage.title}</div>
            <div className="text-[11px] text-slate-300">{toastMessage.text}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        operador={operador}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenManagerial={() => setIsManagerialOpen(true)}
        onSwitchToMobile={() => {
          setModoAmbiente('mobile');
          sessionStorage.setItem('sicovi_modo_ambiente', 'mobile');
        }}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
      />

      {/* Main Container */}
      <main className="max-w-[98%] w-[98%] mx-auto px-4 mt-5 flex-1">
        {activeTab === 'operacional' ? (
          <div>
            {/* KPI Summary */}
            <KpiRow
              disponiveis={disponiveisCount}
              empenhadas={empenhadasCount}
              totalSaidas={filteredRegistros.length}
              totalOcorrencias={totalOcorrenciasPeriodo}
              kmTotal={totalKmPeriodo}
            />

            {/* Fleet Section */}
            <FleetSection
              viaturas={viaturas}
              registros={registros}
              onSelectVehicle={handleSelectVehicleFromFleet}
            />

            {/* Command Hub */}
            <CommandHub
              onOpenEscala={() => setIsEscalaModalOpen(true)}
              onOpenNovoDespacho={() => {
                setRegistroEmEdicao(null);
                setViaturasApoio([]);
                setIsDispatchModalOpen(true);
              }}
            />

            {/* Filter Toolbar */}
            <FilterBar
              buscaGeral={buscaGeral}
              onBuscaGeralChange={setBuscaGeral}
              dataInicio={dataInicio}
              onDataInicioChange={val => {
                setDataInicio(val);
                setPresetAtivo('personalizado');
              }}
              dataFim={dataFim}
              onDataFimChange={val => {
                setDataFim(val);
                setPresetAtivo('personalizado');
              }}
              presetAtivo={presetAtivo}
              onPresetChange={applyPresetData}
              apenasEmAberto={apenasEmAberto}
              onApenasEmAbertoToggle={() => setApenasEmAberto(!apenasEmAberto)}
              onGerarPdf={() => gerarRelatorioPdfViaturas(filteredRegistros, operador)}
              onExportarCsv={() => exportarRelatorioCsv(filteredRegistros)}
              onAtualizarDados={() => {
                setIsSyncing(true);
                const temOutroFiltroAtivo =
                  presetAtivo !== '24h' ||
                  buscaGeral.trim() !== '' ||
                  apenasEmAberto ||
                  Object.values(columnFilters).some(v => v.trim() !== '');

                // Se apenas o filtro padrão de 24h estiver ativo, rola a janela de tempo até o minuto atual
                if (!temOutroFiltroAtivo) {
                  const agoraBr = getAgoraBrasilia();
                  const fusoAgora = formatarIsoParaInputLocal(agoraBr);
                  const d24h = new Date(agoraBr.getTime() - 24 * 60 * 60 * 1000);
                  const fuso24h = formatarIsoParaInputLocal(d24h);
                  setDataInicio(fuso24h);
                  setDataFim(fusoAgora);
                }

                storageService.sincronizarComSupabase().then(res => {
                  setIsSyncing(false);
                  setRegistros([...storageService.getRegistros()]);
                  setViaturas([...storageService.getViaturas()]);
                  showToast('Dados Atualizados', 'Banco de dados sincronizado com sucesso.');
                });
              }}
              onLimparFiltros={() => {
                setBuscaGeral('');
                setColumnFilters({
                  id: '',
                  viatura: '',
                  condutor: '',
                  equipe: '',
                  destino: '',
                  bairro: '',
                  rai: '',
                  natureza: '',
                  operador: ''
                });
                setApenasEmAberto(false);
                applyPresetData('24h');
                showToast('Filtros Limpos', 'Visualização restaurada para as últimas 24 horas.');
              }}
            />

            {/* Records Table */}
            <RecordsTable
              registros={filteredRegistros}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onEdit={r => {
                setRegistroEmEdicao(r);
                setViaturasApoio([]);
                setIsDispatchModalOpen(true);
              }}
              onDelete={id => {
                setRecordToDeleteId(id);
                setIsDeleteConfirmOpen(true);
              }}
              columnFilters={columnFilters}
              onColumnFilterChange={(col, val) => setColumnFilters(prev => ({ ...prev, [col]: val }))}
              onClearColumnFilters={() =>
                setColumnFilters({
                  id: '',
                  viatura: '',
                  condutor: '',
                  equipe: '',
                  destino: '',
                  bairro: '',
                  rai: '',
                  natureza: '',
                  operador: ''
                })
              }
              recentlySavedId={recentlySavedId}
            />
          </div>
        ) : (
          /* Statistics & Charts View */
          <StatisticsView
            registros={registros}
            viaturas={viaturas}
            onRefreshFromDb={() => {
              setRegistros([...storageService.getRegistros()]);
              setViaturas([...storageService.getViaturas()]);
              showToast('Estatísticas Atualizadas', 'Dados consolidados com o banco de dados.');
            }}
            onLoadFullHistory={async () => {
              setIsSyncing(true);
              const res = await storageService.carregarHistoricoCompleto();
              setIsSyncing(false);
              if (res.success) {
                setRegistros([...storageService.getRegistros()]);
                showToast('Histórico Completo', `Carregados ${storageService.getRegistros().length} registros do banco de dados.`);
              } else {
                showToast('Aviso', 'Não foi possível carregar os dados antigos.');
              }
            }}
            onOpenRegistro={reg => {
              setRegistroEmEdicao(reg);
              setViaturasApoio([]);
              setIsDispatchModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        registroEmEdicao={registroEmEdicao}
        onSave={handleSaveDispatch}
        viaturasLista={viaturas.map(v => v.prefixo)}
        militaresLista={militares}
        bairrosLista={bairros}
        destinosLista={destinos}
        operadorAtual={operador}
        onOpenMilitaryPicker={field => {
          setMilitaryTargetField(field);
          setMilitaryInitialValue('');
          setIsMilitarySelectorOpen(true);
        }}
        onOpenVehiclePicker={field => {
          setVehicleTargetField(field);
          setIsVehicleSelectorOpen(true);
        }}
        onOpenSupportSelector={() => setIsSupportSelectorOpen(true)}
        viaturasApoio={viaturasApoio}
        onRemoveViaturaApoio={idx => {
          const copy = [...viaturasApoio];
          copy.splice(idx, 1);
          setViaturasApoio(copy);
        }}
        onUpdateViaturaApoio={(idx, campo, valor) => {
          const copy = [...viaturasApoio];
          copy[idx] = { ...copy[idx], [campo]: valor };
          setViaturasApoio(copy);
        }}
        onAutoFillFromViatura={handleAutoFillFromViatura}
        onOpenMilitaryRegister={() => setIsMilitaryRegisterOpen(true)}
      />

      <SupportVehicleSelectorModal
        isOpen={isSupportSelectorOpen}
        onClose={() => setIsSupportSelectorOpen(false)}
        availableVehicles={viaturas.map(v => v.prefixo)}
        alreadyAddedVehicles={viaturasApoio.map(v => v.viatura.trim().toUpperCase())}
        onConfirm={handleConfirmSupportVehicles}
        getUltimoKm={storageService.getUltimoKm}
      />

      <MilitarySelectorModal
        isOpen={isMilitarySelectorOpen}
        onClose={() => setIsMilitarySelectorOpen(false)}
        targetField={militaryTargetField}
        militares={militares}
        initialValue={militaryInitialValue}
        onConfirm={(field, val) => {
          if (field.startsWith('apoio-')) {
            const parts = field.split('-');
            const campo = parts[1] as 'condutor' | 'equipe';
            const idx = parseInt(parts[2], 10);
            if (!isNaN(idx) && viaturasApoio[idx]) {
              const copy = [...viaturasApoio];
              copy[idx] = { ...copy[idx], [campo]: val };
              setViaturasApoio(copy);
            }
          }
        }}
        onOpenRegisterModal={() => {
          setIsMilitaryRegisterOpen(true);
          setMilitaryRegisterInitialName('');
        }}
      />

      <VehicleSelectorModal
        isOpen={isVehicleSelectorOpen}
        onClose={() => setIsVehicleSelectorOpen(false)}
        viaturas={viaturas}
        onSelect={() => {}}
      />

      <EscalaModal
        isOpen={isEscalaModalOpen}
        onClose={() => setIsEscalaModalOpen(false)}
        viaturas={viaturas}
        escalas={escalas}
        militares={militares}
        onSaveEscala={handleSaveEscala}
        onSaveMultipleEscalas={handleSaveMultipleEscalas}
        onOpenRegisterMilitary={initName => {
          setMilitaryRegisterInitialName(initName || '');
          setIsMilitaryRegisterOpen(true);
        }}
      />

      <MilitaryRegisterModal
        isOpen={isMilitaryRegisterOpen}
        onClose={() => setIsMilitaryRegisterOpen(false)}
        initialName={militaryRegisterInitialName}
        onRegister={handleRegisterMilitary}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        recordId={recordToDeleteId}
        onConfirm={handleConfirmDelete}
      />

      <KmVerificationModal
        isOpen={isKmVerificationOpen}
        onClose={() => {
          setIsKmVerificationOpen(false);
          setPendingSaveAction(null);
        }}
        warnings={kmWarnings}
        onConfirm={() => {
          setIsKmVerificationOpen(false);
          if (pendingSaveAction) pendingSaveAction();
        }}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        operadorPadrao={operador || ''}
        operadores={operadores}
        onSuccess={msg => {
          setOperadores(storageService.getOperadores());
          showToast('Senha Atualizada', msg);
        }}
      />

      <ManagerialModal
        isOpen={isManagerialOpen}
        onClose={() => setIsManagerialOpen(false)}
        viaturas={viaturas}
        militares={militares}
        operadores={operadores}
        onViaturasChange={setViaturas}
        onMilitaresChange={mils => {
          setMilitares(mils);
          setOperadores(storageService.getOperadores());
        }}
        onRegistrosChange={() => {
          setRegistros(storageService.getRegistros());
          setViaturas(storageService.getViaturas());
          applyPresetData('tudo');
          showToast('Banco Atualizado', 'Planilha de despachos importada com sucesso!');
        }}
        onOperadoresChange={ops => {
          setOperadores(ops);
          setMilitares(storageService.getMilitares());
          showToast('Operadores Atualizados', 'Lista de operadores e senhas importada com sucesso!');
        }}
        onBairrosChange={() => {
          showToast('Bairros Atualizados', 'Lista de bairros/cidades importada com sucesso!');
        }}
        onOpenQrCodes={() => setIsQrCodeModalOpen(true)}
      />

      {/* Modal de Confirmação de Sucesso ao Salvar no Banco de Dados */}
      <SystemAlertModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        type="success"
        confirmText="Concluir"
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de Geração e Impressão de QR Codes para as Viaturas */}
      <QrCodeModal
        isOpen={isQrCodeModalOpen}
        onClose={() => setIsQrCodeModalOpen(false)}
        viaturas={viaturas}
      />
    </div>
  );
}
