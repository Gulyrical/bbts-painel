const NOTION_TOKEN = process.env.NOTION_TOKEN;

const DBS = {
  pessoas:       '22af1aaa-8d47-43ce-a573-b397b5aedbb3',
  vinculos:      '382268ad-ef1d-4275-9ad3-aa08e4018af6',
  cargos:        'e11e6ed3-8c42-4abb-b56d-3e0b7f3c68e4',
  equipamentos:  '31946474-2c1c-4755-8a88-986ce2e0703f',
  afastamentos:  '51c1dadf-2605-466d-9502-f6a7f6fb9ee7',
  curriculo:     '256d9706-61b0-4842-b75b-7b47909f178c',
  solicitacoes:  '83f104c0-3fb4-4771-9133-d7fd4f6b07d0',
  envios:        '03a4a676-fe76-469e-a96c-5fa41c750cc8',
  candidatos:    '015f6b6c-6e0e-40d5-a790-6b9e67c37ef9',
};

async function queryDB(dbId, cursor) {
  const body = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  const res = await fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + NOTION_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Notion API ' + res.status + ' on ' + dbId);
  return res.json();
}

async function fetchAll(dbId) {
  let all = [], cursor = null;
  do {
    const data = await queryDB(dbId, cursor);
    all = all.concat(data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return all;
}

function prop(props, name, type) {
  const p = props[name];
  if (!p) return null;
  switch (type) {
    case 'title':    return p.title && p.title[0] ? p.title[0].plain_text : null;
    case 'text':     return p.rich_text && p.rich_text[0] ? p.rich_text[0].plain_text : null;
    case 'select':   return p.select ? p.select.name : null;
    case 'date':     return p.date ? p.date.start : null;
    case 'number':   return p.number !== undefined ? p.number : null;
    case 'email':    return p.email || null;
    case 'rollup_n': return p.rollup ? p.rollup.number : null;
    case 'relation': return p.relation ? p.relation.map(function(r) { return r.id; }) : [];
    default: return null;
  }
}

function parseVinculo(pg) {
  var p = pg.properties;
  return {
    id: pg.id,
    matricula:     prop(p, 'Matrícula', 'title'),
    status:        prop(p, 'Status', 'select'),
    data_admissao: prop(p, 'date:Data de Admissão:start', 'date'),
    data_deslig:   prop(p, 'date:Data de Desligamento:start', 'date'),
    ocorrencia:    prop(p, 'Ocorrência', 'text'),
    gestor:        prop(p, 'Gestor', 'text'),
    ultimo_dia:    prop(p, 'date:Último Dia de Trabalho:start', 'date'),
    pessoa:        prop(p, 'Pessoa', 'relation'),
  };
}

function parseEquipamento(pg) {
  var p = pg.properties;
  return {
    id: pg.id,
    patrimonio:     prop(p, 'Patrimônio', 'title'),
    marca:          prop(p, 'Marca', 'text'),
    tipo:           prop(p, 'Tipo de Equipamento', 'select'),
    situacao:       prop(p, 'Situação Devolução', 'select'),
    responsavel:    prop(p, 'Responsável Recebimento', 'text'),
    data_devolucao: prop(p, 'date:Data de Devolução:start', 'date'),
    pessoa:         prop(p, 'Pessoa', 'relation'),
  };
}

function parseAfastamento(pg) {
  var p = pg.properties;
  return {
    id: pg.id,
    tipo:     prop(p, 'Tipo de Afastamento', 'select') || prop(p, 'Tipo', 'select'),
    dias:     prop(p, 'Qtd Dias', 'number') || prop(p, 'Dias', 'number'),
    data_ini: prop(p, 'date:Data Início:start', 'date') || prop(p, 'date:Data de Início:start', 'date'),
    pessoa:   prop(p, 'Pessoa', 'relation'),
  };
}

function parseCurriculo(pg) {
  var p = pg.properties;
  return {
    id: pg.id,
    tipo:      prop(p, 'Tipo', 'select'),
    descricao: prop(p, 'Descrição', 'title') || prop(p, 'Curso', 'title'),
    pessoa:    prop(p, 'Pessoa', 'relation'),
  };
}

function parseSolicitacao(pg) {
  var p = pg.properties;
  return {
    id: pg.id,
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
  };
}

function parseCandidato(pg) {
  var p = pg.properties;
  return {
    id: pg.id,
    nome:   prop(p, 'Nome do Candidato', 'title'),
    status: prop(p, 'Status', 'select'),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN não configurado' });
  }

  var dbParam = req.query && req.query.db;

  try {
    if (dbParam === 'vinculos') {
      var pages = await fetchAll(DBS.vinculos);
      return res.status(200).json({ vinculos: pages.map(parseVinculo), timestamp: new Date().toISOString() });
    }

    if (dbParam === 'solicitacoes') {
      var pages = await fetchAll(DBS.solicitacoes);
      return res.status(200).json({ solicitacoes: pages.map(parseSolicitacao), timestamp: new Date().toISOString() });
    }

    if (dbParam === 'candidatos') {
      var pages = await fetchAll(DBS.candidatos);
      return res.status(200).json({ candidatos: pages.map(parseCandidato), timestamp: new Date().toISOString() });
    }

    if (dbParam === 'equipamentos') {
      var pages = await fetchAll(DBS.equipamentos);
      return res.status(200).json({ equipamentos: pages.map(parseEquipamento), timestamp: new Date().toISOString() });
    }

    if (dbParam === 'afastamentos') {
      var pages = await fetchAll(DBS.afastamentos);
      return res.status(200).json({ afastamentos: pages.map(parseAfastamento), timestamp: new Date().toISOString() });
    }

    if (dbParam === 'curriculo') {
      var pages = await fetchAll(DBS.curriculo);
      return res.status(200).json({ curriculo: pages.map(parseCurriculo), timestamp: new Date().toISOString() });
    }

    // Busca todas as databases em paralelo
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
};
