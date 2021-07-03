const mysql = require('mysql2/promise');
const config = require('./config');

async function query(sql, params = null) {
  const connection = await mysql.createConnection(config);
  const [results, ] = await connection.execute(sql, params);
  await connection.end();
  return results;
}

async function getAllClients() {
  const clients = await query(
    `SELECT sort_id as id, name FROM clientes`,
  );
  return clients;
}

async function getClientsAtendimentos() {
  const clients = await query(
    //`SELECT sort_id, name FROM clientes WHERE sort_id IN (SELECT client_id FROM atendimentos)`
    `SELECT c.sort_id, c.name, COUNT(1) as count FROM atendimentos a LEFT JOIN clientes c ON c.sort_id = a.client_id GROUP BY c.sort_id`
  );
  return clients;
}

async function getAllUsers() {
  const users = await query(
    `SELECT sort_id as id, username as usuario FROM usuarios WHERE active = 1`,
  );
  return users;
}

async function getUserById(id) {
  const user = await query(
    `SELECT username FROM usuarios WHERE sort_id = ? AND active = 1`,
    [id]
  );
  return user;
}

async function getClientById(id) {
  const cliente = await query(
    `SELECT name, active FROM clientes WHERE sort_id = ?`,
    [id]
  );
  return cliente;
}

async function getAllStatus() {
  const statuses = await query(
    `SELECT id, name FROM status`,
  );
  return statuses;
}

async function countAtendimentos(client_id = null, status_ids = [1, 2], ticket_id = null) {

  let status_in = "";

  switch(status_ids.length) {
    case 1:
      status_in = `status_id IN (?)`;
      break
    case 3:
      status_in = `status_id IN (?, ?, ?)`;
      break;
    default:
      status_in = `status_id IN (?, ?)`;
  }

  let arg_params = [];
  status_ids.forEach((s) => arg_params.push(s));

  let sql = `SELECT COUNT(*) as count FROM atendimentos WHERE ${status_in}`;
  if (client_id) {
    sql += ' AND client_id = ?';
    //sql = `SELECT COUNT(*) as count FROM atendimentos WHERE ${status_in} AND client_id = ?`;
    arg_params.push(client_id);
  }
  if (ticket_id) {
    sql += ' AND ticket = ?';
    //sql = `SELECT COUNT(*) as count FROM atendimentos WHERE ${status_in} AND ticket = ?`;
    arg_params.push(ticket_id);
  }

  const count = await query (
    sql,
    arg_params
  );

  return count;

}

async function getAllAtendimentos() {
  const atendimentos = await query (
    `SELECT atd.id as id,
    s.name as status,
    c.name,
    atd.ticket,
    DATE_FORMAT(atd.data_atendimento,'%d/%m/%y') as data_atendimento,
    DATE_FORMAT(atd.data_retorno,'%d/%m/%y') as data_retorno,
    atd.plataforma,
    atd.obs
    FROM atendimentos atd
    INNER JOIN clientes c ON c.sort_id = atd.client_id
    INNER JOIN status s ON atd.status_id = s.id
    WHERE s.id != 3
    ORDER BY atd.id DESC`
  );
  return atendimentos;
}

async function getAtendimentosByClient(pg = 0, lmt = 25, order = 'DESC', client_id, status_ids = [1,2], ticket_id) {

  // sobre o .toString() ali, depois de eu ter verificado se era um número válido,
  // https://github.com/sidorares/node-mysql2/issues/1239#issuecomment-760314979
  let status_in = "";
  switch(status_ids.length) {
    case 1:
      status_in = `WHERE s.id IN (?)`;
      break
    case 3:
      status_in = `WHERE s.id IN (?, ?, ?)`;
      break;
    default:
      status_in = `WHERE s.id IN (?, ?)`;
  }
  let args_array = [];
  status_ids.forEach((s) => args_array.push(s))
  
  let sql =`SELECT atd.id as id,
   u.username as usuario,
   s.name as status,
   c.name,
   atd.ticket,
   DATE_FORMAT(atd.data_atendimento,'%d/%m/%y') as data_atendimento,
   DATE_FORMAT(atd.data_retorno,'%d/%m/%y') as data_retorno,
   atd.plataforma,
   atd.obs FROM atendimentos atd
   INNER JOIN clientes c ON c.sort_id = atd.client_id 
   INNER JOIN status s ON atd.status_id = s.id
   LEFT JOIN usuarios u ON u.sort_id = atd.user_id
   ${status_in}`;
  if (ticket_id) {
    sql += ` AND atd.ticket = ? `;
    args_array.push(ticket_id.toString());
  }
  sql += ` AND c.sort_id = ?
   ORDER BY atd.id ${order}
   LIMIT ?
   OFFSET ?`;
  args_array.push(client_id, lmt.toString(), pg.toString());

  const atendimentos = await query (sql, args_array);
  return atendimentos;
}

