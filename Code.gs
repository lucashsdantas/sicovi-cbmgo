/**
 * ============================================================================
 * SICOVI - Sistema de Controle de Viaturas (CBMGO)
 * Backend Google Apps Script (Código.gs)
 * ============================================================================
 * Estrutura do Banco de Dados (Planilha Google Sheets):
 * - Aba "BD": [ID, VIATURA, CONDUTOR, EQUIPE, DESTINO, BAIRRO, RAI, NATUREZA, SAIDA, KM_SAIDA, CHEGADA, KM_CHEGADA, OPERADOR]
 * - Aba "VIATURAS": [PREFIXO, CATEGORIA, STATUS, STATUS_DETALHADO]
 * - Aba "EQUIPE": [VIATURA, CONDUTOR, EQUIPE]
 * - Aba "MILITARES": [NOME / GRADUAÇÃO]
 * - Aba "BAIRROS": [BAIRRO, ZONA, DESTINO_PADRAO]
 * - Aba "OPERADOR": [USUARIO, SENHA]
 * ============================================================================
 */

function doGet(e) {
  var htmlOutput = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SICOVI - Controle de Viaturas')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');

  if (e && e.parameter && e.parameter.user) {
    var content = htmlOutput.getContent();
    content = content.replace('/*OPERADOR_INICIAL*/', 'window.operadorInjetado = ' + JSON.stringify(String(e.parameter.user).trim()) + ';');
    return HtmlService.createHtmlOutput(content)
      .setTitle('SICOVI - Controle de Viaturas')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return htmlOutput;
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

function carregarPaginaPrincipal(usuarioLogado) {
  var html = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('SICOVI - Controle de Viaturas')
    .getContent();
  
  if (usuarioLogado) {
    html = html.replace('/*OPERADOR_INICIAL*/', 'window.operadorInjetado = ' + JSON.stringify(String(usuarioLogado).trim()) + ';');
  }
  return html;
}

// --- AUTENTICAÇÃO COM A ABA 'OPERADOR' ---
function verificarLogin(usuario, senha) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaLogin = ss.getSheetByName("OPERADOR");
    if (!abaLogin) {
      return { success: false, mensagem: "Aba 'OPERADOR' não encontrada na planilha." };
    }
    const lastRow = abaLogin.getLastRow();
    if (lastRow < 2) {
      return { success: false, mensagem: "Nenhum operador cadastrado na planilha." };
    }
    const dados = abaLogin.getRange(2, 1, lastRow - 1, 2).getValues();

    const uTrim = String(usuario || "").trim().toLowerCase();
    const sTrim = String(senha || "").trim();

    for (let i = 0; i < dados.length; i++) {
      if (String(dados[i][0]).trim().toLowerCase() === uTrim && String(dados[i][1]).trim() === sTrim) {
        return { success: true, usuario: String(dados[i][0]).trim() };
      }
    }
    return { success: false, mensagem: "Usuário ou senha incorretos!" };
  } catch (err) {
    return { success: false, mensagem: "Erro ao validar login: " + err.message };
  }
}

// --- ALTERAÇÃO DE SENHA DO OPERADOR ---
function alterarSenha(usuario, senhaAtual, novaSenha) {
  try {
    if (!usuario || !senhaAtual || !novaSenha) {
      return { success: false, mensagem: "Preencha todos os campos obrigatórios." };
    }
    if (String(novaSenha).trim().length < 4) {
      return { success: false, mensagem: "A nova senha deve possuir no mínimo 4 caracteres." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaLogin = ss.getSheetByName("OPERADOR");
    if (!abaLogin || abaLogin.getLastRow() < 2) {
      return { success: false, mensagem: "Aba 'OPERADOR' não encontrada ou sem operadores." };
    }

    const lastRow = abaLogin.getLastRow();
    const dados = abaLogin.getRange(2, 1, lastRow - 1, 2).getValues();
    const uTrim = String(usuario).trim().toLowerCase();
    const sAtualTrim = String(senhaAtual).trim();
    const sNovaTrim = String(novaSenha).trim();

    for (let i = 0; i < dados.length; i++) {
      if (String(dados[i][0]).trim().toLowerCase() === uTrim) {
        if (String(dados[i][1]).trim() !== sAtualTrim) {
          return { success: false, mensagem: "Senha atual informada está incorreta." };
        }
        abaLogin.getRange(i + 2, 2).setValue(sNovaTrim);
        SpreadsheetApp.flush();
        return { success: true, mensagem: "Senha alterada com sucesso!" };
      }
    }

    return { success: false, mensagem: "Militar operador não localizado na planilha." };
  } catch (err) {
    return { success: false, mensagem: "Erro ao alterar senha: " + err.message };
  }
}

// Helper de formatação rápida de datas
function formatarDataRapida(val) {
  if (!val) return "";
  if (!(val instanceof Date)) {
    const str = String(val);
    if (str.includes("T")) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) val = d;
      else return str;
    } else {
      return str;
    }
  }
  const dia = val.getDate() < 10 ? '0' + val.getDate() : val.getDate();
  const mes = (val.getMonth() + 1) < 10 ? '0' + (val.getMonth() + 1) : (val.getMonth() + 1);
  const ano = val.getFullYear();
  const hora = val.getHours() < 10 ? '0' + val.getHours() : val.getHours();
  const min = val.getMinutes() < 10 ? '0' + val.getMinutes() : val.getMinutes();
  return dia + '/' + mes + '/' + ano + ' ' + hora + ':' + min;
}

