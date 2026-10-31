import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Navigation,
  Search,
  Minus,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Monitor,
  User,
  X,
  Ambulance,
  Truck,
  Car
} from 'lucide-react';
import { ViaturaItem, RegistroDespacho, CategoriaViatura } from '../../types/sicovi';
import { storageService, formatarDataHoraPtBr, getAgoraBrasilia, getAgoraIsoBrasilia, isDestinoOcorrencia } from '../../services/storageService';
import { soundEffects } from '../../utils/soundEffects';

interface MobileHubProps {
  condutor: string;
  viaturas: ViaturaItem[];
  registros: RegistroDespacho[];
  militares: string[];
  bairros: string[];
  viaturaPredefinida?: string | null;
  onRefreshData: () => void;
  onLogout: () => void;
  onSwitchToDesktop: () => void;
}

const getViaturaIcon = (categoria?: string, prefixo?: string) => {
  const p = (prefixo || '').toUpperCase();
  const c = (categoria || '').toUpperCase();
  if (
    c.includes('RESGATE') ||
    p.startsWith('UR') ||
    p.startsWith('USA') ||
    p.startsWith('ASU') ||
    p.startsWith('USB')
  ) {
    return Ambulance;
  }
  if (
    c.includes('INCÊNDIO') ||
    c.includes('SALVAMENTO') ||
    p.startsWith('ABT') ||
    p.startsWith('ABS') ||
    p.startsWith('AT') ||
    p.startsWith('ABTS') ||
    p.startsWith('AR') ||
    p.startsWith('ACA')
  ) {
    return Truck;
  }
  return Car;
};

