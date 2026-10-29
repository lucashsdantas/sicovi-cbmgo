import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode,
  X,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Ambulance,
  Truck,
  Car
} from 'lucide-react';
import QRCode from 'qrcode';
import { ViaturaItem } from '../types/sicovi';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaturas: ViaturaItem[];
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  viaturas
}) => {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');
  const [qrCodesMap, setQrCodesMap] = useState<Record<string, string>>({});
  const [copiadoVtr, setCopiadoVtr] = useState<string | null>(null);
  const [visualizacaoModo, setVisualizacaoModo] = useState<'grid' | 'impressao'>('grid');
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Normalização da categoria
  const getCategoria = (v: ViaturaItem): string => {
    const c = (v.categoria || '').trim().toUpperCase();
    const p = (v.prefixo || '').trim().toUpperCase();
    if (c.includes('RESGATE') || p.startsWith('UR')) return 'RESGATE';
    if (c.includes('INCÊNDIO') || c.includes('INCENDIO') || c.includes('SALVAMENTO') || p.startsWith('ABT') || p.startsWith('ABS')) {
      return 'INCÊNDIO/SALVAMENTO';
    }
    return 'ADMINISTRATIVA';
  };

  // URL base para geração
  const getUrlForViatura = (prefixo: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?vtr=${encodeURIComponent(prefixo)}&ambiente=mobile`;
  };

  // Gerar QR codes para todas as viaturas
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const gerarCodigos = async () => {
      const novoMapa: Record<string, string> = {};
      for (const v of viaturas) {
        const url = getUrlForViatura(v.prefixo);
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          novoMapa[v.prefixo] = dataUrl;
        } catch (err) {
          console.error('Erro gerando QR Code para ' + v.prefixo, err);
        }
      }
      if (isMounted) {
        setQrCodesMap(novoMapa);
      }
    };

    gerarCodigos();
    return () => {
      isMounted = false;
    };
  }, [isOpen, viaturas]);

  const viaturasFiltradas = useMemo(() => {
    return viaturas
      .filter(v => {
        const matchBusca = v.prefixo.toLowerCase().includes(busca.toLowerCase().trim());
        if (!matchBusca) return false;
        if (categoriaAtiva === 'TODAS') return true;
        return getCategoria(v) === categoriaAtiva;
      })
      .sort((a, b) => a.prefixo.localeCompare(b.prefixo, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [viaturas, busca, categoriaAtiva]);

  const handleCopiarLink = (prefixo: string) => {
    const url = getUrlForViatura(prefixo);
    navigator.clipboard.writeText(url).then(() => {
      setCopiadoVtr(prefixo);
      setTimeout(() => setCopiadoVtr(null), 2500);
    });
  };

  const handleBaixarPng = (prefixo: string) => {
    const dataUrl = qrCodesMap[prefixo];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_CODE_${prefixo.replace(/[^a-zA-Z0-9_-]/g, '_')}_SICOVI.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImprimir = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header (Escondido na impressão) */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                QR Codes das Viaturas
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                  Fixação no Painel
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Aponte a câmera do celular para abrir o mobile com a viatura já selecionada após login
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black shadow-sm transition-all cursor-pointer"
              title="Imprimir folha de etiquetas"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Folha</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters (Escondidos na impressão) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar viatura (ex: UR-152, ABT-31)..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['TODAS', 'RESGATE', 'INCÊNDIO/SALVAMENTO', 'ADMINISTRATIVA'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  categoriaAtiva === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => setVisualizacaoModo('grid')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                visualizacaoModo === 'grid' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grade
            </button>
            <button
              type="button"
              onClick={() => setVisualizacaoModo('impressao')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                visualizacaoModo === 'impressao' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prévia de Impressão
            </button>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Como funciona:</strong> Ao escanear o QR Code fixado no painel da viatura, o militar abre direto o SICOVI Mobile. Ele insere seu nome e senha, e a viatura já se abre automaticamente pronta para registrar Saída ou Chegada!
            </span>
          </div>
          <span className="text-[11px] font-black text-amber-800 shrink-0">
            {viaturasFiltradas.length} {viaturasFiltradas.length === 1 ? 'viatura' : 'viaturas'}
          </span>
        </div>

        {/* Content Area */}
        <div ref={printAreaRef} className="p-5 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          {/* Header oficial exclusivo de impressão */}
          <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  CBMGO - SICOVI | ETIQUETAS QR CODE PARA VIATURAS
                </h1>
                <p className="text-xs text-slate-600">
                  Instrução: Recorte e fixe no painel da viatura para acesso imediato via smartphone
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-bold">
                GERADO EM: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>

          {viaturasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Nenhuma viatura encontrada com o filtro informado.</p>
            </div>
          ) : visualizacaoModo === 'grid' ? (
            /* Grade Interativa */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {viaturasFiltradas.map(vtr => {
                const qrImage = qrCodesMap[vtr.prefixo];
                const cat = getCategoria(vtr);
                let badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                let IconCat = Car;
                if (cat === 'RESGATE') {
                  badgeColor = 'bg-red-50 text-red-800 border-red-200';
                  IconCat = Ambulance;
                } else if (cat === 'INCÊNDIO/SALVAMENTO') {
                  badgeColor = 'bg-orange-50 text-orange-800 border-orange-200';
                  IconCat = Truck;
                }

                return (
                  <div
                    key={vtr.prefixo}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-3.5 flex flex-col items-center text-center group"
                  >
                    {/* Header do Card */}
                    <div className="w-full flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}>
                        <IconCat className="w-3 h-3" />
                        {cat}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {vtr.status || 'DISPONÍVEL'}
                      </span>
                    </div>

                    {/* Prefixo em destaque */}
                    <div className="text-lg font-black text-slate-900 tracking-tight mb-2">
                      {vtr.prefixo}
                    </div>

                    {/* QR Code Container */}
                    <div className="w-44 h-44 bg-white p-2 rounded-xl border-2 border-slate-100 shadow-inner flex items-center justify-center relative mb-3">
                      {qrImage ? (
                        <img
                          src={qrImage}
                          alt={`QR Code ${vtr.prefixo}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 animate-pulse font-medium">
                          Gerando QR...
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium mb-3 leading-tight px-1">
                      Aponte a câmera para registrar deslocamento da <strong className="text-slate-800">{vtr.prefixo}</strong>
                    </p>

                    {/* Ações */}
                    <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleCopiarLink(vtr.prefixo)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Copiar link direto"
                      >
                        {copiadoVtr === vtr.prefixo ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBaixarPng(vtr.prefixo)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Baixar imagem PNG para impressão individual"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-700" />
                        <span>PNG</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Folha Pronta para Impressão / Etiquetas */
            <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-4">
              {viaturasFiltradas.map(vtr => {
                const qrImage = qrCodesMap[vtr.prefixo];
                const cat = getCategoria(vtr);
                let borderColor = 'border-blue-600';
                let headerBg = 'bg-blue-600';
                if (cat === 'RESGATE') {
                  borderColor = 'border-red-600';
                  headerBg = 'bg-red-600';
                } else if (cat === 'INCÊNDIO/SALVAMENTO') {
                  borderColor = 'border-orange-500';
                  headerBg = 'bg-orange-500';
                }

                return (
                  <div
                    key={vtr.prefixo}
                    className={`bg-white rounded-xl border-2 ${borderColor} overflow-hidden flex flex-col items-center text-center p-0 shadow-xs print:break-inside-avoid print:shadow-none`}
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    {/* Header Etiqueta */}
                    <div className={`w-full py-1.5 px-2 ${headerBg} text-white flex items-center justify-between`}>
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        CBMGO • SICOVI
                      </span>
                      <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.2 rounded">
                        {cat}
                      </span>
                    </div>

                    <div className="p-3 w-full flex flex-col items-center">
                      {/* Prefixo Gigante */}
                      <div className="text-2xl font-black text-slate-900 tracking-tight my-1">
                        {vtr.prefixo}
                      </div>

                      {/* QR Code Imagem */}
                      <div className="w-36 h-36 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center my-1">
                        {qrImage && (
                          <img
                            src={qrImage}
                            alt={`QR Code ${vtr.prefixo}`}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>

                      <div className="text-[10px] font-bold text-slate-700 mt-1 leading-tight">
                        ACESSO DIRETO À VIATURA
                      </div>
                      <div className="text-[8px] text-slate-500 leading-tight">
                        Aponte a câmera do celular para registrar saída ou retorno
                      </div>
                    </div>

                    <div className="w-full py-1 bg-slate-100 border-t border-slate-200 text-[8px] text-slate-500 font-medium">
                      Fixar no painel interno da viatura
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer do Modal (Escondido na Impressão) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            Dica: Clique em <strong>Imprimir Folha</strong> para imprimir as etiquetas diretamente em papel ou adesivo A4.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