// --- LEITURA RESILIENTE DE DADOS (ABA 'BD') ---
function carregarDados() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("BD");
    if (!sheet) return [];

    const ultimaLinha = sheet.getLastRow();
    const ultimaColuna = sheet.getLastColumn();
    if (ultimaLinha < 2 || ultimaColuna < 1) return [];

    const dados = sheet.getRange(1, 1, ultimaLinha, ultimaColuna).getValues();
    const cabecalho = dados[0];
    const corpo = dados.slice(1);

    for (let i = 0; i < corpo.length; i++) {
      if (corpo[i][8]) corpo[i][8] = formatarDataRapida(corpo[i][8]);
      if (corpo[i][10]) corpo[i][10] = formatarDataRapida(corpo[i][10]);
    }

    corpo.sort(function(a, b) {
      return (Number(b[0]) || 0) - (Number(a[0]) || 0);
    });

    return [cabecalho, ...corpo];
  } catch (erro) {
    Logger.log("Erro em carregarDados: " + erro);
    return [];
  }
}

// --- CARGA INICIAL BATCH RESILIENTE ---
function getDadosIniciais() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Planilha não disponível.");

    // 1. Viaturas e Status
    let viaturasStatus = [];
    let viaturasLista = [];
    const abaVtr = ss.getSheetByName("VIATURAS");
    if (abaVtr && abaVtr.getLastRow() >= 2) {
      const lastRow = abaVtr.getLastRow();
      const lastCol = abaVtr.getLastColumn();
      if (lastCol >= 2) {
        const dadosVtr = abaVtr.getRange(2, 1, lastRow - 1, Math.min(lastCol, 4)).getValues();
        dadosVtr.forEach(function(l) {
          if (l[0]) {
            const vNome = String(l[0]).trim();
            viaturasLista.push(vNome);
            const vCat = l[1] ? String(l[1]).toUpperCase().trim() : "GERAL";
            let vStatus = "DISPONÍVEL";
            if (l.length >= 4 && l[3]) vStatus = String(l[3]).trim();
            else if (l.length >= 3 && l[2]) vStatus = String(l[2]).trim();
            viaturasStatus.push([vNome, vCat, vStatus]);
          }
        });
      }
    }

    // 2. Equipe / Escalas
    let equipeMap = {};
    const abaEqp = ss.getSheetByName("EQUIPE");
    if (abaEqp && abaEqp.getLastRow() >= 2) {
      const lastRowEqp = abaEqp.getLastRow();
      const lastColEqp = Math.min(3, abaEqp.getLastColumn());
      if (lastColEqp >= 2) {
        const eqpDados = abaEqp.getRange(2, 1, lastRowEqp - 1, lastColEqp).getValues();
        eqpDados.forEach(function(r) {
          if (r[0]) {
            equipeMap[String(r[0]).trim()] = { 
              condutor: r[1] ? String(r[1]).trim() : "", 
              equipe: r[2] ? String(r[2]).trim() : "" 
            };
          }
        });
      }
    }

    const resumoEscalas = viaturasLista.map(function(v) {
      return {
        viatura: v,
        condutor: equipeMap[v] ? equipeMap[v].condutor : "",
        equipe: equipeMap[v] ? equipeMap[v].equipe : ""
      };
    });

    // 3. Militares
    let militares = [];
    const abaMil = ss.getSheetByName("MILITARES");
    if (abaMil && abaMil.getLastRow() >= 2) {
      const lastRow = abaMil.getLastRow();
      const rawMil = abaMil.getRange("A2:A" + lastRow).getValues().flat();
      militares = rawMil
        .map(function(m) { return m !== null && m !== undefined ? String(m).trim() : ""; })
        .filter(function(m) {
          if (!m || m.length < 2) return false;
          var low = m.toLowerCase();
          return !["null", "undefined", "-", "--", "---", "#n/a", "#ref!", "#valor!", "nenhum"].includes(low);
        });
    }

    // 4. Bairros e Destinos
    let bairros = [];
    let destinosPadrao = [];
    const abaBairros = ss.getSheetByName("BAIRROS");
    if (abaBairros && abaBairros.getLastRow() >= 2) {
      const lastRow = abaBairros.getLastRow();
      const lastCol = abaBairros.getLastColumn();
      const dadosB = abaBairros.getRange(2, 1, lastRow - 1, Math.min(lastCol, 3)).getValues();
      dadosB.forEach(function(r) {
        if (r[0]) bairros.push(String(r[0]).trim());
        if (r.length >= 3 && r[2]) destinosPadrao.push(String(r[2]).trim());
      });
      bairros = [...new Set(bairros)].sort();
      destinosPadrao = [...new Set(destinosPadrao)].sort();
    }

    // 5. Registros
    const registros = carregarDados();

    return {
      success: true,
      viaturasStatus: viaturasStatus,
      viaturasLista: viaturasLista,
      resumoEscalas: resumoEscalas,
      militares: [...new Set(militares)].sort(),
      bairros: bairros,
      destinosPadrao: destinosPadrao,
      registros: registros
    };
  } catch (err) {
    Logger.log("Erro em getDadosIniciais: " + err);
    return {
      success: false,
      error: err.message,
      viaturasStatus: [],
      viaturasLista: [],
      resumoEscalas: [],
      militares: [],
      bairros: [],
      destinosPadrao: [],
      registros: []
    };
  }
}

