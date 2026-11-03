import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode,
  X,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  Smartphone,
  Ambulance,
  Truck,
  Car,
  CheckSquare,
  Square,
  FileText,
  Filter
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { ViaturaItem } from '../types/sicovi';
import { storageService } from '../services/storageService';
import { soundEffects } from '../utils/soundEffects';

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
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);

  // Garante a lista atualizada de viaturas mesmo que a prop venha vazia ou desatualizada
  const listaViaturas = useMemo(() => {
    if (Array.isArray(viaturas) && viaturas.length > 0) return viaturas;
    return storageService.getViaturas();
  }, [viaturas, isOpen]);

  // Estado das viaturas marcadas para impressão
  const [selecionadas, setSelecionadas] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const vtrs = storageService.getViaturas();
    vtrs.forEach(v => {
      if (v.prefixo) set.add(v.prefixo.trim().toUpperCase());
    });
    return set;
  });

  // Atualiza seleção padrão quando novas viaturas forem carregadas
  useEffect(() => {
    if (listaViaturas.length > 0 && selecionadas.size === 0) {
      setSelecionadas(new Set(listaViaturas.map(v => v.prefixo.trim().toUpperCase())));
    }
  }, [listaViaturas]);

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

  // URL base para geração do QR Code (direto no mobile)
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
      for (const v of listaViaturas) {
        if (!v || !v.prefixo) continue;
        const url = getUrlForViatura(v.prefixo);
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 360,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          novoMapa[v.prefixo.trim().toUpperCase()] = dataUrl;
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
  }, [isOpen, listaViaturas]);

  // Viaturas filtradas pela busca textual e categoria selecionada
  const viaturasFiltradas = useMemo(() => {
    return listaViaturas
      .filter(v => {
        if (!v || !v.prefixo) return false;
        const matchBusca = v.prefixo.toLowerCase().includes(busca.toLowerCase().trim());
        if (!matchBusca) return false;
        if (categoriaAtiva === 'TODAS') return true;
        return getCategoria(v) === categoriaAtiva;
      })
      .sort((a, b) => a.prefixo.localeCompare(b.prefixo, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [listaViaturas, busca, categoriaAtiva]);

  // Viaturas efetivamente marcadas que serão impressas
  const viaturasMarcadasParaImprimir = useMemo(() => {
    return listaViaturas.filter(v => selecionadas.has(v.prefixo.trim().toUpperCase()));
  }, [listaViaturas, selecionadas]);

  // Alternar seleção de uma viatura individual
  const toggleSelecionada = (prefixo: string) => {
    const limpo = prefixo.trim().toUpperCase();
    soundEffects.playClick();
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(limpo)) {
        next.delete(limpo);
      } else {
        next.add(limpo);
      }
      return next;
    });
  };

  // Marcar todas as viaturas visíveis no filtro atual
  const handleMarcarTodasVisiveis = () => {
    soundEffects.playClick();
    setSelecionadas(prev => {
      const next = new Set(prev);
      viaturasFiltradas.forEach(v => next.add(v.prefixo.trim().toUpperCase()));
      return next;
    });
  };

  // Desmarcar todas as viaturas visíveis no filtro atual
  const handleDesmarcarTodasVisiveis = () => {
    soundEffects.playClick();
    setSelecionadas(prev => {
      const next = new Set(prev);
      viaturasFiltradas.forEach(v => next.delete(v.prefixo.trim().toUpperCase()));
      return next;
    });
  };

  // Marcar por categoria específica
  const handleSelecionarPorCategoria = (cat: string) => {
    soundEffects.playClick();
    const set = new Set<string>();
    listaViaturas.forEach(v => {
      if (getCategoria(v) === cat) {
        set.add(v.prefixo.trim().toUpperCase());
      }
    });
    setSelecionadas(set);
  };

  const handleCopiarLink = (prefixo: string) => {
    const url = getUrlForViatura(prefixo);
    navigator.clipboard.writeText(url).then(() => {
      soundEffects.playSuccess();
      setCopiadoVtr(prefixo);
      setTimeout(() => setCopiadoVtr(null), 2500);
    });
  };

  const handleBaixarPng = (prefixo: string) => {
    const limpo = prefixo.trim().toUpperCase();
    const dataUrl = qrCodesMap[limpo];
    if (!dataUrl) return;
    soundEffects.playClick();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_CODE_${limpo.replace(/[^a-zA-Z0-9_-]/g, '_')}_SICOVI.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * IMPRESSÃO ISOLADA E LIMPA:
   * Cria um iframe isolado temporário contendo APENAS a folha de etiquetas formatada para A4.
   * Não imprime nada da tela de fundo, nem o modal administrativo, nem o login!
   */
  const handleImprimirFolhaIsolada = () => {
    if (viaturasMarcadasParaImprimir.length === 0) {
      soundEffects.playWarning();
      alert('Marque pelo menos uma viatura para gerar a folha de impressão de etiquetas.');
      return;
    }

    setImprimindo(true);
    soundEffects.playClick();

    const htmlEtiquetas = viaturasMarcadasParaImprimir.map(v => {
      const pref = v.prefixo.trim().toUpperCase();
      const qrDataUrl = qrCodesMap[pref] || '';
      const cat = getCategoria(v);
      let catClass = 'card-admin';
      let bgClass = 'bg-admin';
      if (cat === 'RESGATE') {
        catClass = 'card-resgate';
        bgClass = 'bg-resgate';
      } else if (cat === 'INCÊNDIO/SALVAMENTO') {
        catClass = 'card-incendio';
        bgClass = 'bg-incendio';
      }

      return `
        <div class="card-etiqueta ${catClass}">
          <div class="header-etiqueta ${bgClass}">
            <span>CBMGO &bull; SICOVI</span>
            <span class="badge-cat">${cat}</span>
          </div>
          <div class="corpo-etiqueta">
            <div class="prefixo-etiqueta">${pref}</div>
            <div class="qr-container">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="${pref}" />` : '<div style="font-size:10px;color:#94a3b8">Sem QR</div>'}
            </div>
            <div class="texto-principal">ACESSO DIRETO À VIATURA</div>
            <div class="texto-sub">Aponte a câmera para registrar deslocamento</div>
          </div>
        </div>
      `;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setImprimindo(false);
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>CBMGO - SICOVI | Etiquetas QR Code para Viaturas</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          body {
            background: #ffffff !important;
            color: #0f172a;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .topo-folha {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .topo-titulo {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .topo-sub {
            font-size: 9.5px;
            color: #475569;
            margin-top: 2px;
          }
          .topo-data {
            font-size: 8.5px;
            color: #64748b;
            font-weight: bold;
            text-align: right;
            line-height: 1.3;
          }
          .grid-folha {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6mm;
          }
          .card-etiqueta {
            border: 2px solid #0f172a;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background: #ffffff;
            padding: 6px 6px 10px 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .card-resgate { border-color: #dc2626 !important; }
          .card-incendio { border-color: #ea580c !important; }
          .card-admin { border-color: #2563eb !important; }

          .header-etiqueta {
            width: 100%;
            padding: 4px 6px;
            border-radius: 6px;
            color: #ffffff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8.5px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .bg-resgate { background-color: #dc2626 !important; }
          .bg-incendio { background-color: #ea580c !important; }
          .bg-admin { background-color: #2563eb !important; }
          .badge-cat {
            background: rgba(255, 255, 255, 0.25);
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7.5px;
            font-weight: 800;
          }

          .corpo-etiqueta {
            padding: 4px 4px 2px 4px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .prefixo-etiqueta {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin-bottom: 3px;
          }
          .qr-container {
            width: 124px;
            height: 124px;
            padding: 2px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 4px;
          }
          .qr-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .texto-principal {
            font-size: 8.5px;
            font-weight: 800;
            color: #1e293b;
            line-height: 1.1;
          }
          .texto-sub {
            font-size: 7.5px;
            color: #64748b;
            margin-top: 1px;
            line-height: 1.1;
          }
        </style>
      </head>
      <body>
        <div class="topo-folha">
          <div>
            <div class="topo-titulo">CBMGO &bull; SICOVI | ETIQUETAS QR CODE PARA VIATURAS</div>
            <div class="topo-sub">Recorte e fixe no painel da viatura para acesso imediato via smartphone</div>
          </div>
          <div class="topo-data">
            GERADO EM: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
            <br>VIATURAS MARCADAS: ${viaturasMarcadasParaImprimir.length}
          </div>
        </div>
        <div class="grid-folha">
          ${htmlEtiquetas}
        </div>
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setImprimindo(false);
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 3000);
    }, 400);
  };

  /**
   * GERAÇÃO DE ARQUIVO PDF (A4) COM AS ETIQUETAS MARCADAS:
   * Permite salvar o arquivo PDF pronto em disco para enviar ou imprimir em qualquer impressora.
   */
  const handleGerarPdf = async () => {
    if (viaturasMarcadasParaImprimir.length === 0) {
      soundEffects.playWarning();
      alert('Marque pelo menos uma viatura para gerar o PDF de etiquetas.');
      return;
    }

    setGerandoPdf(true);
    soundEffects.playClick();

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 8;
      const colunas = 3;
      const gap = 5;
      const cardWidth = (pageWidth - margin * 2 - (colunas - 1) * gap) / colunas;
      const cardHeight = 84;
      const cardsPerPage = 9;

      let countInPage = 0;

      const desenharHeaderFolha = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('CBMGO • SICOVI | ETIQUETAS QR CODE PARA VIATURAS', margin, 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Recorte e fixe no painel da viatura para acesso imediato via smartphone', margin, 14);
        doc.text(
          `Total: ${viaturasMarcadasParaImprimir.length} | ${new Date().toLocaleDateString('pt-BR')}`,
          pageWidth - margin,
          14,
          { align: 'right' }
        );
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.line(margin, 15.5, pageWidth - margin, 15.5);
      };

      desenharHeaderFolha();

      for (let i = 0; i < viaturasMarcadasParaImprimir.length; i++) {
        if (countInPage === cardsPerPage) {
          doc.addPage();
          desenharHeaderFolha();
          countInPage = 0;
        }

        const v = viaturasMarcadasParaImprimir[i];
        const pref = v.prefixo.trim().toUpperCase();
        const col = countInPage % colunas;
        const row = Math.floor(countInPage / colunas);

        const cardX = margin + col * (cardWidth + gap);
        const cardY = 18 + row * (cardHeight + gap);

        const cat = getCategoria(v);
        let r = 37, g = 99, b = 235; // Admin
        if (cat === 'RESGATE') { r = 220; g = 38; b = 38; }
        else if (cat === 'INCÊNDIO/SALVAMENTO') { r = 234; g = 88; b = 12; }

        // Borda e fundo arredondados contínuos do card (sem cortes)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.8);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight - 6, 3, 3, 'FD');

        // Header interno arredondado (inset com 2mm de margem e cantos arredondados, sem vazar na borda do card)
        doc.setFillColor(r, g, b);
        doc.roundedRect(cardX + 2, cardY + 2, cardWidth - 4, 6.5, 1.8, 1.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('CBMGO • SICOVI', cardX + 4.5, cardY + 6.3);
        doc.text(cat, cardX + cardWidth - 4.5, cardY + 6.3, { align: 'right' });

        // Prefixo da viatura
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14.5);
        doc.setTextColor(15, 23, 42);
        doc.text(pref, cardX + cardWidth / 2, cardY + 15.5, { align: 'center' });

        // Imagem do QR Code
        const qrDataUrl = qrCodesMap[pref];
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', cardX + (cardWidth - 43) / 2, cardY + 17.5, 43, 43);
        }

        // Textos de instrução
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text('ACESSO DIRETO À VIATURA', cardX + cardWidth / 2, cardY + 66, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Aponte a câmera para registrar deslocamento', cardX + cardWidth / 2, cardY + 69.5, { align: 'center' });

        countInPage++;
      }

      doc.save(`ETIQUETAS_VIATURAS_CBMGO_${new Date().toISOString().slice(0, 10)}.pdf`);
      soundEffects.playSuccess();
    } catch (e) {
      console.error('Erro ao gerar PDF de etiquetas:', e);
      soundEffects.playError();
      alert('Não foi possível gerar o arquivo PDF. Tente imprimir a folha diretamente.');
    } finally {
      setGerandoPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shadow-inner">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                Gerador de Etiquetas & QR Codes
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                  Fixação no Painel
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Selecione as viaturas desejadas e imprima as etiquetas para colar no painel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Impressão Isolada */}
            <button
              type="button"
              onClick={handleImprimirFolhaIsolada}
              disabled={imprimindo || viaturasMarcadasParaImprimir.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-black shadow-sm transition-all cursor-pointer"
              title="Imprimir folha de etiquetas das viaturas marcadas"
            >
              <Printer className="w-4 h-4" />
              <span>{imprimindo ? 'Enviando p/ Impressão...' : `Imprimir Folha (${viaturasMarcadasParaImprimir.length})`}</span>
            </button>

            {/* Botão de Download em PDF */}
            <button
              type="button"
              onClick={handleGerarPdf}
              disabled={gerandoPdf || viaturasMarcadasParaImprimir.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-700"
              title="Baixar arquivo PDF com as etiquetas prontas"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{gerandoPdf ? 'Gerando...' : 'Baixar PDF'}</span>
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

        {/* Toolbar & Filters */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          {/* Busca textual */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
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

          {/* Filtro de Categoria */}
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

          {/* Alternador de Modo: Grade vs Prévia de Impressão */}
          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => setVisualizacaoModo('grid')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                visualizacaoModo === 'grid' ? 'bg-white shadow-2xs text-slate-900 font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grade
            </button>
            <button
              type="button"
              onClick={() => setVisualizacaoModo('impressao')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                visualizacaoModo === 'impressao' ? 'bg-white shadow-2xs text-slate-900 font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prévia da Folha A4
            </button>
          </div>
        </div>

        {/* Barra de Seleção e Controle de Viaturas (Checkboxes em lote) */}
        <div className="px-5 py-2.5 bg-amber-50/90 border-b border-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-950 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Viaturas Selecionadas para Impressão:</span>
            </span>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-black rounded-full text-[11px]">
              {viaturasMarcadasParaImprimir.length} de {listaViaturas.length}
            </span>
            <span className="text-slate-500 text-[11px]">
              (Marque ou desmarque para imprimir apenas as necessárias)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleMarcarTodasVisiveis}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Marcar Todas ({viaturasFiltradas.length})</span>
            </button>

            <button
              type="button"
              onClick={handleDesmarcarTodasVisiveis}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 text-rose-500" />
              <span>Desmarcar Todas</span>
            </button>

            {/* Atalhos Rápidos por Categoria */}
            <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-amber-200">
              <span className="text-[10px] text-amber-900 font-bold">Marcar apenas:</span>
              <button
                type="button"
                onClick={() => handleSelecionarPorCategoria('RESGATE')}
                className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-900 rounded text-[10px] font-bold cursor-pointer"
              >
                Resgate
              </button>
              <button
                type="button"
                onClick={() => handleSelecionarPorCategoria('INCÊNDIO/SALVAMENTO')}
                className="px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded text-[10px] font-bold cursor-pointer"
              >
                Incêndio
              </button>
              <button
                type="button"
                onClick={() => handleSelecionarPorCategoria('ADMINISTRATIVA')}
                className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded text-[10px] font-bold cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:overflow-visible">
          {viaturasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 p-8">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma viatura encontrada com o filtro informado.</p>
              <p className="text-xs text-slate-500 mt-1">Limpe o campo de busca ou altere a categoria para listar viaturas.</p>
            </div>
          ) : visualizacaoModo === 'grid' ? (
            /* ========================================================================= */
            /* GRADE INTERATIVA: Com seleção individual em cada card                     */
            /* ========================================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {viaturasFiltradas.map(vtr => {
                const pref = vtr.prefixo.trim().toUpperCase();
                const qrImage = qrCodesMap[pref];
                const cat = getCategoria(vtr);
                const isSelecionada = selecionadas.has(pref);

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
                    key={pref}
                    onClick={() => toggleSelecionada(pref)}
                    className={`rounded-2xl border-2 transition-all p-3.5 flex flex-col items-center text-center cursor-pointer relative select-none ${
                      isSelecionada
                        ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-slate-50/80 border-slate-200 opacity-65 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox de Seleção no Topo */}
                    <div className="w-full flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isSelecionada ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isSelecionada ? 'text-emerald-700' : 'text-slate-400'
                        }`}>
                          {isSelecionada ? 'Impressão Ativa' : 'Não Selecionada'}
                        </span>
                      </div>

                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}>
                        <IconCat className="w-2.5 h-2.5" />
                        {cat}
                      </span>
                    </div>

                    {/* Prefixo em destaque */}
                    <div className="text-xl font-black text-slate-900 tracking-tight my-1">
                      {pref}
                    </div>

                    {/* QR Code Container */}
                    <div className="w-40 h-40 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center relative mb-2">
                      {qrImage ? (
                        <img
                          src={qrImage}
                          alt={`QR Code ${pref}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-slate-400 animate-pulse font-medium">
                          Gerando QR...
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium mb-3 leading-tight px-1">
                      Aponte a câmera para registrar deslocamento da <strong className="text-slate-800">{pref}</strong>
                    </p>

                    {/* Ações Individuais (não propagam para a seleção) */}
                    <div
                      className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopiarLink(pref)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Copiar link direto"
                      >
                        {copiadoVtr === pref ? (
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
                        onClick={() => handleBaixarPng(pref)}
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
            /* ========================================================================= */
            /* PRÉVIA DA FOLHA A4: Mostra exatamente as viaturas marcadas na folha       */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-900">
                      Folha de Impressão A4 ({viaturasMarcadasParaImprimir.length} etiquetas selecionadas)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      As etiquetas abaixo serão impressas em grade de 3 colunas por folha, sem elementos da tela geral.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleImprimirFolhaIsolada}
                  disabled={viaturasMarcadasParaImprimir.length === 0}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-lg text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Agora</span>
                </button>
              </div>

              {viaturasMarcadasParaImprimir.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                  <Square className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Nenhuma viatura selecionada para impressão.</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Alterne para o modo Grade ou clique no botão abaixo para marcar todas as viaturas.
                  </p>
                  <button
                    type="button"
                    onClick={handleMarcarTodasVisiveis}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Marcar Todas as Viaturas
                  </button>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  {/* Cabeçalho da Folha Impressa */}
                  <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black uppercase tracking-tight text-slate-900">
                        CBMGO &bull; SICOVI | ETIQUETAS QR CODE PARA VIATURAS
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Recorte e fixe no painel da viatura para acesso imediato via smartphone
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-bold">
                      DATA: {new Date().toLocaleDateString('pt-BR')} &bull; TOTAL: {viaturasMarcadasParaImprimir.length}
                    </div>
                  </div>

                  {/* Grade de 3 colunas formatada exatamente como o A4 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {viaturasMarcadasParaImprimir.map(vtr => {
                      const pref = vtr.prefixo.trim().toUpperCase();
                      const qrImage = qrCodesMap[pref];
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
                          key={pref}
                          className={`bg-white rounded-2xl border-2 ${borderColor} p-2 flex flex-col items-center text-center shadow-xs relative group`}
                        >
                          {/* Botão de remoção rápida da folha */}
                          <button
                            type="button"
                            onClick={() => toggleSelecionada(pref)}
                            className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                            title="Remover esta viatura da impressão"
                          >
                            &times;
                          </button>

                          {/* Header Etiqueta Inset com cantos arredondados */}
                          <div className={`w-full py-1 px-2.5 ${headerBg} text-white rounded-lg flex items-center justify-between mb-1.5`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              CBMGO • SICOVI
                            </span>
                            <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.2 rounded">
                              {cat}
                            </span>
                          </div>

                          <div className="w-full flex flex-col items-center pb-2">
                            {/* Prefixo Gigante */}
                            <div className="text-2xl font-black text-slate-900 tracking-tight my-1">
                              {pref}
                            </div>

                            {/* QR Code Imagem */}
                            <div className="w-36 h-36 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center my-1">
                              {qrImage ? (
                                <img
                                  src={qrImage}
                                  alt={`QR Code ${pref}`}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="text-xs text-slate-400">Gerando QR...</div>
                              )}
                            </div>

                            <div className="text-[10px] font-bold text-slate-700 mt-1 leading-tight">
                              ACESSO DIRETO À VIATURA
                            </div>
                            <div className="text-[8px] text-slate-500 leading-tight">
                              Aponte a câmera do celular para registrar saída ou retorno
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span>
              <strong>Dica de Impressão:</strong> Ao clicar em <strong>Imprimir Folha</strong>, apenas as viaturas marcadas serão enviadas para o diálogo de impressão, formatadas perfeitamente para folha A4.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimirFolhaIsolada}
              disabled={imprimindo || viaturasMarcadasParaImprimir.length === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Folha ({viaturasMarcadasParaImprimir.length})</span>
            </button>

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
    </div>
  );
};