export const MobileHub: React.FC<MobileHubProps> = ({
  condutor,
  viaturas,
  registros,
  bairros,
  viaturaPredefinida = null,
  onRefreshData,
  onLogout,
  onSwitchToDesktop
}) => {
  // Filtros de busca e categoria no mobile
  const [buscaVtr, setBuscaVtr] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');

  // Estado da Tela de Saída (Despacho)
  const [modalSaidaOpen, setModalSaidaOpen] = useState(false);
  const [vtrSelecionadaParaSaida, setVtrSelecionadaParaSaida] = useState<ViaturaItem | null>(null);
  const [kmSaidaInput, setKmSaidaInput] = useState<number | string>(0);
  const [destinoSelecionado, setDestinoSelecionado] = useState<'OCORRÊNCIA' | 'VISTORIAS' | 'SERVIÇO DA OBM' | 'DIVERSOS'>('OCORRÊNCIA');
  const [naturezaInput, setNaturezaInput] = useState('');
  const [bairroInput, setBairroInput] = useState('');
  const [mostrarSugestoesBairros, setMostrarSugestoesBairros] = useState(false);

  // Estado da Tela de Chegada (Retorno)
  const [modalChegadaOpen, setModalChegadaOpen] = useState(false);
  const [vtrChegada, setVtrChegada] = useState<ViaturaItem | null>(null);
  const [registroAtivoChegada, setRegistroAtivoChegada] = useState<RegistroDespacho | null>(null);
  const [kmChegadaInput, setKmChegadaInput] = useState<number | string>(0);

  // Estado do Modal de Conflito (Saída em aberto de outro militar)
  const [modalConflitoOpen, setModalConflitoOpen] = useState(false);
  const [conflitoVtr, setConflitoVtr] = useState<ViaturaItem | null>(null);
  const [conflitoRegistro, setConflitoRegistro] = useState<RegistroDespacho | null>(null);
  const [kmFechamentoAnterior, setKmFechamentoAnterior] = useState<number | string>(0);

  // Mensagem de erro inline (sem alert HTML)
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Modal de Confirmação / Sucesso (sem alert HTML)
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    tipo: 'saida' | 'chegada' | 'conflito';
    titulo: string;
    mensagem: string;
    viaturaPrefixo: string;
    idRegistro: string | number;
  } | null>(null);

  // Normalização da categoria da viatura
  const getCategoriaViatura = (v: ViaturaItem): CategoriaViatura => {
    const cat = (v.categoria || '').trim().toUpperCase();
    const pref = (v.prefixo || '').trim().toUpperCase();

    if (cat.includes('RESGATE') || pref.startsWith('UR')) return 'RESGATE';
    if (cat.includes('AVANÇADO') || cat.includes('AVANCADO') || pref.startsWith('USA')) return 'SUPORTE AVANÇADO';
    if (
      cat.includes('INCÊNDIO') ||
      cat.includes('INCENDIO') ||
      cat.includes('SALVAMENTO') ||
      pref.startsWith('ABT') ||
      pref.startsWith('ABS') ||
      pref.startsWith('ABR')
    ) {
      return 'INCÊNDIO/SALVAMENTO';
    }
    return 'ADMINISTRATIVA';
  };

  // Encontra o registro de saída em aberto para uma viatura empenhada
  const getRegistroEmAberto = (prefixo: string): RegistroDespacho | null => {
    const prefUpper = prefixo.trim().toUpperCase();
    return (
      registros.find(r => {
        const vMatch = r.viatura.trim().toUpperCase() === prefUpper;
        const emAberto = !r.chegada || r.chegada.trim() === '' || r.chegada === 'EM ABERTO';
        return vMatch && emAberto;
      }) || null
    );
  };

  const naturezasHistorico = useMemo(() => storageService.getNaturezasHistorico(), [modalSaidaOpen]);

  // Filtro e agrupamento de viaturas em ordem alfabética estrita
  const viaturasAgrupadas = useMemo(() => {
    const termo = buscaVtr.toLowerCase().trim();

    const filtradas = viaturas.filter(v => {
      const matchBusca = !termo || v.prefixo.toLowerCase().includes(termo);
      const cat = getCategoriaViatura(v);
      const matchCat = categoriaAtiva === 'TODAS' || cat === categoriaAtiva;
      return matchBusca && matchCat;
    });

    const categoriasOficiais: { chave: CategoriaViatura; titulo: string }[] = [
      { chave: 'ADMINISTRATIVA', titulo: 'ADMINISTRATIVAS' },
      { chave: 'RESGATE', titulo: 'RESGATE' },
      { chave: 'INCÊNDIO/SALVAMENTO', titulo: 'INCÊNDIO & SALVAMENTO' },
      { chave: 'SUPORTE AVANÇADO', titulo: 'SUPORTE AVANÇADO' }
    ];

    const grupos: { titulo: string; chave: CategoriaViatura; lista: ViaturaItem[] }[] = [];

    categoriasOficiais.forEach(({ chave, titulo }) => {
      const vtrsDaCat = filtradas
        .filter(v => getCategoriaViatura(v) === chave)
        .sort((a, b) => a.prefixo.localeCompare(b.prefixo, 'pt-BR', { numeric: true, sensitivity: 'base' }));

      if (vtrsDaCat.length > 0 || (categoriaAtiva === chave && !termo)) {
        grupos.push({ titulo, chave, lista: vtrsDaCat });
      }
    });

    return grupos;
  }, [viaturas, buscaVtr, categoriaAtiva]);

  // Autocomplete de bairros
  const sugestoesBairrosFiltradas = useMemo(() => {
    if (!bairroInput.trim()) return bairros.slice(0, 6);
    const t = bairroInput.toLowerCase().trim();
    return bairros.filter(b => b.toLowerCase().includes(t)).slice(0, 6);
  }, [bairros, bairroInput]);

  // Abertura da Tela de Saída ao tocar em viatura DISPONÍVEL
  const handleSelecionarViatura = (vtr: ViaturaItem) => {
    setErroModal(null);
    const status = (vtr.status || '').toUpperCase();

    if (status === 'EMPENHADA') {
      // Abre tela de chegada / finalização ou conflito
      const regAtivo = getRegistroEmAberto(vtr.prefixo);
      setVtrChegada(vtr);
      setRegistroAtivoChegada(regAtivo);

      const ks =
        regAtivo?.kmSaida !== undefined && regAtivo?.kmSaida !== ''
          ? Number(regAtivo.kmSaida)
          : storageService.getUltimoKm(vtr.prefixo) || 0;
      setKmChegadaInput(ks > 0 ? ks : 0);
      setModalChegadaOpen(true);
      return;
    }

    // Viatura Disponível: abre tela de Saída
    const ultimoKm = storageService.getUltimoKm(vtr.prefixo);
    setKmSaidaInput(ultimoKm !== null && ultimoKm > 0 ? ultimoKm : 0);
    setVtrSelecionadaParaSaida(vtr);
    setDestinoSelecionado('OCORRÊNCIA');
    setNaturezaInput('');
    setBairroInput('');
    setModalSaidaOpen(true);
  };

  // Se o militar acessou via QR Code da viatura, seleciona e abre automaticamente
  const jaSelecionouPredefinida = useRef(false);
  useEffect(() => {
    if (viaturaPredefinida && !jaSelecionouPredefinida.current && viaturas.length > 0) {
      const vtrAlvo = viaturas.find(
        v => v.prefixo.trim().toUpperCase() === viaturaPredefinida.trim().toUpperCase()
      );
      if (vtrAlvo) {
        jaSelecionouPredefinida.current = true;
        handleSelecionarViatura(vtrAlvo);
      }
    }
  }, [viaturaPredefinida, viaturas]);

  // Stepper helper para KM
  const alterarKmSaida = (delta: number) => {
    const atual = Number(kmSaidaInput) || 0;
    const novo = Math.max(0, atual + delta);
    setKmSaidaInput(novo);
  };

  const alterarKmChegada = (delta: number) => {
    const atual = Number(kmChegadaInput) || 0;
    const novo = Math.max(0, atual + delta);
    setKmChegadaInput(novo);
  };

  const alterarKmConflito = (delta: number) => {
    const atual = Number(kmFechamentoAnterior) || 0;
    const novo = Math.max(0, atual + delta);
    setKmFechamentoAnterior(novo);
  };

  // Confirmar Saída
  const handleConfirmarSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vtrSelecionadaParaSaida) return;

    const kmNum = Number(kmSaidaInput);
    if (isNaN(kmNum) || kmNum < 0) {
      setErroModal('Por favor, informe um KM de saída válido.');
      return;
    }

    setErroModal(null);

    // Sincroniza com o servidor central antes de gerar o ID para garantir o último ID somado com 1
    try {
      await storageService.carregarDoBancoCentral();
    } catch {}

    // Fuso horário oficial de Brasília (UTC-3), idêntico ao desktop
    const dataHoraSaidaFmt = formatarDataHoraPtBr(getAgoraBrasilia(), true);

    const payload: Partial<RegistroDespacho> = {
      id: 'PENDENTE', // Exatamente como no desktop: atribui o último ID existente somado com 1
      viatura: vtrSelecionadaParaSaida.prefixo.toUpperCase().trim(),
      condutor: condutor.trim(),
      operador: condutor.trim(), // Regra: condutor e operador têm mesmo valor no mobile
      equipe: '',
      destino: destinoSelecionado,
      natureza: naturezaInput.trim() || destinoSelecionado,
      bairro: bairroInput.trim(),
      rai: '',
      saida: dataHoraSaidaFmt,
      kmSaida: kmNum,
      chegada: '',
      kmChegada: ''
    };

    const res = storageService.salvarRegistro(payload);
    soundEffects.playDeparture();
    onRefreshData();

    setModalSaidaOpen(false);
    setFeedbackModal({
      isOpen: true,
      tipo: 'saida',
      titulo: 'Deslocamento Registrado!',
      mensagem: `Viatura ${vtrSelecionadaParaSaida.prefixo} despachada (#${res.id}) com destino a ${destinoSelecionado}.`,
      viaturaPrefixo: vtrSelecionadaParaSaida.prefixo,
      idRegistro: res.id
    });
  };

  // Confirmar Chegada
  const handleConfirmarChegada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vtrChegada || !registroAtivoChegada) return;

    const kc = Number(kmChegadaInput);
    const ks = Number(registroAtivoChegada.kmSaida);

    if (isNaN(kc) || kc <= 0) {
      setErroModal('Por favor, informe o KM de chegada.');
      return;
    }

    if (!isNaN(ks) && kc < ks) {
      setErroModal(`O KM de chegada (${kc} km) não pode ser inferior ao KM de saída (${ks} km).`);
      return;
    }

    setErroModal(null);

    // Fuso horário oficial de Brasília (UTC-3), idêntico ao desktop
    const dataHoraChegadaFmt = formatarDataHoraPtBr(getAgoraBrasilia(), true);

    const payloadAtualizado: Partial<RegistroDespacho> = {
      ...registroAtivoChegada,
      chegada: dataHoraChegadaFmt,
      kmChegada: kc,
      operador: condutor.trim()
    };

    const res = storageService.salvarRegistro(payloadAtualizado);
    soundEffects.playArrival();
    onRefreshData();

    setModalChegadaOpen(false);
    setFeedbackModal({
      isOpen: true,
      tipo: 'chegada',
      titulo: 'Retorno Registrado!',
      mensagem: `Viatura ${vtrChegada.prefixo} liberada e disponível (${kc - ks} km percorridos).`,
      viaturaPrefixo: vtrChegada.prefixo,
      idRegistro: res.id
    });
  };

  // Finalizar deslocamento anterior esquecido e abrir novo para o condutor atual
  const handleResolverConflitoEFatiar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflitoVtr || !conflitoRegistro) return;

    const kc = Number(kmFechamentoAnterior);
    const ks = Number(conflitoRegistro.kmSaida);

    if (isNaN(kc) || kc <= 0) {
      setErroModal('Por favor, informe o KM de finalização do deslocamento anterior.');
      return;
    }

    if (!isNaN(ks) && kc < ks) {
      setErroModal(`O KM informado (${kc} km) não pode ser menor que o KM de saída (${ks} km).`);
      return;
    }

    setErroModal(null);

    const dataHoraChegadaFmt = formatarDataHoraPtBr(getAgoraBrasilia(), true);

    // Finaliza o deslocamento anterior preservando o condutor original que deu a saída
    const regFinalizado: Partial<RegistroDespacho> = {
      ...conflitoRegistro,
      chegada: dataHoraChegadaFmt,
      kmChegada: kc,
      operador: conflitoRegistro.condutor
    };
    storageService.salvarRegistro(regFinalizado);

    setModalConflitoOpen(false);

    // Imediatamente abre o formulário de saída para o condutor atual
    setVtrSelecionadaParaSaida(conflitoVtr);
    setKmSaidaInput(kc);
    setDestinoSelecionado('OCORRÊNCIA');
    setNaturezaInput('');
    setBairroInput('');
    setModalSaidaOpen(true);
  };

  // Helper para formatar a data/hora abreviada para o card ocupado (ex: 27/10 08:28) no fuso de Brasília
  const formatarDataHoraAbreviada = (dataStr: string | null | undefined): string => {
    if (!dataStr) return '';
    try {
      const formatada = formatarDataHoraPtBr(dataStr);
      if (formatada && formatada.length >= 16) {
        // Formato DD/MM/AAAA HH:MM -> DD/MM HH:MM
        return `${formatada.slice(0, 5)} ${formatada.slice(11, 16)}`;
      }
      return formatada;
    } catch {}
    return String(dataStr).slice(0, 14);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none antialiased">
      {/* ========================================================== */}
      {/* HEADER NATIVO APP MOBILE                                   */}
      {/* ========================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Logo CBMGO e Identificação */}
          <div className="flex items-center gap-2.5">
            <img
              src="/cbmgo-logo.png"
              alt="CBMGO"
              className="h-8 w-auto object-contain"
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = 'https://i.imgur.com/6K44gs7.png';
              }}
            />
            <div>
              <div className="text-xs font-black text-slate-900 leading-tight tracking-tight">
                SICOVI <span className="text-indigo-600 font-extrabold">MOBILE</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-600" />
                <span className="truncate max-w-[150px]">{condutor}</span>
              </div>
            </div>
          </div>

          {/* Ações Rápidas: Alternar Desktop e Logout */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSwitchToDesktop}
              title="Alternar para Modo Central de Operações (Desktop)"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
            >
              <Monitor className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Desktop</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              title="Sair do Sistema"
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Busca de Viatura e Chips de Categoria */}
        <div className="max-w-md mx-auto mt-2.5 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buscaVtr}
              onChange={e => setBuscaVtr(e.target.value)}
              placeholder="Buscar viatura (ex: AV-756, UR, ABT)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {buscaVtr && (
              <button
                type="button"
                onClick={() => setBuscaVtr('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chips Horizontais de Filtro Rápido */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-extrabold">
            {(['TODAS', 'ADMINISTRATIVA', 'RESGATE', 'INCÊNDIO/SALVAMENTO', 'SUPORTE AVANÇADO'] as const).map(cat => {
              const label =
                cat === 'TODAS'
                  ? 'Todas'
                  : cat === 'ADMINISTRATIVA'
                  ? 'Admin'
                  : cat === 'INCÊNDIO/SALVAMENTO'
                  ? 'Incêndio'
                  : cat === 'SUPORTE AVANÇADO'
                  ? 'Sup. Avançado'
                  : 'Resgate';

              const ativo = categoriaAtiva === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaAtiva(cat)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    ativo
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================================== */}
      {/* LISTAGEM DE QUADROS DE VIATURAS (EXATAMENTE COMO NO PRINT) */}
      {/* ========================================================== */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4 space-y-6 overflow-y-auto">
        {viaturasAgrupadas.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xs my-8">
            <p className="text-sm font-bold text-slate-600 mb-1">
              Nenhuma viatura encontrada.
            </p>
            <p className="text-xs text-slate-400">
              {buscaVtr ? 'Tente buscar com outro termo.' : 'Importe as viaturas no Painel Gerencial do Central de Operações.'}
            </p>
          </div>
        ) : (
          viaturasAgrupadas.map(grupo => (
            <section key={grupo.chave} className="space-y-3">
              {/* Título da Categoria com Linhas Flanqueadas (Print) */}
              <div className="flex items-center justify-center gap-3 px-2">
                <div className="flex-1 h-[1px] bg-slate-200/90" />
                <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 px-1">
                  {grupo.titulo}
                </h2>
                <div className="flex-1 h-[1px] bg-slate-200/90" />
              </div>

              {/* Grid de 2 Colunas com Cantos Arredondados Altos */}
              <div className="grid grid-cols-2 gap-3.5">
                {grupo.lista.map(vtr => {
                  const isDisponivel = (vtr.status || '').toUpperCase() === 'DISPONÍVEL';
                  const regAtivo = !isDisponivel ? getRegistroEmAberto(vtr.prefixo) : null;
                  const IconeVtr = getViaturaIcon(vtr.categoria, vtr.prefixo);

                  if (isDisponivel) {
                    // Card Viatura DISPONÍVEL com ícone e feedback de toque
                    return (
                      <button
                        key={vtr.prefixo}
                        type="button"
                        onClick={() => handleSelecionarViatura(vtr)}
                        className="bg-white hover:bg-emerald-50/20 active:bg-emerald-100/70 active:scale-95 touch-manipulation select-none border-2 border-emerald-500 rounded-3xl p-4 min-h-[140px] flex flex-col items-center justify-center shadow-xs hover:shadow-md transition-all duration-75 cursor-pointer group text-center"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-active:scale-90 group-hover:scale-105 transition-transform">
                          <IconeVtr className="w-6 h-6" />
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                          {vtr.prefixo}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
                          Disponível
                        </span>
                      </button>
                    );
                  }

                  // Card Viatura EMPENHADA / OCUPADA: Vermelho se Ocorrência, Amarelo se Outro destino
                  const isOcorr = isDestinoOcorrencia(regAtivo?.destino);
                  const bordaCor = isOcorr ? 'border-rose-500' : 'border-amber-500';
                  const hoverBg = isOcorr ? 'hover:bg-rose-50/20 active:bg-rose-100/70' : 'hover:bg-amber-50/20 active:bg-amber-100/70';
                  const badgeBg = isOcorr ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600';
                  const textoDestino = isOcorr ? 'text-rose-600' : 'text-amber-800';
                  const dataCor = isOcorr ? 'text-rose-700' : 'text-amber-700';

                  return (
                    <button
                      key={vtr.prefixo}
                      type="button"
                      onClick={() => handleSelecionarViatura(vtr)}
                      className={`bg-white ${hoverBg} active:scale-95 touch-manipulation select-none border-2 border-dashed ${bordaCor} rounded-3xl p-3.5 min-h-[140px] flex flex-col items-center justify-center text-center shadow-xs transition-all duration-75 cursor-pointer group`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${badgeBg} flex items-center justify-center mb-1 group-active:scale-90 transition-transform`}>
                        <IconeVtr className="w-4 h-4" />
                      </div>
                      {/* Prefixo em tom suave */}
                      <span className="text-base sm:text-lg font-black text-slate-700 tracking-tight">
                        {vtr.prefixo}
                      </span>

                      {/* Nome do Militar Condutor Responsável */}
                      <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight mt-0.5 line-clamp-1">
                        {regAtivo?.condutor || 'Condutor'}
                      </span>

                      {/* Destino em destaque colorido */}
                      <span className={`text-[10px] font-black uppercase ${textoDestino} tracking-wide mt-0.5`}>
                        {regAtivo?.destino || 'Ocorrência'}
                      </span>

                      {/* Natureza em itálico */}
                      <span className="text-[10px] italic text-slate-400 mt-0.5 line-clamp-1 max-w-[130px]">
                        {regAtivo?.natureza ? regAtivo.natureza : 'S/ Natureza'}
                      </span>

                      {/* Data e Hora de Saída */}
                      <span className={`text-[10px] font-bold ${dataCor} mt-0.5`}>
                        {formatarDataHoraAbreviada(regAtivo?.saida)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ========================================================== */}
      {/* TELA / MODAL: REGISTRAR SAÍDA (EXATAMENTE COMO NO PRINT 2) */}
      {/* ========================================================== */}
      {modalSaidaOpen && vtrSelecionadaParaSaida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header da Tela: Ícone de navegação + REGISTRAR SAÍDA */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600 rotate-45" />
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                  Registrar Saída &bull; {vtrSelecionadaParaSaida.prefixo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalSaidaOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Campos Maiores e Amigáveis ao Toque */}
            <form onSubmit={handleConfirmarSaida} className="p-6 overflow-y-auto space-y-4 flex-1">
              {erroModal && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{erroModal}</span>
                </div>
              )}

              {/* 1. Responsável Atual (Print 2) */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Responsável Atual
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {condutor}
                </span>
              </div>

              {/* 2. KM Saída com Stepper [-] [ 21413 ] [+] (Print 2) */}
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  KM Saída
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => alterarKmSaida(-1)}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="bg-slate-50/90 border border-slate-200 rounded-2xl px-6 py-2.5 min-w-[130px] flex items-center justify-center">
                    <input
                      type="number"
                      value={kmSaidaInput}
                      onChange={e => setKmSaidaInput(e.target.value)}
                      className="text-2xl font-black text-slate-950 font-mono text-center w-full bg-transparent focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => alterarKmSaida(+1)}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 3. Destino (Print 2) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Destino
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['OCORRÊNCIA', 'VISTORIAS', 'SERVIÇO DA OBM', 'DIVERSOS'] as const).map(dest => {
                    const sel = destinoSelecionado === dest;
                    return (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => setDestinoSelecionado(dest)}
                        className={`p-3 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer text-center ${
                          sel
                            ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                            : 'bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {dest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Natureza da Ocorrência (com histórico e preenchimento integrado no campo) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Natureza da Ocorrência
                </span>
                <input
                  type="text"
                  list="datalist-naturezas-mobile"
                  value={naturezaInput}
                  onChange={e => setNaturezaInput(e.target.value)}
                  placeholder="Selecione ou digite (Ex: APH Clínico, Incêndio...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <datalist id="datalist-naturezas-mobile">
                  {naturezasHistorico.map(n => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              {/* 5. Bairro / Cidade (Print 2) */}
              <div className="space-y-1.5 relative">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Bairro / Cidade
                </span>
                <div className="relative">
                  <input
                    type="text"
                    value={bairroInput}
                    onChange={e => {
                      setBairroInput(e.target.value);
                      setMostrarSugestoesBairros(true);
                    }}
                    onFocus={() => setMostrarSugestoesBairros(true)}
                    placeholder="DIGITE PARA BUSCAR..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-10 py-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {mostrarSugestoesBairros && sugestoesBairrosFiltradas.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
                    {sugestoesBairrosFiltradas.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setBairroInput(b);
                          setMostrarSugestoesBairros(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-indigo-50 cursor-pointer"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Botão de Confirmar Saída (Print 2) */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
                >
                  CONFIRMAR SAÍDA
                </button>

                {/* Botão Cancelar ou Voltar caso selecionou viatura errada */}
                <button
                  type="button"
                  onClick={() => setModalSaidaOpen(false)}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancelar / Voltar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TELA / MODAL: REGISTRAR CHEGADA (RETORNO DA VIATURA)       */}
      {/* ========================================================== */}
      {modalChegadaOpen && vtrChegada && registroAtivoChegada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Header da Tela */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                  Registrar Chegada &bull; {vtrChegada.prefixo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalChegadaOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarChegada} className="p-6 overflow-y-auto space-y-4 flex-1">
              {erroModal && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{erroModal}</span>
                </div>
              )}

              {/* Resumo do Deslocamento em Aberto */}
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400">Condutor Saída:</span>
                  <span className="font-black text-slate-900">{registroAtivoChegada.condutor}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400">Data/Hora Saída:</span>
                  <span className="font-black text-slate-800">
                    {formatarDataHoraPtBr(registroAtivoChegada.saida) || registroAtivoChegada.saida}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400">Destino:</span>
                  <span className="font-black text-indigo-600">{registroAtivoChegada.destino}</span>
                </div>
                {registroAtivoChegada.bairro && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400">Bairro / Cidade:</span>
                    <span className="font-bold text-slate-700">{registroAtivoChegada.bairro}</span>
                  </div>
                )}
                {registroAtivoChegada.natureza && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400">Natureza:</span>
                    <span className="font-bold text-slate-700 italic">{registroAtivoChegada.natureza}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400">KM de Saída:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {Number(registroAtivoChegada.kmSaida).toLocaleString('pt-BR')} km
                  </span>
                </div>
              </div>

              {/* Stepper KM Chegada */}
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  KM Chegada
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => alterarKmChegada(-1)}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="bg-slate-50/90 border border-slate-200 rounded-2xl px-6 py-2.5 min-w-[130px] flex items-center justify-center">
                    <input
                      type="number"
                      value={kmChegadaInput}
                      onChange={e => setKmChegadaInput(e.target.value)}
                      className="text-2xl font-black text-slate-950 font-mono text-center w-full bg-transparent focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => alterarKmChegada(+1)}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Cálculo Dinâmico de Distância Percorrida */}
                {Number(kmChegadaInput) >= Number(registroAtivoChegada.kmSaida) && (
                  <div className="text-[11px] font-extrabold text-emerald-600 mt-1">
                    +{Number(kmChegadaInput) - Number(registroAtivoChegada.kmSaida)} km percorridos
                  </div>
                )}
              </div>

              {/* Botões de Confirmação e Cancelar */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
                >
                  CONFIRMAR RETORNO / CHEGADA
                </button>

                {/* Botão de Resolução caso seja saída esquecida de outro militar */}
                <button
                  type="button"
                  onClick={() => {
                    setModalChegadaOpen(false);
                    setConflitoVtr(vtrChegada);
                    setConflitoRegistro(registroAtivoChegada);
                    setKmFechamentoAnterior(kmChegadaInput);
                    setModalConflitoOpen(true);
                  }}
                  className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Saída de outro militar? Finalizar e iniciar nova saída
                </button>

                <button
                  type="button"
                  onClick={() => setModalChegadaOpen(false)}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancelar / Voltar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: RESOLUÇÃO DE CONFLITO (FINALIZA ANTERIOR E INICIA)  */}
      {/* ========================================================== */}
      {modalConflitoOpen && conflitoVtr && conflitoRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                  Finalizar Saída Anterior
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConflitoOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolverConflitoEFatiar} className="p-6 overflow-y-auto space-y-4 flex-1">
              {erroModal && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{erroModal}</span>
                </div>
              )}

              <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-900 leading-relaxed">
                A viatura <strong>{conflitoVtr.prefixo}</strong> estava em deslocamento com{' '}
                <strong>{conflitoRegistro.condutor}</strong>. Ao informar o KM de chegada, o registro anterior
                será concluído preservando o condutor original e um novo formulário de saída será aberto para você ({condutor}).
              </div>

              {/* Stepper KM Finalização Anterior */}
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  KM de Fechamento da Saída Anterior
                </span>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => alterarKmConflito(-1)}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="bg-slate-50/90 border border-slate-200 rounded-2xl px-6 py-2.5 min-w-[130px] flex items-center justify-center">
                    <input
                      type="number"
                      value={kmFechamentoAnterior}
                      onChange={e => setKmFechamentoAnterior(e.target.value)}
                      className="text-2xl font-black text-slate-950 font-mono text-center w-full bg-transparent focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => alterarKmConflito(+1)}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-amber-600/30 cursor-pointer transition-all"
                >
                  FINALIZAR E INICIAR MINHA SAÍDA
                </button>

                <button
                  type="button"
                  onClick={() => setModalConflitoOpen(false)}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancelar / Voltar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE SUCESSO (ESTILIZADO NA TELA)      */}
      {/* ========================================================== */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xs w-full p-6 text-center border border-slate-100">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1 inline-block">
              Registro #{feedbackModal.idRegistro}
            </span>

            <h3 className="text-base font-black text-slate-900 mb-1.5">
              {feedbackModal.titulo}
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              {feedbackModal.mensagem}
            </p>

            <button
              type="button"
              onClick={() => setFeedbackModal(null)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-md shadow-indigo-600/20 cursor-pointer active:scale-98 transition-all"
            >
              OK, Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
