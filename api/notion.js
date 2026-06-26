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

async function queryDB(dbId, cursor = null) {
  const body = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;

  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API ${res.status} on ${dbId}: ${err}`);
  }
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
    case 'title':      return p.title?.[0]?.plain_text || null;
    case 'text':       return p.rich_text?.[0]?.plain_text || null;
    case 'select':     return p.select?.name || null;
    case 'date':       return p.date?.start || null;
    case 'number':     return p.number ?? null;
    case 'checkbox':   return p.checkbox ?? false;
    case 'email':      return p.email || null;
    case 'rollup_n':   return p.rollup?.number ?? null;
    case 'rollup_d':   return p.rollup?.date?.start || null;
    case 'relation':   return p.relation?.map(r => r.id) || [];
    default: return null;
  }
}

// ── Parsers por database ──────────────────────────────────────────────────────

function parsePessoa(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    nome:           prop(p, 'Nome Completo', 'title'),
    cpf:            prop(p, 'CPF', 'text'),
    sexo:           prop(p, 'Sexo', 'select'),
    estado_civil:   prop(p, 'Estado Civil', 'select'),
    cidade:         prop(p, 'Cidade', 'text'),
    estado:         prop(p, 'Estado', 'text'),
    email_corp:     prop(p, 'Email Corporativo', 'email'),
    email_pessoal:  prop(p, 'Email Pessoal', 'email'),
    banco:          prop(p, 'Banco', 'text'),
    conta:          prop(p, 'Conta Bancária', 'text'),
    agencia:        prop(p, 'Agência', 'text'),
    jornada:        prop(p, 'Jornada de Trabalho', 'text'),
    tipo_contrato:  prop(p, 'Tipo de Contrato', 'text'),
  };
}

function parseVinculo(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    matricula:      prop(p, 'Matrícula', 'title'),
    status:         prop(p, 'Status', 'select'),
    uor:            prop(p, 'UOR', 'text'),
    data_admissao:  prop(p, 'date:Data de Admissão:start', 'date'),
    data_deslig:    prop(p, 'date:Data de Desligamento:start', 'date'),
    ocorrencia:     prop(p, 'Ocorrência', 'text'),
    gestor:         prop(p, 'Gestor', 'text'),
    ultimo_dia:     prop(p, 'date:Último Dia de Trabalho:start', 'date'),
    data_solic:     prop(p, 'date:Data de Solicitação:start', 'date'),
    pessoa:         prop(p, 'Pessoa', 'relation'),
  };
}

function parseCargo(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    codigo:   prop(p, 'Código do Cargo', 'title'),
    cargo:    prop(p, 'Cargo', 'text'),
    salario:  prop(p, 'Salário', 'number'),
    nivel:    prop(p, 'Nível', 'select'),
  };
}

function parseEquipamento(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    patrimonio:     prop(p, 'Patrimônio', 'title'),
    marca:          prop(p, 'Marca', 'text'),
    modelo:         prop(p, 'Modelo', 'text'),
    tipo:           prop(p, 'Tipo de Equipamento', 'select'),
    situacao:       prop(p, 'Situação Devolução', 'select'),
    responsavel:    prop(p, 'Responsável Recebimento', 'text'),
    data_devolucao: prop(p, 'date:Data de Devolução:start', 'date'),
    pessoa:         prop(p, 'Pessoa', 'relation'),
  };
}

function parseAfastamento(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    tipo:       prop(p, 'Tipo de Afastamento', 'select') || prop(p, 'Tipo', 'select'),
    dias:       prop(p, 'Qtd Dias', 'number') || prop(p, 'Dias', 'number'),
    data_ini:   prop(p, 'date:Data Início:start', 'date') || prop(p, 'date:Data de Início:start', 'date'),
    data_fim:   prop(p, 'date:Data Fim:start', 'date') || prop(p, 'date:Data de Fim:start', 'date'),
    pessoa:     prop(p, 'Pessoa', 'relation'),
  };
}

function parseCurriculo(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    tipo:         prop(p, 'Tipo', 'select'),
    descricao:    prop(p, 'Descrição', 'title') || prop(p, 'Curso', 'title'),
    instituicao:  prop(p, 'Instituição', 'text'),
    ano:          prop(p, 'Ano', 'number'),
    pessoa:       prop(p, 'Pessoa', 'relation'),
  };
}

function parseSolicitacao(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    numero_sps:     prop(p, 'Número SPS', 'title'),
    fiscal:         prop(p, 'Fiscal do Contrato', 'text'),
    gerente:        prop(p, 'Gerente Demandante', 'text'),
    status:         prop(p, 'Status', 'select'),
    semaforo:       prop(p, 'Semáforo', 'select'),
    data_email:     prop(p, 'date:Data E-mail Recebido:start', 'date'),
    data_curriculos: prop(p, 'date:Data Currículos Enviados:start', 'date'),
    data_entrevista: prop(p, 'date:Data Pedido Entrevista:start', 'date'),
    data_escolhido: prop(p, 'date:Data Candidato Escolhido:start', 'date'),
    data_autorizacao: prop(p, 'date:Data Autorização:start', 'date'),
    data_admissao:  prop(p, 'date:Data Admissão:start', 'date'),
    total_curriculos: prop(p, 'Total Currículos Enviados', 'rollup_n'),
    dias_uteis:     prop(p, 'Dias Úteis Líquidos', 'number'),
    cargo:          prop(p, 'Cargo', 'relation'),
    contratado:     prop(p, 'Contratado', 'relation'),
  };
}

function parseEnvio(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    nome:         prop(p, 'Envio', 'title'),
    data_envio:   prop(p, 'date:Data de Envio:start', 'date'),
    quantidade:   prop(p, 'Quantidade de Currículos', 'number'),
    observacoes:  prop(p, 'Observações', 'text'),
    solicitacao:  prop(p, 'Solicitação', 'relation'),
  };
}

function parseCandidato(pg) {
  const p = pg.properties;
  return {
    id: pg.id,
    nome:               prop(p, 'Nome do Candidato', 'title'),
    status:             prop(p, 'Status', 'select'),
    motivo_triagem:     prop(p, 'Motivo Reprovação Triagem', 'text'),
    data_entrevista:    prop(p, 'date:Data da Entrevista:start', 'date'),
    motivo_entrevista:  prop(p, 'Motivo Reprovação Entrevista', 'text'),
    observacoes:        prop(p, 'Observações', 'text'),
    envio:              prop(p, 'Envio', 'relation'),
    solicitacao:        prop(p, 'Solicitação', 'relation'),
  };
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN não configurado' });
  }

  // Permite buscar só uma database específica via ?db=nome
  const dbParam = req.query?.db;

  try {
    if (dbParam && DBS[dbParam]) {
      // Busca individual
      const parsers = {
        pessoas: parsePessoa, vinculos: parseVinculo, cargos: parseCargo,
        equipamentos: parseEquipamento, afastamentos: parseAfastamento,
        curriculo: parseCurriculo, solicitacoes: parseSolicitacao,
        envios: parseEnvio, candidatos: parseCandidato,
      };
      const pages = await fetchAll(DBS[dbParam]);
      const data  = pages.map(parsers[dbParam]);
      return res.status(200).json({ [dbParam]: data, timestamp: new Date().toISOString() });
    }

    // Busca todas em paralelo
    const [
      pessoasPgs, vinculosPgs, cargosPgs,
      equipPgs, afastPgs, currPgs,
      solPgs, envioPgs, candPgs,
    ] = await Promise.all([
      fetchAll(DBS.pessoas),
      fetchAll(DBS.vinculos),
      fetchAll(DBS.cargos),
      fetchAll(DBS.equipamentos),
      fetchAll(DBS.afastamentos),
      fetchAll(DBS.curriculo),
      fetchAll(DBS.solicitacoes),
      fetchAll(DBS.envios),
      fetchAll(DBS.candidatos),
    ]);

    return res.status(200).json({
      pessoas:      pessoasPgs.map(parsePessoa),
      vinculos:     vinculosPgs.map(parseVinculo),
      cargos:       cargosPgs.map(parseCargo),
      equipamentos: equipPgs.map(parseEquipamento),
      afastamentos: afastPgs.map(parseAfastamento),
      curriculo:    currPgs.map(parseCurriculo),
      solicitacoes: solPgs.map(parseSolicitacao),
      envios:       envioPgs.map(parseEnvio),
      candidatos:   candPgs.map(parseCandidato),
      timestamp:    new Date().toISOString(),
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
