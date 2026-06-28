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
    id:             pg.id,
    patrimonio:     prop(p, 'Patrimônio', 'title'),
    marca:          prop(p, 'Marca', 'text'),
    tipo:           prop(p, 'Tipo de Equipamento', 'select'),
    situacao:       prop(p, 'Situação Devolução', 'select'),
    responsavel:    prop(p, 'Responsável Recebimento', 'text'),
    data_devolucao: prop(p, 'Data de Devolução', 'date'),
    pessoa_id:      getRelId(p, 'Pessoa'),
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN não configurado' });

  var db = req.query && req.query.db;

  try {
    // Endpoint especial para ferias (filtra afastamentos por tipo Ferias)
    if (db === 'banco_horas') {
      var pages = await fetchAll(DBS.banco_horas);
      // Agrupar por matrícula
      var porMat = {};
      pages.forEach(function(pg) {
        var p = pg.properties;
        var mat = prop(p, 'Matrícula', 'number');
        var nome = prop(p, 'Nome', 'text');
        var semana = prop(p, 'Semana', 'number');
        var saldo = prop(p, 'Saldo de Horas', 'number');
        var comp = prop(p, 'Comparação', 'select');
        var dias_uteis = prop(p, 'Dias Úteis', 'number');
        if (!mat) return;
        if (!porMat[mat]) porMat[mat] = {matricula: mat, nome: nome, semanas: {}, comparacao: null, dias_uteis: null};
        if (semana) porMat[mat].semanas[semana] = saldo;
        if (comp) porMat[mat].comparacao = comp;
        if (dias_uteis) porMat[mat].dias_uteis = dias_uteis;
      });

      var resultado = Object.values(porMat).map(function(r) {
        var semanas = Object.keys(r.semanas).map(Number).sort(function(a,b){return a-b;});
        var ultima_semana = semanas.length ? semanas[semanas.length-1] : 0;
        var saldo_atual = ultima_semana ? r.semanas[ultima_semana] : null;
        var saldo_ant = semanas.length > 1 ? r.semanas[semanas[semanas.length-2]] : null;
        // Dias para zerar = ROUND(saldo / 8.0, 0)
        var dias_zerar = saldo_atual !== null ? Math.round(saldo_atual / 8.0) : 0;
        // Comparação
        var comparacao = r.comparacao;
        if (!comparacao && saldo_atual !== null && saldo_ant !== null) {
          comparacao = saldo_atual > saldo_ant ? 'Aumentou' : saldo_atual < saldo_ant ? 'Diminuiu' : 'Inalterado';
        }
        // Últimas 5 semanas como array
        var ult5 = semanas.slice(-5).map(function(s){return r.semanas[s];});
        return {
          matricula: r.matricula,
          nome: r.nome,
          saldo_atual: saldo_atual,
          semanas: ult5,
          ultima_semana: ultima_semana,
          comparacao: comparacao,
          dias_zerar: dias_zerar,
        };
      });

      resultado.sort(function(a,b){return (b.saldo_atual||0)-(a.saldo_atual||0);});
      return res.status(200).json({ banco_horas: resultado, timestamp: new Date().toISOString() });
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
};
