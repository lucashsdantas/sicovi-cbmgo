/**
 * Gera a URL oficial do sistema de atendimento da SSP-GO para o número da ocorrência (RAI).
 * Exemplo: https://atendimento.ssp.go.gov.br/#/atendimento/49573425
 */
export function getUrlAtendimentoSsp(rai: string): string {
  const numeroLimpo = (rai || '').trim().replace(/^#+/, '');
  return `https://atendimento.ssp.go.gov.br/#/atendimento/${encodeURIComponent(numeroLimpo)}`;
}

export function hasValidRai(rai?: string | null): boolean {
  if (!rai) return false;
  const limpo = String(rai).trim();
  return limpo !== '' && limpo !== '---' && limpo !== '-';
}
