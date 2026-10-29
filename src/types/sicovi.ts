export type CategoriaViatura = 'INCÊNDIO/SALVAMENTO' | 'SUPORTE AVANÇADO' | 'RESGATE' | 'ADMINISTRATIVA';
export type StatusViatura = 'DISPONÍVEL' | 'EMPENHADA' | 'MANUTENÇÃO' | 'VISTORIA' | 'OCORRÊNCIA';

export interface ViaturaItem {
  prefixo: string;
  categoria: string;
  status: string;
}

export interface EscalaItem {
  viatura: string;
  condutor: string;
  equipe: string;
}

export interface RegistroDespacho {
  id: number | string;
  viatura: string;
  condutor: string;
  equipe: string;
  destino: string;
  bairro: string;
  rai: string;
  natureza: string;
  saida: string; // "DD/MM/YYYY HH:mm" or ISO
  kmSaida: number | string;
  chegada: string; // "DD/MM/YYYY HH:mm" or empty
  kmChegada: number | string;
  operador: string;
}

export interface ViaturaApoioItem {
  viatura: string;
  condutor: string;
  equipe: string;
  kmSaida: number | string;
}

export interface StatTipoItem {
  tipo: string;
  count: number;
  km: number;
  pct: number;
  media: number;
}

export interface StatCategoriaItem {
  id: string;
  label: string;
  count: number;
  km: number;
  viaturas: Set<string>;
  icon: string;
}

export interface StatViaturaItem {
  viatura: string;
  categoria: string;
  count: number;
  kmRodado: number;
  ultimoKm: number;
}
