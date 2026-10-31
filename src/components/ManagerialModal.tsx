import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Lock,
  Truck,
  Users,
  KeyRound,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  FileSpreadsheet,
  Upload,
  Search,
  MapPin,
  UserCheck,
  Hash,
  Sparkles,
  QrCode,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { ViaturaItem } from '../types/sicovi';
import { storageService, formatarNomeMilitarLimpo, corrigirAcentuacaoTexto } from '../services/storageService';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testarConexaoSupabase,
  isSupabaseConfigured
} from '../services/supabaseClient';
import { SystemAlertModal, AlertModalType } from './SystemAlertModal';
import { soundEffects } from '../utils/soundEffects';

interface ManagerialModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaturas: ViaturaItem[];
  militares: string[];
  operadores: string[];
  onViaturasChange: (vtrs: ViaturaItem[]) => void;
  onMilitaresChange: (mils: string[]) => void;
  onRegistrosChange?: () => void;
  onOperadoresChange?: (ops: string[]) => void;
  onBairrosChange?: (bairros: string[]) => void;
  onOpenQrCodes?: () => void;
}

export const ManagerialModal: React.FC<ManagerialModalProps> = ({
  isOpen,
  onClose,
  viaturas,
  militares,
  operadores,
  onViaturasChange,
  onMilitaresChange,
  onRegistrosChange,
  onOperadoresChange,
  onBairrosChange,
  onOpenQrCodes
}) => {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroAuth, setErroAuth] = useState('');
  const [carregandoAuth, setCarregandoAuth] = useState(false);

  const [activeTab, setActiveTab] = useState<'viaturas' | 'militares' | 'senhas' | 'planilhas' | 'supabase'>('viaturas');

  // Viatura form state
  const [novoPrefixo, setNovoPrefixo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('INCÊNDIO/SALVAMENTO');
  const [novoStatus, setNovoStatus] = useState('DISPONÍVEL');
  const [msgViatura, setMsgViatura] = useState('');

  // Militar form state & Antiguidade draft
  const [novoMilitarNome, setNovoMilitarNome] = useState('');
  const [msgMilitar, setMsgMilitar] = useState('');
  const [buscaMilitarAntiguidade, setBuscaMilitarAntiguidade] = useState('');
  const [draggedMilitarIndex, setDraggedMilitarIndex] = useState<number | null>(null);
  const [dragOverMilitarIndex, setDragOverMilitarIndex] = useState<number | null>(null);

  // Rascunho da ordem de antiguidade para permitir salvar explicitamente
  const [ordemMilitaresRascunho, setOrdemMilitaresRascunho] = useState<string[]>(militares);
  const [temAlteracoesAntiguidade, setTemAlteracoesAntiguidade] = useState(false);
  const [salvandoAntiguidade, setSalvandoAntiguidade] = useState(false);
  const [msgAntiguidade, setMsgAntiguidade] = useState('');

  // Sincroniza o rascunho com a prop militares sempre que não houver edições pendentes
  useEffect(() => {
    if (!temAlteracoesAntiguidade) {
      setOrdemMilitaresRascunho(militares);
    }
  }, [militares, temAlteracoesAntiguidade]);

  const handleReordenarMilitares = (origemIdx: number, destinoIdx: number) => {
    if (
      origemIdx === destinoIdx ||
      origemIdx < 0 ||
      destinoIdx < 0 ||
      origemIdx >= ordemMilitaresRascunho.length ||
      destinoIdx >= ordemMilitaresRascunho.length
    ) {
      return;
    }
    const novaLista = [...ordemMilitaresRascunho];
    const [removido] = novaLista.splice(origemIdx, 1);
    novaLista.splice(destinoIdx, 0, removido);
    setOrdemMilitaresRascunho(novaLista);
    setTemAlteracoesAntiguidade(true);
    soundEffects.playClick();
  };

  const handleMudarPosicaoAntiguidade = (idxAtual: number, valorInput: string) => {
    const num = parseInt(valorInput, 10);
    if (isNaN(num)) return;
    const destinoIdx = Math.max(0, Math.min(ordemMilitaresRascunho.length - 1, num - 1));
    handleReordenarMilitares(idxAtual, destinoIdx);
  };

  const handleSalvarAlteracoesAntiguidade = async () => {
    setSalvandoAntiguidade(true);
    setMsgAntiguidade('Salvando ordem de antiguidade no banco online...');
    try {
      const res = await storageService.salvarMilitaresComAntiguidadeAsync(ordemMilitaresRascunho);
      onMilitaresChange(ordemMilitaresRascunho);
      setTemAlteracoesAntiguidade(false);
      setMsgAntiguidade('Ordem de antiguidade salva com sucesso!');
      soundEffects.playSuccess();
      setTimeout(() => setMsgAntiguidade(''), 4000);
      setAlertModal({
        isOpen: true,
        title: 'Antiguidade Salva no Banco Online',
        message: res.mensagem,
        type: 'success'
      });
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro ao Salvar',
        message: err?.message || 'Falha ao sincronizar ordem de antiguidade.',
        type: 'error'
      });
    } finally {
      setSalvandoAntiguidade(false);
    }
  };

  const handleDescartarAlteracoesAntiguidade = () => {
    setOrdemMilitaresRascunho(militares);
    setTemAlteracoesAntiguidade(false);
    soundEffects.playClick();
  };

  // Reset password state with textual search
  const [filtroMilitarSenha, setFiltroMilitarSenha] = useState('');
  const [operadorSelecionado, setOperadorSelecionado] = useState(operadores[0] || '');
  const [novaSenhaOperador, setNovaSenhaOperador] = useState('');
  const [msgSenha, setMsgSenha] = useState('');

  // Upload/Planilha states
  const [textoPlanilha, setTextoPlanilha] = useState('');
  const [modoPlanilha, setModoPlanilha] = useState<'adicionar' | 'substituir'>('adicionar');
  const [msgPlanilha, setMsgPlanilha] = useState('');

  // Upload/Planilha de Militares com Antiguidade, Posto/Graduação/Nome e Senha
  const [textoPlanilhaMilitares, setTextoPlanilhaMilitares] = useState('');
  const [modoPlanilhaMilitares, setModoPlanilhaMilitares] = useState<'adicionar' | 'substituir'>('adicionar');
  const [msgPlanilhaMilitares, setMsgPlanilhaMilitares] = useState('');
  const [processandoMilitaresPlanilha, setProcessandoMilitaresPlanilha] = useState(false);

  const [textoViaturas, setTextoViaturas] = useState('');
  const [modoViaturas, setModoViaturas] = useState<'adicionar' | 'substituir'>('adicionar');
  const [msgViaturas, setMsgViaturas] = useState('');

  const [textoOperadores, setTextoOperadores] = useState('');
  const [modoOperadores, setModoOperadores] = useState<'adicionar' | 'substituir'>('adicionar');
  const [msgOperadores, setMsgOperadores] = useState('');

  const [textoBairros, setTextoBairros] = useState('');
  const [modoBairros, setModoBairros] = useState<'adicionar' | 'substituir'>('adicionar');
  const [msgBairros, setMsgBairros] = useState('');
  const [processandoImportacao, setProcessandoImportacao] = useState(false);
  const [enviandoTudo, setEnviandoTudo] = useState(false);

  // Reset Banco de Dados states
  const [senhaReset, setSenhaReset] = useState('');
  const [resetando, setResetando] = useState(false);

  // Sequência de IDs / Próximo ID states
  const [proximoIdInput, setProximoIdInput] = useState<number | string>(() => storageService.getProximoId());
  const [maiorIdAtual, setMaiorIdAtual] = useState<number>(() => storageService.getMaiorIdRegistros());
  const [maiorIdSupabase, setMaiorIdSupabase] = useState<number | null>(null);
  const [msgProximoId, setMsgProximoId] = useState('');
  const [carregandoIdSupa, setCarregandoIdSupa] = useState(false);

  // SystemAlertModal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: AlertModalType;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Supabase config state
  const currentCfg = getSupabaseConfig();
  const [supaUrl, setSupaUrl] = useState(currentCfg.url);
  const [supaKey, setSupaKey] = useState(currentCfg.anonKey);
  const [statusConexao, setStatusConexao] = useState<{ testado: boolean; ok: boolean; msg: string }>({
    testado: false,
    ok: isSupabaseConfigured(),
    msg: isSupabaseConfigured() ? 'Credenciais configuradas' : 'Supabase não conectado'
  });
  const [copiadoSql, setCopiadoSql] = useState(false);

  // Lista combinada de militares e operadores respeitando estritamente a antiguidade cadastrada
  const listaMilitarParaSenha = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    militares.forEach(m => {
      const clean = (m || '').trim();
      const k = clean.toLowerCase();
      if (clean && !seen.has(k)) {
        seen.add(k);
        list.push(clean);
      }
    });
    operadores.forEach(o => {
      const clean = (o || '').trim();
      const k = clean.toLowerCase();
      if (clean && !seen.has(k)) {
        seen.add(k);
        list.push(clean);
      }
    });
    return list;
  }, [militares, operadores]);

  const militaresFiltradosParaSenha = useMemo(() => {
    if (!filtroMilitarSenha.trim()) return listaMilitarParaSenha;
    const t = filtroMilitarSenha.toLowerCase().trim();
    return listaMilitarParaSenha.filter(m => m.toLowerCase().includes(t));
  }, [listaMilitarParaSenha, filtroMilitarSenha]);

  // Lista de militares com índice de antiguidade e filtro de busca
  const militaresFiltradosAntiguidade = useMemo(() => {
    if (!buscaMilitarAntiguidade.trim()) {
      return ordemMilitaresRascunho.map((nome, index) => ({ nome, antiguidade: index + 1, originalIndex: index }));
    }
    const termo = buscaMilitarAntiguidade.toLowerCase().trim();
    return ordemMilitaresRascunho
      .map((nome, index) => ({ nome, antiguidade: index + 1, originalIndex: index }))
      .filter(item => item.nome.toLowerCase().includes(termo));
  }, [ordemMilitaresRascunho, buscaMilitarAntiguidade]);

  useEffect(() => {
    if (!isOpen) {
      setAutenticado(false);
      setSenhaInput('');
      setErroAuth('');
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (alertModal.isOpen) {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
        } else {
          setAutenticado(false);
          setSenhaInput('');
          setErroAuth('');
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, alertModal.isOpen, onClose]);

  const handleFecharModal = () => {
    setAutenticado(false);
    setSenhaInput('');
    setErroAuth('');
    onClose();
  };

  if (!isOpen) return null;

  const handleAutenticar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth('');
    setCarregandoAuth(true);

    try {
      const ok = await storageService.verificarSenhaGerencial(senhaInput);
      if (ok) {
        setAutenticado(true);
        setSenhaInput('');
      } else {
        setErroAuth('Senha gerencial incorreta!');
      }
    } catch {
      setErroAuth('Erro ao verificar senha.');
    } finally {
      setCarregandoAuth(false);
    }
  };

  const handleAdicionarViatura = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPrefixo.trim()) return;

    const atualizadas = storageService.adicionarViatura({
      prefixo: novoPrefixo,
      categoria: novaCategoria,
      status: novoStatus
    });

    onViaturasChange(atualizadas);
    setNovoPrefixo('');
    setMsgViatura(`Viatura ${novoPrefixo.toUpperCase()} adicionada!`);
    setTimeout(() => setMsgViatura(''), 3000);
  };

  const handleExcluirViatura = (prefixo: string) => {
    setAlertModal({
      isOpen: true,
      title: 'Excluir Viatura',
      message: `Deseja realmente remover a viatura ${prefixo} do sistema?`,
      type: 'danger',
      confirmText: 'Sim, Remover',
      cancelText: 'Cancelar',
      onConfirm: () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        const atualizadas = storageService.excluirViatura(prefixo);
        onViaturasChange(atualizadas);
      }
    });
  };

  const handleMudarStatusViatura = (prefixo: string, novoSt: string) => {
    const atualizadas = storageService.atualizarViatura(prefixo, { status: novoSt });
    onViaturasChange(atualizadas);
  };

  const handleMudarCategoriaViatura = (prefixo: string, novaCat: string) => {
    const atualizadas = storageService.atualizarViatura(prefixo, { categoria: novaCat });
    onViaturasChange(atualizadas);
  };

  const handleAdicionarMilitar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMilitarNome.trim()) return;

    const nomeFormatado = formatarNomeMilitarLimpo(novoMilitarNome);
    const atualizados = storageService.adicionarMilitar(nomeFormatado);
    onMilitaresChange(atualizados);
    setOrdemMilitaresRascunho(atualizados);
    setTemAlteracoesAntiguidade(false);
    setNovoMilitarNome('');
    setMsgMilitar(`Militar cadastrado com sucesso!`);
    setTimeout(() => setMsgMilitar(''), 3000);
  };

  const handleExcluirMilitar = (nome: string) => {
    setAlertModal({
      isOpen: true,
      title: 'Excluir Militar',
      message: `Deseja realmente remover o militar ${nome}?`,
      type: 'danger',
      confirmText: 'Sim, Remover',
      cancelText: 'Cancelar',
      onConfirm: () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        const atualizados = storageService.excluirMilitar(nome);
        onMilitaresChange(atualizados);
        setOrdemMilitaresRascunho(atualizados);
        setTemAlteracoesAntiguidade(false);
      }
    });
  };

  const handleProcessarPlanilhaMilitares = async () => {
    if (!textoPlanilhaMilitares.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Planilha Vazia',
        message: 'Cole ou selecione o arquivo com a antiguidade, posto/graduação/nome e senha dos militares.',
        type: 'warning'
      });
      return;
    }

    setProcessandoMilitaresPlanilha(true);
    setMsgPlanilhaMilitares('Processando e salvando militares no banco de dados online...');

    try {
      const res = await storageService.importarMilitaresComAntiguidadeESenha(
        textoPlanilhaMilitares,
        modoPlanilhaMilitares
      );

      setTextoPlanilhaMilitares('');
      onMilitaresChange(res.militares);
      setOrdemMilitaresRascunho(res.militares);
      setTemAlteracoesAntiguidade(false);
      if (onOperadoresChange) onOperadoresChange(res.operadores);

      setMsgPlanilhaMilitares(`Sucesso! ${res.importados} militares importados e persistidos no banco de dados online.`);
      soundEffects.playSuccess();

      setAlertModal({
        isOpen: true,
        title: 'Militares Importados com Sucesso',
        message: `${res.importados} militares foram importados com antiguidade e senhas criptografadas no banco de dados online.`,
        type: 'success'
      });
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro na Importação',
        message: err?.message || 'Falha ao importar planilha de militares.',
        type: 'error'
      });
    } finally {
      setProcessandoMilitaresPlanilha(false);
      setTimeout(() => setMsgPlanilhaMilitares(''), 5000);
    }
  };

  const handleResetarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operadorSelecionado || !novaSenhaOperador.trim()) return;

    const res = storageService.resetarSenhaOperador(operadorSelecionado, novaSenhaOperador);
    setMsgSenha(res.mensagem);
    setNovaSenhaOperador('');
    setTimeout(() => setMsgSenha(''), 4000);
  };

  // Upload Handlers com detecção automática de codificação (UTF-8 e Windows-1252 / ISO-8859-1)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (texto: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const buffer = ev.target?.result as ArrayBuffer;
      if (buffer) {
        let texto = '';
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          const decoded = utf8Decoder.decode(buffer);
          if (!decoded.includes('\uFFFD')) {
            texto = decoded;
          } else {
            throw new Error('Falha UTF-8');
          }
        } catch {
          // Se falhar UTF-8 (muito comum em planilhas salvas no Excel para Windows), decodifica com Windows-1252
          try {
            const winDecoder = new TextDecoder('windows-1252');
            texto = winDecoder.decode(buffer);
          } catch {
            const isoDecoder = new TextDecoder('iso-8859-1');
            texto = isoDecoder.decode(buffer);
          }
        }
        setter(corrigirAcentuacaoTexto(texto));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleProcessarPlanilhaRegistros = async () => {
    if (!textoPlanilha.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Planilha Vazia',
        message: 'Cole ou selecione o arquivo da planilha de registros.',
        type: 'warning'
      });
      return;
    }

    setProcessandoImportacao(true);
    setMsgPlanilha('Importando e salvando registros diretamente no banco de dados Supabase na nuvem...');
    try {
      const res = await storageService.importarPlanilhaRegistros(textoPlanilha, modoPlanilha);
      setMsgPlanilha(`Sucesso! ${res.importados} registros de deslocamento foram persistidos no banco de dados.`);
      setTextoPlanilha('');
      if (onRegistrosChange) onRegistrosChange();
      let msgDetalhe = `${res.importados} registros de deslocamento foram persistidos no banco de dados com sucesso!`;
      if (res.salvoNoSupabase) {
        msgDetalhe += ' Sincronizado diretamente com a nuvem do Supabase.';
      } else if (res.erroSupabase) {
        msgDetalhe += ` (Aviso Supabase: ${res.erroSupabase} - dados salvos com segurança no Banco Central da aplicação).`;
      }
      setAlertModal({
        isOpen: true,
        title: 'Importação Concluída',
        message: msgDetalhe,
        type: 'success'
      });
    } catch (e: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro na Importação',
        message: e?.message || 'Ocorreu um erro ao importar e sincronizar os registros.',
        type: 'error'
      });
    } finally {
      setProcessandoImportacao(false);
      setTimeout(() => setMsgPlanilha(''), 6000);
    }
  };

  const handleProcessarViaturas = async () => {
    if (!textoViaturas.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Lista Vazia',
        message: 'Cole ou selecione o arquivo com a lista de viaturas e categorias (Prefixo; Categoria; Status).',
        type: 'warning'
      });
      return;
    }

    setProcessandoImportacao(true);
    setMsgViaturas('Salvando viaturas no banco de dados...');
    try {
      const res = await storageService.importarViaturas(textoViaturas, modoViaturas);
      onViaturasChange(storageService.getViaturas());
      setTextoViaturas('');
      setMsgViaturas(`Sucesso! ${res.importados} viaturas importadas e sincronizadas no banco.`);
      setAlertModal({
        isOpen: true,
        title: 'Viaturas Salvas no Banco',
        message: `${res.importados} viaturas foram importadas e persistidas no Supabase e banco central com suas categorias.`,
        type: 'success'
      });
    } catch (e: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro na Importação',
        message: e?.message || 'Erro ao sincronizar viaturas.',
        type: 'error'
      });
    } finally {
      setProcessandoImportacao(false);
      setTimeout(() => setMsgViaturas(''), 6000);
    }
  };

  const handleProcessarOperadores = async () => {
    if (!textoOperadores.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Lista Vazia',
        message: 'Cole ou selecione a lista de operadores (Operador; Senha).',
        type: 'warning'
      });
      return;
    }

    setProcessandoImportacao(true);
    setMsgOperadores('Salvando credenciais e operadores no banco de dados...');
    try {
      const res = await storageService.importarOperadoresSenhas(textoOperadores, modoOperadores);
      setMsgOperadores(`Sucesso! ${res.importados} operadores e credenciais salvos no banco.`);
      setTextoOperadores('');
      if (onOperadoresChange) onOperadoresChange(res.operadores);
      onMilitaresChange(storageService.getMilitares());
      setAlertModal({
        isOpen: true,
        title: 'Operadores Salvos no Banco',
        message: `${res.importados} operadores e credenciais foram salvos no Supabase na nuvem e no servidor central. O login agora funcionará em qualquer máquina ou celular!`,
        type: 'success'
      });
    } catch (e: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro na Importação',
        message: e?.message || 'Erro ao sincronizar operadores.',
        type: 'error'
      });
    } finally {
      setProcessandoImportacao(false);
      setTimeout(() => setMsgOperadores(''), 6000);
    }
  };

  const handleProcessarBairros = async () => {
    if (!textoBairros.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Lista Vazia',
        message: 'Cole ou selecione a lista de bairros e cidades.',
        type: 'warning'
      });
      return;
    }

    setProcessandoImportacao(true);
    setMsgBairros('Salvando bairros no banco de dados...');
    try {
      const res = await storageService.importarBairros(textoBairros, modoBairros);
      setMsgBairros(`Sucesso! ${res.importados} bairros/cidades importados para o banco.`);
      setTextoBairros('');
      if (onBairrosChange) onBairrosChange(res.bairros);
      setAlertModal({
        isOpen: true,
        title: 'Bairros Salvos no Banco',
        message: `${res.importados} bairros e cidades foram adicionados e persistidos no banco de dados na nuvem.`,
        type: 'success'
      });
    } catch (e: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro na Importação',
        message: e?.message || 'Erro ao sincronizar bairros.',
        type: 'error'
      });
    } finally {
      setProcessandoImportacao(false);
      setTimeout(() => setMsgBairros(''), 6000);
    }
  };

  const handleSolicitarResetBanco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaReset.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Senha Obrigatória',
        message: 'Informe a senha administrativa para confirmar o reset do banco de dados.',
        type: 'warning'
      });
      return;
    }

    setAlertModal({
      isOpen: true,
      title: 'Atenção: Reset Geral do Banco de Dados',
      message: 'Esta operação irá EXCLUIR TODOS os registros de despachos e histórico de viaturas, limpar todas as escalas e redefinir o status de toda a frota para DISPONÍVEL (tanto localmente quanto no Supabase Cloud). Deseja realmente prosseguir?',
      type: 'danger',
      confirmText: 'Sim, Resetar Banco',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        setResetando(true);
        try {
          const res = await storageService.resetarBancoDeDados(senhaReset);
          if (res.success) {
            setSenhaReset('');
            onViaturasChange(storageService.getViaturas());
            if (onRegistrosChange) onRegistrosChange();
            setAlertModal({
              isOpen: true,
              title: 'Banco de Dados Reinicializado',
              message: res.mensagem,
              type: 'success'
            });
          } else {
            setAlertModal({
              isOpen: true,
              title: 'Falha no Reset',
              message: res.mensagem,
              type: 'error'
            });
          }
        } catch (err: any) {
          setAlertModal({
            isOpen: true,
            title: 'Erro no Reset',
            message: 'Ocorreu um erro ao resetar o banco de dados: ' + (err.message || String(err)),
            type: 'error'
          });
        } finally {
          setResetando(false);
        }
      }
    });
  };

  const handleConsultarIdsBanco = async () => {
    setCarregandoIdSupa(true);
    setMsgProximoId('');
    try {
      const localMax = storageService.getMaiorIdRegistros();
      setMaiorIdAtual(localMax);
      const supaMax = await storageService.obterMaiorIdSupabase();
      setMaiorIdSupabase(supaMax);
      const prox = storageService.getProximoId();
      setProximoIdInput(prox);
      soundEffects.playArrival();
    } finally {
      setCarregandoIdSupa(false);
    }
  };

  const handleSalvarProximoId = () => {
    const num = parseInt(String(proximoIdInput).trim(), 10);
    if (isNaN(num) || num <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'ID Inválido',
        message: 'Por favor, informe um número inteiro positivo para o próximo ID de registro.',
        type: 'warning'
      });
      return;
    }

    storageService.setProximoId(num);
    setProximoIdInput(num);
    setMsgProximoId(`Próximo ID configurado para #${num}! Novos registros e despachos iniciarão a partir deste número.`);
    soundEffects.playSuccess();
    setTimeout(() => setMsgProximoId(''), 4500);
  };

  const handleAutoAjustarProximoId = () => {
    const localMax = storageService.getMaiorIdRegistros();
    const teto = Math.max(localMax, maiorIdSupabase || 0);
    const novoProx = teto + 1;
    storageService.setProximoId(novoProx);
    setProximoIdInput(novoProx);
    setMaiorIdAtual(localMax);
    setMsgProximoId(`Próximo ID ajustado automaticamente para #${novoProx} (+1 após o maior ID #${teto} do banco).`);
    soundEffects.playSuccess();
    setTimeout(() => setMsgProximoId(''), 4500);
  };

  const handleSalvarConfigSupabase = () => {
    saveSupabaseConfig(supaUrl, supaKey);
    handleTestarSupabase();
  };

  const handleTestarSupabase = async () => {
    const res = await testarConexaoSupabase();
    setStatusConexao({
      testado: true,
      ok: res.success,
      msg: res.message
    });
  };

  const handleEnviarTudoParaSupabase = async () => {
    setEnviandoTudo(true);
    try {
      const res = await storageService.enviarTodosDadosLocaisParaSupabase();
      setAlertModal({
        isOpen: true,
        title: res.success ? 'Dados Enviados com Sucesso' : 'Falha no Envio',
        message: res.mensagem,
        type: res.success ? 'success' : 'error'
      });
    } catch (e: any) {
      setAlertModal({
        isOpen: true,
        title: 'Erro no Envio',
        message: e?.message || 'Falha ao sincronizar dados locais com o Supabase.',
        type: 'error'
      });
    } finally {
      setEnviandoTudo(false);
    }
  };

  const handleSincronizarSupabase = async () => {
    const res = await storageService.sincronizarComSupabase(0);
    setAlertModal({
      isOpen: true,
      title: res.success ? 'Sincronização Concluída' : 'Aviso de Sincronização',
      message: res.mensagem,
      type: res.success ? 'success' : 'warning'
    });
    if (res.success) {
      onViaturasChange(storageService.getViaturas());
      onMilitaresChange(storageService.getMilitares());
      if (onRegistrosChange) onRegistrosChange();
    }
  };

  const handleCopiarSql = () => {
    const sqlScript = `-- SICOVI - Schema Supabase
CREATE TABLE IF NOT EXISTS public.viaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefixo VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'GERAL',
    status VARCHAR(50) NOT NULL DEFAULT 'DISPONÍVEL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.militares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.registros (
    id BIGSERIAL PRIMARY KEY,
    viatura VARCHAR(50) NOT NULL,
    condutor VARCHAR(100) NOT NULL,
    equipe TEXT,
    destino VARCHAR(150) NOT NULL,
    bairro VARCHAR(100),
    rai VARCHAR(50),
    natureza VARCHAR(150),
    saida TIMESTAMP WITH TIME ZONE NOT NULL,
    km_saida INTEGER NOT NULL,
    chegada TIMESTAMP WITH TIME ZONE,
    km_chegada INTEGER,
    operador VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.militares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso Total Viaturas" ON public.viaturas FOR ALL USING (true);
CREATE POLICY "Acesso Total Militares" ON public.militares FOR ALL USING (true);
CREATE POLICY "Acesso Total Operadores" ON public.operadores FOR ALL USING (true);
CREATE POLICY "Acesso Total Registros" ON public.registros FOR ALL USING (true);
`;
    navigator.clipboard.writeText(sqlScript);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-100">
                Painel Administrativo &bull; Gestão de Frota e Dados
              </h3>
              <p className="text-[10px] text-slate-400">
                Acesso restrito ao Oficial de Dia e Encarregado de Frota
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autenticado && onOpenQrCodes && (
              <button
                type="button"
                onClick={onOpenQrCodes}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                title="Gerar e imprimir QR Codes das viaturas para fixação no painel"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gerar QR Codes das Viaturas</span>
                <span className="sm:hidden">QR Codes</span>
              </button>
            )}
            <button
              onClick={handleFecharModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!autenticado ? (
          <div className="p-8 flex flex-col items-center justify-center flex-1 max-w-sm mx-auto w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 border border-red-100 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Acesso Administrativo</h3>
            <p className="text-xs text-slate-500 mb-6">
              Insira a senha de administração gerencial para gerenciar a frota, importar planilhas e redefinir senhas.
            </p>

            {erroAuth && (
              <div className="w-full p-3 mb-4 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 text-center animate-in shake duration-200">
                {erroAuth}
              </div>
            )}

            <form onSubmit={handleAutenticar} className="w-full space-y-3">
              <input
                type="password"
                value={senhaInput}
                onChange={e => setSenhaInput(e.target.value)}
                placeholder="Senha administrativa"
                required
                autoFocus
                className="w-full px-4 py-2.5 text-xs text-center border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-red-700 transition-colors"
              />
              <button
                type="submit"
                disabled={carregandoAuth}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-red-700/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {carregandoAuth ? 'Verificando...' : 'Liberar Painel'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-3 overflow-x-auto shrink-0 relative z-30 shadow-2xs select-none">
              <button
                onClick={() => setActiveTab('viaturas')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'viaturas'
                    ? 'border-red-700 text-red-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Truck className="w-4 h-4" /> Viaturas ({viaturas.length})
              </button>
              <button
                onClick={() => setActiveTab('militares')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'militares'
                    ? 'border-red-700 text-red-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" /> Militares ({militares.length})
              </button>
              <button
                onClick={() => setActiveTab('senhas')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'senhas'
                    ? 'border-red-700 text-red-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4" /> Reset de Senhas
              </button>
              <button
                onClick={() => setActiveTab('planilhas')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'planilhas'
                    ? 'border-red-700 text-red-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Upload de Planilhas
              </button>
              <button
                onClick={() => setActiveTab('supabase')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'supabase'
                    ? 'border-red-700 text-red-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Database className="w-4 h-4 text-emerald-600" /> Supabase
              </button>

              {onOpenQrCodes && (
                <button
                  type="button"
                  onClick={onOpenQrCodes}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-black border-b-2 border-transparent text-amber-900 bg-amber-100/80 hover:bg-amber-200/90 rounded-t-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                  title="Gerar e imprimir QR Codes das viaturas para fixação no painel"
                >
                  <QrCode className="w-4 h-4 text-amber-700" />
                  <span>Gerar QR Codes</span>
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* ABA 1: VIATURAS */}
              {activeTab === 'viaturas' && (
                <div className="space-y-6">
                  {/* Banner Gerador de QR Code exclusivo administrativo */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border-2 border-amber-400/60 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-black">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-amber-950 flex items-center gap-2">
                          <span>QR Codes das Viaturas para Painel</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full font-bold">Exclusivo Administrativo</span>
                        </h4>
                        <p className="text-[11px] text-amber-900/80 font-medium">
                          Gere, baixe imagens PNG individuais ou imprima a folha de etiquetas com os QR Codes de todas as viaturas para fixar no painel interno.
                        </p>
                      </div>
                    </div>
                    {onOpenQrCodes && (
                      <button
                        type="button"
                        onClick={onOpenQrCodes}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                      >
                        <QrCode className="w-4 h-4 text-amber-400" />
                        <span>Gerar e Imprimir QR Codes</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-red-700" /> Cadastrar Viatura
                    </h4>
                    {msgViatura && (
                      <div className="p-2 mb-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {msgViatura}
                      </div>
                    )}
                    <form onSubmit={handleAdicionarViatura} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Prefixo</label>
                        <input
                          type="text"
                          value={novoPrefixo}
                          onChange={e => setNovoPrefixo(e.target.value.toUpperCase())}
                          placeholder="Ex: UR-188, ABT-50"
                          required
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Categoria</label>
                        <select
                          value={novaCategoria}
                          onChange={e => setNovaCategoria(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                        >
                          <option value="INCÊNDIO/SALVAMENTO">INCÊNDIO/SALVAMENTO</option>
                          <option value="SUPORTE AVANÇADO">SUPORTE AVANÇADO</option>
                          <option value="RESGATE">RESGATE</option>
                          <option value="ADMINISTRATIVA">ADMINISTRATIVA</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Inicial</label>
                        <select
                          value={novoStatus}
                          onChange={e => setNovoStatus(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                        >
                          <option value="DISPONÍVEL">Disponível</option>
                          <option value="EMPENHADA">Empenhada</option>
                          <option value="MANUTENÇÃO">Manutenção</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="py-2 px-4 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Adicionar
                      </button>
                    </form>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Prefixo</th>
                          <th className="py-2 px-3">Categoria</th>
                          <th className="py-2 px-3">Status Atual</th>
                          <th className="py-2 px-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viaturas.map(v => (
                          <tr key={v.prefixo} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{v.prefixo}</td>
                            <td className="py-2.5 px-3">
                              <select
                                value={v.categoria}
                                onChange={e => handleMudarCategoriaViatura(v.prefixo, e.target.value)}
                                className="px-2 py-1 text-[11px] font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                              >
                                <option value="INCÊNDIO/SALVAMENTO">INCÊNDIO/SALVAMENTO</option>
                                <option value="SUPORTE AVANÇADO">SUPORTE AVANÇADO</option>
                                <option value="RESGATE">RESGATE</option>
                                <option value="ADMINISTRATIVA">ADMINISTRATIVA</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={v.status}
                                onChange={e => handleMudarStatusViatura(v.prefixo, e.target.value)}
                                className={`px-2 py-1 rounded text-[11px] font-bold border ${
                                  v.status === 'DISPONÍVEL'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : v.status === 'EMPENHADA'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="DISPONÍVEL">Disponível</option>
                                <option value="EMPENHADA">Empenhada</option>
                                <option value="MANUTENÇÃO">Manutenção</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleExcluirViatura(v.prefixo)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                title="Excluir Viatura"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABA 2: MILITARES & QUADRO DE ANTIGUIDADE */}
              {activeTab === 'militares' && (
                <div className="space-y-5">
                  {/* Cadastrar Novo Militar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-red-700" /> Cadastrar Novo Militar na OBM
                    </h4>
                    {msgMilitar && (
                      <div className="p-2 mb-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> {msgMilitar}
                      </div>
                    )}
                    <form onSubmit={handleAdicionarMilitar} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Posto / Graduação / Nome Completo
                        </label>
                        <input
                          type="text"
                          value={novoMilitarNome}
                          onChange={e => setNovoMilitarNome(e.target.value)}
                          placeholder="Ex: 2º Ten Cardoso, 1º Sgt Silva, Cb Costa, Sd Souza..."
                          required
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-2 px-5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Plus className="w-4 h-4" /> Cadastrar Militar
                      </button>
                    </form>
                  </div>

                  {/* Quadro Geral de Antiguidade dos Militares */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-red-700" />
                            <span>Banco de Militares &bull; Ordem de Antiguidade ({ordemMilitaresRascunho.length} Militares)</span>
                          </h4>
                          {temAlteracoesAntiguidade && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Alterações pendentes não salvas
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Arraste pela alça <strong className="text-slate-700">⠿</strong>, altere o número da coluna <strong className="text-slate-700">Antiguidade</strong> ou use as setas ▲/▼. Em seguida, clique no botão <strong className="text-emerald-700">Salvar Alterações de Antiguidade</strong> para persistir no banco online.
                        </p>
                      </div>

                      {/* Botões de Ação e Busca */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {temAlteracoesAntiguidade && (
                          <button
                            type="button"
                            onClick={handleDescartarAlteracoesAntiguidade}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Descartar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleSalvarAlteracoesAntiguidade}
                          disabled={salvandoAntiguidade}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all ${
                            temAlteracoesAntiguidade
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-1 shadow-emerald-200 animate-pulse'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                          title="Salvar a nova sequência de antiguidade no banco de dados online"
                        >
                          <CheckCircle2 className={`w-4 h-4 ${temAlteracoesAntiguidade ? 'text-emerald-200' : 'text-slate-300'}`} />
                          <span>{salvandoAntiguidade ? 'Salvando no Banco...' : 'Salvar Alterações de Antiguidade'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('planilhas')}
                          className="px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          title="Importar planilha de militares com antiguidade e senhas"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>Importar Planilha</span>
                        </button>

                        {/* Busca rápida na lista */}
                        <div className="relative min-w-[180px]">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={buscaMilitarAntiguidade}
                            onChange={e => setBuscaMilitarAntiguidade(e.target.value)}
                            placeholder="Filtrar militar..."
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
                          />
                        </div>
                      </div>
                    </div>

                    {msgAntiguidade && (
                      <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{msgAntiguidade}</span>
                      </div>
                    )}

                    <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
                            <th className="py-2.5 px-3 text-center w-[130px]">Antiguidade</th>
                            <th className="py-2.5 px-2 text-center w-[50px]">Arrastar</th>
                            <th className="py-2.5 px-4">Posto / Graduação / Nome</th>
                            <th className="py-2.5 px-3 text-center w-[90px]">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {militaresFiltradosAntiguidade.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 font-medium text-xs">
                                Nenhum militar encontrado com o filtro aplicado.
                              </td>
                            </tr>
                          ) : (
                            militaresFiltradosAntiguidade.map(item => {
                              const origIdx = item.originalIndex;
                              const isDragging = draggedMilitarIndex === origIdx;
                              const isOver = dragOverMilitarIndex === origIdx;

                              return (
                                <tr
                                  key={item.nome}
                                  draggable={!buscaMilitarAntiguidade}
                                  onDragStart={(e) => {
                                    setDraggedMilitarIndex(origIdx);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (dragOverMilitarIndex !== origIdx) {
                                      setDragOverMilitarIndex(origIdx);
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setDraggedMilitarIndex(null);
                                    setDragOverMilitarIndex(null);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedMilitarIndex !== null && draggedMilitarIndex !== origIdx) {
                                      handleReordenarMilitares(draggedMilitarIndex, origIdx);
                                    }
                                    setDraggedMilitarIndex(null);
                                    setDragOverMilitarIndex(null);
                                  }}
                                  className={`transition-colors select-none ${
                                    isDragging
                                      ? 'opacity-40 bg-slate-100'
                                      : isOver
                                      ? 'bg-red-50 border-t-2 border-red-600'
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  {/* Coluna Antiguidade: badge, input direto e setas ▲/▼ */}
                                  <td className="py-2 px-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-red-900 bg-red-50 border border-red-200 px-2 py-0.5 rounded min-w-[32px]">
                                        #{item.antiguidade}
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        max={ordemMilitaresRascunho.length}
                                        defaultValue={item.antiguidade}
                                        key={item.nome + '_' + item.antiguidade}
                                        onBlur={(e) => handleMudarPosicaoAntiguidade(origIdx, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleMudarPosicaoAntiguidade(origIdx, (e.currentTarget as HTMLInputElement).value);
                                          }
                                        }}
                                        className="w-12 text-center text-xs font-bold border border-slate-300 rounded px-1 py-0.5 bg-white text-slate-800 focus:outline-none focus:border-red-700"
                                        title="Digite o número da antiguidade e clique em Salvar Alterações de Antiguidade"
                                      />
                                      <div className="flex flex-col">
                                        <button
                                          type="button"
                                          disabled={origIdx === 0}
                                          onClick={() => handleReordenarMilitares(origIdx, origIdx - 1)}
                                          className="text-[9px] text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer leading-none p-0.5"
                                          title="Subir de Antiguidade (Maior Precedência)"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          disabled={origIdx === militares.length - 1}
                                          onClick={() => handleReordenarMilitares(origIdx, origIdx + 1)}
                                          className="text-[9px] text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer leading-none p-0.5"
                                          title="Descer de Antiguidade"
                                        >
                                          ▼
                                        </button>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Coluna Alça de Arraste */}
                                  <td className="py-2 px-2 text-center">
                                    <div
                                      className={`p-1 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 ${
                                        !buscaMilitarAntiguidade ? 'cursor-grab active:cursor-grabbing' : 'opacity-30 cursor-not-allowed'
                                      }`}
                                      title={!buscaMilitarAntiguidade ? 'Clique e arraste para reordenar' : 'Limpe a busca para arrastar'}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  </td>

                                  {/* Coluna Nome do Militar */}
                                  <td className="py-2 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-xs text-slate-900">
                                        {item.nome}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Coluna Ações */}
                                  <td className="py-2 px-3 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleExcluirMilitar(item.nome)}
                                      className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                      title={`Remover ${item.nome} do banco de militares`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: RESET DE SENHAS COM BUSCA TEXTUAL PRÁTICA */}
              {activeTab === 'senhas' && (
                <div className="max-w-xl mx-auto py-2 space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-red-50 text-red-700 rounded-xl flex items-center justify-center mx-auto mb-2 border border-red-100">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Redefinição de Senha de Militares</h4>
                    <p className="text-xs text-slate-500">
                      Localize rapidamente o militar por nome ou graduação para redefinir sua senha de acesso.
                    </p>
                  </div>

                  {msgSenha && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> {msgSenha}
                    </div>
                  )}

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    {/* Campo de Busca Textual Prática */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        1. Filtrar Militar por Nome / Graduação:
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Digite para filtrar (ex: Silva, Dantas, Cb, Sgt, Ten)..."
                          value={filtroMilitarSenha}
                          onChange={e => setFiltroMilitarSenha(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-red-700"
                        />
                      </div>
                    </div>

                    {/* Lista selecionável com scroll */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          Militar Selecionado:
                        </label>
                        <span className="text-xs font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                          {operadorSelecionado || 'Nenhum selecionado'}
                        </span>
                      </div>
                      <div className="border border-slate-300 rounded-xl bg-white max-h-36 overflow-y-auto p-1 divide-y divide-slate-100 shadow-inner">
                        {militaresFiltradosParaSenha.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setOperadorSelecionado(m)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors cursor-pointer ${
                              operadorSelecionado === m
                                ? 'bg-red-700 text-white font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 opacity-70" />
                              <span>{m}</span>
                            </span>
                            {operadorSelecionado === m && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleResetarSenha} className="space-y-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          2. Nova Senha para &quot;{operadorSelecionado}&quot;
                        </label>
                        <input
                          type="text"
                          value={novaSenhaOperador}
                          onChange={e => setNovaSenhaOperador(e.target.value)}
                          placeholder="Digite a nova senha (mínimo 4 caracteres)"
                          required
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <KeyRound className="w-4 h-4" /> Redefinir Senha do Militar
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ABA 4: UPLOAD DE PLANILHAS (BANCO, OPERADORES, BAIRROS) */}
              {activeTab === 'planilhas' && (
                <div className="space-y-6">
                  {/* Status do Banco de Dados Online (Supabase) */}
                  <div className={`relative z-0 p-3.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap ${
                    isSupabaseConfigured()
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
                          <Database className="w-4 h-4" />
                          <span>
                            {isSupabaseConfigured()
                              ? 'Banco de Dados Online Conectado (Supabase)'
                              : 'Aviso: Banco de Dados Online (Supabase) Não Configurado'}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium opacity-90 mt-0.5">
                          {isSupabaseConfigured()
                            ? 'As planilhas e dados importados abaixo serão persistidos no banco de dados online na nuvem e ficarão salvos para todos os dispositivos.'
                            : 'Sem as credenciais do Supabase, as planilhas ficarão salvas apenas na memória deste navegador. Para sincronizar online com todas as máquinas, configure o Supabase.'}
                        </div>
                      </div>
                    </div>
                    {!isSupabaseConfigured() && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('supabase')}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all"
                      >
                        Configurar Banco Online
                      </button>
                    )}
                  </div>
                  {/* Seção 1: Planilha do Banco de Dados / Despachos */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800">
                            1. Upload do Banco de Dados de Despachos (Planilha)
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Formato: &quot;ID &bull; Viatura &bull; Condutor &bull; Equipe &bull; Destino &bull; Bairro &bull; RAI &bull; Natureza Ocorrência &bull; Data/Hora Saída &bull; Km Saída &bull; Data/Hora Chegada &bull; Km Chegada &bull; Operador&quot;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600">Modo:</label>
                        <select
                          value={modoPlanilha}
                          onChange={e => setModoPlanilha(e.target.value as any)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="adicionar">Adicionar aos existentes</option>
                          <option value="substituir">Substituir banco existente</option>
                        </select>
                      </div>
                    </div>

                    {msgPlanilha && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{msgPlanilha}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>Carregar Arquivo (.csv, .tsv, .txt)</span>
                        <input
                          type="file"
                          accept=".csv,.tsv,.txt"
                          onChange={e => handleFileUpload(e, setTextoPlanilha)}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-400">ou cole abaixo o conteúdo copiado do Excel/Sheets:</span>
                    </div>

                    <textarea
                      rows={5}
                      value={textoPlanilha}
                      onChange={e => setTextoPlanilha(corrigirAcentuacaoTexto(e.target.value))}
                      placeholder="Cole aqui os dados copiados da sua planilha (separados por tabulação ou ponto e vírgula)..."
                      className="w-full p-3 font-mono text-[11px] bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-red-700"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleProcessarPlanilhaRegistros}
                        disabled={processandoImportacao}
                        className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Upload className="w-4 h-4" /> {processandoImportacao ? 'Salvando no Banco...' : 'Processar e Importar Despachos'}
                      </button>
                    </div>
                  </div>

                  {/* Seção 2: Upload da Planilha dos Militares (Antiguidade, Posto/Graduação/Nome e Senha) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                            <span>2. Upload de Militares com Antiguidade, Nome e Senha</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                              Banco Online &bull; Supabase
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Formato: <strong className="text-slate-700">&quot;Antiguidade; Posto/Graduação/Nome; Senha&quot;</strong> (ex: 1; SubTen Dantas; 123456 &bull; aceita separador por tabulação do Excel ou ponto e vírgula)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600">Modo:</label>
                        <select
                          value={modoPlanilhaMilitares}
                          onChange={e => setModoPlanilhaMilitares(e.target.value as any)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                        >
                          <option value="adicionar">Adicionar / Atualizar Militares</option>
                          <option value="substituir">Substituir todo o banco de militares</option>
                        </select>
                      </div>
                    </div>

                    {msgPlanilhaMilitares && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{msgPlanilhaMilitares}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>Carregar Arquivo (.csv, .tsv, .txt)</span>
                        <input
                          type="file"
                          accept=".csv,.txt,.tsv"
                          onChange={e => handleFileUpload(e, setTextoPlanilhaMilitares)}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-400">ou cole diretamente os dados copiados do Excel/Sheets:</span>
                    </div>

                    <textarea
                      rows={5}
                      value={textoPlanilhaMilitares}
                      onChange={e => setTextoPlanilhaMilitares(corrigirAcentuacaoTexto(e.target.value))}
                      placeholder="1; SubTen Dantas; 123456&#10;2; 1º Sgt Silva; 654321&#10;3; 2º Sgt Cardoso; senha123&#10;4; Cb Costa; 789101"
                      className="w-full p-3 font-mono text-[11px] bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-red-700"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleProcessarPlanilhaMilitares}
                        disabled={processandoMilitaresPlanilha}
                        className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{processandoMilitaresPlanilha ? 'Sincronizando com Banco Online...' : 'Importar e Salvar Militares no Banco Online'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Seção 3: Upload de Bairros / Cidades */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-600" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800">
                            3. Upload da Lista de Bairros / Cidades
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Cole os bairros e cidades (um por linha ou separados por vírgula / ponto e vírgula)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600">Modo:</label>
                        <select
                          value={modoBairros}
                          onChange={e => setModoBairros(e.target.value as any)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="adicionar">Adicionar à lista existente</option>
                          <option value="substituir">Substituir lista existente</option>
                        </select>
                      </div>
                    </div>

                    {msgBairros && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{msgBairros}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload className="w-4 h-4 text-amber-600" />
                        <span>Carregar Arquivo (.txt, .csv)</span>
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={e => handleFileUpload(e, setTextoBairros)}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-400">ou cole a relação de bairros/cidades:</span>
                    </div>

                    <textarea
                      rows={3}
                      value={textoBairros}
                      onChange={e => setTextoBairros(corrigirAcentuacaoTexto(e.target.value))}
                      placeholder="Centro&#10;Setor Bueno&#10;Jardim Goiás&#10;Marista&#10;Campinas"
                      className="w-full p-3 font-mono text-[11px] bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-red-700"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleProcessarBairros}
                        className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Upload className="w-4 h-4" /> Importar Bairros/Cidades
                      </button>
                    </div>
                  </div>

                  {/* Seção 4: Upload da Lista de Viaturas e Categorias */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800">
                            4. Upload da Lista de Viaturas e Categorias
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Formato: &quot;Prefixo; Categoria; Status&quot; (Categorias: INCÊNDIO/SALVAMENTO, SUPORTE AVANÇADO, RESGATE, ADMINISTRATIVA)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600">Modo:</label>
                        <select
                          value={modoViaturas}
                          onChange={e => setModoViaturas(e.target.value as any)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="adicionar">Adicionar / Atualizar</option>
                          <option value="substituir">Substituir frota existente</option>
                        </select>
                      </div>
                    </div>

                    {msgViaturas && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{msgViaturas}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        <span>Carregar Arquivo (.txt, .csv, .tsv)</span>
                        <input
                          type="file"
                          accept=".txt,.csv,.tsv"
                          onChange={e => handleFileUpload(e, setTextoViaturas)}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-slate-400">ou cole a relação de viaturas:</span>
                    </div>

                    <textarea
                      rows={3}
                      value={textoViaturas}
                      onChange={e => setTextoViaturas(corrigirAcentuacaoTexto(e.target.value))}
                      placeholder="ABT-22; INCÊNDIO/SALVAMENTO; DISPONÍVEL&#10;USA-01; SUPORTE AVANÇADO; DISPONÍVEL&#10;UR-15; RESGATE; DISPONÍVEL&#10;ADM-02; ADMINISTRATIVA; DISPONÍVEL"
                      className="w-full p-3 font-mono text-[11px] bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-red-700"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleProcessarViaturas}
                        className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Upload className="w-4 h-4" /> Importar e Sincronizar Viaturas
                      </button>
                    </div>
                  </div>

                  {/* Seção 5: SEQUÊNCIA NUMÉRICA DE DESPACHOS - PRÓXIMO ID */}
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-2 border-blue-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0 text-blue-700">
                          <Hash className="w-5 h-5 font-black" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-blue-900 tracking-wide flex items-center gap-2">
                            <span>5. Sequência Numérica de Despachos &bull; Próximo ID</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-800 border border-blue-300">
                              Aproveitamento de Banco
                            </span>
                          </h4>
                          <p className="text-[11px] text-blue-800 leading-relaxed font-medium mt-0.5">
                            Defina o número inicial para os novos registros de despachos e saídas de viaturas. Esta configuração garante a <strong>continuidade da sequência existente</strong> com os dados históricos já salvos no banco de dados.
                          </p>
                        </div>
                      </div>

                      {/* Badges de IDs atuais */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-3 py-1.5 bg-white border border-blue-200 rounded-xl flex items-center gap-2 text-xs shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Maior ID Local:</span>
                          <span className="font-mono font-black text-slate-900">#{maiorIdAtual}</span>
                        </div>
                        {maiorIdSupabase !== null && (
                          <div className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl flex items-center gap-2 text-xs shadow-2xs">
                            <span className="text-[10px] font-bold uppercase text-emerald-600">Maior ID Nuvem:</span>
                            <span className="font-mono font-black text-emerald-800">#{maiorIdSupabase}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleConsultarIdsBanco}
                          disabled={carregandoIdSupa}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                          title="Consultar maior ID no Supabase"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${carregandoIdSupa ? 'animate-spin' : ''}`} />
                          <span>Verificar Banco</span>
                        </button>
                      </div>
                    </div>

                    {msgProximoId && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{msgProximoId}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          Próximo ID a ser gravado:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={proximoIdInput}
                          onChange={e => setProximoIdInput(e.target.value)}
                          className="w-32 px-3 py-1.5 text-xs font-mono font-black text-blue-900 border-2 border-blue-400 rounded-xl bg-white focus:outline-none focus:border-blue-600 text-center shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSalvarProximoId}
                        className="py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Gravar Próximo ID</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoAjustarProximoId}
                        className="py-2 px-3 bg-white hover:bg-blue-50 border border-blue-300 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                      >
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Ajustar Automático (+1 do maior)</span>
                      </button>
                    </div>
                  </div>

                  {/* Seção 6: ZONA DE PERIGO - RESET GERAL DO BANCO DE DADOS */}
                  <div className="bg-rose-50/70 border-2 border-rose-300 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 text-rose-700">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-rose-900 tracking-wide">
                          6. Zona de Perigo &bull; Reset Geral do Banco de Dados
                        </h4>
                        <p className="text-[11px] text-rose-800 leading-relaxed font-medium mt-0.5">
                          Esta ação irá <strong>apagar permanentemente todos os registros de despachos e ocorrências</strong>, limpar as escalas operacionais e <strong>retornar o status de todas as viaturas para DISPONÍVEL</strong> tanto localmente quanto no <strong>Supabase Cloud</strong>. Esta ação não pode ser desfeita.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSolicitarResetBanco} className="flex items-center gap-3 flex-wrap pt-2 border-t border-rose-200">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="password"
                          value={senhaReset}
                          onChange={e => setSenhaReset(e.target.value)}
                          placeholder="Digite a senha administrativa para confirmar"
                          className="w-full px-3 py-2 text-xs border border-rose-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-700"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={resetando}
                        className="py-2 px-5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{resetando ? 'Resetando...' : 'Resetar Banco de Dados'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ABA 5: SUPABASE */}
              {activeTab === 'supabase' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    statusConexao.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      {statusConexao.ok ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      )}
                      <div>
                        <div className="text-xs font-bold">{statusConexao.msg}</div>
                        <div className="text-[11px] opacity-80">
                          {statusConexao.ok
                            ? 'O SICOVI está apto a persistir viaturas, militares e registros na nuvem.'
                            : 'O sistema está em modo local. Insira suas credenciais abaixo para conectar com o Supabase.'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleTestarSupabase}
                      className="px-3 py-1.5 bg-white text-slate-800 rounded-lg text-xs font-bold border border-slate-200 shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Testar Conexão
                    </button>
                  </div>

                  {/* Form de Credenciais */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" /> Credenciais do Projeto Supabase
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Project URL</label>
                      <input
                        type="text"
                        value={supaUrl}
                        onChange={e => setSupaUrl(e.target.value)}
                        placeholder="https://xyz.supabase.co"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Anon Public API Key</label>
                      <input
                        type="password"
                        value={supaKey}
                        onChange={e => setSupaKey(e.target.value)}
                        placeholder="eyJhbGciOi..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1 flex-wrap">
                      <button
                        onClick={handleSalvarConfigSupabase}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                      >
                        Salvar Credenciais
                      </button>
                      {statusConexao.ok && (
                        <>
                          <button
                            onClick={handleSincronizarSupabase}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Sincronizar da Nuvem
                          </button>
                          <button
                            onClick={handleEnviarTudoParaSupabase}
                            disabled={enviandoTudo}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" /> {enviandoTudo ? 'Enviando...' : 'Subir Dados Locais para Supabase'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Script SQL */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase">
                        Script SQL para Criação das Tabelas
                      </h4>
                      <button
                        onClick={handleCopiarSql}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        {copiadoSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiadoSql ? 'Copiado!' : 'Copiar Script SQL'}</span>
                      </button>
                    </div>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                      <code>{`-- SICOVI - Schema Supabase
CREATE TABLE IF NOT EXISTS public.viaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefixo VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'GERAL',
    status VARCHAR(50) NOT NULL DEFAULT 'DISPONÍVEL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.militares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.operadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.registros (
    id BIGSERIAL PRIMARY KEY,
    viatura VARCHAR(50) NOT NULL,
    condutor VARCHAR(100) NOT NULL,
    equipe TEXT,
    destino VARCHAR(150) NOT NULL,
    bairro VARCHAR(100),
    rai VARCHAR(50),
    natureza VARCHAR(150),
    saida TIMESTAMP WITH TIME ZONE NOT NULL,
    km_saida INTEGER NOT NULL,
    chegada TIMESTAMP WITH TIME ZONE,
    km_chegada INTEGER,
    operador VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">
            {autenticado ? 'Sessão administrativa ativa' : 'Sessão bloqueada'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* System Alert & Confirmation Modal */}
      <SystemAlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText={alertModal.confirmText}
        cancelText={alertModal.cancelText}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
      />
    </div>
  );
};
