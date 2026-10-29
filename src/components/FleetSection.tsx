import React from 'react';
import { ViaturaItem } from '../types/sicovi';
import { Ambulance, Truck, Car, LayoutGrid } from 'lucide-react';

interface FleetSectionProps {
  viaturas: ViaturaItem[];
  onSelectVehicle: (prefixo: string, status: string) => void;
}

export const FleetSection: React.FC<FleetSectionProps> = ({ viaturas, onSelectVehicle }) => {
  // 1. RESGATE: apenas viaturas de Resgate
  const resgateViaturas = viaturas.filter(v => {
    const c = (v.categoria || '').trim().toUpperCase();
    return c === 'RESGATE' || (c === '' && v.prefixo.startsWith('UR'));
  });

  // 2. INCÊNDIO & SALVAMENTO: Incêndio/Salvamento E Suporte Avançado juntos no mesmo quadro
  const incendioESuporteViaturas = viaturas.filter(v => {
    const c = (v.categoria || '').trim().toUpperCase();
    return (
      c === 'INCÊNDIO/SALVAMENTO' ||
      c === 'INCENDIO/SALVAMENTO' ||
      c === 'SUPORTE AVANÇADO' ||
      c === 'SUPORTE AVANCADO' ||
      c === 'INCÊNDIO' ||
      c === 'INCENDIO' ||
      c === 'SALVAMENTO' ||
      (c === '' && (v.prefixo.startsWith('ABT') || v.prefixo.startsWith('ABS') || v.prefixo.startsWith('USA')))
    );
  });

  // 3. ADMINISTRATIVAS: as demais viaturas
  const admViaturas = viaturas.filter(v => {
    return !resgateViaturas.includes(v) && !incendioESuporteViaturas.includes(v);
  });

  const renderCard = (v: ViaturaItem, iconType: 'ambulance' | 'truck' | 'car') => {
    const s = (v.status || 'DISPONÍVEL').toUpperCase();
    let borderClass = 'border-t-2 border-t-emerald-500 bg-emerald-50/25';
    let labelColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let iconColor = 'text-emerald-600';
    let statusText = 'Disp';

    if (s === 'EMPENHADA' || s === 'OCORRÊNCIA' || s === 'VISTORIA') {
      borderClass = 'border-t-2 border-t-rose-500 bg-rose-50/25';
      labelColor = 'text-rose-700 bg-rose-50 border-rose-200';
      iconColor = 'text-rose-600';
      statusText = 'Emp';
    } else if (s === 'MANUTENÇÃO') {
      borderClass = 'border-t-2 border-t-amber-500 bg-amber-50/25';
      labelColor = 'text-amber-700 bg-amber-50 border-amber-200';
      iconColor = 'text-amber-600';
      statusText = 'Manut';
    }

    return (
      <button
        key={v.prefixo}
        type="button"
        onClick={() => onSelectVehicle(v.prefixo, v.status)}
        title={`${v.prefixo} - ${s} (Clique para registrar saída ou chegada)`}
        className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer ${borderClass}`}
      >
        <div className={`mb-0.5 ${iconColor}`}>
          {iconType === 'ambulance' && <Ambulance className="w-4 h-4" />}
          {iconType === 'truck' && <Truck className="w-4 h-4" />}
          {iconType === 'car' && <Car className="w-4 h-4" />}
        </div>
        <span className="text-[11px] font-black text-slate-800 tracking-tight leading-none text-center truncate max-w-full">
          {v.prefixo}
        </span>
        <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded border mt-1 leading-none ${labelColor}`}>
          {statusText}
        </span>
      </button>
    );
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-red-700" />
            Frota Operacional
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Clique em qualquer viatura para despachar saída ou registrar retorno
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* RESGATE (BORDA VERMELHA) */}
        <div className="bg-white rounded-xl border-2 border-red-500 shadow-xs overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-red-50/70 border-b border-red-200 flex items-center justify-between border-l-4 border-l-red-600">
            <div className="flex items-center gap-1.5 font-bold text-xs text-red-900 uppercase tracking-wide">
              <Ambulance className="w-3.5 h-3.5 text-red-700" />
              <span>RESGATE</span>
            </div>
            <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-red-200 text-red-800">
              {resgateViaturas.length} Vtrs
            </span>
          </div>
          <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-80 overflow-y-auto content-start">
            {resgateViaturas.map(v => renderCard(v, 'ambulance'))}
          </div>
        </div>

        {/* INCÊNDIO & SALVAMENTO (BORDA LARANJA) */}
        <div className="bg-white rounded-xl border-2 border-orange-500 shadow-xs overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-orange-50/70 border-b border-orange-200 flex items-center justify-between border-l-4 border-l-orange-500">
            <div className="flex items-center gap-1.5 font-bold text-xs text-orange-950 uppercase tracking-wide">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>INCÊNDIO &amp; SALVAMENTO</span>
            </div>
            <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-orange-200 text-orange-800">
              {incendioESuporteViaturas.length} Vtrs
            </span>
          </div>
          <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-80 overflow-y-auto content-start">
            {incendioESuporteViaturas.map(v => {
              const c = (v.categoria || '').toUpperCase();
              const isSuporte = c.includes('SUPORTE') || v.prefixo.startsWith('USA');
              return renderCard(v, isSuporte ? 'ambulance' : 'truck');
            })}
          </div>
        </div>

        {/* ADMINISTRATIVAS (BORDA AZUL) */}
        <div className="bg-white rounded-xl border-2 border-blue-500 shadow-xs overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-blue-50/70 border-b border-blue-200 flex items-center justify-between border-l-4 border-l-blue-600">
            <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950 uppercase tracking-wide">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>ADMINISTRATIVAS</span>
            </div>
            <span className="text-[10px] font-extrabold bg-white px-2 py-0.5 rounded-full border border-blue-200 text-blue-800">
              {admViaturas.length} Vtrs
            </span>
          </div>
          <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-80 overflow-y-auto content-start">
            {admViaturas.map(v => renderCard(v, 'car'))}
          </div>
        </div>
      </div>
    </section>
  );
};