function getViaturas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("VIATURAS");
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat().filter(String);
}

function getMilitares() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MILITARES");
  if (!sheet || sheet.getLastRow() < 2) return [];
  const raw = sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat();
  return raw
    .map(function(m) { return m !== null && m !== undefined ? String(m).trim() : ""; })
    .filter(function(m) {
      if (!m || m.length < 2) return false;
      var low = m.toLowerCase();
      return !["null", "undefined", "-", "--", "---", "#n/a", "#ref!", "#valor!", "nenhum"].includes(low);
    });
}

function getListaDeBairros() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("BAIRROS");
  if (!sheet || sheet.getLastRow() < 2) return [];
  return [...new Set(sheet.getRange("A2:A" + sheet.getLastRow()).getValues().flat().filter(String))].sort();
}

function getDestinosPadrao() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BAIRROS");
    if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 3) return [];
    return [...new Set(sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues().flat().filter(String))].sort();
  } catch (e) {
    return [];
  }
}

function getViaturasStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName("VIATURAS"); 
  if (!aba || aba.getLastRow() < 2) return [];
  const lastCol = aba.getLastColumn();
  const dados = aba.getRange(2, 1, aba.getLastRow() - 1, Math.min(lastCol, 4)).getValues();
  return dados
    .filter(function(l) { return l[0] && l[1]; }) 
    .map(function(l) { 
      const st = l.length >= 4 && l[3] ? String(l[3]).trim() : (l.length >= 3 && l[2] ? String(l[2]).trim() : "DISPONÍVEL");
      return [String(l[0]).trim(), String(l[1]).toUpperCase().trim(), st]; 
    });
}

function getEquipePorViatura(viatura) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("EQUIPE");
  if (!sheet || sheet.getLastRow() < 2) return { condutor: "", equipe: "" };
  const lastCol = Math.min(3, sheet.getLastColumn());
  const dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  const vtrBusca = String(viatura).trim().toUpperCase();
  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === vtrBusca) {
      return { condutor: dados[i][1] || "", equipe: dados[i][2] || "" };
    }
  }
  return { condutor: "", equipe: "" };
}

function getResumoEscalas() {
  try {
    const d = getDadosIniciais();
    return d.resumoEscalas || [];
  } catch (e) {
    return [];
  }
}

