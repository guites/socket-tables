const mysql = require('mysql2/promise');
const config = require('./config');

async function query(sql, params) {
  const connection = await mysql.createConnection(config);
  const [results, ] = await connection.execute(sql, params);
  return results;
}

async function getAllClients() {
  const clients = await query(
    `SELECT sort_id as id, name FROM clientes WHERE active = ?`,
    [1]
  );
  return clients;
}

async function getAllAtendimentos() {
  const atendimentos = await query (
    `SELECT atd.id, c.name, atd.ticket, DATE_FORMAT(atd.data_atendimento,'%d/%m/%y') as data_atendimento, DATE_FORMAT(atd.data_retorno,'%d/%m/%y') as data_retorno, atd.plataforma, atd.obs FROM atendimentos atd INNER JOIN clientes c ON c.sort_id = atd.client_id`
  );
  return atendimentos;
}


async function insertAtendimento(atd) {
  const newAtd = await query (
    `INSERT INTO atendimentos (client_id, data_atendimento, data_retorno, plataforma, obs) VALUES (?, ?, ?, ?, ?)`,
    [atd.client_id, atd.data_atendimento, atd.data_retorno, atd.plataforma, atd.obs]
  );
  return newAtd;
}
module.exports = {
  getAllClients,
  getAllAtendimentos,
  insertAtendimento
}
