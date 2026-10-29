import React, { useState, useMemo } from 'react';
import { RegistroDespacho, ViaturaItem, StatTipoItem } from '../types/sicovi';
import { parseDateTimeFormat, formatarDataHoraPtBr } from '../services/storageService';
import {
  Filter,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Ambulance,
  Flame,
  ShieldAlert,
  Car,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface StatisticsViewProps {
  registros: RegistroDespacho[];
  viaturas: ViaturaItem[];
  onRefreshFromDb: () => void;
  onLoadFullHistory?: () => Promise<void>;
  onOpenRegistro?: (registro: RegistroDespacho) => void;
}

export type CategoriaPadrao = 'INCÊNDIO/SALVAMENTO' | 'SUPORTE AVANÇADO' | 'RESGATE' | 'ADMINISTRATIVA';

export interface ViaturaCategoriaItem {
  prefixo: string;
  count: number;
  km: number;
  pct: number;
}

export interface CategoriaDetalhada {
  id: CategoriaPadrao;
  label: string;
  count: number;
  km: number;
  pctDeslocamentos: number;
  pctKm: number;
  icon: string;
  color: string;
  badgeBg: string;
  viaturas: ViaturaCategoriaItem[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  registros,
  viaturas,
  onRefreshFromDb,
  onLoadFullHistory,
  onOpenRegistro
}) => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [filtroViatura, setFiltroViatura] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [viaturasSelecionadas, setViaturasSelecionadas] = useState<string[]>([]);
  const [modoKm, setModoKm] = useState<'soma' | 'acumulado' | 'chegada'>('soma');
  const [subAba, setSubAba] = useState<'tipo' | 'categoria' | 'viatura'>('tipo');
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [modalPontoRegistros, setModalPontoRegistros] = useState<{
    isOpen: boolean;
    dataStr: string;
    registros: RegistroDespacho[];
    kmSoma: number;
  } | null>(null);

  // Sorting states for Detalhamento dos Deslocamentos
  const [sortViaturaCol, setSortViaturaCol] = useState<'viatura' | 'categoria' | 'count' | 'kmRodado' | 'ultimoKm'>('kmRodado');
  const [sortViaturaAsc, setSortViaturaAsc] = useState<boolean>(false); // default: maior para menor
  const [sortTipoCol, setSortTipoCol] = useState<'tipo' | 'count' | 'pct' | 'km' | 'media'>('count');
  const [sortTipoAsc, setSortTipoAsc] = useState<boolean>(false);

  // Pagination states
  const [tipoPage, setTipoPage] = useState(1);
  const [viaturaPage, setViaturaPage] = useState(1);
  const itemsPerPage = 8;

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Helper to normalize categories to the 4 official ones
  const getCategoriaViatura = (prefixoVtr: string): CategoriaPadrao => {
    const vtrClean = (prefixoVtr || '').trim().toUpperCase();
    const obj = viaturas.find(v => v.prefixo.trim().toUpperCase() === vtrClean);
    const cat = (obj?.categoria || '').trim().toUpperCase();

    if (cat.includes('RESGATE') || vtrClean.startsWith('UR')) return 'RESGATE';
    if (cat.includes('AVANÇADO') || cat.includes('AVANCADO') || vtrClean.startsWith('USA')) return 'SUPORTE AVANÇADO';
    if (
      cat.includes('INCÊNDIO') ||
      cat.includes('INCENDIO') ||
      cat.includes('SALVAMENTO') ||
      vtrClean.startsWith('ABT') ||
      vtrClean.startsWith('ABS') ||
      vtrClean.startsWith('ABR')
    ) {
      return 'INCÊNDIO/SALVAMENTO';
    }
    return 'ADMINISTRATIVA';
  };

  // Available Years
  const anosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    registros.forEach(r => {
      const dt = parseDateTimeFormat(r.saida);
      if (dt) set.add(String(dt.getFullYear()));
    });
    return Array.from(set).sort().reverse();
  }, [registros]);

  // Viaturas da Categoria Selecionada para Ação Rápida
  const viaturasDaCategoria = useMemo(() => {
    if (!filtroCategoria) {
      return viaturas.map(v => v.prefixo.trim().toUpperCase()).sort();
    }
    return viaturas
      .filter(v => getCategoriaViatura(v.prefixo) === filtroCategoria)
      .map(v => v.prefixo.trim().toUpperCase())
      .sort();
  }, [viaturas, filtroCategoria]);

  // Filtered Records
  const registrosFiltrados = useMemo(() => {
    const dtIni = dataInicio ? new Date(dataInicio + 'T00:00:00') : null;
    const dtFim = dataFim ? new Date(dataFim + 'T23:59:59') : null;

    return registros.filter(r => {
      const vtr = r.viatura.trim().toUpperCase();

      // Multi-viaturas filter check
      if (viaturasSelecionadas.length > 0) {
        if (!viaturasSelecionadas.includes(vtr)) return false;
      } else if (filtroViatura && vtr !== filtroViatura.trim().toUpperCase()) {
        return false;
      }

      // Category filter check
      const catVtr = getCategoriaViatura(vtr);
      if (filtroCategoria && catVtr !== filtroCategoria) return false;

      const dt = parseDateTimeFormat(r.saida);
      if (!dt) {
        if (dtIni || dtFim || filtroAno || filtroMes || filtroDia) return false;
        return true;
      }

      if (dtIni && dt < dtIni) return false;
      if (dtFim && dt > dtFim) return false;
      if (filtroAno && String(dt.getFullYear()) !== filtroAno) return false;
      if (filtroMes) {
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        if (m !== filtroMes) return false;
      }
      if (filtroDia) {
        const ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        if (ymd !== filtroDia) return false;
      }

      return true;
    });
  }, [registros, viaturas, dataInicio, dataFim, filtroAno, filtroMes, filtroDia, filtroViatura, filtroCategoria, viaturasSelecionadas]);

  // Aggregate Metrics
  const { totalDeslocamentos, totalKm, mediaKm, totalOcorrencias, viaturasAtivasCount } = useMemo(() => {
    let tKm = 0;
    let tOcorr = 0;
    const vtrsSet = new Set<string>();

    registrosFiltrados.forEach(r => {
      if (r.viatura) vtrsSet.add(r.viatura.trim().toUpperCase());
      const dest = (r.destino || '').toUpperCase();
      if (dest.includes('OCORR') || dest === 'OCORRÊNCIA' || dest === 'OCORRENCIA') tOcorr++;

      const ks = Number(r.kmSaida);
      const kc = Number(r.kmChegada);
      if (!isNaN(ks) && !isNaN(kc) && kc >= ks) {
        tKm += kc - ks;
      }
    });

    const count = registrosFiltrados.length;
    const media = count > 0 ? (tKm / count).toFixed(1) : '0';

    return {
      totalDeslocamentos: count,
      totalKm: tKm,
      mediaKm: media,
      totalOcorrencias: tOcorr,
      viaturasAtivasCount: vtrsSet.size
    };
  }, [registrosFiltrados]);

  // Viatura Única Ativa (detecta se há exatamente uma viatura em foco no gráfico)
  const viaturaUnicaAtiva = useMemo(() => {
    if (viaturasSelecionadas.length === 1) return viaturasSelecionadas[0];
    if (filtroViatura && viaturasSelecionadas.length === 0) return filtroViatura.trim().toUpperCase();
    if (viaturasAtivasCount === 1 && registrosFiltrados.length > 0) {
      return registrosFiltrados[0].viatura.trim().toUpperCase();
    }
    return null;
  }, [viaturasSelecionadas, filtroViatura, viaturasAtivasCount, registrosFiltrados]);

  // Se o modo for 'chegada' mas não houver viatura única ativa, volta para 'soma'
  const effectiveModoKm = modoKm === 'chegada' && !viaturaUnicaAtiva ? 'soma' : modoKm;

  // 1. Agrupamento "Por Tipo" (somado e consolidado para evitar explosão de tipos)
  const listaTipos: StatTipoItem[] = useMemo(() => {
    const mapa: Record<string, { tipo: string; count: number; km: number }> = {};

    registrosFiltrados.forEach(r => {
      let raw = (r.destino || 'Não especificado').trim();
      if (!raw) raw = 'Não especificado';

      // Normalização inteligente de tipos para agregação
      const upper = raw.toUpperCase();
      let key = raw;
      if (upper === 'OCORRENCIA' || upper === 'OCORRÊNCIA') key = 'Ocorrência';
      else if (upper.includes('ABASTEC')) key = 'Abastecimento';
      else if (upper.includes('OBM') || upper.includes('SERVIÇO') || upper.includes('SERVICO')) key = 'A serviço da OBM';
      else if (upper.includes('INSTRUÇÃO') || upper.includes('INSTRUCAO') || upper.includes('TREINAMENTO')) key = 'Instrução / Treinamento';
      else if (upper.includes('MANUTENÇÃO') || upper.includes('MANUTENCAO') || upper.includes('OFICINA')) key = 'Manutenção / Oficina';
      else if (upper.includes('VISTORIA')) key = 'Vistoria Técnica';
      else {
        // Padroniza primeira letra maiúscula
        key = raw.charAt(0).toUpperCase() + raw.slice(1);
      }

      if (!mapa[key]) mapa[key] = { tipo: key, count: 0, km: 0 };
      mapa[key].count++;

      const ks = Number(r.kmSaida);
      const kc = Number(r.kmChegada);
      if (!isNaN(ks) && !isNaN(kc) && kc >= ks) {
        mapa[key].km += kc - ks;
      }
    });

    return Object.values(mapa)
      .map(item => ({
        ...item,
        pct: totalDeslocamentos > 0 ? (item.count / totalDeslocamentos) * 100 : 0,
        media: item.count > 0 ? item.km / item.count : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [registrosFiltrados, totalDeslocamentos]);

  // Lista de Tipos Ordenada conforme clique do usuário nas colunas
  const listaTiposOrdenada = useMemo(() => {
    return [...listaTipos].sort((a, b) => {
      let cmp = 0;
      if (sortTipoCol === 'tipo') cmp = a.tipo.localeCompare(b.tipo);
      else if (sortTipoCol === 'count') cmp = a.count - b.count;
      else if (sortTipoCol === 'pct') cmp = a.pct - b.pct;
      else if (sortTipoCol === 'km') cmp = a.km - b.km;
      else if (sortTipoCol === 'media') cmp = a.media - b.media;
      return sortTipoAsc ? cmp : -cmp;
    });
  }, [listaTipos, sortTipoCol, sortTipoAsc]);

  // Paginated Tipos
  const totalPaginasTipos = Math.max(1, Math.ceil(listaTiposOrdenada.length / itemsPerPage));
  const tiposPaginados = useMemo(() => {
    const start = (tipoPage - 1) * itemsPerPage;
    return listaTiposOrdenada.slice(start, start + itemsPerPage);
  }, [listaTiposOrdenada, tipoPage]);

  // 2. Agrupamento e Detalhamento "Por Categoria" com suas viaturas respectivas ordenadas de maior para menor
  const categoriasDetalhadas: CategoriaDetalhada[] = useMemo(() => {
    const mapa: Record<
      CategoriaPadrao,
      {
        count: number;
        km: number;
        viaturasMap: Record<string, { count: number; km: number }>;
      }
    > = {
      'INCÊNDIO/SALVAMENTO': { count: 0, km: 0, viaturasMap: {} },
      'SUPORTE AVANÇADO': { count: 0, km: 0, viaturasMap: {} },
      RESGATE: { count: 0, km: 0, viaturasMap: {} },
      ADMINISTRATIVA: { count: 0, km: 0, viaturasMap: {} }
    };

    registrosFiltrados.forEach(r => {
      const vtr = r.viatura.trim().toUpperCase();
      const cat = getCategoriaViatura(vtr);

      mapa[cat].count++;

      const ks = Number(r.kmSaida);
      const kc = Number(r.kmChegada);
      const km = !isNaN(ks) && !isNaN(kc) && kc >= ks ? kc - ks : 0;
      mapa[cat].km += km;

      if (vtr) {
        if (!mapa[cat].viaturasMap[vtr]) {
          mapa[cat].viaturasMap[vtr] = { count: 0, km: 0 };
        }
        mapa[cat].viaturasMap[vtr].count++;
        mapa[cat].viaturasMap[vtr].km += km;
      }
    });

    const config: Record<
      CategoriaPadrao,
      { label: string; icon: string; color: string; badgeBg: string }
    > = {
      'INCÊNDIO/SALVAMENTO': {
        label: 'Incêndio & Salvamento',
        icon: 'flame',
        color: '#dc2626',
        badgeBg: 'bg-red-50 text-red-800 border-red-200'
      },
      'SUPORTE AVANÇADO': {
        label: 'Suporte Avançado',
        icon: 'shield-alert',
        color: '#d97706',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200'
      },
      RESGATE: {
        label: 'Resgate',
        icon: 'ambulance',
        color: '#059669',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      },
      ADMINISTRATIVA: {
        label: 'Administrativa',
        icon: 'car',
        color: '#2563eb',
        badgeBg: 'bg-blue-50 text-blue-800 border-blue-200'
      }
    };

    const ordem: CategoriaPadrao[] = ['RESGATE', 'INCÊNDIO/SALVAMENTO', 'SUPORTE AVANÇADO', 'ADMINISTRATIVA'];

    return ordem.map(catKey => {
      const item = mapa[catKey];
      const cfg = config[catKey];

      // Build sorted list of respective vehicles for this category (highest KM to lowest KM)
      const viaturasList: ViaturaCategoriaItem[] = Object.entries(item.viaturasMap)
        .map(([prefixo, d]) => ({
          prefixo,
          count: d.count,
          km: d.km,
          pct: item.km > 0 ? (d.km / item.km) * 100 : item.count > 0 ? (d.count / item.count) * 100 : 0
        }))
        .sort((a, b) => (b.km !== a.km ? b.km - a.km : b.count - a.count));

      return {
        id: catKey,
        label: cfg.label,
        count: item.count,
        km: item.km,
        pctDeslocamentos: totalDeslocamentos > 0 ? (item.count / totalDeslocamentos) * 100 : 0,
        pctKm: totalKm > 0 ? (item.km / totalKm) * 100 : 0,
        icon: cfg.icon,
        color: cfg.color,
        badgeBg: cfg.badgeBg,
        viaturas: viaturasList
      };
    });
  }, [registrosFiltrados, viaturas, totalDeslocamentos, totalKm]);

  // 3. Agrupamento por Viatura
  const listaViaturas = useMemo(() => {
    const mapa: Record<string, { viatura: string; categoria: string; count: number; kmRodado: number; ultimoKm: number }> = {};

    registrosFiltrados.forEach(r => {
      const vtr = r.viatura.trim().toUpperCase();
      if (!mapa[vtr]) {
        mapa[vtr] = {
          viatura: vtr,
          categoria: getCategoriaViatura(vtr),
          count: 0,
          kmRodado: 0,
          ultimoKm: 0
        };
      }

      mapa[vtr].count++;
      const ks = Number(r.kmSaida);
      const kc = Number(r.kmChegada);
      if (!isNaN(ks) && !isNaN(kc) && kc >= ks) {
        mapa[vtr].kmRodado += kc - ks;
        if (kc > mapa[vtr].ultimoKm) mapa[vtr].ultimoKm = kc;
      } else if (!isNaN(ks) && ks > mapa[vtr].ultimoKm) {
        mapa[vtr].ultimoKm = ks;
      }
    });

    return Object.values(mapa);
  }, [registrosFiltrados, viaturas]);

  // Lista de Viaturas Ordenada conforme clique do usuário nas colunas
  const listaViaturasOrdenada = useMemo(() => {
    return [...listaViaturas].sort((a, b) => {
      let cmp = 0;
      if (sortViaturaCol === 'viatura') cmp = a.viatura.localeCompare(b.viatura);
      else if (sortViaturaCol === 'categoria') cmp = a.categoria.localeCompare(b.categoria);
      else if (sortViaturaCol === 'count') cmp = a.count - b.count;
      else if (sortViaturaCol === 'kmRodado') cmp = a.kmRodado - b.kmRodado;
      else if (sortViaturaCol === 'ultimoKm') cmp = a.ultimoKm - b.ultimoKm;
      return sortViaturaAsc ? cmp : -cmp;
    });
  }, [listaViaturas, sortViaturaCol, sortViaturaAsc]);

  const totalPaginasViaturas = Math.max(1, Math.ceil(listaViaturasOrdenada.length / itemsPerPage));
  const viaturasPaginadas = useMemo(() => {
    const start = (viaturaPage - 1) * itemsPerPage;
    return listaViaturasOrdenada.slice(start, start + itemsPerPage);
  }, [listaViaturasOrdenada, viaturaPage]);

  // Chart 1: Time Series Data Points (Soma dos KM percorridos por Categoria / Viaturas Selecionadas ou Odômetro de Chegada)
  const chartPoints = useMemo(() => {
    const registrosValidos: { r: RegistroDespacho; dt: Date; km: number; kmChegadaVal: number; kmSaidaVal: number }[] = [];
    const diasSet = new Set<string>();

    registrosFiltrados.forEach(r => {
      const dt = parseDateTimeFormat(r.saida);
      if (!dt) return;

      const ks = Number(r.kmSaida);
      const kc = Number(r.kmChegada);
      const kmRod = !isNaN(ks) && !isNaN(kc) && kc >= ks ? (kc - ks) : 0;
      const kmChegadaVal = !isNaN(kc) && kc > 0 ? kc : (!isNaN(ks) ? ks : 0);
      const kmSaidaVal = !isNaN(ks) ? ks : 0;

      registrosValidos.push({ r, dt, km: kmRod, kmChegadaVal, kmSaidaVal });
      diasSet.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
    });

    if (registrosValidos.length === 0) return [];

    interface AggPoint {
      key: string;
      date: Date;
      dateStr: string;
      kmSoma: number;
      kmAcumulado: number;
      kmChegada: number;
      kmSaida: number;
      deslocamentosCount: number;
      registros: RegistroDespacho[];
      porCategoria: Record<string, number>;
      porViatura: Record<string, number>;
    }

    // Se estiver no modo 'chegada' (quando apenas uma viatura está acionada),
    // mostramos a evolução do KM de chegada em cada deslocamento!
    if (effectiveModoKm === 'chegada') {
      const sortedRegistros = [...registrosValidos].sort((a, b) => a.dt.getTime() - b.dt.getTime());
      return sortedRegistros.map(({ r, dt, km, kmChegadaVal, kmSaidaVal }, idx) => {
        const fullPt = formatarDataHoraPtBr(dt);
        const cat = getCategoriaViatura(r.viatura);
        const vtr = r.viatura.trim().toUpperCase();

        return {
          key: `${dt.getTime()}_${r.id}_${idx}`,
          date: dt,
          dateStr: `${fullPt.slice(0, 5)} ${fullPt.slice(11, 16)}`,
          kmSoma: km,
          kmAcumulado: 0,
          kmChegada: kmChegadaVal,
          kmSaida: kmSaidaVal,
          deslocamentosCount: 1,
          registros: [r],
          porCategoria: { [cat]: km },
          porViatura: { [vtr]: km }
        };
      });
    }

    const agruparPorDia = diasSet.size > 1;
    const mapa = new Map<string, AggPoint>();

    registrosValidos.forEach(({ r, dt, km, kmChegadaVal, kmSaidaVal }) => {
      let key = '';
      let dateStr = '';
      const cat = getCategoriaViatura(r.viatura);
      const vtr = r.viatura.trim().toUpperCase();

      if (agruparPorDia) {
        const diaPt = formatarDataHoraPtBr(dt);
        key = diaPt.slice(0, 10);
        dateStr = diaPt.slice(0, 5); // DD/MM
      } else {
        const fullPt = formatarDataHoraPtBr(dt);
        key = `${fullPt}_${r.id}`;
        dateStr = `${fullPt.slice(0, 5)} ${fullPt.slice(11, 16)}`;
      }

      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          date: dt,
          dateStr,
          kmSoma: 0,
          kmAcumulado: 0,
          kmChegada: kmChegadaVal,
          kmSaida: kmSaidaVal,
          deslocamentosCount: 0,
          registros: [],
          porCategoria: {},
          porViatura: {}
        });
      }

      const pt = mapa.get(key)!;
      pt.kmSoma += km;
      pt.deslocamentosCount++;
      pt.registros.push(r);
      if (kmChegadaVal > pt.kmChegada) pt.kmChegada = kmChegadaVal;
      pt.porCategoria[cat] = (pt.porCategoria[cat] || 0) + km;
      pt.porViatura[vtr] = (pt.porViatura[vtr] || 0) + km;
    });

    const sorted = Array.from(mapa.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

    let acum = 0;
    sorted.forEach(p => {
      acum += p.kmSoma;
      p.kmAcumulado = acum;
    });

    return sorted;
  }, [registrosFiltrados, viaturas, effectiveModoKm]);

  const clearFilters = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroAno('');
    setFiltroMes('');
    setFiltroDia('');
    setFiltroViatura('');
    setFiltroCategoria('');
    setViaturasSelecionadas([]);
    setTipoPage(1);
    setViaturaPage(1);
  };

  const handleBuscarHistoricoAntigo = async () => {
    if (!onLoadFullHistory) return;
    setIsLoadingHistory(true);
    try {
      await onLoadFullHistory();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Compact SVG Chart rendering dimensions (ampliado para melhor resolução na timeline)
  const chartWidth = 680;
  const chartHeight = 195;
  const padLeft = 52;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 32;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const yValues = chartPoints.map(p => {
    if (effectiveModoKm === 'chegada') return p.kmChegada;
    if (effectiveModoKm === 'acumulado') return p.kmAcumulado;
    return p.kmSoma;
  });

  const minVal = yValues.length > 0 ? Math.min(...yValues) : 0;
  const maxVal = yValues.length > 0 ? Math.max(...yValues) : 100;

  // No modo chegada, para dar escala visual precisa ao odômetro e mostrar a inclinação da curva com clareza:
  const minY = effectiveModoKm === 'chegada'
    ? Math.max(0, Math.floor(minVal - (maxVal - minVal > 0 ? (maxVal - minVal) * 0.15 : 10)))
    : 0;
  const maxY = effectiveModoKm === 'chegada'
    ? Math.ceil(maxVal + (maxVal - minY > 0 ? (maxVal - minY) * 0.1 : 10))
    : (yValues.length > 0 ? Math.max(...yValues, 10) : 100);
  const rangeY = maxY - minY === 0 ? 1 : maxY - minY;

  const coords = chartPoints.map((p, idx) => {
    const x = chartPoints.length === 1 ? padLeft + innerW / 2 : padLeft + (idx / (chartPoints.length - 1)) * innerW;
    const val = effectiveModoKm === 'chegada' ? p.kmChegada : effectiveModoKm === 'acumulado' ? p.kmAcumulado : p.kmSoma;
    const y = padTop + innerH - ((val - minY) / rangeY) * innerH;
    return { x, y, raw: p, valor: val };
  });

  const pathLine =
    coords.length > 0
      ? coords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
      : '';
  const pathArea =
    coords.length > 0
      ? `${pathLine} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + innerH} L ${coords[0].x.toFixed(1)} ${
          padTop + innerH
        } Z`
      : '';

  // Max KM among categories for proportional bars in Chart 2
  const maxCategoriaKm = Math.max(...categoriasDetalhadas.map(c => c.km), 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Filter Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
            <Filter className="w-3.5 h-3.5 text-red-700" />
            <span>Filtros de Análise Estatística</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onLoadFullHistory && (
              <button
                type="button"
                onClick={handleBuscarHistoricoAntigo}
                disabled={isLoadingHistory}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Puxa registros de mais de 30 dias atrás sob demanda do Supabase"
              >
                <Database className="w-3.5 h-3.5 text-amber-700" />
                <span>{isLoadingHistory ? 'Carregando...' : 'Buscar Histórico Antigo (> 30 dias)'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRefreshFromDb}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Dados</span>
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Data Inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => {
                setDataInicio(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Data Final</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => {
                setDataFim(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Ano</label>
            <select
              value={filtroAno}
              onChange={e => {
                setFiltroAno(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">Todos os anos</option>
              {anosDisponiveis.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mês</label>
            <select
              value={filtroMes}
              onChange={e => {
                setFiltroMes(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">Todos os meses</option>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Dia Específico</label>
            <input
              type="date"
              value={filtroDia}
              onChange={e => {
                setFiltroDia(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Viatura</label>
            <select
              value={filtroViatura}
              onChange={e => {
                setFiltroViatura(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">Todas as viaturas</option>
              {viaturas.map(v => (
                <option key={v.prefixo} value={v.prefixo}>
                  {v.prefixo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Categoria</label>
            <select
              value={filtroCategoria}
              onChange={e => {
                setFiltroCategoria(e.target.value);
                setTipoPage(1);
                setViaturaPage(1);
              }}
              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">Todas as categorias</option>
              <option value="RESGATE">Resgate</option>
              <option value="INCÊNDIO/SALVAMENTO">Incêndio &amp; Salvamento</option>
              <option value="SUPORTE AVANÇADO">Suporte Avançado</option>
              <option value="ADMINISTRATIVA">Administrativa</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-800 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{totalDeslocamentos}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Deslocamentos Totais</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-emerald-700 text-lg">speed</span>
          </div>
          <div>
            <div className="text-base font-black text-emerald-700 leading-tight">
              {totalKm.toLocaleString('pt-BR')} km
            </div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">KM Rodados Totais</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-blue-700 text-lg">avg_pace</span>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{mediaKm} km</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Média por Saída</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-rose-700 text-lg">local_fire_department</span>
          </div>
          <div>
            <div className="text-base font-black text-rose-700 leading-tight">{totalOcorrencias}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Em Ocorrência</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{viaturasAtivasCount}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Viaturas Utilizadas</div>
          </div>
        </div>
      </div>

      {/* Two Charts: Expanded Temporal Evolution (Left) & Compact Category Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Evolução Temporal de KM (Larger Width Allocation) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between lg:col-span-7 xl:col-span-8">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-700 text-base">show_chart</span>
                <span>
                  {effectiveModoKm === 'chegada'
                    ? `Evolução do Odômetro (KM de Chegada) • ${viaturaUnicaAtiva}`
                    : 'Evolução Temporal do KM (Soma dos Deslocamentos)'}
                </span>
              </h3>
              <p className="text-[10px] text-slate-500">
                {effectiveModoKm === 'chegada'
                  ? `Odômetro e KM final de chegada em cada deslocamento da viatura ${viaturaUnicaAtiva}`
                  : filtroCategoria
                  ? `Soma das viaturas de ${filtroCategoria}`
                  : 'Soma combinada de todas as categorias e viaturas'}
                {effectiveModoKm !== 'chegada' && viaturasSelecionadas.length > 0 ? ` • ${viaturasSelecionadas.join(', ')}` : ''} •{' '}
                <span className="text-red-700 font-semibold">Duplo clique em um ponto para abrir registros</span>
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setModoKm('soma')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  effectiveModoKm === 'soma' ? 'bg-white text-red-800 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Soma por Período
              </button>
              <button
                type="button"
                onClick={() => setModoKm('acumulado')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  effectiveModoKm === 'acumulado' ? 'bg-white text-red-800 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Soma Acumulada
              </button>
              {viaturaUnicaAtiva && (
                <button
                  type="button"
                  onClick={() => setModoKm('chegada')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    effectiveModoKm === 'chegada' ? 'bg-white text-red-800 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Exibir odômetro e KM de chegada a cada deslocamento da viatura ${viaturaUnicaAtiva}`}
                >
                  <TrendingUp className="w-3 h-3 text-red-700" />
                  <span>Evolução do KM (Chegada)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Legend / Filters (Categoria, Viaturas Multi-Select, Ano, Mês) */}
          <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 mb-2 flex flex-col gap-2 text-xs">
            {/* Categorias quick action */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase mr-1">Categoria:</span>
              <button
                type="button"
                onClick={() => {
                  setFiltroCategoria('');
                  setViaturasSelecionadas([]);
                  setFiltroViatura('');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  !filtroCategoria
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todas as Categorias
              </button>
              <button
                type="button"
                onClick={() => {
                  const nova = filtroCategoria === 'RESGATE' ? '' : 'RESGATE';
                  setFiltroCategoria(nova);
                  setViaturasSelecionadas([]);
                  setFiltroViatura('');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  filtroCategoria === 'RESGATE'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <Ambulance className="w-3 h-3" />
                <span>Resgate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nova = filtroCategoria === 'INCÊNDIO/SALVAMENTO' ? '' : 'INCÊNDIO/SALVAMENTO';
                  setFiltroCategoria(nova);
                  setViaturasSelecionadas([]);
                  setFiltroViatura('');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  filtroCategoria === 'INCÊNDIO/SALVAMENTO'
                    ? 'bg-red-700 border-red-800 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-red-800 hover:bg-red-50'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Incêndio/Salvamento</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nova = filtroCategoria === 'SUPORTE AVANÇADO' ? '' : 'SUPORTE AVANÇADO';
                  setFiltroCategoria(nova);
                  setViaturasSelecionadas([]);
                  setFiltroViatura('');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  filtroCategoria === 'SUPORTE AVANÇADO'
                    ? 'bg-amber-600 border-amber-700 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Suporte Avançado</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nova = filtroCategoria === 'ADMINISTRATIVA' ? '' : 'ADMINISTRATIVA';
                  setFiltroCategoria(nova);
                  setViaturasSelecionadas([]);
                  setFiltroViatura('');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  filtroCategoria === 'ADMINISTRATIVA'
                    ? 'bg-blue-600 border-blue-700 text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-blue-800 hover:bg-blue-50'
                }`}
              >
                <Car className="w-3 h-3" />
                <span>Administrativa</span>
              </button>
            </div>

            {/* Linha 2: Multi-seleção de Viaturas e Filtros Temporais */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-200/60">
              <div className="flex items-center gap-1 mr-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase">Viaturas:</span>
                {viaturasSelecionadas.length > 0 && (
                  <span className="text-[9px] bg-red-100 text-red-800 font-extrabold px-1.5 py-0.2 rounded-full">
                    {viaturasSelecionadas.length} ativas (Soma combinada)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setViaturasSelecionadas([]);
                  setFiltroViatura('');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  viaturasSelecionadas.length === 0
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todas ({viaturasDaCategoria.length})
              </button>

              {viaturasDaCategoria.map(vtr => {
                const isSel = viaturasSelecionadas.includes(vtr);
                return (
                  <button
                    key={vtr}
                    type="button"
                    onClick={() => {
                      setViaturasSelecionadas(prev =>
                        prev.includes(vtr) ? prev.filter(x => x !== vtr) : [...prev, vtr]
                      );
                      setFiltroViatura('');
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      isSel
                        ? 'bg-red-700 border-red-800 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200'
                    }`}
                  >
                    {isSel && <Check className="w-2.5 h-2.5" />}
                    <span>{vtr}</span>
                  </button>
                );
              })}

              {/* Anos e Meses quick action */}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ano:</span>
                  <select
                    value={filtroAno}
                    onChange={e => setFiltroAno(e.target.value)}
                    className="px-2 py-0.5 text-[10px] font-bold border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="">Todos</option>
                    {anosDisponiveis.map(a => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mês:</span>
                  <select
                    value={filtroMes}
                    onChange={e => setFiltroMes(e.target.value)}
                    className="px-2 py-0.5 text-[10px] font-bold border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="">Todos</option>
                    <option value="01">Jan</option>
                    <option value="02">Fev</option>
                    <option value="03">Mar</option>
                    <option value="04">Abr</option>
                    <option value="05">Mai</option>
                    <option value="06">Jun</option>
                    <option value="07">Jul</option>
                    <option value="08">Ago</option>
                    <option value="09">Set</option>
                    <option value="10">Out</option>
                    <option value="11">Nov</option>
                    <option value="12">Dez</option>
                  </select>
                </div>

                {(filtroCategoria || viaturasSelecionadas.length > 0 || filtroAno || filtroMes) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroCategoria('');
                      setViaturasSelecionadas([]);
                      setFiltroViatura('');
                      setFiltroAno('');
                      setFiltroMes('');
                    }}
                    className="text-[10px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer ml-1"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SVG Line Graph */}
          {chartPoints.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum dado de quilometragem para os filtros e viaturas ativos.
            </div>
          ) : (
            <div className="w-full relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none">
                <defs>
                  <linearGradient id="areaGradientCompact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#991b1b" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.33, 0.66, 1].map((pct, i) => {
                  const y = padTop + innerH - pct * innerH;
                  const val = Math.round(minY + pct * rangeY);
                  return (
                    <g key={i}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={i === 0 || i === 3 ? 'none' : '3,3'}
                      />
                      <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#64748b" fontWeight="600">
                        {val.toLocaleString('pt-BR')} km
                      </text>
                    </g>
                  );
                })}

                {/* Filled Area */}
                <path d={pathArea} fill="url(#areaGradientCompact)" />

                {/* Line */}
                <path
                  d={pathLine}
                  fill="none"
                  stroke="#991b1b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Points with double-click to view dispatch modal */}
                {coords.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint === pt ? 6 : 3.5}
                      fill="#ffffff"
                      stroke="#991b1b"
                      strokeWidth={hoveredPoint === pt ? 3 : 2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onDoubleClick={() => {
                        if (pt.raw.registros.length === 1) {
                          if (onOpenRegistro) onOpenRegistro(pt.raw.registros[0]);
                        } else if (pt.raw.registros.length > 1) {
                          setModalPontoRegistros({
                            isOpen: true,
                            dataStr: pt.raw.dateStr,
                            registros: pt.raw.registros,
                            kmSoma: pt.raw.kmSoma
                          });
                        }
                      }}
                    />
                    {effectiveModoKm === 'chegada' && (coords.length <= 25 || idx % Math.ceil(coords.length / 15) === 0 || idx === coords.length - 1) && (
                      <text
                        x={pt.x}
                        y={pt.y - 8}
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#0f172a"
                        fontWeight="800"
                        className="pointer-events-none select-none"
                      >
                        {pt.valor.toLocaleString('pt-BR')}
                      </text>
                    )}
                    {(idx === 0 || idx === coords.length - 1 || idx === Math.floor(coords.length / 2)) && (
                      <text
                        x={pt.x}
                        y={padTop + innerH + 16}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {pt.raw.dateStr.split(' ')[0]}
                      </text>
                    )}
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute z-30 bg-slate-900 text-white text-[10px] rounded-xl p-3 shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 min-w-[200px] border border-slate-700"
                  style={{
                    left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                    top: `${(hoveredPoint.y / chartHeight) * 100}%`
                  }}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1">
                    <span className="font-extrabold text-red-400">{hoveredPoint.raw.dateStr}</span>
                    <span className="text-[9px] bg-red-900 text-red-200 px-1.5 py-0.2 rounded font-black">
                      {hoveredPoint.raw.deslocamentosCount} {hoveredPoint.raw.deslocamentosCount === 1 ? 'saída' : 'saídas'}
                    </span>
                  </div>

                  <div className="space-y-0.5 mb-1.5">
                    {effectiveModoKm === 'chegada' ? (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">KM de Chegada:</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {hoveredPoint.valor.toLocaleString('pt-BR')} km
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">KM de Saída:</span>
                          <span className="font-mono font-bold text-slate-300">
                            {hoveredPoint.raw.kmSaida ? hoveredPoint.raw.kmSaida.toLocaleString('pt-BR') + ' km' : '---'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">KM Percorrido:</span>
                          <span className="font-mono font-bold text-emerald-300">
                            +{hoveredPoint.raw.kmSoma.toLocaleString('pt-BR')} km
                          </span>
                        </div>
                        {hoveredPoint.raw.registros[0] && (
                          <div className="border-t border-slate-800 pt-1 mt-1 text-[9px] space-y-0.5">
                            <div className="text-slate-300 truncate">
                              <strong>Destino:</strong> {hoveredPoint.raw.registros[0].destino || '---'}
                            </div>
                            <div className="text-slate-400 truncate">
                              <strong>Condutor:</strong> {hoveredPoint.raw.registros[0].condutor || '---'}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">Soma de KM:</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {hoveredPoint.raw.kmSoma.toLocaleString('pt-BR')} km
                          </span>
                        </div>
                        {effectiveModoKm === 'acumulado' && (
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">Total Acumulado:</span>
                            <span className="font-mono font-bold text-slate-200">
                              {hoveredPoint.raw.kmAcumulado.toLocaleString('pt-BR')} km
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Detalhe por Categoria */}
                  {Object.keys(hoveredPoint.raw.porCategoria).length > 1 && (
                    <div className="border-t border-slate-800 pt-1 mb-1 space-y-0.5 text-[9px]">
                      <div className="font-bold text-slate-400 uppercase text-[8px]">Por Categoria:</div>
                      {Object.entries(hoveredPoint.raw.porCategoria).map(([cat, km]) => (
                        <div key={cat} className="flex justify-between">
                          <span className="text-slate-300 truncate max-w-[120px]">{cat}:</span>
                          <span className="font-mono text-slate-100 font-bold">{Number(km).toLocaleString('pt-BR')} km</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Detalhe por Viatura */}
                  {Object.keys(hoveredPoint.raw.porViatura).length > 1 && (
                    <div className="border-t border-slate-800 pt-1 mb-1 space-y-0.5 text-[9px]">
                      <div className="font-bold text-slate-400 uppercase text-[8px]">Por Viatura:</div>
                      {Object.entries(hoveredPoint.raw.porViatura).slice(0, 4).map(([vtr, km]) => (
                        <div key={vtr} className="flex justify-between">
                          <span className="text-slate-300">{vtr}:</span>
                          <span className="font-mono text-slate-100 font-bold">{Number(km).toLocaleString('pt-BR')} km</span>
                        </div>
                      ))}
                      {Object.keys(hoveredPoint.raw.porViatura).length > 4 && (
                        <div className="text-[8px] text-slate-400 text-right">
                          +{Object.keys(hoveredPoint.raw.porViatura).length - 4} outras viaturas
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-1 text-[8px] text-emerald-300 italic text-center">
                    Duplo clique para abrir {hoveredPoint.raw.deslocamentosCount === 1 ? 'o registro' : 'a lista de saídas'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart 2: Soma de KM Percorrido por Categoria (Compact Width Allocation) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between lg:col-span-5 xl:col-span-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-700" />
                <span>Soma de KM Percorrido por Categoria</span>
              </h3>
              <p className="text-[10px] text-slate-500">
                Distribuição comparativa do consumo total de quilometragem da frota
              </p>
            </div>
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
              Total: {totalKm.toLocaleString('pt-BR')} km
            </span>
          </div>

          <div className="flex flex-col gap-3 my-auto pt-1">
            {categoriasDetalhadas.map(cat => {
              const barPercent = maxCategoriaKm > 0 ? (cat.km / maxCategoriaKm) * 100 : 0;
              return (
                <div key={cat.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      {cat.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-red-600" />}
                      {cat.icon === 'ambulance' && <Ambulance className="w-3.5 h-3.5 text-emerald-600" />}
                      {cat.icon === 'shield-alert' && <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />}
                      {cat.icon === 'car' && <Car className="w-3.5 h-3.5 text-blue-600" />}
                      <span>{cat.label}</span>
                      <span className="text-[10px] font-medium text-slate-400">({cat.count} saídas)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-slate-900">
                        {cat.km.toLocaleString('pt-BR')} km
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 w-11 text-right">
                        {cat.pctKm.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Proportional Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(barPercent, cat.km > 0 ? 3 : 0)}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Classificação pelas 4 categorias operacionais regulamentares</span>
            <span className="font-bold text-slate-700">{totalDeslocamentos} saídas computadas</span>
          </div>
        </div>
      </div>

      {/* Detalhamento dos Totais de Deslocamento */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
              <span className="material-symbols-outlined text-slate-700 text-base">format_list_bulleted</span>
              <span>Detalhamento dos Deslocamentos</span>
            </div>

            {/* Chip para Desmarcar Viatura Filtrada */}
            {(filtroViatura || viaturasSelecionadas.length > 0) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-300 rounded-lg text-xs font-bold text-red-900 shadow-2xs">
                <span>
                  Viatura(s) Filtrada(s):{' '}
                  <strong>{viaturasSelecionadas.length > 0 ? viaturasSelecionadas.join(', ') : filtroViatura}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroViatura('');
                    setViaturasSelecionadas([]);
                  }}
                  className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-white hover:bg-red-100 border border-red-300 text-red-700 text-[10px] font-extrabold cursor-pointer transition-colors"
                  title="Desmarcar todas as viaturas para remover filtragem"
                >
                  <X className="w-3 h-3" />
                  <span>Desmarcar</span>
                </button>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setSubAba('tipo');
                setTipoPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                subAba === 'tipo' ? 'bg-white text-red-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Tipo ({listaTipos.length})
            </button>
            <button
              type="button"
              onClick={() => setSubAba('categoria')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                subAba === 'categoria' ? 'bg-white text-red-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Categoria (4)
            </button>
            <button
              type="button"
              onClick={() => {
                setSubAba('viatura');
                setViaturaPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                subAba === 'viatura' ? 'bg-white text-red-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Viatura ({listaViaturas.length})
            </button>
          </div>
        </div>

        {/* 1. Sub-view: Por Tipo (Agrupado & com Paginação e Ordenação) */}
        {subAba === 'tipo' && (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 select-none">
                    <th
                      onClick={() => {
                        if (sortTipoCol === 'tipo') setSortTipoAsc(prev => !prev);
                        else {
                          setSortTipoCol('tipo');
                          setSortTipoAsc(true);
                        }
                      }}
                      className="py-2 px-3 text-left cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por tipo"
                    >
                      <div className="flex items-center gap-1">
                        <span>Tipo / Destino Agrupado</span>
                        {sortTipoCol === 'tipo' ? (
                          sortTipoAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortTipoCol === 'count') setSortTipoAsc(prev => !prev);
                        else {
                          setSortTipoCol('count');
                          setSortTipoAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por número de saídas"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Deslocamentos</span>
                        {sortTipoCol === 'count' ? (
                          sortTipoAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortTipoCol === 'pct') setSortTipoAsc(prev => !prev);
                        else {
                          setSortTipoCol('pct');
                          setSortTipoAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por percentual"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>% do Total</span>
                        {sortTipoCol === 'pct' ? (
                          sortTipoAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortTipoCol === 'km') setSortTipoAsc(prev => !prev);
                        else {
                          setSortTipoCol('km');
                          setSortTipoAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por KM total"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>KM Rodados</span>
                        {sortTipoCol === 'km' ? (
                          sortTipoAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortTipoCol === 'media') setSortTipoAsc(prev => !prev);
                        else {
                          setSortTipoCol('media');
                          setSortTipoAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por média de KM"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Média KM/Saída</span>
                        {sortTipoCol === 'media' ? (
                          sortTipoAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tiposPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum deslocamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    tiposPaginados.map(item => (
                      <tr key={item.tipo} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.tipo}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">{item.count}</td>
                        <td className="py-2 px-3 text-center font-medium text-slate-600">{item.pct.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {item.km.toLocaleString('pt-BR')} km
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 font-medium">{item.media.toFixed(1)} km</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Por Tipo */}
            {totalPaginasTipos > 1 && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="text-[11px]">
                  Mostrando página <strong>{tipoPage}</strong> de <strong>{totalPaginasTipos}</strong> (Total:{' '}
                  {listaTipos.length} tipos agrupados)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipoPage(prev => Math.max(1, prev - 1))}
                    disabled={tipoPage === 1}
                    className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-[11px] px-2">
                    {tipoPage} / {totalPaginasTipos}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTipoPage(prev => Math.min(totalPaginasTipos, prev + 1))}
                    disabled={tipoPage === totalPaginasTipos}
                    className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Próxima Página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Sub-view: Por Categoria (com Viaturas Respectivas e Total de Cada Uma, do Maior para o Menor) */}
        {subAba === 'categoria' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoriasDetalhadas.map(cat => (
              <div
                key={cat.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.icon === 'flame' && <Flame className="w-4 h-4" />}
                        {cat.icon === 'ambulance' && <Ambulance className="w-4 h-4" />}
                        {cat.icon === 'shield-alert' && <ShieldAlert className="w-4 h-4" />}
                        {cat.icon === 'car' && <Car className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{cat.label}</h4>
                        <span className="text-[10px] text-slate-500">
                          {cat.pctDeslocamentos.toFixed(1)}% das saídas | {cat.pctKm.toFixed(1)}% dos KMs
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-700">{cat.km.toLocaleString('pt-BR')} km</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase">{cat.count} Saídas</div>
                      </div>
                    </div>
                  </div>

                  {/* Respective Vehicles List (Classificada do Maior para o Menor) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-extrabold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                      <span>Viaturas desta Categoria ({cat.viaturas.length}):</span>
                      <span>Total KM Rodado</span>
                    </div>

                    {cat.viaturas.length === 0 ? (
                      <div className="py-3 text-center text-slate-400 text-xs italic bg-white rounded border border-slate-200">
                        Nenhuma viatura desta categoria com registros no período.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
                        {cat.viaturas.map((vItem, idx) => {
                          const isSel = filtroViatura === vItem.prefixo || viaturasSelecionadas.includes(vItem.prefixo);
                          return (
                            <button
                              key={vItem.prefixo}
                              type="button"
                              onClick={() => {
                                if (isSel) {
                                  if (filtroViatura === vItem.prefixo) setFiltroViatura('');
                                  if (viaturasSelecionadas.includes(vItem.prefixo)) {
                                    setViaturasSelecionadas(prev => prev.filter(v => v !== vItem.prefixo));
                                  }
                                } else {
                                  setFiltroViatura(vItem.prefixo);
                                  setViaturasSelecionadas([vItem.prefixo]);
                                }
                              }}
                              className={`rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs transition-all cursor-pointer text-left ${
                                isSel
                                  ? 'bg-red-50 border-2 border-red-600 shadow-2xs'
                                  : 'bg-white border border-slate-200 hover:border-slate-300'
                              }`}
                              title={isSel ? 'Clique para desmarcar esta viatura da filtragem' : 'Clique para filtrar por esta viatura'}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-[10px] font-extrabold text-slate-400">#{idx + 1}</span>
                                <span className={`font-black ${isSel ? 'text-red-800' : 'text-slate-800'}`}>{vItem.prefixo}</span>
                                <span className="text-[10px] text-slate-500">({vItem.count} saídas)</span>
                                {isSel && (
                                  <span className="text-[9px] font-black bg-red-700 text-white px-1.5 py-0.2 rounded-full">
                                    Filtrada
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-700">{vItem.km.toLocaleString('pt-BR')} km</span>
                                <span className="text-[9px] font-semibold text-slate-400 w-10 text-right">
                                  {vItem.pct.toFixed(0)}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Sub-view: Por Viatura (com Paginação e Ordenação de Colunas) */}
        {subAba === 'viatura' && (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 select-none">
                    <th
                      onClick={() => {
                        if (sortViaturaCol === 'viatura') setSortViaturaAsc(prev => !prev);
                        else {
                          setSortViaturaCol('viatura');
                          setSortViaturaAsc(true);
                        }
                      }}
                      className="py-2 px-3 text-left cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por prefixo da viatura"
                    >
                      <div className="flex items-center gap-1">
                        <span>Viatura</span>
                        {sortViaturaCol === 'viatura' ? (
                          sortViaturaAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortViaturaCol === 'categoria') setSortViaturaAsc(prev => !prev);
                        else {
                          setSortViaturaCol('categoria');
                          setSortViaturaAsc(true);
                        }
                      }}
                      className="py-2 px-3 text-left cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por categoria"
                    >
                      <div className="flex items-center gap-1">
                        <span>Categoria</span>
                        {sortViaturaCol === 'categoria' ? (
                          sortViaturaAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortViaturaCol === 'count') setSortViaturaAsc(prev => !prev);
                        else {
                          setSortViaturaCol('count');
                          setSortViaturaAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por total de saídas"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Total de Saídas</span>
                        {sortViaturaCol === 'count' ? (
                          sortViaturaAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortViaturaCol === 'kmRodado') setSortViaturaAsc(prev => !prev);
                        else {
                          setSortViaturaCol('kmRodado');
                          setSortViaturaAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por KM rodados"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>KM Rodados</span>
                        {sortViaturaCol === 'kmRodado' ? (
                          sortViaturaAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sortViaturaCol === 'ultimoKm') setSortViaturaAsc(prev => !prev);
                        else {
                          setSortViaturaCol('ultimoKm');
                          setSortViaturaAsc(false);
                        }
                      }}
                      className="py-2 px-3 text-right cursor-pointer hover:bg-slate-200 transition-colors"
                      title="Clique para ordenar por último KM registrado"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Último KM Registrado</span>
                        {sortViaturaCol === 'ultimoKm' ? (
                          sortViaturaAsc ? <ArrowUp className="w-3 h-3 text-red-700" /> : <ArrowDown className="w-3 h-3 text-red-700" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-3 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viaturasPaginadas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma viatura com registros no período.
                      </td>
                    </tr>
                  ) : (
                    viaturasPaginadas.map(item => {
                      const isAtiva = filtroViatura === item.viatura || viaturasSelecionadas.includes(item.viatura);
                      return (
                        <tr
                          key={item.viatura}
                          className={`transition-colors ${
                            isAtiva ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-red-800">
                            <div className="flex items-center gap-1.5">
                              <span>{item.viatura}</span>
                              {isAtiva && (
                                <span className="text-[9px] font-black bg-red-700 text-white px-1.5 py-0.2 rounded-full">
                                  Ativa
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">{item.categoria}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900">{item.count}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {item.kmRodado.toLocaleString('pt-BR')} km
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                            {item.ultimoKm > 0 ? `${item.ultimoKm.toLocaleString('pt-BR')} km` : '---'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isAtiva ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (filtroViatura === item.viatura) setFiltroViatura('');
                                  if (viaturasSelecionadas.includes(item.viatura)) {
                                    setViaturasSelecionadas(prev => prev.filter(v => v !== item.viatura));
                                  }
                                }}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold transition-all shadow-2xs cursor-pointer w-full"
                                title="Clique para desmarcar esta viatura e remover a filtragem"
                              >
                                <Check className="w-3 h-3" />
                                <span>Desmarcar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setFiltroViatura(item.viatura);
                                  setViaturasSelecionadas([item.viatura]);
                                }}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700 rounded text-xs font-bold transition-all cursor-pointer w-full"
                                title="Filtrar estatísticas por esta viatura"
                              >
                                <span>Filtrar</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Por Viatura */}
            {totalPaginasViaturas > 1 && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="text-[11px]">
                  Mostrando página <strong>{viaturaPage}</strong> de <strong>{totalPaginasViaturas}</strong> (Total:{' '}
                  {listaViaturas.length} viaturas)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViaturaPage(prev => Math.max(1, prev - 1))}
                    disabled={viaturaPage === 1}
                    className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-[11px] px-2">
                    {viaturaPage} / {totalPaginasViaturas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViaturaPage(prev => Math.min(totalPaginasViaturas, prev + 1))}
                    disabled={viaturaPage === totalPaginasViaturas}
                    className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Próxima Página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Despachos do Ponto (quando há múltiplas saídas somadas no período) */}
      {modalPontoRegistros && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-100 tracking-wide">
                  Deslocamentos em {modalPontoRegistros.dataStr}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {modalPontoRegistros.registros.length} saídas registradas &bull;{' '}
                  <strong className="text-emerald-400 font-bold">{modalPontoRegistros.kmSoma.toLocaleString('pt-BR')} km</strong> somados
                </p>
              </div>
              <button
                onClick={() => setModalPontoRegistros(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
              {modalPontoRegistros.registros.map((r, i) => {
                const ks = Number(r.kmSaida);
                const kc = Number(r.kmChegada);
                const rod = !isNaN(ks) && !isNaN(kc) && kc >= ks ? kc - ks : 0;
                return (
                  <div
                    key={r.id || i}
                    onClick={() => {
                      setModalPontoRegistros(null);
                      if (onOpenRegistro) onOpenRegistro(r);
                    }}
                    className="pt-2 first:pt-0 p-2.5 rounded-xl hover:bg-red-50/70 border border-transparent hover:border-red-200 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-xs text-slate-900 group-hover:text-red-700 transition-colors">
                          #{r.id} &bull; {r.viatura}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {r.destino}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Condutor: <strong className="text-slate-800">{r.condutor}</strong>{' '}
                        {r.equipe ? `| Equipe: ${r.equipe}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Saída: {r.saida || '-'} {r.chegada ? `| Chegada: ${r.chegada}` : '(Em aberto)'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono text-emerald-700">
                        +{rod.toLocaleString('pt-BR')} km
                      </div>
                      <span className="text-[10px] font-bold text-red-700 group-hover:underline">
                        Abrir Despacho &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setModalPontoRegistros(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