// --- GRAVAÇÃO OTIMIZADA E SEGURA NO BANCO DE DADOS (PLANILHA BD) ---
function salvarRegistro(registro) {
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    lock.waitLock(15000);
  } catch (lockErr) {
    Logger.log("Aviso de lock: " + lockErr);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let planilha = ss.getSheetByName('BD');
    if (!planilha) {
      planilha = ss.insertSheet('BD');
      planilha.appendRow(["ID", "VIATURA", "CONDUTOR", "EQUIPE", "DESTINO", "BAIRRO", "RAI", "NATUREZA", "SAIDA", "KM_SAIDA", "CHEGADA", "KM_CHEGADA", "OPERADOR"]);
    }

    const lastRow = planilha.getLastRow();
    let idNum = parseInt(registro.ID);
    let linhaEdit = -1;
    let maxIdExistente = 0;

    if (lastRow >= 2) {
      const idsCol = planilha.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idsCol.length; i++) {
        const valId = parseInt(idsCol[i][0]);
        if (!isNaN(valId)) {
          if (valId > maxIdExistente) maxIdExistente = valId;
          if (!isNaN(idNum) && valId === idNum) {
            linhaEdit = i + 2;
          }
        }
      }
    }

    if (isNaN(idNum) || registro.ID === "PENDENTE" || idNum <= 0) {
      idNum = maxIdExistente + 1;
      linhaEdit = -1;
    }

    let dataHoraSaida = registro.dataHoraSaida || "";
    let dataHoraChegada = registro.dataHoraChegada || "";

    const novaLinha = [
      idNum,
      registro.viatura || "",
      registro.condutor || "",
      registro.equipe || "",
      registro.destino || "",
      registro.bairro || "",
      registro.rai || "",
      registro.natureza || "",
      dataHoraSaida,
      registro.kmSaida !== undefined && registro.kmSaida !== null ? registro.kmSaida : "",
      dataHoraChegada,
      registro.kmChegada !== undefined && registro.kmChegada !== null ? registro.kmChegada : "",
      registro.operador || ""
    ];

    if (linhaEdit !== -1) {
      planilha.getRange(linhaEdit, 1, 1, novaLinha.length).setValues([novaLinha]);
    } else {
      planilha.appendRow(novaLinha);
    }
    
    // Atualiza status da viatura no banco de dados (Aba VIATURAS)
    if (registro.viatura) {
      try {
        const abaVtr = ss.getSheetByName("VIATURAS");
        if (abaVtr && abaVtr.getLastRow() >= 2) {
          const vtrNomeAlvo = String(registro.viatura).trim().toUpperCase();
          const lastRowV = abaVtr.getLastRow();
          const colVtrs = abaVtr.getRange(2, 1, lastRowV - 1, 1).getValues();
          const novoStatusVtr = (!dataHoraChegada || String(dataHoraChegada).trim() === "") ? "EMPENHADA" : "DISPONÍVEL";
          for (let vi = 0; vi < colVtrs.length; vi++) {
            if (String(colVtrs[vi][0]).trim().toUpperCase() === vtrNomeAlvo) {
              const colTargetStatus = abaVtr.getLastColumn() >= 4 ? 4 : 3;
              abaVtr.getRange(vi + 2, colTargetStatus).setValue(novoStatusVtr);
              break;
            }
          }
        }
      } catch (errVtr) {
        Logger.log("Aviso ao sincronizar status da viatura: " + errVtr);
      }
    }
    
    SpreadsheetApp.flush();
    if (lock) {
      try { lock.releaseLock(); } catch(e){}
    }

    const registroFormatado = [
      idNum,
      registro.viatura || "",
      registro.condutor || "",
      registro.equipe || "",
      registro.destino || "",
      registro.bairro || "",
      registro.rai || "",
      registro.natureza || "",
      formatarDataRapida(dataHoraSaida),
      registro.kmSaida !== undefined && registro.kmSaida !== null ? registro.kmSaida : "",
      formatarDataRapida(dataHoraChegada),
      registro.kmChegada !== undefined && registro.kmChegada !== null ? registro.kmChegada : "",
      registro.operador || ""
    ];

    const novoStatusVtr = (!dataHoraChegada || String(dataHoraChegada).trim() === "") ? "EMPENHADA" : "DISPONÍVEL";

    return { 
      success: true, 
      id: idNum,
      registro: registroFormatado,
      viatura: registro.viatura || "",
      novoStatusVtr: novoStatusVtr
    };

  } catch (e) {
    if (lock) {
      try { lock.releaseLock(); } catch(err){}
    }
    Logger.log("Erro ao salvar registro: " + e.message);
    throw new Error("Erro ao salvar registro no banco de dados: " + e.message);
  }
}

