const NOTION_TOKEN = process.env.NOTION_TOKEN;

const DBS = {
  pessoas:       'c3d305b6-6c8c-45fe-be86-ebde62f624df',
  vinculos:      '7e8aae2c-7799-4a47-9bfd-f2f8dd705089',
  cargos:        'd26e55bc-e591-4a4c-9f31-25026a89f519',
  equipamentos:  '43c2d242-f755-4fca-96ce-d6b8bff6164d',
  afastamentos:  '730a04f3-e5b5-4dfa-988e-6d10ae833b6a',
  banco_horas:   'ba44785b-184d-4612-a57f-5f34b6e83b37',
  curriculo:     '5129428f-b760-4b3d-aab2-910a06df3cbf',
  solicitacoes:  '7cf89395-eab1-41d8-bd22-6e209ec7073f',
  envios:        'b701ee07-4324-40db-96e3-1e864b20b3b8',
  candidatos:    'd289f1f6-e5c4-49c4-b1f4-62613e168a4d',
  vagas:         'fd6d7e56-f4a5-493f-8da6-b7fade3ecee3',
  eventos_sps:   '7284912d-8edb-4692-918b-0cda0463ed0a',
};

async function queryDB(dbId, cursor) {
  var body = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  var res = await fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + NOTION_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    var errBody = await res.text();
    throw new Error('Notion API ' + res.status + ' on ' + dbId + ': ' + errBody);
  }
  return res.json();
}

