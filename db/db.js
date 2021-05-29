const mysql = require('mysql2/promise');
const config = require('./config');

async function query(sql, params = null) {
  const connection = await mysql.createConnection(config);
  const [results, ] = await connection.execute(sql, params);
  return results;
}

async function getAllClients() {
  const clients = await query(
    `SELECT sort_id as id, name FROM clientes`,
  );
  return clients;
}

async function getAllStatus() {
  const statuses = await query(
    `SELECT id, name FROM status`,
  );
  return statuses;
}

async function countAtendimentos() {

  const count = await query (
    `SELECT COUNT(*) as count FROM atendimentos WHERE status_id != 3`
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

async function getAtendimentos(pg = 0, lmt = 25, order = 'DESC') {

  // sobre o .toString() ali, depois de eu ter verificado se era um número válido,
  // https://github.com/sidorares/node-mysql2/issues/1239#issuecomment-760314979
  
  const atendimentos = await query (
 `SELECT atd.id as id, s.name as status, c.name, atd.ticket, DATE_FORMAT(atd.data_atendimento,'%d/%m/%y') as data_atendimento, DATE_FORMAT(atd.data_retorno,'%d/%m/%y') as data_retorno, atd.plataforma, atd.obs FROM atendimentos atd INNER JOIN clientes c ON c.sort_id = atd.client_id INNER JOIN status s ON atd.status_id = s.id WHERE s.id != 3 ORDER BY atd.id ${order} LIMIT ? OFFSET ?`,
  [lmt.toString(), pg.toString()] );
  return atendimentos;
}
async function updateAtendimento(id, column, value) {
  // acho que não consigo setar o nome da coluna de forma dinâmica
  let column_name;
  switch (column) {
    case "plataforma":
      column_name = "plataforma";
      break;
    case "ticket":
      column_name = "ticket";
      break;
    case "status":
      column_name = "status_id";
      break;
    default:
      column_name = "obs";
  }
  const atendimento = await query(
    `UPDATE atendimentos SET ${column_name} = ? WHERE id = ?`,
    [value, id]
  );
  return atendimento;
}


async function insertAtendimento(atd) {
  if (atd.ticket == '' || !atd.ticket) {
    atd.ticket = null;
  }
  const newAtd = await query (
    `INSERT INTO atendimentos (client_id, ticket, data_atendimento, data_retorno, plataforma, obs) VALUES (?, ?, ?, ?, ?, ?)`,
    [atd.client_id, atd.ticket, atd.data_atendimento, atd.data_retorno, atd.plataforma, atd.obs]
  );
  return newAtd;
}
module.exports = {
  getAllClients,
  getAllAtendimentos,
  getAtendimentos,
  countAtendimentos,
  insertAtendimento,
  updateAtendimento,
  getAllStatus
}
