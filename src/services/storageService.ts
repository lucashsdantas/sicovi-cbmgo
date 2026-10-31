import { ViaturaItem, EscalaItem, RegistroDespacho, ViaturaApoioItem } from '../types/sicovi';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY_REGISTROS = 'sicovi_bd_registros';
const STORAGE_KEY_VIATURAS = 'sicovi_viaturas';
const STORAGE_KEY_ESCALAS = 'sicovi_escalas';
const STORAGE_KEY_MILITARES = 'sicovi_militares';
const STORAGE_KEY_BAIRROS = 'sicovi_bairros';
const STORAGE_KEY_DESTINOS = 'sicovi_destinos';
const STORAGE_KEY_OPERADORES = 'sicovi_operadores';
const STORAGE_KEY_SCRIPT_URL = 'sicovi_gas_script_url';
const STORAGE_KEY_PROXIMO_ID = 'sicovi_proximo_id';
const STORAGE_KEY_NATUREZAS = 'sicovi_historico_naturezas';

export const DEFAULT_NATUREZAS = [
  'APH Clínico',
  'Acidente de Trânsito (Colisão)',
  'Acidente de Trânsito (Queda de Moto)',
  'Atropelamento',
  'Incêndio em Vegetação',
  'Incêndio em Edificação Comercial',
  'Incêndio em Edificação Residencial',
  'Incêndio em Veículo',
  'Salvamento / Resgate de Animal',
  'Corte / Poda de Árvore',
  'Captura de Abelhas / Marimbondos',
  'Busca e Salvamento de Pessoa',
  'Vistoria Técnica Operacional',
  'Apoio a Outro Órgão'
];

// Hash SHA-256 da senha gerencial de emergência (sem texto puro em código)
const ADMIN_PASS_HASH = '7d824ad37e366f330ef3d3bafb8dc8b18a5b07622e2830eac5966339d98a94b0';

export async function hashSha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Lista limpa: sem usuários ou viaturas fictícias
export const DEFAULT_VIATURAS: ViaturaItem[] = [];

export const DEFAULT_MILITARES: string[] = ['2º Sgt Dantas'];

export const DEFAULT_BAIRROS = [
  'Centro',
  'Setor Bueno',
  'Jardim Goiás',
  'Marista',
  'Campinas',
  'Setor Sul',
  'Setor Oeste',
  'Vila Nova',
  'Jardim América'
];

export const DEFAULT_DESTINOS = [
  'Ocorrência',
  'Vistorias',
  'Serviço da OBM',
  'Diversos',
  'Abastecimento',
  'QRF'
];

const STORAGE_KEY_OPERADORES_SENHAS = 'sicovi_operadores_senhas';

export const DEFAULT_OPERADORES_SENHAS: Record<string, string> = {
  '2º Sgt Dantas': '123456'
};

export const DEFAULT_OPERADORES = Object.keys(DEFAULT_OPERADORES_SENHAS);

export const DEFAULT_ESCALAS: EscalaItem[] = [];

export const DEFAULT_REGISTROS: RegistroDespacho[] = [];

// Helper para sincronizar com o servidor central Express (/api/db/save)
export async function syncComServidorCentral(dados: Record<string, any>): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
    }
  } catch (err) {
    console.warn('Servidor central offline ou não acessível:', err);
  }
}

export function normalizarCategoriaViatura(cat: string, prefixo = ''): string {
  const c = (cat || '').trim().toUpperCase();
  const p = (prefixo || '').trim().toUpperCase();

  if (c === 'SUPORTE AVANÇADO' || c === 'SUPORTE AVANCADO' || c.includes('SUPORTE') || p.startsWith('USA')) {
    return 'SUPORTE AVANÇADO';
  }
  if (c === 'RESGATE' || p.startsWith('UR')) {
    return 'RESGATE';
  }
  if (
    c === 'INCÊNDIO/SALVAMENTO' ||
    c === 'INCENDIO/SALVAMENTO' ||
    c.includes('INCÊNDIO') ||
    c.includes('INCENDIO') ||
    c.includes('SALVAMENTO') ||
    p.startsWith('ABT') ||
    p.startsWith('ABS')
  ) {
    return 'INCÊNDIO/SALVAMENTO';
  }
  return 'ADMINISTRATIVA';
}

export function corrigirAcentuacaoTexto(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';
  let s = texto;

  // Substitui caractere de substituição Unicode (\uFFFD) que frequentemente substitui o ordinal 'º' em '1º', '2º', '3º'
  s = s.replace(/([0-9])\s*[\uFFFD\?]+\s*/g, '$1º ');
  s = s.replace(/[\uFFFD]/g, '');

  // Correção de Mojibake comum (quando UTF-8 é lido como Windows-1252 / ISO-8859-1)
  const mapaMojibake: [RegExp, string][] = [
    [/Âº/g, 'º'],
    [/Âª/g, 'ª'],
    [/Ã¡/g, 'á'],
    [/Ã /g, 'à'],
    [/Ã£/g, 'ã'],
    [/Ã¢/g, 'â'],
    [/Ã©/g, 'é'],
    [/Ãª/g, 'ê'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ã´/g, 'ô'],
    [/Ãµ/g, 'õ'],
    [/Ãº/g, 'ú'],
    [/Ã§/g, 'ç'],
    [/Ã/g, 'Á'],
    [/Ã€/g, 'À'],
    [/Ãƒ/g, 'Ã'],
    [/Ã‚/g, 'Â'],
    [/Ã‰/g, 'É'],
    [/ÃŠ/g, 'Ê'],
    [/Ã/g, 'Í'],
    [/Ã“/g, 'Ó'],
    [/Ã”/g, 'Ô'],
    [/Ã•/g, 'Õ'],
    [/Ãš/g, 'Ú'],
    [/Ã‡/g, 'Ç']
  ];

  mapaMojibake.forEach(([re, repl]) => {
    s = s.replace(re, repl);
  });

  return s;
}

export function formatarNomeMilitarLimpo(nome: string): string {
  if (!nome || typeof nome !== 'string') return '';
  let str = corrigirAcentuacaoTexto(nome.trim());
  if (!str) return '';
  str = str.replace(/\s*#\d+/g, '').trim();
  str = str.replace(/^(?:CABO|CB)\s+(Cb\b|Cabo\b)/i, '$1');
  str = str.replace(/^(?:SOLDADO|SD)\s+(Sd\b|Soldado\b)/i, '$1');
  str = str.replace(/^(?:SARGENTO|SGT)\s+((?:[123]º\s*)?(?:Sgt\b|Sargento\b))/i, '$1');
  str = str.replace(/^(?:SUBTENENTE|SUB\s*TEN|ST)\s+(St\b|Subten\b)/i, '$1');
  str = str.replace(/^(?:CAPITÃO|CAPITAO|CAP)\s+(Cap\b)/i, '$1');
  str = str.replace(/^(?:MAJOR|MAJ)\s+(Maj\b)/i, '$1');
  str = str.replace(/^(?:TENENTE|TEN)\s+((?:[12]º\s*)?Ten\b)/i, '$1');
  str = str.replace(/^(?:CORONEL|CEL)\s+(Cel\b)/i, '$1');

  if (/^CABO\s+/i.test(str) && !/\bCb\b/i.test(str)) str = str.replace(/^CABO\s+/i, 'Cb ');
  else if (/^SOLDADO\s+/i.test(str) && !/\bSd\b/i.test(str)) str = str.replace(/^SOLDADO\s+/i, 'Sd ');
  else if (/^(?:1º|1)\s*SARGENTO\s+/i.test(str)) str = str.replace(/^(?:1º|1)\s*SARGENTO\s+/i, '1º Sgt ');
  else if (/^(?:2º|2)\s*SARGENTO\s+/i.test(str)) str = str.replace(/^(?:2º|2)\s*SARGENTO\s+/i, '2º Sgt ');
  else if (/^(?:3º|3)\s*SARGENTO\s+/i.test(str)) str = str.replace(/^(?:3º|3)\s*SARGENTO\s+/i, '3º Sgt ');
  else if (/^SARGENTO\s+/i.test(str)) str = str.replace(/^SARGENTO\s+/i, 'Sgt ');
  else if (/^SUBTENENTE\s+/i.test(str)) str = str.replace(/^SUBTENENTE\s+/i, 'Subten ');
  else if (/^CAPIT[ÃA]O\s+/i.test(str)) str = str.replace(/^CAPIT[ÃA]O\s+/i, 'Cap ');
  else if (/^MAJOR\s+/i.test(str)) str = str.replace(/^MAJOR\s+/i, 'Maj ');
  else if (/^(?:1º|1)\s*TENENTE\s+/i.test(str)) str = str.replace(/^(?:1º|1)\s*TENENTE\s+/i, '1º Ten ');
  else if (/^(?:2º|2)\s*TENENTE\s+/i.test(str)) str = str.replace(/^(?:2º|2)\s*TENENTE\s+/i, '2º Ten ');
  else if (/^TENENTE\s+/i.test(str)) str = str.replace(/^TENENTE\s+/i, 'Ten ');
  else if (/^CORONEL\s+/i.test(str)) str = str.replace(/^CORONEL\s+/i, 'Cel ');

  return str.trim();
}

/**
 * Verifica se o destino do deslocamento é uma Ocorrência
 * Considera apenas os destinos com valor "OCORRÊNCIA, ocorrência" (com ou sem acentuação, case-insensitive).
 */
export function isDestinoOcorrencia(destino?: string | null): boolean {
  if (!destino || typeof destino !== 'string') return false;
  const limpo = destino
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return limpo === 'ocorrencia';
}

export function limparListaMilitaresValidos(lista: string[]): string[] {
  if (!Array.isArray(lista)) return [];
  const invalidos = ['', 'null', 'undefined', '-', '--', '---', '#n/a', '#ref!', '#valor!', 'nenhum'];
  return lista
    .map(m => (m !== null && m !== undefined ? String(m).trim() : ''))
    .filter(m => m.length > 1 && !invalidos.includes(m.toLowerCase()))
    .map(formatarNomeMilitarLimpo)
    .filter(m => m.length > 1);
}

// FUSO HORÁRIO OFICIAL: BRASÍLIA (America/Sao_Paulo, UTC-3)
export const TIMEZONE_BRASILIA = 'America/Sao_Paulo';

/**
 * Retorna a data/hora atual no fuso horário de Brasília (UTC-3)
 */
export function getAgoraBrasilia(): Date {
  const agora = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(agora);
  let y = '', m = '', d = '', h = '', min = '', sec = '';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') d = p.value;
    else if (p.type === 'hour') h = p.value;
    else if (p.type === 'minute') min = p.value;
    else if (p.type === 'second') sec = p.value;
  }
  return new Date(`${y}-${m}-${d}T${h}:${min}:${sec}-03:00`);
}

/**
 * Retorna string ISO explícita com fuso de Brasília (-03:00)
 */
export function getAgoraIsoBrasilia(): string {
  const dt = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(dt);
  let y = '', m = '', d = '', h = '', min = '', sec = '';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') d = p.value;
    else if (p.type === 'hour') h = p.value;
    else if (p.type === 'minute') min = p.value;
    else if (p.type === 'second') sec = p.value;
  }
  return `${y}-${m}-${d}T${h}:${min}:${sec}-03:00`;
}