// --- GRAVAÇÃO ATÔMICA DE MÚLTIPLOS DESPACHOS SIMULTÂNEOS (TREM DE SOCORRO / APOIO) ---
function salvarMultiplosDespachos(listaDespachos) {
  if (!listaDespachos || !Array.isArray(listaDespachos) || listaDespachos.length === 0) {
    throw new Error("Nenhum despacho informado para gravação.");
  }

  if (listaDespachos.length === 1) {
    const resUnico = salvarRegistro(listaDespachos[0]);
    return {
      success: true,
      ids: [resUnico.id],
      registros: [resUnico.registro],
      viaturasAtualizadas: [{ viatura: resUnico.viatura, novoStatus: resUnico.novoStatusVtr }]
    };
  }

  let lock = null;
  try {
    lock = LockService.getScriptLock();
    lock.waitLock(20000);
  } catch (lockErr) {
    Logger.log("Aviso de lock em lote: " + lockErr);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let planilha = ss.getSheetByName('BD');
    if (!planilha) {
      planilha = ss.insertSheet('BD');
      planilha.appendRow(["ID", "VIATURA", "CONDUTOR", "EQUIPE", "DESTINO", "BAIRRO", "RAI", "NATUREZA", "SAIDA", "KM_SAIDA", "CHEGADA", "KM_CHEGADA", "OPERADOR"]);
    }

    const lastRow = planilha.getLastRow();
    let maxIdExistente = 0;

    if (lastRow >= 2) {
      const idsCol = planilha.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idsCol.length; i++) {
        const valId = parseInt(idsCol[i][0]);
        if (!isNaN(valId) && valId > maxIdExistente) {
          maxIdExistente = valId;
        }
      }
    }

    const novasLinhas = [];
    const registrosFormatados = [];
    const idsCriados = [];
    const viaturasAtualizadas = [];

    for (let k = 0; k < listaDespachos.length; k++) {
      const item = listaDespachos[k];
      maxIdExistente++;
      const idNum = maxIdExistente;
      idsCriados.push(idNum);

      const dataHoraSaida = item.dataHoraSaida || "";
      const dataHoraChegada = item.dataHoraChegada || "";
      const kmSaidaVal = item.kmSaida !== undefined && item.kmSaida !== null ? item.kmSaida : "";
      const kmChegadaVal = item.kmChegada !== undefined && item.kmChegada !== null ? item.kmChegada : "";

      const linhaBd = [
        idNum,
        item.viatura || "",
        item.condutor || "",
        item.equipe || "",
        item.destino || "",
        item.bairro || "",
        item.rai || "",
        item.natureza || "",
        dataHoraSaida,
        kmSaidaVal,
        dataHoraChegada,
        kmChegadaVal,
        item.operador || ""
      ];

      novasLinhas.push(linhaBd);

      registrosFormatados.push([
        idNum,
        item.viatura || "",
        item.condutor || "",
        item.equipe || "",
        item.destino || "",
        item.bairro || "",
        item.rai || "",
        item.natureza || "",
        formatarDataRapida(dataHoraSaida),
        kmSaidaVal,
        formatarDataRapida(dataHoraChegada),
        kmChegadaVal,
        item.operador || ""
      ]);

      const novoStatus = (!dataHoraChegada || String(dataHoraChegada).trim() === "") ? "EMPENHADA" : "DISPONÍVEL";
      viaturasAtualizadas.push({ viatura: item.viatura || "", novoStatus: novoStatus });
    }

    const startAppendRow = planilha.getLastRow() + 1;
    planilha.getRange(startAppendRow, 1, novasLinhas.length, novasLinhas[0].length).setValues(novasLinhas);

    try {
      const abaVtr = ss.getSheetByName("VIATURAS");
      if (abaVtr && abaVtr.getLastRow() >= 2) {
        const lastRowV = abaVtr.getLastRow();
        const colVtrs = abaVtr.getRange(2, 1, lastRowV - 1, 1).getValues();
        const colTargetStatus = abaVtr.getLastColumn() >= 4 ? 4 : 3;

        for (let i = 0; i < viaturasAtualizadas.length; i++) {
          const vNomeAlvo = String(viaturasAtualizadas[i].viatura).trim().toUpperCase();
          for (let vi = 0; vi < colVtrs.length; vi++) {
            if (String(colVtrs[vi][0]).trim().toUpperCase() === vNomeAlvo) {
              abaVtr.getRange(vi + 2, colTargetStatus).setValue(viaturasAtualizadas[i].novoStatus);
              break;
            }
          }
        }
      }
    } catch (errVtr) {
      Logger.log("Aviso ao atualizar viaturas em lote: " + errVtr);
    }

    SpreadsheetApp.flush();
    if (lock) {
      try { lock.releaseLock(); } catch(e){}
    }

    return {
      success: true,
      ids: idsCriados,
      registros: registrosFormatados,
      viaturasAtualizadas: viaturasAtualizadas
    };

  } catch (e) {
    if (lock) {
      try { lock.releaseLock(); } catch(err){}
    }
    Logger.log("Erro em salvarMultiplosDespachos: " + e.message);
    throw new Error("Erro ao salvar acionamento simultâneo no banco de dados: " + e.message);
  }
}

