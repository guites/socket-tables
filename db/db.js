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

async function countAtendimentos(client_id = null, status_ids = [1, 2]) {

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

  let sql;
  if (!client_id) sql = `SELECT COUNT(*) as count FROM atendimentos WHERE ${status_in}`;
  if (client_id) {
    sql = `SELECT COUNT(*) as count FROM atendimentos WHERE ${status_in} AND client_id = ?`;
    arg_params.push(client_id);
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

async function getAtendimentosByClient(pg = 0, lmt = 25, order = 'DESC', client_id, status_ids = [1,2]) {

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
  args_array.push(client_id, lmt.toString(), pg.toString());
  
  const atendimentos = await query (
 `SELECT atd.id as id,
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
  ${status_in}
  AND c.sort_id = ?
  ORDER BY atd.id ${order}
  LIMIT ?
  OFFSET ?`,
  args_array
  );
  return atendimentos;
}

async function getAtendimentos(pg = 0, lmt = 25, order = 'DESC', status_ids = [1, 2]) {

  // sobre o .toString() ali, depois de eu ter verificado se era um número válido,
  // https://github.com/sidorares/node-mysql2/issues/1239#issuecomment-760314979
  //
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
  args_array.push(lmt.toString(), pg.toString());
  
  const atendimentos = await query (
   `SELECT atd.id as id,
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
    WHERE ${status_in}
    ORDER BY atd.id ${order}
    LIMIT ?
    OFFSET ?`,
    args_array
  );
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
    `INSERT INTO atendimentos (client_id, user_id, ticket, data_atendimento, data_retorno, plataforma, obs) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [atd.client_id, atd.user_id, atd.ticket, atd.data_atendimento, atd.data_retorno, atd.plataforma, atd.obs]
  );
  return newAtd;
}
module.exports = {
  getAllClients,
  getAllUsers,
  getClientsAtendimentos,
  getUserById,
  getClientById,
  getAllAtendimentos,
  getAtendimentos,
  getAtendimentosByClient,
  countAtendimentos,
  insertAtendimento,
  updateAtendimento,
  getAllStatus
}