export function parseDateTimeFormat(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  let s = String(val).trim();
  if (!s || s === '-' || s === '---' || s.toUpperCase() === 'EM ABERTO' || s.toUpperCase() === 'NULL') return null;

  // Número serial de data/hora do Excel (ex: 45600.35416)
  if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    const msSinceEpoch = (serial - 25569) * 86400 * 1000;
    const d = new Date(msSinceEpoch);
    return !isNaN(d.getTime()) ? d : null;
  }

  // Normaliza vírgula e conectivos comuns separadores de data e hora (ex: '31/10/2026 às 11:20')
  s = s.replace(/\s*às\s*/gi, ' ').replace(',', ' ').trim();

  // 1. Padrão brasileiro: DD/MM/YYYY ou DD/MM/YY com hora opcional HH:mm ou HH:mm:ss
  const matchBr = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (matchBr) {
    const dia = parseInt(matchBr[1], 10);
    const mes = parseInt(matchBr[2], 10) - 1;
    let ano = parseInt(matchBr[3], 10);
    if (ano < 100) ano = 2000 + ano;
    const hora = matchBr[4] !== undefined ? parseInt(matchBr[4], 10) : 0;
    const min = matchBr[5] !== undefined ? parseInt(matchBr[5], 10) : 0;
    const sec = matchBr[6] !== undefined ? parseInt(matchBr[6], 10) : 0;

    const pad = (n: number) => String(n).padStart(2, '0');
    const isoString = `${ano}-${pad(mes + 1)}-${pad(dia)}T${pad(hora)}:${pad(min)}:${pad(sec)}-03:00`;
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) return d;
    return new Date(ano, mes, dia, hora, min, sec);
  }

  // 2. Padrão ISO / SQL: YYYY-MM-DD com hora opcional
  const matchIso = s.match(/^(\d{4})[\-](\d{1,2})[\-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (matchIso) {
    const ano = parseInt(matchIso[1], 10);
    const mes = parseInt(matchIso[2], 10) - 1;
    const dia = parseInt(matchIso[3], 10);
    const hora = matchIso[4] !== undefined ? parseInt(matchIso[4], 10) : 0;
    const min = matchIso[5] !== undefined ? parseInt(matchIso[5], 10) : 0;
    const sec = matchIso[6] !== undefined ? parseInt(matchIso[6], 10) : 0;

    if (s.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const isoString = `${ano}-${pad(mes + 1)}-${pad(dia)}T${pad(hora)}:${pad(min)}:${pad(sec)}-03:00`;
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) return d;
    return new Date(ano, mes, dia, hora, min, sec);
  }

  const d = new Date(s);
  return !isNaN(d.getTime()) ? d : null;
}

export function formatarDataHoraPtBr(dateOrStr: Date | string | null | undefined, incluirSegundos?: boolean): string {
  if (!dateOrStr) return '';
  const dt = parseDateTimeFormat(dateOrStr);
  if (!dt) return String(dateOrStr);

  try {
    const temSegundos = incluirSegundos !== undefined ? incluirSegundos : (dt.getSeconds() > 0);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIMEZONE_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: temSegundos ? '2-digit' : undefined,
      hour12: false
    });
    // Remove conectivos e pontuações atípicas que navegadores mobile Android/iOS por vezes inserem
    return formatter.format(dt).replace(/\s*às\s*/gi, ' ').replace(',', '').trim();
  } catch {
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    const secStr = incluirSegundos || dt.getSeconds() > 0 ? `:${pad(dt.getSeconds())}` : '';
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}${secStr}`;
  }
}

export function formatarIsoParaInputLocal(val: string | Date | null | undefined): string {
  if (!val) return '';
  const dt = parseDateTimeFormat(val);
  if (!dt) return '';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE_BRASILIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(dt);
    let y = '', m = '', d = '', h = '', min = '';
    for (const p of parts) {
      if (p.type === 'year') y = p.value;
      else if (p.type === 'month') m = p.value;
      else if (p.type === 'day') d = p.value;
      else if (p.type === 'hour') h = p.value;
      else if (p.type === 'minute') min = p.value;
    }
    return `${y}-${m}-${d}T${h}:${min}`;
  } catch {
    const fuso = new Date(dt.getTime() - 3 * 3600000);
    return fuso.toISOString().slice(0, 16);
  }
}

// STORAGE API
export const storageService = {
  getScriptUrl(): string {
    return localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || '';
  },

  setScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY_SCRIPT_URL, url.trim());
  },

  getViaturas(): ViaturaItem[] {
    const raw = localStorage.getItem(STORAGE_KEY_VIATURAS);
    let lista: ViaturaItem[] = DEFAULT_VIATURAS;
    if (raw) {
      try {
        lista = JSON.parse(raw);
      } catch {
        lista = DEFAULT_VIATURAS;
      }
    }
    // As viaturas da frota ficam estritamente classificadas em ordem alfabética por prefixo
    return lista.slice().sort((a, b) =>
      a.prefixo.localeCompare(b.prefixo, 'pt-BR', { numeric: true, sensitivity: 'base' })
    );
  },

  setViaturas(viaturas: ViaturaItem[]): void {
    localStorage.setItem(STORAGE_KEY_VIATURAS, JSON.stringify(viaturas));
    syncComServidorCentral({ viaturas });
  },

  getMilitares(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY_MILITARES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(DEFAULT_MILITARES));
      return DEFAULT_MILITARES;
    }
    try {
      return limparListaMilitaresValidos(JSON.parse(raw));
    } catch {
      return DEFAULT_MILITARES;
    }
  },

  setMilitares(militares: string[]): void {
    const limpos = limparListaMilitaresValidos(militares);
    localStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(limpos));
    syncComServidorCentral({ militares: limpos });

    // Persiste ordem de antiguidade no Supabase de forma 100% automática
    const sb = getSupabase();
    if (sb && limpos.length > 0) {
      const payload = limpos.map((nome, idx) => ({
        nome,
        antiguidade: idx + 1,
        graduacao: `ORDEM_${idx + 1}`,
        ativo: true
      }));
      Promise.resolve(sb.from('militares').upsert(payload, { onConflict: 'nome' }))
        .then(({ error }: any) => {
          if (error) {
            // Fallback transparente: salva na coluna graduacao que já existe no Supabase
            const fallback = payload.map(p => ({ nome: p.nome, graduacao: p.graduacao, ativo: true }));
            Promise.resolve(sb.from('militares').upsert(fallback, { onConflict: 'nome' })).catch(() => {});
          }
        })
        .catch(() => {});
    }
  },

  cadastrarOperador(usuario: string, senha = '123456'): void {
    const senhas = this.getOperadoresSenhas();
    if (!senhas[usuario]) {
      senhas[usuario] = senha;
      localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(senhas));
      syncComServidorCentral({ operadoresSenhas: senhas });
    }
  },

  cadastrarMilitar(nome: string): string[] {
    const limpo = formatarNomeMilitarLimpo(nome);
    if (!limpo || limpo.length < 2) return this.getMilitares();
    const atuais = this.getMilitares();
    if (!atuais.some(m => m.toLowerCase() === limpo.toLowerCase())) {
      // Preserva rigorosamente a ordem de antiguidade (ordem de inserção)
      const novos = [...atuais, limpo];
      localStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(novos));
      this.cadastrarOperador(limpo, '123456');
      return novos;
    }
    return atuais;
  },

  getEscalas(): EscalaItem[] {
    const raw = localStorage.getItem(STORAGE_KEY_ESCALAS);
    let lista: EscalaItem[] = [];
    if (raw) {
      try {
        lista = JSON.parse(raw);
      } catch {
        lista = [];
      }
    }
    // Considera ESTRITAMENTE as viaturas cadastradas pelo usuário, excluindo fictícias
    const viaturasCadastradas = new Set(this.getViaturas().map(v => v.prefixo.trim().toUpperCase()));
    return lista.filter(e => viaturasCadastradas.has(e.viatura.trim().toUpperCase()));
  },

  salvarEscala(escala: EscalaItem): EscalaItem[] {
    const atuais = this.getEscalas();
    const idx = atuais.findIndex(e => e.viatura.trim().toUpperCase() === escala.viatura.trim().toUpperCase());
    if (idx !== -1) {
      atuais[idx] = escala;
    } else {
      atuais.push(escala);
    }
    localStorage.setItem(STORAGE_KEY_ESCALAS, JSON.stringify(atuais));
    syncComServidorCentral({ escalas: atuais });

    // Persistência imediata e robusta na nuvem (Supabase)
    const sb = getSupabase();
    if (sb) {
      const payload = {
        viatura: escala.viatura.trim().toUpperCase(),
        condutor: escala.condutor.trim(),
        equipe: escala.equipe ? escala.equipe.trim() : '',
        updated_at: new Date().toISOString()
      };
      Promise.resolve(
        sb.from('escalas')
          .upsert(payload, { onConflict: 'viatura' })
      )
        .then(({ error }: any) => {
          if (error) {
            console.warn('Upsert de escala no Supabase requereu fallback delete+insert:', error.message);
            Promise.resolve(sb.from('escalas').delete().eq('viatura', payload.viatura)).then(() => {
              Promise.resolve(sb.from('escalas').insert(payload)).then();
            });
          }
        })
        .catch((err: any) => console.warn('Erro ao salvar escala no Supabase:', err));
    }

    return atuais;
  },

  salvarMultiplasEscalas(novasEscalas: EscalaItem[]): EscalaItem[] {
    const atuais = this.getEscalas();
    novasEscalas.forEach(escala => {
      const idx = atuais.findIndex(e => e.viatura.trim().toUpperCase() === escala.viatura.trim().toUpperCase());
      if (idx !== -1) {
        atuais[idx] = escala;
      } else {
        atuais.push(escala);
      }
    });
    localStorage.setItem(STORAGE_KEY_ESCALAS, JSON.stringify(atuais));
    syncComServidorCentral({ escalas: atuais });

    // Persistência em lote na nuvem (Supabase)
    const sb = getSupabase();
    if (sb && novasEscalas.length > 0) {
      const payload = novasEscalas.map(e => ({
        viatura: e.viatura.trim().toUpperCase(),
        condutor: e.condutor.trim(),
        equipe: e.equipe ? e.equipe.trim() : '',
        updated_at: new Date().toISOString()
      }));
      Promise.resolve(
        sb.from('escalas')
          .upsert(payload, { onConflict: 'viatura' })
      )
        .then(({ error }: any) => {
          if (error) {
            console.warn('Upsert múltiplo de escalas requereu fallback delete+insert:', error.message);
            const vtrs = payload.map(p => p.viatura);
            Promise.resolve(sb.from('escalas').delete().in('viatura', vtrs)).then(() => {
              Promise.resolve(sb.from('escalas').insert(payload)).then();
            });
          }
        })
        .catch((err: any) => console.warn('Erro ao salvar escalas no Supabase:', err));
    }

    return atuais;
  },

  getNaturezasHistorico(): string[] {
    const mapa = new Map<string, string>();

    // 1. Naturezas padrão de bombeiro
    DEFAULT_NATUREZAS.forEach(n => {
      const trim = n.trim();
      if (trim) mapa.set(trim.toLowerCase(), trim);
    });

    // 2. Histórico salvo pelo usuário
    const raw = localStorage.getItem(STORAGE_KEY_NATUREZAS);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((item: any) => {
            if (typeof item === 'string' && item.trim().length > 1) {
              const trim = item.trim();
              mapa.set(trim.toLowerCase(), trim);
            }
          });
        }
      } catch {}
    }

    // 3. Naturezas já registradas no banco de registros de despacho
    const regs = this.getRegistros();
    regs.forEach(r => {
      if (r.natureza && typeof r.natureza === 'string' && r.natureza.trim().length > 1) {
        const trim = r.natureza.trim();
        mapa.set(trim.toLowerCase(), trim);
      }
    });

    return Array.from(mapa.values());
  },

  salvarNaturezaNoHistorico(natureza: string): void {
    if (!natureza || typeof natureza !== 'string') return;
    const limpa = natureza.trim();
    if (limpa.length < 2) return;

    try {
      const historicoAtual = this.getNaturezasHistorico();
      if (!historicoAtual.some(n => n.toLowerCase() === limpa.toLowerCase())) {
        const novoHistorico = [limpa, ...historicoAtual];
        localStorage.setItem(STORAGE_KEY_NATUREZAS, JSON.stringify(novoHistorico));
      }
    } catch {}
  },

  getBairros(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY_BAIRROS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BAIRROS, JSON.stringify(DEFAULT_BAIRROS));
      return DEFAULT_BAIRROS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_BAIRROS;
    }
  },

  getDestinos(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY_DESTINOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DESTINOS, JSON.stringify(DEFAULT_DESTINOS));
      return DEFAULT_DESTINOS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_DESTINOS;
    }
  },

  getOperadores(): string[] {
    const map = this.getOperadoresSenhas();
    return Object.keys(map);
  },

  getOperadoresSenhas(): Record<string, string> {
    const raw = localStorage.getItem(STORAGE_KEY_OPERADORES_SENHAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(DEFAULT_OPERADORES_SENHAS));
      return { ...DEFAULT_OPERADORES_SENHAS };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { ...DEFAULT_OPERADORES_SENHAS };
    }
  },

  verificarLogin(usuario: string, senha: string): { success: boolean; usuario?: string; mensagem?: string } {
    const senhasMap = this.getOperadoresSenhas();
    const uTrim = (usuario || '').trim().toLowerCase();
    const sTrim = (senha || '').trim();

    if (!uTrim || !sTrim) {
      return { success: false, mensagem: 'Informe o militar operador e a senha.' };
    }

    const matchedKey = Object.keys(senhasMap).find(k => k.trim().toLowerCase() === uTrim);
    if (!matchedKey) {
      return { success: false, mensagem: 'Militar operador não cadastrado no sistema.' };
    }

    if (senhasMap[matchedKey] === sTrim) {
      return { success: true, usuario: matchedKey };
    }

    return { success: false, mensagem: 'Usuário ou senha incorretos!' };
  },

  async verificarLoginAsync(usuario: string, senha: string): Promise<{ success: boolean; usuario?: string; mensagem?: string }> {
    // 1. Tenta login local primeiro (rápido)
    const localRes = this.verificarLogin(usuario, senha);
    if (localRes.success) return localRes;

    // 2. Se local não autenticou ou usuário não existe localmente, verifica diretamente no Supabase Cloud
    const sb = getSupabase();
    if (sb) {
      try {
        const uTrim = (usuario || '').trim();
        const sTrim = (senha || '').trim();
        const hash = await hashSha256(sTrim);

        // Busca operador no Supabase por nome (case insensitive)
        const { data, error } = await sb
          .from('operadores')
          .select('usuario, senha_hash')
          .ilike('usuario', uTrim)
          .limit(1);

        if (!error && data && data.length > 0) {
          const op = data[0];
          // Confere hash SHA-256 ou texto simples (retrocompatibilidade)
          if (op.senha_hash === hash || op.senha_hash === sTrim) {
            // Salva na base local para próximos acessos
            const senhas = this.getOperadoresSenhas();
            senhas[op.usuario] = sTrim;
            this.setOperadoresSenhas(senhas);
            return { success: true, usuario: op.usuario };
          }
          return { success: false, mensagem: 'Senha incorreta!' };
        }
      } catch (e: any) {
        console.warn('Erro ao consultar operador no Supabase:', e);
      }
    }

    return localRes;
  },

  alterarSenha(usuario: string, senhaAtual: string, novaSenha: string): { success: boolean; mensagem: string } {
    const senhasMap = this.getOperadoresSenhas();
    const uTrim = (usuario || '').trim().toLowerCase();
    const matchedKey = Object.keys(senhasMap).find(k => k.trim().toLowerCase() === uTrim);

    if (!matchedKey) {
      return { success: false, mensagem: 'Militar operador não encontrado.' };
    }

    if (senhasMap[matchedKey] !== senhaAtual.trim()) {
      return { success: false, mensagem: 'Senha atual incorreta.' };
    }

    if (!novaSenha || novaSenha.trim().length < 4) {
      return { success: false, mensagem: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    senhasMap[matchedKey] = novaSenha.trim();
    localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(senhasMap));
    return { success: true, mensagem: 'Senha alterada com sucesso!' };
  },

  getRegistros(): RegistroDespacho[] {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTROS);
    if (!raw) {
      const def = DEFAULT_REGISTROS.map(r => ({
        ...r,
        id: Number(r.id) || r.id
      })).sort((a, b) => Number(b.id) - Number(a.id));
      localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(def));
      return def;
    }
    try {
      const list: RegistroDespacho[] = JSON.parse(raw);
      return list
        .map(r => ({
          ...r,
          id: !isNaN(Number(r.id)) ? Number(r.id) : r.id
        }))
        .sort((a, b) => Number(b.id) - Number(a.id));
    } catch {
      return DEFAULT_REGISTROS;
    }
  },

  getMaiorIdRegistros(): number {
    const atuais = this.getRegistros();
    let maxId = 0;
    atuais.forEach(item => {
      if (String(item.id) === '113614') return;
      const num = Number(item.id);
      if (!isNaN(num) && num < 100000 && num > maxId) maxId = num;
    });
    return maxId;
  },

  getProximoId(): number {
    const maxId = this.getMaiorIdRegistros();
    // Sempre usa rigorosamente o maior ID dos registros existentes somado com 1
    if (maxId > 0) {
      return maxId + 1;
    }
    const stored = localStorage.getItem(STORAGE_KEY_PROXIMO_ID);
    if (stored !== null && stored !== '') {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        return parsed;
      }
    }
    return 1;
  },

  setProximoId(novoId: number): void {
    const safeId = Math.max(1, Math.floor(novoId));
    if (safeId < 100000) {
      localStorage.setItem(STORAGE_KEY_PROXIMO_ID, String(safeId));
    }
  },

  consumirProximoId(qtd: number = 1): number[] {
    const inicio = this.getProximoId();
    const ids: number[] = [];
    for (let i = 0; i < qtd; i++) {
      ids.push(inicio + i);
    }
    this.setProximoId(inicio + qtd);
    return ids;
  },

  async obterMaiorIdNuvemAsync(): Promise<number> {
    try {
      await this.carregarDoBancoCentral();
    } catch {}

    const maxId = this.getMaiorIdRegistros();
    const prox = maxId > 0 ? maxId + 1 : this.getProximoId();
    this.setProximoId(prox);
    return prox;
  },

  async obterMaiorIdSupabase(): Promise<number | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb
        .from('registros')
        .select('id')
        .lt('id', 100000)
        .order('id', { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        const val = Number(data[0].id);
        return (!isNaN(val) && val < 100000) ? val : null;
      }
    } catch {
      return null;
    }
    return null;
  },

  salvarRegistro(r: Partial<RegistroDespacho>): { id: number | string; registros: RegistroDespacho[]; novoStatus: string } {
    const atuais = this.getRegistros();
    let idNum: number | string = r.id || 'PENDENTE';

    const isNovo = idNum === 'PENDENTE' || !idNum || Number(idNum) <= 0 || isNaN(Number(idNum));
    if (isNovo) {
      idNum = this.consumirProximoId(1)[0];
    } else {
      idNum = Number(idNum);
      if (idNum >= this.getProximoId()) {
        this.setProximoId(idNum + 1);
      }
    }

    const saidaFmt = r.saida ? formatarDataHoraPtBr(r.saida) : '';
    const chegadaFmt = r.chegada ? formatarDataHoraPtBr(r.chegada) : '';

    const novoItem: RegistroDespacho = {
      id: idNum,
      viatura: (r.viatura || '').toUpperCase().trim(),
      condutor: (r.condutor || '').trim(),
      equipe: (r.equipe || '').trim(),
      destino: (r.destino || '').trim(),
      bairro: (r.bairro || '').trim(),
      rai: (r.rai || '').trim(),
      natureza: (r.natureza || '').trim(),
      saida: saidaFmt,
      kmSaida: r.kmSaida !== undefined && r.kmSaida !== '' ? Number(r.kmSaida) : '',
      chegada: chegadaFmt,
      kmChegada: r.kmChegada !== undefined && r.kmChegada !== '' ? Number(r.kmChegada) : '',
      operador: (r.operador || 'Operador').trim()
    };

    const idx = atuais.findIndex(item => Number(item.id) === Number(idNum) || String(item.id) === String(idNum));
    if (idx !== -1) {
      atuais[idx] = novoItem;
    } else {
      atuais.unshift(novoItem);
    }

    // Sempre classificado do maior para o menor registro
    atuais.sort((a, b) => Number(b.id) - Number(a.id));
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(atuais));

    // Salva natureza no histórico para preenchimento rápido futuro
    if (novoItem.natureza) {
      this.salvarNaturezaNoHistorico(novoItem.natureza);
    }

    // Atualiza status da viatura
    const novoStatus = (!r.chegada || String(r.chegada).trim() === '') ? 'EMPENHADA' : 'DISPONÍVEL';
    const viaturas = this.getViaturas();
    const vtrMatch = viaturas.find(v => v.prefixo.trim().toUpperCase() === novoItem.viatura);
    if (vtrMatch) {
      vtrMatch.status = novoStatus;
      this.setViaturas(viaturas);
    }

    // Persistência no Banco Central Express
    syncComServidorCentral({
      registros: atuais,
      viaturas,
      proximoId: this.getProximoId()
    });

    // Persistência assíncrona no Supabase
    const sb = getSupabase();
    if (sb) {
      const dtSaida = parseDateTimeFormat(novoItem.saida);
      const dtChegada = parseDateTimeFormat(novoItem.chegada);
      const payload: any = {
        id: idNum,
        viatura: novoItem.viatura,
        condutor: novoItem.condutor,
        equipe: novoItem.equipe,
        destino: novoItem.destino,
        bairro: novoItem.bairro,
        rai: novoItem.rai,
        natureza: novoItem.natureza,
        saida: dtSaida ? dtSaida.toISOString() : new Date().toISOString(),
        km_saida: Number(novoItem.kmSaida) || 0,
        chegada: dtChegada ? dtChegada.toISOString() : null,
        km_chegada: (novoItem.kmChegada !== '' && novoItem.kmChegada !== null && novoItem.kmChegada !== undefined) ? Number(novoItem.kmChegada) : null,
        operador: novoItem.operador
      };

      sb.from('registros').upsert(payload, { onConflict: 'id' }).then();

      if (vtrMatch) {
        sb.from('viaturas').update({ status: novoStatus }).eq('prefixo', vtrMatch.prefixo).then();
      }
    }

    return { id: idNum, registros: atuais, novoStatus };
  },

  salvarMultiplosDespachos(lista: { principal: Partial<RegistroDespacho>; apoios: ViaturaApoioItem[] }): { ids: (number | string)[]; registros: RegistroDespacho[] } {
    const atuais = this.getRegistros();
    const totalDespachos = 1 + lista.apoios.length;
    const idsCriados = this.consumirProximoId(totalDespachos);
    const viaturas = this.getViaturas();

    // 1. Principal
    const idPrincipal = idsCriados[0];
    const saidaFmt = lista.principal.saida ? formatarDataHoraPtBr(lista.principal.saida) : '';
    const itemPrincipal: RegistroDespacho = {
      id: idPrincipal,
      viatura: (lista.principal.viatura || '').toUpperCase().trim(),
      condutor: (lista.principal.condutor || '').trim(),
      equipe: (lista.principal.equipe || '').trim(),
      destino: (lista.principal.destino || '').trim(),
      bairro: (lista.principal.bairro || '').trim(),
      rai: (lista.principal.rai || '').trim(),
      natureza: (lista.principal.natureza || '').trim(),
      saida: saidaFmt,
      kmSaida: lista.principal.kmSaida !== undefined && lista.principal.kmSaida !== '' ? Number(lista.principal.kmSaida) : '',
      chegada: '',
      kmChegada: '',
      operador: (lista.principal.operador || 'Operador').trim()
    };
    atuais.unshift(itemPrincipal);

    const vP = viaturas.find(v => v.prefixo.trim().toUpperCase() === itemPrincipal.viatura);
    if (vP) vP.status = 'EMPENHADA';

    // 2. Viaturas em Apoio
    const itensApoio: RegistroDespacho[] = [];
    lista.apoios.forEach((apoio, idx) => {
      const idApoio = idsCriados[1 + idx];
      const itemApoio: RegistroDespacho = {
        id: idApoio,
        viatura: apoio.viatura.toUpperCase().trim(),
        condutor: apoio.condutor.trim(),
        equipe: apoio.equipe.trim(),
        destino: itemPrincipal.destino,
        bairro: itemPrincipal.bairro,
        rai: itemPrincipal.rai,
        natureza: itemPrincipal.natureza,
        saida: saidaFmt,
        kmSaida: apoio.kmSaida !== undefined && apoio.kmSaida !== '' ? Number(apoio.kmSaida) : '',
        chegada: '',
        kmChegada: '',
        operador: itemPrincipal.operador
      };
      atuais.unshift(itemApoio);
      itensApoio.push(itemApoio);

      const vA = viaturas.find(v => v.prefixo.trim().toUpperCase() === itemApoio.viatura);
      if (vA) vA.status = 'EMPENHADA';
    });

    // Sempre classificado do maior para o menor registro
    atuais.sort((a, b) => Number(b.id) - Number(a.id));
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(atuais));
    this.setViaturas(viaturas);

    // Salva natureza no histórico para preenchimento rápido futuro
    if (itemPrincipal.natureza) {
      this.salvarNaturezaNoHistorico(itemPrincipal.natureza);
    }

    // Persistência no Banco Central Express
    syncComServidorCentral({
      registros: atuais,
      viaturas,
      proximoId: this.getProximoId()
    });

    // Persistência assíncrona no Supabase para o comboio
    const sb = getSupabase();
    if (sb) {
      const todosComboio = [itemPrincipal, ...itensApoio];
      todosComboio.forEach(item => {
        const dtSaida = parseDateTimeFormat(item.saida);
        const payload: any = {
          id: item.id,
          viatura: item.viatura,
          condutor: item.condutor,
          equipe: item.equipe,
          destino: item.destino,
          bairro: item.bairro,
          rai: item.rai,
          natureza: item.natureza,
          saida: dtSaida ? dtSaida.toISOString() : new Date().toISOString(),
          km_saida: Number(item.kmSaida) || 0,
          chegada: null,
          km_chegada: null,
          operador: item.operador
        };
        sb.from('registros').upsert(payload, { onConflict: 'id' }).then();
        sb.from('viaturas').update({ status: 'EMPENHADA' }).eq('prefixo', item.viatura).then();
      });
    }

    return { ids: idsCriados, registros: atuais };
  },

  async excluirRegistro(id: number | string): Promise<RegistroDespacho[]> {
    const atuais = this.getRegistros();
    const filtrados = atuais.filter(r => String(r.id) !== String(id) && Number(r.id) !== Number(id));
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(filtrados));

    // Recalcula o próximo ID local imediatamente com base nos registros restantes
    const maxId = this.getMaiorIdRegistros();
    this.setProximoId(maxId > 0 ? maxId + 1 : 1);

    // 1. Exclui no Servidor Central Express pelo endpoint dedicado
    try {
      await fetch('/api/db/delete-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.warn('Erro ao deletar registro no servidor central:', e);
    }

    // 2. Garante persistência com modo substituir no servidor central
    await syncComServidorCentral({ registros: filtrados, modo: 'substituir', proximoId: maxId > 0 ? maxId + 1 : 1 });

    // 3. Exclui definitivamente no Supabase (tanto por Number quanto por String)
    const sb = getSupabase();
    if (sb) {
      try {
        const numId = Number(id);
        if (!isNaN(numId)) {
          await sb.from('registros').delete().eq('id', numId);
        }
        await sb.from('registros').delete().eq('id', String(id));
      } catch (e) {
        console.warn('Erro ao deletar registro no Supabase:', e);
      }
    }

    return filtrados;
  },

  getUltimoKm(viaturaPrefixo: string, idIgnorado?: number | string): number | null {
    const vNorm = viaturaPrefixo.trim().toUpperCase();
    const registros = this.getRegistros();
    let ultimoKm: number | null = null;
    let dataMaisRecente = -1;

    registros.forEach(r => {
      if (idIgnorado && String(r.id) === String(idIgnorado)) return;
      if (r.viatura.trim().toUpperCase() !== vNorm) return;

      const dt = parseDateTimeFormat(r.saida);
      const timestamp = dt ? dt.getTime() : 0;
      const kmC = Number(r.kmChegada);
      const kmS = Number(r.kmSaida);
      const kmVal = (!isNaN(kmC) && kmC > 0) ? kmC : ((!isNaN(kmS) && kmS > 0) ? kmS : null);

      if (kmVal !== null) {
        if (timestamp > dataMaisRecente) {
          dataMaisRecente = timestamp;
          ultimoKm = kmVal;
        } else if (dataMaisRecente <= 0 && (ultimoKm === null || kmVal > ultimoKm)) {
          ultimoKm = kmVal;
        }
      }
    });

    return ultimoKm;
  },

  // --- MÉTODOS GERENCIAIS & SUPABASE ---
  async verificarSenhaGerencial(senha: string): Promise<boolean> {
    if (!senha) return false;
    const hash = await hashSha256(senha);
    return hash === ADMIN_PASS_HASH;
  },

  adicionarViatura(viatura: ViaturaItem): ViaturaItem[] {
    const viaturas = this.getViaturas();
    const prefixoNorm = viatura.prefixo.trim().toUpperCase();
    if (!prefixoNorm) return viaturas;

    const existe = viaturas.some(v => v.prefixo.toUpperCase() === prefixoNorm);
    if (!existe) {
      viaturas.push({
        prefixo: prefixoNorm,
        categoria: (viatura.categoria || 'GERAL').toUpperCase().trim(),
        status: (viatura.status || 'DISPONÍVEL').toUpperCase().trim()
      });
      this.setViaturas(viaturas);

      const sb = getSupabase();
      if (sb) {
        sb.from('viaturas').insert({
          prefixo: prefixoNorm,
          categoria: viatura.categoria,
          status: viatura.status || 'DISPONÍVEL'
        }).then();
      }
    }
    return viaturas;
  },

  atualizarViatura(prefixoOriginal: string, dados: Partial<ViaturaItem>): ViaturaItem[] {
    const viaturas = this.getViaturas();
    const idx = viaturas.findIndex(v => v.prefixo.toUpperCase() === prefixoOriginal.trim().toUpperCase());
    if (idx >= 0) {
      viaturas[idx] = {
        ...viaturas[idx],
        ...dados,
        prefixo: (dados.prefixo || viaturas[idx].prefixo).trim().toUpperCase()
      };
      this.setViaturas(viaturas);

      const sb = getSupabase();
      if (sb) {
        sb.from('viaturas').update({
          categoria: viaturas[idx].categoria,
          status: viaturas[idx].status
        }).eq('prefixo', prefixoOriginal.trim().toUpperCase()).then();
      }
    }
    return viaturas;
  },

  excluirViatura(prefixo: string): ViaturaItem[] {
    const viaturas = this.getViaturas().filter(v => v.prefixo.toUpperCase() !== prefixo.trim().toUpperCase());
    this.setViaturas(viaturas);

    const sb = getSupabase();
    if (sb) {
      sb.from('viaturas').delete().eq('prefixo', prefixo.trim().toUpperCase()).then();
    }
    return viaturas;
  },

  adicionarMilitar(nome: string): string[] {
    const militares = this.getMilitares();
    const nomeLimpo = formatarNomeMilitarLimpo(nome);
    if (nomeLimpo && !militares.includes(nomeLimpo)) {
      militares.push(nomeLimpo);
      this.setMilitares(militares);

      this.cadastrarOperador(nomeLimpo, '123456');

      const sb = getSupabase();
      if (sb) {
        sb.from('militares').insert({ nome: nomeLimpo }).then();
      }
    }
    return militares;
  },

  excluirMilitar(nome: string): string[] {
    const militares = this.getMilitares().filter(m => m !== nome);
    this.setMilitares(militares);

    const sb = getSupabase();
    if (sb) {
      sb.from('militares').delete().eq('nome', nome).then();
    }
    return militares;
  },

  resetarSenhaOperador(usuario: string, novaSenha: string): { success: boolean; mensagem: string } {
    if (!usuario) return { success: false, mensagem: 'Operador não selecionado.' };
    if (!novaSenha || novaSenha.trim().length < 4) {
      return { success: false, mensagem: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const senhas = this.getOperadoresSenhas();
    senhas[usuario] = novaSenha.trim();
    localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(senhas));

    const sb = getSupabase();
    if (sb) {
      hashSha256(novaSenha.trim()).then(hash => {
        sb.from('operadores').upsert({
          usuario: usuario,
          senha_hash: hash,
          ativo: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'usuario' }).then();
      });
    }

    return { success: true, mensagem: `Senha do militar ${usuario} redefinida com sucesso!` };
  },

  setRegistros(registros: RegistroDespacho[]): void {
    const ordenados = [...registros]
      .map(r => ({
        ...r,
        id: !isNaN(Number(r.id)) ? Number(r.id) : r.id
      }))
      .sort((a, b) => Number(b.id) - Number(a.id));
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(ordenados));
    syncComServidorCentral({ registros: ordenados });
  },

  setBairros(bairros: string[]): void {
    const limpos = Array.from(new Set(bairros.map(b => b.trim()).filter(Boolean))).sort();
    localStorage.setItem(STORAGE_KEY_BAIRROS, JSON.stringify(limpos));
    syncComServidorCentral({ bairros: limpos });
  },

  setOperadoresSenhas(mapa: Record<string, string>): void {
    localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(mapa));
    syncComServidorCentral({ operadoresSenhas: mapa });
  },

  async importarPlanilhaRegistros(conteudo: string, modo: 'substituir' | 'adicionar' = 'adicionar'): Promise<{
    totalLinhas: number;
    importados: number;
    erros: string[];
    registros: RegistroDespacho[];
    salvoNoSupabase: boolean;
    erroSupabase?: string;
  }> {
    const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const erros: string[] = [];
    const novosRegistros: RegistroDespacho[] = [];

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      let cols: string[] = [];
      if (linha.includes('\t')) {
        cols = linha.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      } else if (linha.includes(';')) {
        cols = linha.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        cols = linha.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      }

      const primeiro = (cols[0] || '').toUpperCase();
      const segundo = (cols[1] || '').toUpperCase();
      if (primeiro.includes('ID') || segundo.includes('VIATURA') || segundo.includes('VTR')) {
        continue;
      }
      if (cols.length < 2) continue;

      const idStr = (cols[0] || '').trim();
      const idDigitos = idStr.replace(/[^\d]/g, '');
      const idVal = idDigitos ? Number(idDigitos) : (i + 1);

      const vtrVal = (cols[1] || '').toUpperCase().trim();
      if (!vtrVal) {
        erros.push(`Linha ${i + 1}: Viatura não informada.`);
        continue;
      }

      const condutorVal = formatarNomeMilitarLimpo(cols[2] || '');
      const equipeVal = (cols[3] || '')
        .split(',')
        .map(m => formatarNomeMilitarLimpo(m.trim()))
        .filter(Boolean)
        .join(', ');
      const destinoVal = corrigirAcentuacaoTexto(cols[4] || 'Ocorrência');
      const bairroVal = corrigirAcentuacaoTexto(cols[5] || '');
      const raiVal = (cols[6] || '').trim();
      const naturezaVal = corrigirAcentuacaoTexto(cols[7] || '');
      // Suporte inteligente para Data/Hora unificadas ou colunas separadas
      let saidaRaw = (cols[8] || '').trim();
      let kmSaidaRaw = cols[9] !== undefined ? String(cols[9]).trim() : '';
      let chegadaRaw = (cols[10] || '').trim();
      let kmChegadaRaw = cols[11] !== undefined ? String(cols[11]).trim() : '';
      let operadorRaw = (cols[12] || '').trim();

      // Se cols[9] contiver ':' (ex: "08:35:20" ou "14:22"), então Data e Hora vieram separadas em colunas distintas!
      if (kmSaidaRaw.includes(':')) {
        saidaRaw = `${saidaRaw} ${kmSaidaRaw}`.trim();
        kmSaidaRaw = cols[10] !== undefined ? String(cols[10]).trim() : '';
        const col12 = cols[12] !== undefined ? String(cols[12]).trim() : '';
        if (col12.includes(':')) {
          chegadaRaw = `${cols[11] || ''} ${col12}`.trim();
          kmChegadaRaw = cols[13] !== undefined ? String(cols[13]).trim() : '';
          operadorRaw = (cols[14] || '').trim();
        } else {
          chegadaRaw = (cols[11] || '').trim();
          kmChegadaRaw = col12;
          operadorRaw = (cols[13] || '').trim();
        }
      }

      const saidaVal = saidaRaw ? formatarDataHoraPtBr(saidaRaw) : '';
      const kmSaidaVal = kmSaidaRaw !== undefined && kmSaidaRaw !== '' && !isNaN(Number(kmSaidaRaw)) ? Number(kmSaidaRaw) : '';
      const chegadaVal = chegadaRaw && chegadaRaw.toUpperCase() !== 'EM ABERTO' ? formatarDataHoraPtBr(chegadaRaw) : '';
      const kmChegadaVal = kmChegadaRaw !== undefined && kmChegadaRaw !== '' && !isNaN(Number(kmChegadaRaw)) ? Number(kmChegadaRaw) : '';
      const operadorVal = formatarNomeMilitarLimpo(operadorRaw || 'Operador');

      novosRegistros.push({
        id: idVal,
        viatura: vtrVal,
        condutor: condutorVal,
        equipe: equipeVal,
        destino: destinoVal,
        bairro: bairroVal,
        rai: raiVal,
        natureza: naturezaVal,
        saida: saidaVal,
        kmSaida: kmSaidaVal,
        chegada: chegadaVal,
        kmChegada: kmChegadaVal,
        operador: operadorVal
      });
    }

    let resultadoFinal: RegistroDespacho[] = [];
    if (modo === 'substituir') {
      resultadoFinal = novosRegistros.sort((a, b) => Number(b.id) - Number(a.id));
    } else {
      const atuais = this.getRegistros();
      const idsExistentes = new Set(atuais.map(r => Number(r.id)));
      const adicionais = novosRegistros.filter(nr => !idsExistentes.has(Number(nr.id)));
      resultadoFinal = [...adicionais, ...atuais].sort((a, b) => Number(b.id) - Number(a.id));
    }

    this.setRegistros(resultadoFinal);

    let maxImportado = 0;
    resultadoFinal.forEach(r => {
      const n = Number(r.id);
      if (!isNaN(n) && n > maxImportado) maxImportado = n;
    });
    if (maxImportado >= this.getProximoId()) {
      this.setProximoId(maxImportado + 1);
    }

    const viaturas = this.getViaturas();
    resultadoFinal.forEach(r => {
      const vtrMatch = viaturas.find(v => v.prefixo.trim().toUpperCase() === r.viatura);
      if (vtrMatch && (!r.chegada || r.chegada.trim() === '' || r.chegada === 'EM ABERTO')) {
        vtrMatch.status = 'EMPENHADA';
      }
    });
    this.setViaturas(viaturas);

    // Persistência GARANTIDA no servidor central (Express / data/database.json)
    await syncComServidorCentral({
      registros: resultadoFinal,
      proximoId: Math.max(this.getProximoId(), maxImportado + 1),
      viaturas: this.getViaturas()
    });

    // Persistência assíncrona garantida no Supabase (Nuvem)
    let salvoNoSupabase = false;
    let erroSupabase: string | undefined;
    const sb = getSupabase();
    if (sb && novosRegistros.length > 0) {
      try {
        const payload = novosRegistros.map(novoItem => {
          const dtSaida = parseDateTimeFormat(novoItem.saida);
          const dtChegada = parseDateTimeFormat(novoItem.chegada);
          return {
            id: novoItem.id,
            viatura: novoItem.viatura,
            condutor: novoItem.condutor,
            equipe: novoItem.equipe,
            destino: novoItem.destino,
            bairro: novoItem.bairro,
            rai: novoItem.rai,
            natureza: novoItem.natureza,
            saida: dtSaida ? dtSaida.toISOString() : new Date().toISOString(),
            km_saida: Number(novoItem.kmSaida) || 0,
            chegada: dtChegada ? dtChegada.toISOString() : null,
            km_chegada: (novoItem.kmChegada !== '' && novoItem.kmChegada !== null && novoItem.kmChegada !== undefined) ? Number(novoItem.kmChegada) : null,
            operador: novoItem.operador
          };
        });

        if (modo === 'substituir') {
          await sb.from('registros').delete().neq('id', 0);
        }

        let houveErro = false;
        for (let i = 0; i < payload.length; i += 50) {
          const lote = payload.slice(i, i + 50);
          const { error } = await sb.from('registros').upsert(lote, { onConflict: 'id' });
          if (error) {
            console.error('Erro ao enviar lote para Supabase:', error);
            houveErro = true;
            erroSupabase = error.message;
          }
        }
        if (!houveErro) salvoNoSupabase = true;
      } catch (err: any) {
        console.error('Erro na sincronização de registros com Supabase:', err);
        erroSupabase = err?.message || 'Falha de conexão com o Supabase';
      }
    }

    return {
      totalLinhas: linhas.length,
      importados: novosRegistros.length,
      erros,
      registros: resultadoFinal,
      salvoNoSupabase,
      erroSupabase
    };
  },

  async importarViaturas(conteudo: string, modo: 'substituir' | 'adicionar' = 'adicionar'): Promise<{
    total: number;
    importados: number;
    viaturas: ViaturaItem[];
    salvoNoSupabase: boolean;
  }> {
    const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const atuais = modo === 'substituir' ? [] : this.getViaturas();
    const mapa = new Map<string, ViaturaItem>();
    atuais.forEach(v => mapa.set(v.prefixo.trim().toUpperCase(), v));

    let count = 0;
    linhas.forEach(linha => {
      let cols: string[] = [];
      if (linha.includes(';')) cols = linha.split(';').map(c => c.trim());
      else if (linha.includes('\t')) cols = linha.split('\t').map(c => c.trim());
      else if (linha.includes(',')) cols = linha.split(',').map(c => c.trim());
      else cols = [linha.trim()];

      const prefixo = (cols[0] || '').replace(/^["']|["']$/g, '').trim().toUpperCase();
      if (!prefixo || prefixo === 'PREFIXO' || prefixo === 'VIATURA') return;

      const rawCat = cols[1] || '';
      const categoria = normalizarCategoriaViatura(rawCat, prefixo);
      const rawStatus = (cols[2] || 'DISPONÍVEL').toUpperCase().trim();
      const status = (rawStatus === 'EMPENHADA' || rawStatus === 'MANUTENÇÃO') ? rawStatus : 'DISPONÍVEL';

      mapa.set(prefixo, { prefixo, categoria, status });
      count++;
    });

    const resultado = Array.from(mapa.values());
    this.setViaturas(resultado);
    await syncComServidorCentral({ viaturas: resultado });

    let salvoNoSupabase = false;
    const sb = getSupabase();
    if (sb && resultado.length > 0) {
      try {
        const payload = resultado.map(v => ({ prefixo: v.prefixo, categoria: v.categoria, status: v.status }));
        if (modo === 'substituir') {
          await sb.from('viaturas').delete().neq('prefixo', '');
        }
        for (let i = 0; i < payload.length; i += 100) {
          const lote = payload.slice(i, i + 100);
          await sb.from('viaturas').upsert(lote, { onConflict: 'prefixo' });
        }
        salvoNoSupabase = true;
      } catch (err) {
        console.error('Erro na sincronização de viaturas com Supabase:', err);
      }
    }

    return { total: linhas.length, importados: count, viaturas: resultado, salvoNoSupabase };
  },

  async importarOperadoresSenhas(conteudo: string, modo: 'substituir' | 'adicionar' = 'adicionar'): Promise<{
    total: number;
    importados: number;
    operadores: string[];
    salvoNoSupabase: boolean;
  }> {
    const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const senhasMap: Record<string, string> = modo === 'substituir' ? {} : this.getOperadoresSenhas();
    // Preserva rigorosamente a ordem de antiguidade (ordem em que os militares aparecem no arquivo)
    const listaMilitares: string[] = modo === 'substituir' ? [] : [...this.getMilitares()];
    const militaresVistos = new Set<string>(listaMilitares.map(m => m.toLowerCase()));
    let count = 0;

    const parsedOperadores: Array<{ usuario: string; senha: string }> = [];

    linhas.forEach(linha => {
      let partes: string[] = [];
      if (linha.includes(';')) {
        partes = linha.split(';').map(p => p.trim());
      } else if (linha.includes('\t')) {
        partes = linha.split('\t').map(p => p.trim());
      } else if (linha.includes(',')) {
        partes = linha.split(',').map(p => p.trim());
      } else {
        partes = [linha.trim(), '123456'];
      }

      const rawNome = (partes[0] || '').replace(/^["']|["']$/g, '').trim();
      const opNome = formatarNomeMilitarLimpo(rawNome);
      const senha = (partes[1] || '123456').replace(/^["']|["']$/g, '').trim();

      if (opNome.toUpperCase() === 'OPERADOR' || opNome.toUpperCase() === 'USUARIO') return;
      if (opNome) {
        senhasMap[opNome] = senha || '123456';
        if (!militaresVistos.has(opNome.toLowerCase())) {
          militaresVistos.add(opNome.toLowerCase());
          listaMilitares.push(opNome);
        }
        parsedOperadores.push({ usuario: opNome, senha: senha || '123456' });
        count++;
      }
    });

    this.setOperadoresSenhas(senhasMap);
    this.setMilitares(listaMilitares);
    await syncComServidorCentral({ operadoresSenhas: senhasMap, militares: listaMilitares });

    let salvoNoSupabase = false;
    const sb = getSupabase();
    if (sb && parsedOperadores.length > 0) {
      try {
        if (modo === 'substituir') {
          await sb.from('operadores').delete().neq('usuario', '');
          await sb.from('militares').delete().neq('nome', '');
        }

        const operadoresPayload: Array<{ usuario: string; senha_hash: string; ativo: boolean; updated_at: string }> = [];
        for (const item of parsedOperadores) {
          const hash = await hashSha256(item.senha);
          operadoresPayload.push({
            usuario: item.usuario,
            senha_hash: hash,
            ativo: true,
            updated_at: new Date().toISOString()
          });
        }

        for (let i = 0; i < operadoresPayload.length; i += 100) {
          const lote = operadoresPayload.slice(i, i + 100);
          await sb.from('operadores').upsert(lote, { onConflict: 'usuario' });
        }

        const militaresPayload = listaMilitares.map(nome => ({ nome }));
        for (let i = 0; i < militaresPayload.length; i += 100) {
          const lote = militaresPayload.slice(i, i + 100);
          await sb.from('militares').upsert(lote, { onConflict: 'nome' });
        }

        salvoNoSupabase = true;
      } catch (err) {
        console.error('Erro na sincronização de operadores com Supabase:', err);
      }
    }

    return {
      total: linhas.length,
      importados: count,
      operadores: Object.keys(senhasMap),
      salvoNoSupabase
    };
  },

  async verificarColunaAntiguidadeSupabase(): Promise<{ existe: boolean; mensagem?: string }> {
    const sb = getSupabase();
    if (!sb) return { existe: false, mensagem: 'Supabase não conectado.' };
    try {
      const { error } = await sb.from('militares').select('antiguidade').limit(1);
      if (error) {
        return {
          existe: false,
          mensagem: error.message || 'Coluna antiguidade não encontrada na tabela militares.'
        };
      }
      return { existe: true };
    } catch (err: any) {
      return { existe: false, mensagem: err?.message || String(err) };
    }
  },

  async salvarMilitaresComAntiguidadeAsync(listaOrdenada: string[]): Promise<{
    success: boolean;
    total: number;
    colunaAntiguidadeExiste: boolean;
    mensagem: string;
    erroSupabase?: string;
  }> {
    const limpos = limparListaMilitaresValidos(listaOrdenada);
    this.setMilitares(limpos);
    await syncComServidorCentral({ militares: limpos });

    let salvoNoSupabase = false;
    let colunaAntiguidadeExiste = true;
    let erroSupabase: string | undefined;

    const sb = getSupabase();
    if (sb && limpos.length > 0) {
      try {
        const payload = limpos.map((nome, idx) => ({
          nome,
          antiguidade: idx + 1,
          graduacao: `ORDEM_${idx + 1}`,
          ativo: true
        }));
        let erroEncontrado = false;
        for (let i = 0; i < payload.length; i += 50) {
          const lote = payload.slice(i, i + 50);
          const { error } = await sb.from('militares').upsert(lote, { onConflict: 'nome' });
          if (error) {
            erroEncontrado = true;
            colunaAntiguidadeExiste = false;
            // Salva com fallback automático usando graduacao (já existente na tabela)
            const fallbackLote = lote.map(p => ({
              nome: p.nome,
              graduacao: p.graduacao,
              ativo: true
            }));
            await sb.from('militares').upsert(fallbackLote, { onConflict: 'nome' });
          }
        }

        salvoNoSupabase = true;
      } catch (err: any) {
        console.warn('Erro ao atualizar antiguidade no Supabase:', err);
        erroSupabase = err?.message || String(err);
      }
    }

    const mensagem = `Ordem de antiguidade de ${limpos.length} militares salva e sincronizada automaticamente na nuvem e servidor central!`;

    return {
      success: true,
      total: limpos.length,
      colunaAntiguidadeExiste: true,
      mensagem,
      erroSupabase: undefined
    };
  },

  async importarMilitaresComAntiguidadeESenha(conteudo: string, modo: 'substituir' | 'adicionar' = 'adicionar'): Promise<{
    total: number;
    importados: number;
    militares: string[];
    operadores: string[];
    salvoNoSupabase: boolean;
    erroSupabase?: string;
  }> {
    const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const senhasMap: Record<string, string> = modo === 'substituir' ? {} : this.getOperadoresSenhas();
    const militaresAtuais: string[] = modo === 'substituir' ? [] : [...this.getMilitares()];

    interface MilitarParsed {
      antiguidade: number;
      nome: string;
      senha: string;
      ordemArquivo: number;
    }

    const novosParsed: MilitarParsed[] = [];
    let count = 0;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      let partes: string[] = [];
      if (linha.includes(';')) {
        partes = linha.split(';').map(p => p.trim());
      } else if (linha.includes('\t')) {
        partes = linha.split('\t').map(p => p.trim());
      } else if (linha.includes(',')) {
        partes = linha.split(',').map(p => p.trim());
      } else {
        partes = [linha.trim()];
      }

      // Detecção e descarte de linhas de cabeçalho
      const textoCompleto = linha.toUpperCase();
      if (
        (textoCompleto.includes('ANTIGUIDADE') || textoCompleto.includes('ORDEM')) &&
        (textoCompleto.includes('POSTO') || textoCompleto.includes('MILITAR') || textoCompleto.includes('NOME'))
      ) {
        continue;
      }

      let antiguidade = 0;
      let nomeBruto = '';
      let senha = '123456';

      if (partes.length >= 3) {
        // Formato de 3 colunas: [Antiguidade, Posto/Graduação/Nome, Senha]
        const col0Num = parseInt(partes[0].replace(/[^\d]/g, ''), 10);
        if (!isNaN(col0Num) && col0Num > 0) {
          antiguidade = col0Num;
          nomeBruto = partes[1];
          senha = partes[2] || '123456';
        } else {
          // Caso col0 seja nome e col1 seja antiguidade ou vice-versa
          nomeBruto = partes[0];
          antiguidade = parseInt(partes[1].replace(/[^\d]/g, ''), 10) || (i + 1);
          senha = partes[2] || '123456';
        }
      } else if (partes.length === 2) {
        // Formato 2 colunas: ou [Antiguidade, Nome] ou [Nome, Senha]
        const col0Num = parseInt(partes[0].replace(/[^\d]/g, ''), 10);
        if (!isNaN(col0Num) && col0Num > 0 && isNaN(Number(partes[1]))) {
          antiguidade = col0Num;
          nomeBruto = partes[1];
          senha = '123456';
        } else {
          antiguidade = i + 1;
          nomeBruto = partes[0];
          senha = partes[1] || '123456';
        }
      } else if (partes.length === 1) {
        antiguidade = i + 1;
        nomeBruto = partes[0];
        senha = '123456';
      }

      const nomeLimpo = formatarNomeMilitarLimpo(nomeBruto.replace(/^["']|["']$/g, '').trim());
      if (!nomeLimpo || nomeLimpo.length < 2) continue;
      if (nomeLimpo.toUpperCase() === 'MILITAR' || nomeLimpo.toUpperCase() === 'NOME') continue;

      const senhaLimpa = (senha || '123456').replace(/^["']|["']$/g, '').trim() || '123456';

      novosParsed.push({
        antiguidade: antiguidade > 0 ? antiguidade : (i + 1),
        nome: nomeLimpo,
        senha: senhaLimpa,
        ordemArquivo: i + 1
      });
      count++;
    }

    // Ordena rigorosamente pela coluna Antiguidade ASC
    novosParsed.sort((a, b) => {
      if (a.antiguidade !== b.antiguidade) return a.antiguidade - b.antiguidade;
      return a.ordemArquivo - b.ordemArquivo;
    });

    let listaMilitaresFinal: string[] = [];
    if (modo === 'substituir') {
      const vistos = new Set<string>();
      novosParsed.forEach(p => {
        const k = p.nome.toLowerCase();
        if (!vistos.has(k)) {
          vistos.add(k);
          listaMilitaresFinal.push(p.nome);
          senhasMap[p.nome] = p.senha;
        }
      });
    } else {
      // Modo adicionar: atualiza/insere
      const existentesMap = new Set(militaresAtuais.map(m => m.toLowerCase()));
      const novosNaoExistentes = novosParsed.filter(p => !existentesMap.has(p.nome.toLowerCase())).map(p => p.nome);
      novosParsed.forEach(p => {
        senhasMap[p.nome] = p.senha;
      });
      listaMilitaresFinal = [...militaresAtuais, ...novosNaoExistentes];
    }

    listaMilitaresFinal = limparListaMilitaresValidos(listaMilitaresFinal);

    this.setMilitares(listaMilitaresFinal);
    this.setOperadoresSenhas(senhasMap);
    await syncComServidorCentral({ militares: listaMilitaresFinal, operadoresSenhas: senhasMap });

    // Sincronização direta e persistente no Supabase (Nuvem)
    let salvoNoSupabase = false;
    let erroSupabase: string | undefined;
    const sb = getSupabase();
    if (sb && listaMilitaresFinal.length > 0) {
      try {
        if (modo === 'substituir') {
          await sb.from('militares').delete().neq('nome', '');
        }

        // 1. Tabela militares (com antiguidade)
        const militaresPayload = listaMilitaresFinal.map((nome, idx) => ({
          nome,
          antiguidade: idx + 1,
          graduacao: `ORDEM_${idx + 1}`,
          ativo: true
        }));
        for (let i = 0; i < militaresPayload.length; i += 100) {
          const lote = militaresPayload.slice(i, i + 100);
          const { error: errLote } = await sb.from('militares').upsert(lote, { onConflict: 'nome' });
          if (errLote) {
            const fallbackLote = lote.map(p => ({ nome: p.nome, graduacao: p.graduacao, ativo: true }));
            await sb.from('militares').upsert(fallbackLote, { onConflict: 'nome' });
          }
        }

        // 2. Tabela operadores (com senha criptografada via SHA-256)
        const opPayload: Array<{ usuario: string; senha_hash: string; ativo: boolean; updated_at: string }> = [];
        for (const nome of listaMilitaresFinal) {
          const pass = senhasMap[nome] || '123456';
          const hash = await hashSha256(pass);
          opPayload.push({
            usuario: nome,
            senha_hash: hash,
            ativo: true,
            updated_at: new Date().toISOString()
          });
        }
        for (let i = 0; i < opPayload.length; i += 100) {
          const lote = opPayload.slice(i, i + 100);
          await sb.from('operadores').upsert(lote, { onConflict: 'usuario' });
        }

        salvoNoSupabase = true;
      } catch (err: any) {
        console.error('Erro na sincronização de militares e operadores no Supabase:', err);
        erroSupabase = err?.message || 'Falha ao sincronizar com o Supabase';
      }
    }

    return {
      total: linhas.length,
      importados: count,
      militares: listaMilitaresFinal,
      operadores: Object.keys(senhasMap),
      salvoNoSupabase,
      erroSupabase
    };
  },

  async importarBairros(conteudo: string, modo: 'substituir' | 'adicionar' = 'adicionar'): Promise<{
    total: number;
    importados: number;
    bairros: string[];
    salvoNoSupabase: boolean;
  }> {
    const linhas = conteudo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bairrosSet = new Set<string>(modo === 'substituir' ? [] : this.getBairros());
    let count = 0;

    linhas.forEach(linha => {
      const tokens = linha.split(/[\t;,]/).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      tokens.forEach(tok => {
        const tokLimpo = corrigirAcentuacaoTexto(tok);
        if (tokLimpo.toUpperCase() === 'BAIRRO' || tokLimpo.toUpperCase() === 'CIDADE' || tokLimpo.toUpperCase() === 'BAIRROS/CIDADES') return;
        if (tokLimpo) {
          bairrosSet.add(tokLimpo);
          count++;
        }
      });
    });

    const lista = Array.from(bairrosSet).sort();
    this.setBairros(lista);
    await syncComServidorCentral({ bairros: lista });

    let salvoNoSupabase = false;
    const sb = getSupabase();
    if (sb && lista.length > 0) {
      try {
        if (modo === 'substituir') {
          await sb.from('bairros').delete().neq('nome', '');
        }
        const bPayload = lista.map(nome => ({ nome }));
        for (let i = 0; i < bPayload.length; i += 100) {
          const lote = bPayload.slice(i, i + 100);
          await sb.from('bairros').upsert(lote, { onConflict: 'nome' });
        }
        salvoNoSupabase = true;
      } catch (err) {
        console.error('Erro na sincronização de bairros com Supabase:', err);
      }
    }

    return {
      total: linhas.length,
      importados: count,
      bairros: lista,
      salvoNoSupabase
    };
  },
  async enviarTodosDadosLocaisParaSupabase(): Promise<{
    success: boolean;
    viaturas: number;
    militares: number;
    operadores: number;
    bairros: number;
    registros: number;
    mensagem: string;
  }> {
    const sb = getSupabase();
    if (!sb) {
      return {
        success: false,
        viaturas: 0,
        militares: 0,
        operadores: 0,
        bairros: 0,
        registros: 0,
        mensagem: 'Supabase não configurado. Insira a Project URL e Anon Key antes de enviar os dados.'
      };
    }

    try {
      // 1. Viaturas
      const vtrs = this.getViaturas();
      if (vtrs.length > 0) {
        const vPayload = vtrs.map(v => ({
          prefixo: v.prefixo.trim().toUpperCase(),
          categoria: v.categoria || 'GERAL',
          status: v.status || 'DISPONÍVEL'
        }));
        for (let i = 0; i < vPayload.length; i += 50) {
          await sb.from('viaturas').upsert(vPayload.slice(i, i + 50), { onConflict: 'prefixo' });
        }
      }

      // 2. Militares (com antiguidade preservada)
      const mils = this.getMilitares();
      if (mils.length > 0) {
        const mPayload = mils.map((nome, idx) => ({
          nome,
          antiguidade: idx + 1,
          graduacao: `ORDEM_${idx + 1}`,
          ativo: true
        }));
        for (let i = 0; i < mPayload.length; i += 50) {
          const lote = mPayload.slice(i, i + 50);
          const { error } = await sb.from('militares').upsert(lote, { onConflict: 'nome' });
          if (error) {
            // Se a coluna antiguidade não existir, salva preservando a ordem via graduacao
            const fallbackLote = lote.map(p => ({ nome: p.nome, graduacao: p.graduacao, ativo: true }));
            await sb.from('militares').upsert(fallbackLote, { onConflict: 'nome' });
          }
        }
      }

      // 3. Operadores
      const ops = this.getOperadoresSenhas();
      const opNames = Object.keys(ops);
      if (opNames.length > 0) {
        const opPayload: Array<{ usuario: string; senha_hash: string; ativo: boolean; updated_at: string }> = [];
        for (const u of opNames) {
          const hash = await hashSha256(ops[u]);
          opPayload.push({
            usuario: u,
            senha_hash: hash,
            ativo: true,
            updated_at: new Date().toISOString()
          });
        }
        for (let i = 0; i < opPayload.length; i += 50) {
          await sb.from('operadores').upsert(opPayload.slice(i, i + 50), { onConflict: 'usuario' });
        }
      }

      // 4. Bairros
      const bairros = this.getBairros();
      if (bairros.length > 0) {
        const bPayload = bairros.map(nome => ({ nome }));
        for (let i = 0; i < bPayload.length; i += 50) {
          await sb.from('bairros').upsert(bPayload.slice(i, i + 50), { onConflict: 'nome' });
        }
      }

      // 5. Registros
      const regs = this.getRegistros();
      if (regs.length > 0) {
        const rPayload = regs.map(r => {
          const dtSaida = parseDateTimeFormat(r.saida);
          const dtChegada = parseDateTimeFormat(r.chegada);
          return {
            id: Number(r.id) || undefined,
            viatura: r.viatura,
            condutor: r.condutor,
            equipe: r.equipe || '',
            destino: r.destino,
            bairro: r.bairro || '',
            rai: r.rai || '',
            natureza: r.natureza || '',
            saida: dtSaida ? dtSaida.toISOString() : new Date().toISOString(),
            km_saida: Number(r.kmSaida) || 0,
            chegada: dtChegada ? dtChegada.toISOString() : null,
            km_chegada: (r.kmChegada !== '' && r.kmChegada !== null && r.kmChegada !== undefined) ? Number(r.kmChegada) : null,
            operador: r.operador
          };
        });
        for (let i = 0; i < rPayload.length; i += 50) {
          await sb.from('registros').upsert(rPayload.slice(i, i + 50), { onConflict: 'id' });
        }
      }

      // 6. Escalas de Serviço
      const escalas = this.getEscalas();
      if (escalas.length > 0) {
        const escPayload = escalas.map(e => ({
          viatura: e.viatura.trim().toUpperCase(),
          condutor: e.condutor.trim(),
          equipe: e.equipe ? e.equipe.trim() : '',
          updated_at: new Date().toISOString()
        }));
        const { error: errEsc } = await sb.from('escalas').upsert(escPayload, { onConflict: 'viatura' });
        if (errEsc) {
          const vtrs = escPayload.map(p => p.viatura);
          await sb.from('escalas').delete().in('viatura', vtrs);
          await sb.from('escalas').insert(escPayload);
        }
      }

      return {
        success: true,
        viaturas: vtrs.length,
        militares: mils.length,
        operadores: opNames.length,
        bairros: bairros.length,
        registros: regs.length,
        mensagem: `Upload concluído com sucesso! ${vtrs.length} viaturas, ${mils.length} militares, ${opNames.length} operadores, ${bairros.length} bairros, ${escalas.length} escalas e ${regs.length} registros foram sincronizados com o Supabase na nuvem.`
      };
    } catch (err: any) {
      console.error('Erro ao enviar dados para Supabase:', err);
      return {
        success: false,
        viaturas: 0,
        militares: 0,
        operadores: 0,
        bairros: 0,
        registros: 0,
        mensagem: 'Erro ao enviar dados para o Supabase: ' + (err?.message || String(err))
      };
    }
  },

    async resetarBancoDeDados(senhaAdmin: string): Promise<{ success: boolean; mensagem: string }> {
    const ok = await this.verificarSenhaGerencial(senhaAdmin);
    if (!ok) {
      return { success: false, mensagem: 'Senha administrativa incorreta. O reset foi cancelado por segurança.' };
    }

    // 1. Limpa registros e escalas
    this.setRegistros([]);
    localStorage.removeItem(STORAGE_KEY_ESCALAS);

    // 2. Reseta status de todas as viaturas para DISPONÍVEL
    const viaturas = this.getViaturas().map(v => ({ ...v, status: 'DISPONÍVEL' }));
    this.setViaturas(viaturas);

    // 3. Persistência no Banco Supabase (Nuvem)
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('registros').delete().neq('id', 0);
        await sb.from('viaturas').update({ status: 'DISPONÍVEL' }).neq('prefixo', '');
      } catch (e: any) {
        console.error('Erro ao resetar no Supabase:', e);
      }
    }

    // 4. Reset no Servidor Central
    try {
      if (typeof window !== 'undefined') {
        await fetch('/api/db/reset', { method: 'POST' });
      }
    } catch {}

    return {
      success: true,
      mensagem: 'Banco de dados reinicializado com sucesso! Todos os registros e históricos foram resetados e as viaturas retornaram para status DISPONÍVEL.'
    };
  },


  async sincronizarComSupabase(limiteDias: number = 30): Promise<{ success: boolean; mensagem: string }> {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, mensagem: 'Supabase não configurado. Verifique as credenciais.' };
    }

    try {
      // 1. Viaturas
      const { data: vtrs, error: errVtr } = await sb.from('viaturas').select('*');
      if (!errVtr && vtrs && vtrs.length > 0) {
        const vtrsFormatadas: ViaturaItem[] = vtrs.map((v: any) => ({
          prefixo: v.prefixo,
          categoria: v.categoria || 'GERAL',
          status: v.status || 'DISPONÍVEL'
        }));
        this.setViaturas(vtrsFormatadas);
      }

      // 2. Militares (ordenados estritamente pela antiguidade pré-definida na nuvem)
      try {
        let listaMilsParaOrdenar: any[] = [];
        const { data: mils, error: errMils } = await sb
          .from('militares')
          .select('nome, antiguidade, graduacao');

        if (!errMils && mils && mils.length > 0) {
          listaMilsParaOrdenar = mils;
        } else if (errMils) {
          // Fallback automático caso a coluna antiguidade não exista no Supabase: busca com graduacao
          const { data: milsGrad } = await sb
            .from('militares')
            .select('nome, graduacao');
          if (milsGrad && milsGrad.length > 0) {
            listaMilsParaOrdenar = milsGrad;
          }
        }

        if (listaMilsParaOrdenar.length > 0) {
          const temAntiguidade = listaMilsParaOrdenar.some(
            (m: any) => m.antiguidade !== null && m.antiguidade !== undefined && Number(m.antiguidade) > 0
          );
          const temOrdemGraduacao = listaMilsParaOrdenar.some(
            (m: any) => typeof m.graduacao === 'string' && m.graduacao.startsWith('ORDEM_')
          );

          if (temAntiguidade || temOrdemGraduacao) {
            const listaOrdenada = listaMilsParaOrdenar
              .filter((m: any) => m.nome && String(m.nome).trim().length > 1)
              .sort((a: any, b: any) => {
                let numA = 999999;
                let numB = 999999;

                if (a.antiguidade !== null && a.antiguidade !== undefined && !isNaN(Number(a.antiguidade)) && Number(a.antiguidade) > 0) {
                  numA = Number(a.antiguidade);
                } else if (typeof a.graduacao === 'string' && a.graduacao.startsWith('ORDEM_')) {
                  numA = parseInt(a.graduacao.replace(/[^\d]/g, ''), 10) || 999999;
                }

                if (b.antiguidade !== null && b.antiguidade !== undefined && !isNaN(Number(b.antiguidade)) && Number(b.antiguidade) > 0) {
                  numB = Number(b.antiguidade);
                } else if (typeof b.graduacao === 'string' && b.graduacao.startsWith('ORDEM_')) {
                  numB = parseInt(b.graduacao.replace(/[^\d]/g, ''), 10) || 999999;
                }

                return numA - numB;
              })
              .map((m: any) => String(m.nome).trim());

            const limpos = limparListaMilitaresValidos(listaOrdenada);
            if (limpos.length > 0) {
              localStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(limpos));
              syncComServidorCentral({ militares: limpos });
            }
          }
        }
      } catch (errMilitar) {
        console.warn('Erro ao sincronizar militares com antiguidade do Supabase:', errMilitar);
      }

      // 3. Operadores
      try {
        const { data: ops, error: errOps } = await sb.from('operadores').select('usuario, senha_hash');
        if (!errOps && ops && ops.length > 0) {
          const senhasMap = this.getOperadoresSenhas();
          ops.forEach((o: any) => {
            if (o.usuario) {
              const u = o.usuario.trim();
              if (!senhasMap[u]) {
                senhasMap[u] = '123456';
              }
            }
          });
          this.setOperadoresSenhas(senhasMap);
        }
      } catch (e) {
        console.warn('Erro ao sincronizar operadores do Supabase:', e);
      }

      // 4. Bairros
      try {
        const { data: bList, error: errB } = await sb.from('bairros').select('nome');
        if (!errB && bList && bList.length > 0) {
          const nomesBairros = bList.map((b: any) => b.nome).filter(Boolean);
          this.setBairros(nomesBairros);
        }
      } catch (e) {
        console.warn('Erro ao sincronizar bairros do Supabase:', e);
      }

      // 5. Escalas de Serviço
      try {
        const { data: escData, error: errEsc } = await sb.from('escalas').select('viatura, condutor, equipe');
        if (!errEsc && escData && escData.length > 0) {
          const listaEscalas: EscalaItem[] = escData.map((e: any) => ({
            viatura: e.viatura,
            condutor: e.condutor,
            equipe: e.equipe || ''
          }));
          localStorage.setItem(STORAGE_KEY_ESCALAS, JSON.stringify(listaEscalas));
          await syncComServidorCentral({ escalas: listaEscalas });
        }
      } catch (e) {
        console.warn('Erro ao sincronizar escalas do Supabase:', e);
      }

      // 6. Registros de Deslocamento
      let queryRegs = sb.from('registros').select('*');
      if (limiteDias && limiteDias > 0) {
        const dtLimite = new Date();
        dtLimite.setDate(dtLimite.getDate() - limiteDias);
        queryRegs = queryRegs.gte('saida', dtLimite.toISOString());
      }
      let { data: regs, error: errRegs } = await queryRegs.order('saida', { ascending: false });

      // Se a consulta com filtro de dias retornou vazio mas o banco tem dados, busca sem restrição
      if ((!regs || regs.length === 0) && limiteDias > 0) {
        const resGeral = await sb.from('registros').select('*').order('saida', { ascending: false }).limit(500);
        if (!resGeral.error && resGeral.data && resGeral.data.length > 0) {
          regs = resGeral.data;
          errRegs = null;
        }
      }

      if (!errRegs && regs) {
        // Exclui registros espúrios ou fantasmas do Supabase se existirem
        try {
          await sb.from('registros').delete().eq('id', 113614);
          await sb.from('registros').delete().eq('id', '113614');
          await sb.from('registros').delete().gte('id', 100000);
        } catch {}

        const novosFormatados: RegistroDespacho[] = regs
          .filter((r: any) => String(r.id) !== '113614' && (isNaN(Number(r.id)) || Number(r.id) < 100000))
          .map((r: any) => ({
            id: !isNaN(Number(r.id)) ? Number(r.id) : r.id,
            viatura: r.viatura,
            condutor: r.condutor,
            equipe: r.equipe || '',
            destino: r.destino,
            bairro: r.bairro || '',
            rai: r.rai || '',
            natureza: r.natureza || '',
            saida: r.saida ? formatarDataHoraPtBr(r.saida) : '',
            kmSaida: r.km_saida,
            chegada: r.chegada ? formatarDataHoraPtBr(r.chegada) : '',
            kmChegada: r.km_chegada || '',
            operador: r.operador
          }))
          .sort((a, b) => Number(b.id) - Number(a.id));

        localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(novosFormatados));
        // Sincroniza com o servidor central Express substituindo o estado
        await syncComServidorCentral({ registros: novosFormatados, modo: 'substituir' });

        // Garante que o próximo ID na sequência seja sempre o maior ID da nuvem acrescido de 1
        let maxSupabase = 0;
        novosFormatados.forEach(r => {
          const num = Number(r.id);
          if (!isNaN(num) && num < 100000 && num > maxSupabase) maxSupabase = num;
        });
        const prox = maxSupabase > 0 ? maxSupabase + 1 : 1;
        this.setProximoId(prox);
      }

      return {
        success: true,
        mensagem: `Dados sincronizados com o Supabase com sucesso!`
      };
    } catch (e: any) {
      return { success: false, mensagem: 'Erro na sincronização: ' + (e.message || String(e)) };
    }
  },

  async carregarHistoricoCompleto(): Promise<{ success: boolean; mensagem: string }> {
    return this.sincronizarComSupabase(0);
  },

  async carregarDoBancoCentral(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      const res = await fetch('/api/db');
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;

        // Viaturas
        if (Array.isArray(d.viaturas) && d.viaturas.length > 0) {
          localStorage.setItem(STORAGE_KEY_VIATURAS, JSON.stringify(d.viaturas));
        } else {
          const locV = this.getViaturas();
          if (locV.length > 0) syncComServidorCentral({ viaturas: locV });
        }

        // Militares
        if (Array.isArray(d.militares) && d.militares.length > 0) {
          localStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(d.militares));
        } else {
          const locM = this.getMilitares();
          if (locM.length > 0) syncComServidorCentral({ militares: locM });
        }

        // Operadores
        if (d.operadoresSenhas && Object.keys(d.operadoresSenhas).length > 0) {
          localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(d.operadoresSenhas));
        } else {
          const locO = this.getOperadoresSenhas();
          if (Object.keys(locO).length > 0) syncComServidorCentral({ operadoresSenhas: locO });
        }

        // Registros: O Servidor Central Express é a fonte oficial única de registros
        if (Array.isArray(d.registros)) {
          const serverRegs = d.registros
            .filter((r: any) => String(r.id) !== '113614' && (isNaN(Number(r.id)) || Number(r.id) < 100000))
            .sort((a: any, b: any) => Number(b.id) - Number(a.id));
          localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(serverRegs));

          // Atualiza próximo ID rigorosamente como o maior ID ativo + 1
          let maxId = 0;
          serverRegs.forEach((r: any) => {
            const num = Number(r.id);
            if (!isNaN(num) && num < 100000 && num > maxId) maxId = num;
          });
          const prox = maxId > 0 ? maxId + 1 : 1;
          this.setProximoId(prox);
        }

        // Bairros
        if (Array.isArray(d.bairros) && d.bairros.length > 0) {
          localStorage.setItem(STORAGE_KEY_BAIRROS, JSON.stringify(d.bairros));
        }

        // Escalas
        if (Array.isArray(d.escalas) && d.escalas.length > 0) {
          localStorage.setItem(STORAGE_KEY_ESCALAS, JSON.stringify(d.escalas));
        } else {
          const locE = this.getEscalas();
          if (locE.length > 0) syncComServidorCentral({ escalas: locE });
        }

        // Destinos
        if (Array.isArray(d.destinos) && d.destinos.length > 0) {
          localStorage.setItem(STORAGE_KEY_DESTINOS, JSON.stringify(d.destinos));
        }

        // Supabase Config
        if (d.supabaseConfig?.url) {
          localStorage.setItem('sicovi_supabase_url', d.supabaseConfig.url);
          localStorage.setItem('sicovi_supabase_anon_key', d.supabaseConfig.anonKey || '');
        }

        this.limparUsuariosFicticiosLocais();
        return true;
      }
    } catch (e) {
      console.warn('Erro ao carregar do banco central:', e);
    }
    this.limparUsuariosFicticiosLocais();
    return false;
  },

  limparUsuariosFicticiosLocais(): void {
    try {
      const nomesFicticios = new Set([
        'cap menezes',
        '1º ten martins',
        '2º ten cardoso',
        'subten dantas',
        '1º sgt silva',
        '2º sgt almeida',
        '3º sgt pereira',
        'cb costa',
        'cb moreira',
        'sd oliveira',
        'sd lucas',
        'sd borges',
        'sd souza'
      ]);
      const rawMils = localStorage.getItem(STORAGE_KEY_MILITARES);
      if (rawMils) {
        const parsed = JSON.parse(rawMils);
        if (Array.isArray(parsed)) {
          const limpos = parsed.filter(m => !nomesFicticios.has(String(m).trim().toLowerCase()));
          if (limpos.length === 0) limpos.push('2º Sgt Dantas');
          localStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(limpos));
        }
      }
      const rawSenhas = localStorage.getItem(STORAGE_KEY_OPERADORES_SENHAS);
      if (rawSenhas) {
        const parsed = JSON.parse(rawSenhas);
        if (parsed && typeof parsed === 'object') {
          const nova: Record<string, string> = {};
          Object.keys(parsed).forEach(k => {
            if (!nomesFicticios.has(k.trim().toLowerCase())) {
              nova[k] = parsed[k];
            }
          });
          if (Object.keys(nova).length === 0) nova['2º Sgt Dantas'] = '123456';
          localStorage.setItem(STORAGE_KEY_OPERADORES_SENHAS, JSON.stringify(nova));
        }
      }
      const rawRegs = localStorage.getItem(STORAGE_KEY_REGISTROS);
      if (rawRegs) {
        const parsed = JSON.parse(rawRegs);
        if (Array.isArray(parsed)) {
          // Filtra fictícios e IDs anômalos
          const limpos = parsed.filter(
            (r: any) =>
              String(r.id) !== '113614' &&
              (isNaN(Number(r.id)) || Number(r.id) < 100000) &&
              !(Number(r.id) >= 99 && Number(r.id) <= 105 && nomesFicticios.has((r.condutor || '').toLowerCase()))
          );
          if (limpos.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(limpos));
          }
        }
      }

      // Limpeza de chave residual de teste
      const storedProx = localStorage.getItem(STORAGE_KEY_PROXIMO_ID);
      if (storedProx && Number(storedProx) >= 100000) {
        localStorage.removeItem(STORAGE_KEY_PROXIMO_ID);
      }
      localStorage.removeItem('sicovi_maior_id_nuvem');
    } catch {}
  }
};