function salvarDefinicaoEquipe(dadosEscala) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("EQUIPE");
    
    if (!sheet) {
      sheet = ss.insertSheet("EQUIPE");
      sheet.appendRow(["VIATURA", "CONDUTOR", "EQUIPE"]);
    }

    const lastRow = sheet.getLastRow();
    const vtrTarget = String(dadosEscala.viatura).trim().toUpperCase();
    let linhaEncontrada = -1;

    if (lastRow > 1) {
      const dados = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < dados.length; i++) {
        if (String(dados[i][0]).trim().toUpperCase() === vtrTarget) {
          linhaEncontrada = i + 2;
          break;
        }
      }
    }

    const condutor = dadosEscala.condutor || "";
    const equipe = dadosEscala.equipe || "";

    if (linhaEncontrada !== -1) {
      sheet.getRange(linhaEncontrada, 2, 1, 2).setValues([[condutor, equipe]]);
    } else {
      sheet.appendRow([dadosEscala.viatura, condutor, equipe]);
    }
    
    SpreadsheetApp.flush();
    return { success: true, viatura: dadosEscala.viatura };
  } catch (e) {
    Logger.log("Erro em salvarDefinicaoEquipe: " + e.message);
    throw new Error("Falha ao salvar escala no banco de dados: " + e.message);
  }
}

function excluirRegistro(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("BD");
    if (!sheet || sheet.getLastRow() < 2) return false;

    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    const targetId = Number(id);

    for (let i = 0; i < ids.length; i++) {
      if (Number(ids[i][0]) === targetId) {
        sheet.deleteRow(i + 2);
        SpreadsheetApp.flush();
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

function getListaOperadores() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const abaLogin = ss.getSheetByName("OPERADOR");
    if (!abaLogin || abaLogin.getLastRow() < 2) return [];
    const usuarios = abaLogin.getRange(2, 1, abaLogin.getLastRow() - 1, 1).getValues();
    return [...new Set(usuarios.flat().filter(String).map(function(s){ return String(s).trim(); }))].sort();
  } catch (e) {
    return [];
  }
}

function cadastrarMilitar(nomeMilitar) {
  try {
    if (!nomeMilitar || typeof nomeMilitar !== 'string') {
      return { success: false, mensagem: "Nome do militar inválido." };
    }
    const nomeLimpo = String(nomeMilitar).trim();
    if (nomeLimpo.length < 2) {
      return { success: false, mensagem: "Nome do militar muito curto." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let abaMil = ss.getSheetByName("MILITARES");
    if (!abaMil) {
      abaMil = ss.insertSheet("MILITARES");
      abaMil.appendRow(["NOME / GRADUAÇÃO"]);
    }

    const lastRow = abaMil.getLastRow();
    if (lastRow >= 2) {
      const militaresExistentes = abaMil.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(function(m) {
        return String(m || "").trim().toLowerCase();
      });
      if (militaresExistentes.includes(nomeLimpo.toLowerCase())) {
        return { success: true, mensagem: "Militar já consta na planilha.", nome: nomeLimpo, militares: getMilitares() };
      }
    }

    abaMil.appendRow([nomeLimpo]);
    SpreadsheetApp.flush();

    const listaAtualizada = getMilitares();
    return { success: true, mensagem: "Militar cadastrado com sucesso na planilha MILITARES!", nome: nomeLimpo, militares: listaAtualizada };
  } catch (err) {
    Logger.log("Erro ao cadastrar militar: " + err);
    return { success: false, mensagem: "Erro ao cadastrar militar: " + err.message };
  }
}