async function fetchAll(dbId) {
  var all = [], cursor = null;
  do {
    var data = await queryDB(dbId, cursor);
    all = all.concat(data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return all;
}

function prop(props, name, type) {
  var p = props[name];
  if (!p) return null;
  switch (type) {
    case 'title':    return p.title && p.title[0] ? p.title[0].plain_text : null;
    case 'text':     return p.rich_text && p.rich_text[0] ? p.rich_text[0].plain_text : null;
    case 'select':   return p.select ? p.select.name : null;
    case 'date':     return p.date ? p.date.start : null;
    case 'number':   return p.number !== undefined ? p.number : null;
    case 'email':    return p.email || null;
    case 'phone_number': return p.phone_number || null;
    case 'rollup_n': return p.rollup ? p.rollup.number : null;
    case 'relation': return p.relation ? p.relation.map(function(r) { return r.id; }) : [];
    default: return null;
  }
}

function getRelId(props, name) {
  var p = props[name];
  if (!p || !p.relation || p.relation.length === 0) return null;
  return p.relation[0].id;
}

function parsePessoa(pg) {
  var p = pg.properties;
  var ddd = prop(p, 'DDD', 'text') || '';
  var tel = prop(p, 'Telefone', 'phone_number') || '';
  var telefone = ddd && tel ? '(' + ddd + ') ' + tel : tel || ddd || null;
  return {
    id:            pg.id,
    nome:          prop(p, 'Nome Completo', 'title') || prop(p, 'Nome', 'title'),
    cpf:           prop(p, 'CPF', 'text'),
    rg:            prop(p, 'RG', 'text'),
    orgao_rg:      prop(p, 'Órgão Emissor RG', 'text'),
    estado_rg:     prop(p, 'Estado Emissor RG', 'text'),
    nascimento:    prop(p, 'Data de Nascimento', 'date'),
    sexo:          prop(p, 'Sexo', 'select'),
    estado_civil:  prop(p, 'Estado Civil', 'select'),
    nacionalidade: prop(p, 'Nacionalidade', 'text'),
    telefone:      telefone,
    logradouro:    prop(p, 'Logradouro', 'text'),
    numero:        prop(p, 'Número', 'text'),
    complemento:   prop(p, 'Complemento', 'text'),
    bairro:        prop(p, 'Bairro', 'text'),
    cidade:        prop(p, 'Cidade', 'text'),
    estado:        prop(p, 'Estado', 'text'),
    cep:           prop(p, 'CEP', 'text'),
    email_pessoal: prop(p, 'Email Pessoal', 'email'),
    email_corp:    prop(p, 'Email Corporativo', 'email'),
    banco:         prop(p, 'Banco', 'text'),
    agencia:       prop(p, 'Agência', 'text'),
    conta:         prop(p, 'Conta Bancária', 'text'),
    tipo_conta:    prop(p, 'Tipo de Conta', 'text'),
    nome_mae:      prop(p, 'Nome da Mãe', 'text'),
    nome_pai:      prop(p, 'Nome do Pai', 'text'),
    jornada:       prop(p, 'Jornada de Trabalho', 'text'),
    tipo_contrato: prop(p, 'Tipo de Contrato', 'text'),
    grau_instrucao: prop(p, 'Grau de Instrução', 'text'),
    pis:           prop(p, 'PIS', 'text'),
    ctps:          prop(p, 'CTPS', 'text'),
  };
}

function parseVinculo(pg) {
  var p = pg.properties;
  return {
    id:            pg.id,
    matricula:     prop(p, 'Matrícula', 'title'),
    status:        prop(p, 'Status', 'select'),
    uor:           prop(p, 'UOR', 'text'),
    data_admissao: prop(p, 'Data de Admissão', 'date'),
    data_deslig:   prop(p, 'Data de Desligamento', 'date'),
    ocorrencia:    prop(p, 'Ocorrência', 'text'),
    gestor:        prop(p, 'Gestor', 'text'),
    ultimo_dia:    prop(p, 'Último Dia de Trabalho', 'date'),
    data_solic:    prop(p, 'Data de Solicitação', 'date'),
    pessoa_id:     getRelId(p, 'Pessoa'),
    cargo_id:      getRelId(p, 'Cargo'),
  };
}

function parseCargo(pg) {
  var p = pg.properties;
  return {
    id:      pg.id,
    codigo:  prop(p, 'Código SGPS', 'title'),
    cargo:   prop(p, 'Descrição do Posto', 'text'),
    salario: prop(p, 'Salário', 'number'),
    nivel:   prop(p, 'Senioridade', 'select'),
  };
}

function parseEquipamento(pg) {
  var p = pg.properties;
  return {
    id:                pg.id,
    patrimonio:        prop(p, 'Patrimônio', 'title'),
    numero_patrimonio: prop(p, 'Número de Patrimônio', 'text'),
    marca:             prop(p, 'Marca', 'text'),
    modelo:            prop(p, 'Modelo', 'text'),
    tipo:              prop(p, 'Tipo de Equipamento', 'select'),
    situacao:          prop(p, 'Situação Devolução', 'select'),
    responsavel:       prop(p, 'Responsável Recebimento', 'text'),
    de_acordo:         prop(p, 'De Acordo Recebimento', 'text'),
    observacao:        prop(p, 'Observação', 'text'),
    data_entrega:      prop(p, 'date:Data de Entrega:start', 'date'),
    data_devolucao:    prop(p, 'date:Data de Devolução:start', 'date'),
    pessoa_id:         getRelId(p, 'Pessoa'),
  };
}

function parseAfastamento(pg) {
  var p = pg.properties;
  return {
    id:        pg.id,
    tipo:      prop(p, 'Tipo de Afastamento', 'select') || prop(p, 'Tipo', 'select'),
    dias:      prop(p, 'Qtd Dias', 'number') || prop(p, 'Dias', 'number'),
    data_ini:  prop(p, 'Data Início', 'date') || prop(p, 'Data de Início', 'date'),
    data_fim:  prop(p, 'Data Fim', 'date') || prop(p, 'Data de Fim', 'date'),
    pessoa_id: getRelId(p, 'Pessoa'),
  };
}

function parseCurriculo(pg) {
  var p = pg.properties;
  return {
    id:          pg.id,
    tipo:        prop(p, 'Tipo', 'select'),
    descricao:   prop(p, 'Descrição', 'title') || prop(p, 'Curso', 'title'),
    instituicao: prop(p, 'Instituição', 'text'),
    ano:         prop(p, 'Ano', 'number'),
    pessoa_id:   getRelId(p, 'Pessoa'),
  };
}

function parseSolicitacao(pg) {
  var p = pg.properties;
  return {
    id:               pg.id,
    numero_sps:       prop(p, 'Número SPS', 'title'),
    fiscal:           prop(p, 'Fiscal do Contrato', 'text'),
    gerente:          prop(p, 'Gerente Demandante', 'text'),
    status:           prop(p, 'Status', 'select'),
    data_email:       prop(p, 'date:Data E-mail Recebido:start', 'date'),
    data_curriculos:  prop(p, 'date:Data Currículos Enviados:start', 'date'),
    data_entrevista:  prop(p, 'date:Data Pedido Entrevista:start', 'date'),
    data_escolhido:   prop(p, 'date:Data Candidato Escolhido:start', 'date'),
    data_autorizacao: prop(p, 'date:Data Autorização:start', 'date'),
    data_admissao:    prop(p, 'date:Data Admissão:start', 'date'),
    total_curriculos: prop(p, 'Total Currículos Enviados', 'rollup_n'),
    cargo_rel:        getRelId(p, 'Cargo'),
  };
}


function parseAfastamentoFerias(pg) {
  var p = pg.properties;
  var titulo = prop(p, 'ID Afastamento', 'title') || '';
  var partes = titulo.split(' - ');
  var nome = partes.length >= 2 ? partes.slice(1, partes.length - 1).join(' - ') : titulo;
  return {
    id:          pg.id,
    nome:        nome,
    data_inicio: prop(p, 'Data de Início', 'date'),
    data_fim:    prop(p, 'Data de Fim', 'date'),
    qtd_dias:    prop(p, 'Qtd Dias', 'number'),
    dias_abono:  prop(p, 'Dias de Abono', 'number'),
    tipo:        prop(p, 'Tipo de Afastamento', 'select'),
  };
}
function parseEnvio(pg) {
  var p = pg.properties;
  return {
    id:         pg.id,
    nome:       prop(p, 'Envio', 'title'),
    data_envio: prop(p, 'Data de Envio', 'date'),
    quantidade: prop(p, 'Quantidade de Currículos', 'number'),
  };
}

function parseCandidato(pg) {
  var p = pg.properties;
  return {
    id:     pg.id,
    nome:   prop(p, 'Nome do Candidato', 'title'),
    status: prop(p, 'Status', 'select'),
  };
}

module.exports = async function handler(req, res) {
  try {
    return await realHandler(req, res);
  } catch (outerErr) {
    try {
      return res.status(500).json({ error: 'Erro inesperado no servidor: ' + outerErr.message });
    } catch (e2) {
      return res.status(500).end('{"error":"Erro fatal no servidor"}');
    }
  }
};

async function realHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=10');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN não configurado' });

  // ── POST: Criar ou atualizar SPS ────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      var body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      var action = body.action;
      var dados = body.dados;

      if (action === 'upload_curriculo') {
        // Upload PDF direto para o Notion usando File Upload API (maio 2025)
        var fileBase64 = dados.file_base64;
        var fileName = dados.file_name;
        var mimeType = 'application/pdf';
        var fileBuffer = Buffer.from(fileBase64, 'base64');

        // Passo 1: Criar o file upload no Notion
        var createRes = await fetch('https://api.notion.com/v1/file_uploads', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + NOTION_TOKEN,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ mode: 'single_part', filename: fileName })
        });
        var createData = await createRes.json();
        if (createData.object === 'error') return res.status(400).json({ error: 'Criar upload: ' + createData.message });

        var uploadId = createData.id;
        var uploadUrl = createData.upload_url;

        // Passo 2: Enviar o arquivo via multipart/form-data manual
        var boundary = '----NotionFileBoundary' + Date.now();
        var CRLF = '\r\n';
        var bodyParts = Buffer.concat([
          Buffer.from('--' + boundary + CRLF),
          Buffer.from('Content-Disposition: form-data; name="file"; filename="' + fileName + '"' + CRLF),
          Buffer.from('Content-Type: application/pdf' + CRLF),
          Buffer.from(CRLF),
          fileBuffer,
          Buffer.from(CRLF + '--' + boundary + '--' + CRLF)
        ]);

        var sendRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + NOTION_TOKEN,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
            'Content-Length': String(bodyParts.length)
          },
          body: bodyParts
        });
        var sendData = await sendRes.json();
        if (sendData.object === 'error') return res.status(400).json({ error: 'Enviar arquivo: ' + sendData.message });
        if (sendData.status !== 'uploaded') return res.status(400).json({ error: 'Upload não concluído: ' + JSON.stringify(sendData) });

        return res.status(200).json({ ok: true, file_upload_id: uploadId });
      }

      if (action === 'criar_candidato') {
        var props = {
          'Nome do Candidato': { title: [{ text: { content: dados.nome } }] },
        };
        if (dados.telefone) props['Telefone'] = { phone_number: dados.telefone };
        if (dados.cargo_id) props['Cargo Pretendido'] = { relation: [{ id: dados.cargo_id }] };
        if (dados.sps_ids && dados.sps_ids.length > 0) {
          props['Solicitação'] = { relation: dados.sps_ids.map(function(id) { return { id: id }; }) };
        }
        // Anexar currículo via file_upload_id se disponível
        if (dados.file_upload_id) {
          props['Currículo'] = { files: [{ type: 'file_upload', file_upload: { id: dados.file_upload_id } }] };
        }

        var r = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent: { database_id: 'd289f1f6-e5c4-49c4-b1f4-62613e168a4d' }, properties: props })
        });
        var d = await r.json();
        if (d.object === 'error') return res.status(400).json({ error: d.message });
        return res.status(200).json({ ok: true, id: d.id });
      }

      if (action === 'criar_sps') {
        var props = {
          'Número SPS': { title: [{ text: { content: dados.numero_sps } }] },
          'Status': { select: { name: 'Aguardando Currículos' } },
        };
        if (dados.gerente) props['Gerente Demandante'] = { rich_text: [{ text: { content: dados.gerente } }] };
        if (dados.fiscal) props['Fiscal do Contrato'] = { rich_text: [{ text: { content: dados.fiscal } }] };
        if (dados.observacoes) props['Observações'] = { rich_text: [{ text: { content: dados.observacoes } }] };
        if (dados.data_email) props['date:Data E-mail Recebido:start'] = { date: { start: dados.data_email } };
        if (dados.cargo_id) props['Cargo'] = { relation: [{ id: dados.cargo_id }] };

        var r = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent: { database_id: DBS.solicitacoes }, properties: props })
        });
        var d = await r.json();
        if (d.object === 'error') return res.status(400).json({ error: d.message });
        return res.status(200).json({ ok: true, id: d.id });
      }

      if (action === 'atualizar_sps') {
        var pid = body.page_id;

        // Salva Status sozinho primeiro
        if (dados.status) {
          var rS = await fetch('https://api.notion.com/v1/pages/' + pid, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: { 'Status': { select: { name: dados.status } } } })
          });
          var dS = await rS.json();
          if (dS.object === 'error') return res.status(400).json({ error: 'Status: ' + dS.message });
        }

        // Salva texto
        var pt = {};
        if (dados.gerente !== undefined) pt['Gerente Demandante'] = { rich_text: dados.gerente ? [{ text: { content: dados.gerente } }] : [] };
        if (dados.fiscal !== undefined) pt['Fiscal do Contrato'] = { rich_text: dados.fiscal ? [{ text: { content: dados.fiscal } }] : [] };
        if (dados.observacoes !== undefined) pt['Observações'] = { rich_text: dados.observacoes ? [{ text: { content: dados.observacoes } }] : [] };
        if (Object.keys(pt).length > 0) {
          await fetch('https://api.notion.com/v1/pages/' + pid, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: pt })
          });
        }

        // Salva datas individualmente
        var datas = [
          ['date:Data Currículos Enviados:start', dados.data_curriculos],
          ['date:Data Pedido Entrevista:start', dados.data_entrevista],
          ['date:Data Candidato Escolhido:start', dados.data_escolhido],
          ['date:Data Autorização:start', dados.data_autorizacao],
          ['date:Data Admissão:start', dados.data_admissao],
        ];
        for (var i = 0; i < datas.length; i++) {
          if (!datas[i][1]) continue;
          var pd = {}; pd[datas[i][0]] = { date: { start: datas[i][1] } };
          await fetch('https://api.notion.com/v1/pages/' + pid, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: pd })
          });
        }

        return res.status(200).json({ ok: true });
      }

      if (action === 'criar_evento_sps') {
        // dados: { sps_id, data, status, observacao }
        var props = {
          'Evento': { title: [{ text: { content: (dados.status || 'Evento') + ' — ' + (dados.data || '') } }] },
          'SPS': { relation: [{ id: dados.sps_id }] },
          'Status': { select: { name: dados.status } },
        };
        if (dados.data) props['Data'] = { date: { start: dados.data } };
        if (dados.observacao) props['Observação'] = { rich_text: [{ text: { content: dados.observacao } }] };

        var r = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent: { database_id: DBS.eventos_sps }, properties: props })
        });
        var d = await r.json();
        if (d.object === 'error') return res.status(400).json({ error: d.message });

        // Também atualiza o Status atual da SPS principal para refletir o evento mais recente
        if (dados.sps_id && dados.status) {
          await fetch('https://api.notion.com/v1/pages/' + dados.sps_id, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: { 'Status': { select: { name: dados.status } } } })
          });
        }

        return res.status(200).json({ ok: true, id: d.id });
      }

      if (action === 'excluir_evento_sps') {
        var eid = body.page_id;
        var r = await fetch('https://api.notion.com/v1/pages/' + eid, {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: true })
        });
        var d = await r.json();
        if (d.object === 'error') return res.status(400).json({ error: d.message });
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'action inválida' });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  var db = req.query && req.query.db;

  try {
    // Endpoint especial para ferias (filtra afastamentos por tipo Ferias)
    if (db === 'banco_horas') {
      // Busca últimas 5 semanas de cada colaborador
      // Semana máxima = última semana com Comparação preenchida
      // Total: ~351 * 5 = ~1755 registros — muito mais rápido!
      
      // 1) Achar a última semana (registros com Comparação preenchida)
      var bodyUlt = { page_size: 100, filter: { property: 'Comparação', select: { is_not_empty: true } } };
      var pagesUlt = [];
      var cursorUlt = null;
      while (true) {
        if (cursorUlt) bodyUlt.start_cursor = cursorUlt;
        var rUlt = await fetch('https://api.notion.com/v1/databases/' + DBS.banco_horas + '/query', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyUlt)
        });
        var dUlt = await rUlt.json();
        pagesUlt = pagesUlt.concat(dUlt.results || []);
        if (!dUlt.has_more) break;
        cursorUlt = dUlt.next_cursor;
      }

      // Montar mapa da última semana
      var ultimoMap = {};
      var maxSemana = 0;
      pagesUlt.forEach(function(pg) {
        var p = pg.properties;
        var mat = prop(p, 'Matrícula', 'number');
        var sem = prop(p, 'Semana', 'number');
        if (!mat) return;
        if (sem > maxSemana) maxSemana = sem;
        ultimoMap[mat] = {
          matricula: mat,
          nome: prop(p, 'Nome', 'text'),
          saldo_atual: prop(p, 'Saldo de Horas', 'number'),
          ultima_semana: sem,
          comparacao: prop(p, 'Comparação', 'select'),
          dias_uteis: prop(p, 'Dias Úteis', 'number'),
        };
      });

      // 2) Buscar as 4 semanas anteriores (maxSemana-4 até maxSemana-1)
      var semMin = Math.max(1, maxSemana - 4);
      var bodyHist = {
        page_size: 100,
        filter: { and: [
          { property: 'Semana', number: { greater_than_or_equal_to: semMin } },
          { property: 'Semana', number: { less_than: maxSemana } }
        ]}
      };
      var pagesHist = [];
      var cursorHist = null;
      while (true) {
        if (cursorHist) bodyHist.start_cursor = cursorHist;
        var rHist = await fetch('https://api.notion.com/v1/databases/' + DBS.banco_horas + '/query', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyHist)
        });
        var dHist = await rHist.json();
        pagesHist = pagesHist.concat(dHist.results || []);
        if (!dHist.has_more) break;
        cursorHist = dHist.next_cursor;
      }

      // Montar histórico por matrícula
      var histMap = {};
      pagesHist.forEach(function(pg) {
        var p = pg.properties;
        var mat = prop(p, 'Matrícula', 'number');
        var sem = prop(p, 'Semana', 'number');
        var saldo = prop(p, 'Saldo de Horas', 'number');
        if (!mat || !sem) return;
        if (!histMap[mat]) histMap[mat] = {};
        histMap[mat][sem] = saldo;
      });

      // Montar resultado final
      var resultado = Object.values(ultimoMap).map(function(r) {
        var hist = histMap[r.matricula] || {};
        var semanas = [];
        for (var s = semMin; s < maxSemana; s++) semanas.push(hist[s] !== undefined ? hist[s] : null);
        semanas.push(r.saldo_atual); // última semana
        var dias_zerar = r.saldo_atual !== null ? Math.round(r.saldo_atual / 8.0) : 0;
        return {
          matricula: r.matricula,
          nome: r.nome,
          saldo_atual: r.saldo_atual,
          ultima_semana: r.ultima_semana,
          comparacao: r.comparacao,
          dias_zerar: dias_zerar,
          semanas: semanas, // array de 5 valores
          semanas_labels: Array.from({length: 5}, function(_, i) { return 'S' + String(semMin + i).padStart(2,'0'); }),
        };
      });

      resultado.sort(function(a,b){ return (b.saldo_atual||0) - (a.saldo_atual||0); });
      return res.status(200).json({ banco_horas: resultado, ultima_semana: maxSemana, timestamp: new Date().toISOString() });
    }


    if (db === 'solicitacoes') {
      var [solPages, cargoPages] = await Promise.all([
        fetchAll(DBS.solicitacoes),
        fetchAll(DBS.cargos),
      ]);
      // Mapa page_id -> {codigo, descricao}
      var cargoMap = {};
      cargoPages.forEach(function(pg) {
        var p = pg.properties;
        cargoMap[pg.id] = {
          codigo: prop(p, 'Código SGPS', 'title'),
          descricao: prop(p, 'Descrição do Posto', 'text'),
        };
      });
      var solicitacoes = solPages.map(function(pg) {
        var s = parseSolicitacao(pg);
        if (s.cargo_rel && cargoMap[s.cargo_rel]) {
          s.cargo_codigo = cargoMap[s.cargo_rel].codigo;
          s.cargo_desc   = cargoMap[s.cargo_rel].descricao;
        }
        return s;
      });
      return res.status(200).json({ solicitacoes: solicitacoes, timestamp: new Date().toISOString() });
    }

    if (db === 'candidatos') {
      var [candPages, cargoPages] = await Promise.all([
        fetchAll('d289f1f6-e5c4-49c4-b1f4-62613e168a4d'),
        fetchAll(DBS.cargos),
      ]);
      var cargoMap = {};
      cargoPages.forEach(function(pg) {
        var codigo = prop(pg.properties, 'Código SGPS', 'title');
        var desc = prop(pg.properties, 'Descrição do Posto', 'text');
        var nivel = prop(pg.properties, 'Senioridade', 'select');
        cargoMap[pg.id] = codigo + (desc ? ' — ' + desc : '') + (nivel ? ' (' + nivel + ')' : '');
      });
      var candidatos = candPages.map(function(pg) {
        var p = pg.properties;
        var nome = prop(p, 'Nome do Candidato', 'title') || '—';
        // Buscar URL do currículo no campo Files
        var curriculoUrl = null;
        var filesField = p['Currículo'];
        if (filesField && filesField.files && filesField.files.length > 0) {
          var f0 = filesField.files[0];
          if (f0.type === 'file' && f0.file) curriculoUrl = f0.file.url;
          else if (f0.type === 'external' && f0.external) curriculoUrl = f0.external.url;
        }
        var cargoRel = getRelId(p, 'Cargo Pretendido');
        var spsRel = prop(p, 'Solicitação', 'relation') || [];
        return {
          id: pg.id,
          nome: nome,
          telefone: prop(p, 'Telefone', 'phone_number'),
          cargo: cargoRel ? cargoMap[cargoRel] : null,
          curriculo_url: curriculoUrl,
          sps_count: spsRel.length,
        };
      }).sort(function(a,b){ return a.nome.localeCompare(b.nome); });
      return res.status(200).json({ candidatos: candidatos, timestamp: new Date().toISOString() });
    }

    if (db === 'cargos_lista') {
      var pages = await fetchAll(DBS.cargos);
      var cargos = pages.map(function(pg) {
        var p = pg.properties;
        return {
          id: pg.id,
          codigo: prop(p, 'Código SGPS', 'title'),
          descricao: prop(p, 'Descrição do Posto', 'text'),
          senioridade: prop(p, 'Senioridade', 'select'),
          salario: prop(p, 'Salário', 'number'),
          valor_custo: prop(p, 'Valor de Custo', 'number'),
        };
      }).filter(function(c) { return c.codigo; })
        .sort(function(a,b) { return (a.codigo||'').localeCompare(b.codigo||''); });
      return res.status(200).json({ cargos: cargos, timestamp: new Date().toISOString() });
    }

    if (db === 'vagas_lista') {
      var pages = await fetchAll(DBS.vagas);
      var vagas = pages.map(function(pg) {
        var p = pg.properties;
        return {
          id: pg.id,
          codigo: prop(p, 'Posto SGPS', 'title'),
          descricao: prop(p, 'Descrição do Posto', 'text'),
          senioridade: prop(p, 'Senioridade', 'select'),
          salario: prop(p, 'Salário', 'number'),
          valor_custo: prop(p, 'Valor de Custo', 'number'),
          qtde_contratual: prop(p, 'Qtde Contratual', 'number'),
        };
      }).filter(function(v) { return v.codigo; })
        .sort(function(a,b) { return (a.codigo||'').localeCompare(b.codigo||''); });
      return res.status(200).json({ vagas: vagas, timestamp: new Date().toISOString() });
    }

    if (db === 'eventos_sps') {
      var pages = await fetchAll(DBS.eventos_sps);
      var eventos = pages.map(function(pg) {
        var p = pg.properties;
        return {
          id: pg.id,
          sps_id: getRelId(p, 'SPS'),
          data: prop(p, 'Data', 'date'),
          status: prop(p, 'Status', 'select'),
          observacao: prop(p, 'Observação', 'text'),
        };
      }).filter(function(e) { return e.sps_id && e.data; })
        .sort(function(a,b) { return (a.data||'').localeCompare(b.data||''); });
      return res.status(200).json({ eventos: eventos, timestamp: new Date().toISOString() });
    }

    if (db === 'equipamentos_lista') {
      var [eqPages, pessoaPages, vinculoPages] = await Promise.all([
        fetchAll(DBS.equipamentos),
        fetchAll(DBS.pessoas),
        fetchAll(DBS.vinculos),
      ]);

      var pessoaMap = {};
      pessoaPages.forEach(function(pg) {
        var nome = prop(pg.properties, 'Nome Completo', 'title') || prop(pg.properties, 'Nome', 'title');
        if (nome) pessoaMap[pg.id] = nome;
      });

      // Mapa pessoa_id -> status do vínculo mais relevante (prioriza Ativo se houver mais de um vínculo)
      var statusPorPessoa = {};
      var matriculaPorPessoa = {};
      vinculoPages.forEach(function(pg) {
        var p = pg.properties;
        var pessoaId = getRelId(p, 'Pessoa');
        if (!pessoaId) return;
        var status = prop(p, 'Status', 'select');
        var matricula = prop(p, 'Matrícula', 'title');
        if (!statusPorPessoa[pessoaId] || status === 'Ativo') {
          statusPorPessoa[pessoaId] = status;
          matriculaPorPessoa[pessoaId] = matricula;
        }
      });

      var equipamentos = eqPages.map(function(pg) {
        var eq = parseEquipamento(pg);
        eq.pessoa_nome = eq.pessoa_id ? (pessoaMap[eq.pessoa_id] || null) : null;
        eq.pessoa_status = eq.pessoa_id ? (statusPorPessoa[eq.pessoa_id] || null) : null;
        eq.pessoa_matricula = eq.pessoa_id ? (matriculaPorPessoa[eq.pessoa_id] || null) : null;
        return eq;
      });

      return res.status(200).json({ equipamentos: equipamentos, timestamp: new Date().toISOString() });
    }

    if (db === 'sps_abertas') {
      var [spsPages, cargoPages2] = await Promise.all([
        fetchAll(DBS.solicitacoes),
        fetchAll(DBS.cargos),
      ]);
      var cargoMap2 = {};
      cargoPages2.forEach(function(pg) {
        var codigo = prop(pg.properties, 'Código SGPS', 'title');
        var desc = prop(pg.properties, 'Descrição do Posto', 'text');
        cargoMap2[pg.id] = { codigo: codigo, descricao: desc };
      });
      var abertas = spsPages.map(function(pg) {
        var p = pg.properties;
        var cargoRel = getRelId(p, 'Cargo');
        var cargo = cargoRel && cargoMap2[cargoRel] ? cargoMap2[cargoRel] : null;
        return {
          id: pg.id,
          numero_sps: prop(p, 'Número SPS', 'title'),
          gerente: prop(p, 'Gerente Demandante', 'text'),
          status: prop(p, 'Status', 'select'),
          cargo_codigo: cargo ? cargo.codigo : null,
          cargo_desc: cargo ? cargo.descricao : null,
        };
      }).filter(function(s) {
        return !['Contratado','Cancelado'].includes(s.status);
      }).sort(function(a,b) {
        return (b.numero_sps||'').localeCompare(a.numero_sps||'');
      });
      return res.status(200).json({ sps_abertas: abertas, timestamp: new Date().toISOString() });
    }

    if (db === 'atestados') {
      // Buscar atestados e pessoas em paralelo
      var [atesPages, pessoaPages] = await Promise.all([
        fetchAll(DBS.afastamentos),
        fetchAll(DBS.pessoas),
      ]);

      // Mapa page_id -> nome da pessoa
      var pessoaMap = {};
      pessoaPages.forEach(function(pg) {
        var nome = prop(pg.properties, 'Nome', 'title');
        if (nome) pessoaMap[pg.id] = nome;
      });

      var atestados = atesPages
        .map(function(pg) {
          var p = pg.properties;
          // Pega o nome via relação Pessoa
          var pessoaIds = prop(p, 'Pessoa', 'relation') || [];
          var nome = pessoaIds.length > 0 ? (pessoaMap[pessoaIds[0]] || '—') : '—';
          return {
            id:          pg.id,
            nome:        nome,
            tipo:        prop(p, 'Tipo de Afastamento', 'select'),
            cid:         prop(p, 'CID', 'text'),
            data_inicio: prop(p, 'Data de Início', 'date'),
            data_fim:    prop(p, 'Data de Fim', 'date'),
            dias:        prop(p, 'Qtd Dias', 'number'),
            observacao:  prop(p, 'Observação', 'text'),
          };
        })
        .filter(function(r) { return r.tipo === 'Atestado médico'; });
      return res.status(200).json({ atestados: atestados, timestamp: new Date().toISOString() });
    }

    if (db === 'afastamentos_ferias') {
      var pages = await fetchAll(DBS.afastamentos);
      var ferias = pages.map(parseAfastamentoFerias).filter(function(r){ return r.tipo === 'Férias'; });
      return res.status(200).json({ ferias: ferias, timestamp: new Date().toISOString() });
    }

    if (db && DBS[db]) {
      var parsers = {
        pessoas: parsePessoa, vinculos: parseVinculo, cargos: parseCargo,
        equipamentos: parseEquipamento, afastamentos: parseAfastamento,
        curriculo: parseCurriculo, solicitacoes: parseSolicitacao,
        envios: parseEnvio, candidatos: parseCandidato, afastamentos_ferias: parseAfastamentoFerias,
      };
      var pages = await fetchAll(DBS[db]);
      var result = {};
      result[db] = pages.map(parsers[db]);
      result.timestamp = new Date().toISOString();
      return res.status(200).json(result);
    }

    var results = await Promise.all([
      fetchAll(DBS.vinculos),
      fetchAll(DBS.equipamentos),
      fetchAll(DBS.afastamentos),
      fetchAll(DBS.curriculo),
      fetchAll(DBS.solicitacoes),
      fetchAll(DBS.candidatos),
    ]);

    return res.status(200).json({
      vinculos:     results[0].map(parseVinculo),
      equipamentos: results[1].map(parseEquipamento),
      afastamentos: results[2].map(parseAfastamento),
      curriculo:    results[3].map(parseCurriculo),
      solicitacoes: results[4].map(parseSolicitacao),
      candidatos:   results[5].map(parseCandidato),
      timestamp:    new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