async function getAtendimentos(pg = 0, lmt = 25, order = 'DESC', status_ids = [1, 2], ticket_id = null, description = null) {

  // sobre o .toString() ali, depois de eu ter verificado se era um número válido,
  // https://github.com/sidorares/node-mysql2/issues/1239#issuecomment-760314979
  
  if (description) {

    console.log("description: ", description);

  }
  let status_in = "";

  switch(status_ids.length) {
    case 1:
      status_in = `s.id IN (?)`;
      break
    case 3:
      status_in = `s.id IN (?, ?, ?)`;
      break;
    default:
      status_in = `s.id IN (?, ?)`;
  }

  let args_array = [];
  status_ids.forEach((s) => args_array.push(s))
  
  let sql = `
    SELECT atd.id as id,
    u.username as usuario,
    s.name as status,
    c.name,
    atd.ticket,
    DATE_FORMAT(atd.data_atendimento,'%d/%m/%y') as data_atendimento,
    DATE_FORMAT(atd.data_retorno,'%d/%m/%y') as data_retorno,
    atd.plataforma,
    atd.obs FROM atendimentos atd
    INNER JOIN clientes c ON c.sort_id = atd.client_id 
    INNER JOIN status s ON atd.status_id = s.id
    LEFT JOIN usuarios u ON u.sort_id = atd.user_id
    WHERE ${status_in}`;

    if (ticket_id) {
      sql += ` AND atd.ticket = ? `;
      args_array.push(ticket_id.toString());
    }

    if (description) {
      sql += ` AND atd.obs LIKE ? `;
      args_array.push(`%${description}%`);
    }

    sql += `
    ORDER BY atd.id ${order}
    LIMIT ?
    OFFSET ?`;

  args_array.push(lmt.toString(), pg.toString());

  const atendimentos = await query (
    sql,
    args_array
  );
  return atendimentos;
}
async function updateAtendimento(id, column, value) {
  const atendimento = await query(
    `UPDATE atendimentos SET ${column} = ? WHERE id = ?`,
    [value, id]
  );
  return atendimento;
}

async function getAtendimentoById(id) {
  const atendimento = await query (
    `SELECT * FROM atendimentos WHERE id = ?`,
    [id]
  );
  return atendimento;
}

async function insertAtendimento(atd) {
  if (atd.ticket == '' || !atd.ticket) {
    atd.ticket = null;
  }
  const newAtd = await query (
    `INSERT INTO atendimentos (client_id, user_id, ticket, data_atendimento, data_retorno, plataforma, obs) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [atd.client_id, atd.user_id, atd.ticket, atd.data_atendimento, atd.data_retorno, atd.plataforma, atd.obs]
  );
  return newAtd;
}

async function auditLog(tipo, tabela, user_id, tabela_pk) {
  const log = await query(
    `INSERT INTO auditlogs (tipo, tabela, user_id, tabela_pk) VALUES (?, ?, ?, ?)`,
    [tipo, tabela, user_id, tabela_pk]
  );
  return log;
}

async function auditLogDetalhe(log_id, nome_coluna, valor_antigo, valor_novo) {
  const logDetalhe = await query(
    `INSERT INTO auditlogdetalhes (log_id, nome_coluna, valor_antigo, valor_novo) VALUES (?, ?, ?, ?)`,
    [log_id, nome_coluna, valor_antigo, valor_novo]
  );
  return logDetalhe;
}

async function getLog(id) {
  const log = await query(
    `SELECT al.id, al.tipo, al.tabela, u.username, c.name, al.criado_em, a.id as codigo FROM auditlogs al INNER JOIN atendimentos a ON al.tabela_pk = a.id INNER JOIN clientes c ON a.client_id = c.sort_id INNER JOIN usuarios u ON u.sort_id = al.user_id WHERE al.id = ?`,
    [id]
  );
  return log;
}

module.exports = {
  auditLog,
  auditLogDetalhe,
  getLog,
  getAllClients,
  getAllUsers,
  getClientsAtendimentos,
  getUserById,
  getClientById,
  getAtendimentoById,
  getAllAtendimentos,
  getAtendimentos,
  getAtendimentosByClient,
  countAtendimentos,
  insertAtendimento,
  updateAtendimento,
  getAllStatus
}
