import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, LogIn, Lock, Eye, EyeOff, KeyRound, ShieldCheck, Search, Check, Smartphone, Monitor, QrCode } from 'lucide-react';
import { storageService } from '../services/storageService';

interface LoginScreenProps {
  operadores: string[];
  militares?: string[];
  viaturaPredefinida?: string | null;
  onLogin: (operador: string, ambiente?: 'desktop' | 'mobile') => void;
  onOpenChangePassword: () => void;
  onOpenManagerial: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  operadores,
  militares = [],
  viaturaPredefinida = null,
  onLogin,
  onOpenChangePassword,
  onOpenManagerial
}) => {
  const isMobileInitial = typeof window !== 'undefined' && (
    Boolean(viaturaPredefinida) ||
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  const [modoAcesso, setModoAcesso] = useState<'desktop' | 'mobile'>(
    viaturaPredefinida ? 'mobile' : isMobileInitial ? 'mobile' : 'desktop'
  );
  const [lembrar, setLembrar] = useState(() => {
    return localStorage.getItem('lembrarLogin') !== 'false';
  });
  const [usuarioInput, setUsuarioInput] = useState(() => {
    const rem = localStorage.getItem('lembrarLogin') !== 'false';
    if (!rem) return '';
    return localStorage.getItem('ultimoOperador') || (operadores.length > 0 ? operadores[0] : '2º Sgt Dantas');
  });
  const [condutorInput, setCondutorInput] = useState(() => {
    const rem = localStorage.getItem('lembrarLogin') !== 'false';
    if (!rem) return '';
    return localStorage.getItem('ultimoCondutor') || (militares.length > 0 ? militares[0] : '2º Sgt Dantas');
  });
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [mostrarSugestoesCondutor, setMostrarSugestoesCondutor] = useState(false);
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [autenticando, setAutenticando] = useState(false);
  const senhaInputRef = useRef<HTMLInputElement>(null);
  const senhaMobileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownCondutorRef = useRef<HTMLDivElement>(null);

  // Ao montar, sincroniza dados do banco central e do Supabase para atualizar a lista de usuários no dropdown
  useEffect(() => {
    storageService.carregarDoBancoCentral().then(() => {
      storageService.sincronizarComSupabase().catch(() => {});
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarSugestoes(false);
      }
      if (dropdownCondutorRef.current && !dropdownCondutorRef.current.contains(event.target as Node)) {
        setMostrarSugestoesCondutor(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combina lista de operadores cadastrados e militares cadastrados respeitando a antiguidade
  const listaMilitarCompleta = useMemo(() => {
    return Array.from(new Set([...operadores, ...militares])).filter(Boolean);
  }, [operadores, militares]);

  const militaresFiltrados = useMemo(() => {
    if (!usuarioInput.trim()) return listaMilitarCompleta;
    const termo = usuarioInput.toLowerCase().trim();
    return listaMilitarCompleta.filter(m => m.toLowerCase().includes(termo));
  }, [listaMilitarCompleta, usuarioInput]);

  const condutoresFiltrados = useMemo(() => {
    if (!condutorInput.trim()) return listaMilitarCompleta;
    const termo = condutorInput.toLowerCase().trim();
    return listaMilitarCompleta.filter(m => m.toLowerCase().includes(termo));
  }, [listaMilitarCompleta, condutorInput]);

  const handleSelectMilitar = (militarNome: string) => {
    setUsuarioInput(militarNome);
    setMostrarSugestoes(false);
    setErroLogin('');
    setTimeout(() => {
      senhaInputRef.current?.focus();
    }, 100);
  };

  const handleSelectCondutor = (condutorNome: string) => {
    setCondutorInput(condutorNome);
    setMostrarSugestoesCondutor(false);
    setErroLogin('');
    setTimeout(() => {
      senhaMobileInputRef.current?.focus();
    }, 100);
  };

  const handleToggleLembrar = (checked: boolean) => {
    setLembrar(checked);
    if (!checked) {
      localStorage.setItem('lembrarLogin', 'false');
      localStorage.removeItem('ultimoOperador');
      localStorage.removeItem('ultimoCondutor');
      sessionStorage.removeItem('operadorLogado');
      setUsuarioInput('');
      setCondutorInput('');
      setSenha('');
    } else {
      localStorage.setItem('lembrarLogin', 'true');
    }
  };

  const handleSubmitDesktop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin('');

    const militarEscolhido = usuarioInput.trim();
    if (!militarEscolhido) {
      setErroLogin('Informe o militar ou operador de serviço.');
      return;
    }

    setAutenticando(true);
    try {
      const res = await storageService.verificarLoginAsync(militarEscolhido, senha);
      if (!res.success) {
        setErroLogin(res.mensagem || 'Usuário ou senha incorretos!');
        return;
      }

      if (lembrar) {
        localStorage.setItem('ultimoOperador', res.usuario || militarEscolhido);
      } else {
        localStorage.removeItem('ultimoOperador');
      }

      onLogin(res.usuario || militarEscolhido, 'desktop');
    } finally {
      setAutenticando(false);
    }
  };

  const handleSubmitMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin('');

    const condutorEscolhido = condutorInput.trim();
    if (!condutorEscolhido) {
      setErroLogin('Informe o militar condutor da viatura.');
      return;
    }

    setAutenticando(true);
    try {
      const res = await storageService.verificarLoginAsync(condutorEscolhido, senha);
      if (!res.success) {
        setErroLogin(res.mensagem || 'Usuário ou senha incorretos!');
        return;
      }

      if (lembrar) {
        localStorage.setItem('ultimoCondutor', res.usuario || condutorEscolhido);
      } else {
        localStorage.removeItem('ultimoCondutor');
      }

      onLogin(res.usuario || condutorEscolhido, 'mobile');
    } finally {
      setAutenticando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 relative">
      <div className="bg-white/98 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border-t-4 border-red-700 relative z-10 flex flex-col items-center overflow-hidden">
        {/* CBMGO Official Logo Only */}
        <div className="mb-3 text-center">
          <img
            src="/cbmgo-logo.png"
            alt="Logo CBMGO"
            className="h-16 sm:h-20 w-auto object-contain mx-auto drop-shadow-xs"
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = 'https://i.imgur.com/6K44gs7.png';
            }}
          />
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-0.5">
          SICOVI
        </h1>
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-red-800 text-center mb-4">
          Controle Operacional de Viaturas &bull; CBMGO
        </p>

        {viaturaPredefinida && (
          <div className="w-full mb-4 p-3 bg-amber-500/15 border-2 border-amber-500/80 rounded-2xl flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-black tracking-wider text-amber-900 flex items-center gap-1.5">
                <span>QR Code Lido</span>
                <span className="bg-amber-500/30 text-amber-950 px-1.5 py-0.2 rounded font-black">
                  {viaturaPredefinida}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-700 leading-tight">
                Faça o login do militar para registrar a viatura diretamente!
              </div>
            </div>
          </div>
        )}

        {/* Carousel / Tab Switcher: Desktop vs Mobile */}
        <div className="w-full bg-slate-100 p-1 rounded-2xl flex items-center mb-4 border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setModoAcesso('desktop');
              setErroLogin('');
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              modoAcesso === 'desktop'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 scale-[1.02]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-red-700" />
            <span>Central de Operações</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModoAcesso('mobile');
              setErroLogin('');
            }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              modoAcesso === 'mobile'
                ? 'bg-red-700 text-white shadow-md shadow-red-700/30 scale-[1.02]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Acesso Viatura (Mobile)</span>
          </button>
        </div>

        {erroLogin && (
          <div className="w-full p-2.5 mb-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 text-center animate-in shake duration-200">
            {erroLogin}
          </div>
        )}

        {/* Sliding Carousel Container */}
        <div className="w-full overflow-hidden">
          <div
            className="flex w-[200%] transition-transform duration-300 ease-out"
            style={{ transform: modoAcesso === 'desktop' ? 'translateX(0%)' : 'translateX(-50%)' }}
          >
            {/* ========================================================================= */}
            {/* SLIDE 1: POSTO DE CONTROLE (DESKTOP)                                     */}
            {/* ========================================================================= */}
            <div className="w-1/2 pr-3">
              <form onSubmit={handleSubmitDesktop} className="w-full flex flex-col gap-3.5 text-left">
                {/* Campo Militar / Operador */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Militar / Operador de Serviço
                    </label>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Digite ou selecione o militar..."
                      value={usuarioInput}
                      onChange={e => {
                        setUsuarioInput(e.target.value);
                        setMostrarSugestoes(true);
                        setErroLogin('');
                      }}
                      onFocus={() => setMostrarSugestoes(true)}
                      required
                      className="w-full pl-10 pr-9 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-700 transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSugestoes(!mostrarSugestoes)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </div>

                  {mostrarSugestoes && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1 divide-y divide-slate-100">
                      {militaresFiltrados.map(m => (
                        <button
                          key={m}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            handleSelectMilitar(m);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                            usuarioInput.trim().toLowerCase() === m.toLowerCase()
                              ? 'bg-red-800 text-white font-bold'
                              : 'hover:bg-red-50 text-slate-700'
                          }`}
                        >
                          <span>{m}</span>
                          {usuarioInput.trim().toLowerCase() === m.toLowerCase() && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      ref={senhaInputRef}
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-red-700 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium">
                    <input
                      type="checkbox"
                      checked={lembrar}
                      onChange={e => handleToggleLembrar(e.target.checked)}
                      className="accent-red-800 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Lembrar de mim</span>
                  </label>

                  <button
                    type="button"
                    onClick={onOpenChangePassword}
                    className="text-[11px] font-bold text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Mudar senha</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={autenticando}
                  className="w-full mt-1 py-3 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-black tracking-wide shadow-md shadow-red-800/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{autenticando ? 'VERIFICANDO NO BANCO...' : 'ACESSAR CENTRAL DE OPERAÇÕES'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenManagerial}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-red-700" />
                  <span>Painel Gerencial / Administração</span>
                </button>
              </form>
            </div>

            {/* ========================================================================= */}
            {/* SLIDE 2: ACESSO VIATURA (MOBILE / CONDUTOR)                              */}
            {/* ========================================================================= */}
            <div className="w-1/2 pl-3">
              <form onSubmit={handleSubmitMobile} className="w-full flex flex-col gap-3.5 text-left">
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center gap-2 text-xs">
                  <Smartphone className="w-4 h-4 text-red-700 shrink-0" />
                  <div>
                    <span className="font-black text-red-900 block text-[11px] uppercase">
                      Acesso Móvel da Guarnição
                    </span>
                    <span className="text-[10px] text-red-700 leading-tight">
                      Identifique o <strong>Condutor Responsável</strong> para gerenciar a viatura em trânsito.
                    </span>
                  </div>
                </div>

                {/* Campo Condutor Responsável */}
                <div className="relative" ref={dropdownCondutorRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Condutor Responsável
                    </label>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar nome do condutor..."
                      value={condutorInput}
                      onChange={e => {
                        setCondutorInput(e.target.value);
                        setMostrarSugestoesCondutor(true);
                        setErroLogin('');
                      }}
                      onFocus={() => setMostrarSugestoesCondutor(true)}
                      required
                      className="w-full pl-10 pr-9 py-2.5 text-xs font-bold border-2 border-red-300 focus:border-red-700 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSugestoesCondutor(!mostrarSugestoesCondutor)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </div>

                  {mostrarSugestoesCondutor && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1 divide-y divide-slate-100">
                      {condutoresFiltrados.map(m => (
                        <button
                          key={m}
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            handleSelectCondutor(m);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                            condutorInput.trim().toLowerCase() === m.toLowerCase()
                              ? 'bg-red-800 text-white font-bold'
                              : 'hover:bg-red-50 text-slate-700'
                          }`}
                        >
                          <span>{m}</span>
                          {condutorInput.trim().toLowerCase() === m.toLowerCase() && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Senha Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Senha do Condutor
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      ref={senhaMobileInputRef}
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:border-red-700 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium">
                    <input
                      type="checkbox"
                      checked={lembrar}
                      onChange={e => handleToggleLembrar(e.target.checked)}
                      className="accent-red-800 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Lembrar de mim</span>
                  </label>

                  <button
                    type="button"
                    onClick={onOpenChangePassword}
                    className="text-[11px] font-bold text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Mudar senha</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={autenticando}
                  className="w-full mt-1 py-3.5 bg-red-700 hover:bg-red-800 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-lg shadow-red-700/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-60"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{autenticando ? 'VERIFICANDO NO BANCO...' : 'ENTRAR NO MODO MOBILE'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 w-full text-center">
          <span className="text-[10px] font-semibold text-slate-400">
            Corpo de Bombeiros Militar do Estado de Goiás
          </span>
        </div>
      </div>
    </div>
  );
};

