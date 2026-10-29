import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RegistroDespacho } from '../types/sicovi';
import { formatarNomeMilitarLimpo } from '../services/storageService';

function formatarDataHoraDuasLinhas(val: string): string {
  if (!val || String(val).trim() === '') return '';
  const s = String(val).trim();
  if (s.toUpperCase() === 'EM ABERTO') return 'EM ABERTO';

  if (s.includes(' ')) {
    const parts = s.split(' ');
    if (parts.length >= 2 && parts[0].includes('/') && parts[1].includes(':')) {
      return `${parts[0]}\n${parts[1]}`;
    }
  }
  return s;
}

function formatarEquipeDuasLinhas(val: string): string {
  if (!val || String(val).trim() === '') return '';
  const partes = String(val).split(',').map(s => s.trim()).filter(Boolean);
  if (partes.length <= 1) return partes[0] || '';
  const meio = Math.ceil(partes.length / 2);
  const l1 = partes.slice(0, meio).join(', ');
  const l2 = partes.slice(meio).join(', ');
  return `${l1}\n${l2}`;
}

function formatarNaturezaDuasLinhas(val: string): string {
  if (!val || String(val).trim() === '') return '';
  const s = String(val).trim();
  if (s.length <= 16) return s;
  const palavras = s.split(/\s+/);
  if (palavras.length <= 1) return s;
  const meio = Math.ceil(palavras.length / 2);
  return `${palavras.slice(0, meio).join(' ')}\n${palavras.slice(meio).join(' ')}`;
}

const getLogoBase64 = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/cbmgo-logo.png';
  });
};

export async function gerarRelatorioPdfViaturas(registros: RegistroDespacho[], operador: string = 'Operador'): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const dataHora = new Date().toLocaleString('pt-BR');
  const totalPagesExp = '{total_pages_count_string}';
  const logoData = await getLogoBase64();

  const headers = [
    ['ID', 'Viatura', 'Condutor', 'Equipe', 'Destino', 'Bairro', 'RAI', 'Natureza', 'Saída', 'Km S', 'Chegada', 'Km C', 'KM', 'Operador']
  ];

  const rows = registros.map(r => {
    let kmDif = '';
    const kmS = Number(r.kmSaida);
    const kmC = Number(r.kmChegada);
    if (!isNaN(kmS) && !isNaN(kmC) && kmC >= kmS) {
      kmDif = String(kmC - kmS);
    }

    const condutorLimpo = formatarNomeMilitarLimpo(r.condutor || '');
    const equipeLimpa = (r.equipe || '')
      .split(',')
      .map(m => formatarNomeMilitarLimpo(m.trim()))
      .filter(Boolean)
      .join(', ');

    const equipeFmt = formatarEquipeDuasLinhas(equipeLimpa);
    const naturezaFmt = formatarNaturezaDuasLinhas(r.natureza || '');
    const saidaFmt = formatarDataHoraDuasLinhas(r.saida);
    const chegadaFmt = r.chegada && String(r.chegada).trim() !== '' ? formatarDataHoraDuasLinhas(r.chegada) : 'EM ABERTO';

    return [
      r.id,
      r.viatura,
      condutorLimpo,
      equipeFmt,
      r.destino,
      r.bairro || '---',
      r.rai || '---',
      naturezaFmt,
      saidaFmt,
      r.kmSaida !== '' ? String(r.kmSaida) : '---',
      chegadaFmt,
      r.kmChegada !== '' ? String(r.kmChegada) : '---',
      kmDif || '---',
      r.operador || operador
    ];
  });

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 72,
    margin: { top: 72, bottom: 44, left: 24, right: 24 },
    tableWidth: 793.89,
    styles: {
      fontSize: 6.0,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak',
      lineWidth: 0.2,
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [153, 27, 27],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.2,
      cellPadding: 2.5,
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' }, // ID
      1: { cellWidth: 44, fontStyle: 'bold', halign: 'center' }, // Viatura
      2: { cellWidth: 74, halign: 'left' }, // Condutor
      3: { cellWidth: 85, halign: 'left' }, // Equipe
      4: { cellWidth: 112, halign: 'left' }, // Destino
      5: { cellWidth: 68, halign: 'left' }, // Bairro
      6: { cellWidth: 46, halign: 'center' }, // RAI
      7: { cellWidth: 72, halign: 'left' }, // Natureza
      8: { cellWidth: 48, halign: 'center' }, // Saída
      9: { cellWidth: 31, halign: 'center' }, // Km S
      10: { cellWidth: 48, halign: 'center' }, // Chegada
      11: { cellWidth: 31, halign: 'center' }, // Km C
      12: { cellWidth: 28, fontStyle: 'bold', halign: 'center' }, // KM Rodado
      13: { cellWidth: 79.89, halign: 'center' } // Operador
    },
    didDrawPage: (data) => {
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height || pageSize.getHeight();
      const pageWidth = pageSize.width || pageSize.getWidth();

      // Top logo on left
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', 24, 14, 46, 46);
        } catch {
          // Fallback if image format issue
        }
      }

      // Top title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('SICOVI - Relatório de Deslocamentos', pageWidth / 2, 28, { align: 'center' });

      // Subtitle
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Corpo de Bombeiros Militar de Goiás • Data e hora de emissão: ${dataHora}`, pageWidth / 2, 43, { align: 'center' });

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(1.0);
      doc.line(24, pageHeight - 34, pageWidth - 24, pageHeight - 34);

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`SICOVI - Sistema de Controle de Viaturas • Operador: ${operador} • Total de Registros: ${rows.length}`, 24, pageHeight - 18);

      // Page numbering
      const paginacaoStr = `Página ${data.pageNumber} de ${totalPagesExp}`;
      doc.text(paginacaoStr, pageWidth - 24, pageHeight - 18, { align: 'right' });
    }
  });

  if (typeof (doc as any).putTotalPages === 'function') {
    (doc as any).putTotalPages(totalPagesExp);
  }

  doc.save(`SICOVI_Relatorio_${new Date().getTime()}.pdf`);
}


export function exportarRelatorioCsv(registros: RegistroDespacho[]): void {
  if (registros.length === 0) return;

  const cabecalho = [
    'ID', 'Viatura', 'Condutor', 'Equipe', 'Destino', 'Bairro', 'RAI',
    'Natureza', 'DataHora_Saida', 'Km_Saida', 'DataHora_Chegada', 'Km_Chegada', 'KM_Rodado', 'Operador'
  ];

  const linhas = [cabecalho.join(';')];

  registros.forEach(r => {
    let kmDif = '';
    const kmS = Number(r.kmSaida);
    const kmC = Number(r.kmChegada);
    if (!isNaN(kmS) && !isNaN(kmC) && kmC >= kmS) {
      kmDif = String(kmC - kmS);
    }

    const linha = [
      `"${r.id}"`,
      `"${r.viatura}"`,
      `"${r.condutor}"`,
      `"${(r.equipe || '').replace(/"/g, '""')}"`,
      `"${(r.destino || '').replace(/"/g, '""')}"`,
      `"${(r.bairro || '').replace(/"/g, '""')}"`,
      `"${(r.rai || '').replace(/"/g, '""')}"`,
      `"${(r.natureza || '').replace(/"/g, '""')}"`,
      `"${r.saida || ''}"`,
      `"${r.kmSaida !== '' ? r.kmSaida : ''}"`,
      `"${r.chegada || ''}"`,
      `"${r.kmChegada !== '' ? r.kmChegada : ''}"`,
      `"${kmDif}"`,
      `"${r.operador || ''}"`
    ];
    linhas.push(linha.join(';'));
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(linhas.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `SICOVI_Exportacao_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
