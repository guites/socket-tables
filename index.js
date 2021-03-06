require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const db = require('./db/db');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const FormData = require('form-data');
const sortURL = process.env.SORTWEB_URL;
const showdown = require('showdown');
const converter = new showdown.Converter();

function clientErrorHandler (err, req, res, next) {
  console.log(req.xhr);
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' })
  } else {
    if (err.type == 'entity.too.large') {
      res.status(413).json({success:false, message:'Campo muito grande!'});
    } else if (err.type == 'entity.parse.failed') {
      res.status(400).json({success:false, message:'json mal formatado.'});
    } else {
      next(err);
    }
  }
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods","*");
  next();
});

app.use(bodyParser.json());
app.use(clientErrorHandler);

app.get('/', (req, res) => {
  app.use(express.static(__dirname));
  res.sendFile(__dirname + '/index.html');
});

app.get('/api', async (req, res) => {
  res.json({
    routes: {
      "/api/clients": {
        "get": {},
      },
      "/api/clients/atendimentos": {
        "get": {},
      },
      "/api/status": {
        "get": {}
      },
      "/api/atendimentos": {
        "get": {
          page: "offset from latest atendimento, based on limit",
          limit: "atendimentos per page",
          order: "asc or desc"
        },
        "post": {
          client_id: 'int',
          ticket: 'int',
          data_atendimento: 'datetime',
          data_retorno: 'datetime',
          plataforma: 'varchar(255)',
          obs: 'text'
        }
      },
      "/api/atendimentos/:id": {
        "put": {
          column: "column to be updated",
          value: "new column value"
        }
      },
    }
  });
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await db.getAllClients();
    res.json(clients);
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }
});

app.get('/api/clients/atendimentos', async (req, res) => {
  try {
    const clients = await db.getClientsAtendimentos();
    res.json(clients);
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const statuses = await db.getAllStatus();
    res.json(statuses);
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }
});

app.get('/api/atendimentos', async (req, res, next) => {

  let { page, limit, order, client_id, status_ids, ticket_id, description } = req.query;

  if(ticket_id) {
    if (isNaN(parseInt(ticket_id))) {
      // s?? valida se estiver presente
      return res.status(400).send("O n??mero do ticket deve ser um valor num??rico.");
    }
  } else {
    ticket_id = null;
  }

  if (!order) return res.status(400).send("voc?? deve definir uma order=ASC ou order=DESC.");
  if (!status_ids) return res.status(400).send("Voc?? deve definir o status dos pedidos.");

  status_ids = status_ids.split(",");
  if(status_ids.some(isNaN)) return res.status(400).send("Os c??digos de status devem ser valores num??ricos.");
  if (isNaN(parseInt(page)) || isNaN(parseInt(limit))) {
    return res.status(400).send("page e limit devem ser valores num??ricos.");
  }
  if (page == 0) page = 1;
  const allowed_orders = ['ASC', 'DESC'];
  order = order.toUpperCase();
  if (allowed_orders.indexOf(order) == -1) {
    return res.status(400).send("order deve ser ASC ou DESC");
  }

  let atendimentos;
  let count;

  client_id = parseInt(client_id);

  try {
    if (!isNaN(client_id) && client_id != 0) {
      count = await db.countAtendimentos(client_id, status_ids, ticket_id, description);
      atendimentos = await db.getAtendimentosByClient( ((page - 1) * limit), limit, order, client_id, status_ids, ticket_id, description );
    } else {
      count = await db.countAtendimentos(client_id, status_ids, ticket_id, description);
      atendimentos = await db.getAtendimentos( ((page - 1) * limit), limit, order, status_ids, ticket_id, description );
    }
    res.json({atendimentos, count: count[0].count});
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }

});

app.put('/api/atendimentos/:id', async(req, res) => {
  if (!req.body.user_id) {
    return res.status(400).json({
      success: false,
      message: "Defina um usu??rio nas configura????es."
    });
  }     
  try {
    let column_name;
    switch (req.body.column) {
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
    const oldValues = await db.getAtendimentoById(req.params.id);
    const updated = await db.updateAtendimento(
      req.params.id,
      column_name,
      req.body.value
    );
    if (updated.affectedRows == 1 && updated.changedRows == 1) {

      db.auditLog("update", "atendimentos", req.body.user_id, req.params.id)
      .then((log) => {
        db.auditLogDetalhe(log.insertId, column_name, oldValues[0][column_name], req.body.value)
        return log;
      })
      .then((log) => db.getLog(log.insertId))
      .then((getlog) => {

        io.fetchSockets()
        .then((sockets) => {
          sockets[0].emit('log', getlog[0]);
        });

      });

      return res.json({
        success: true,
        message: "Salvo."
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Erro ao processar requisi????o."
      })
    }
  } catch (err) {
    console.log(err);
    if (err.code == 'ER_DATA_TOO_LONG') {
      res.status(400).send({
        success: false,
        message: `Campo ${req.body.column} muito grande!`
      })
    }
    res.status(500).send({
      success: false,
      message: "Erro ao interagir com banco de dados."
    });
  }
});



async function validateNewAtendimento(atd) {

  const body = {
    client_id: atd.client_id,
    user_id: atd.user_id,
    status: atd.status,
    ticket: atd.ticket,
    data_atendimento: atd.data_atendimento,
    data_retorno: atd.data_retorno,
    plataforma: atd.plataforma,
    obs: atd.obs
  };

  //valida campos obrigat??rios
  
  if (
    !body.client_id ||
    !body.user_id ||
    !body.data_atendimento ||
    !body.data_retorno ||
    !body.plataforma ||
    !body.obs
  ) throw new Error("campos client_id, user_id, status, data_atendimento, data_retorno, plataforma e obs s??o obrigat??rios.");

  // valida status_id, o campo n??o pode vir preenchido.
  const received_status = parseInt(body.status, 10);
  if (received_status) {
    throw new RangeError("O status inicial do atendimento ?? definido automaticamente.");
  } else {
    body.status_name = "aberto";
  }     

  // valida campos de data
  // caso os valores vierem como string, o mysql impede a inser????o
  // preciso validar se a data est?? no intervalo esperado
  var data_atendimento = new Date(body.data_atendimento);
  var data_fechamento = new Date(body.data_fechamento);
  var hoje = new Date();
  var limite_inferior = hoje.setDate(hoje.getDate() - 7);

  if (
    data_atendimento < limite_inferior ||
    data_fechamento < limite_inferior
  ) {
    throw new Error("Voc?? n??o pode criar atendimentos referentes a mais de uma semana no passado.");
  }

  // valida o campo user_id
  const user = await db.getUserById(body.user_id);

  if (!user) {
    throw new Error("Id de usu??rio inv??lido!");
  }
  body.username = user[0].username;

  // valida client_id
  const client = await db.getClientById(body.client_id);
  if (!client || client.length == 0) {
    throw new Error("Id de cliente inv??lido.");
  } else if (client[0].active == 0) {
    throw new Error("Cliente inativo. Crie o atendimento em nome da Astrusweb, especificando o cliente nas observa????es.");
  }
  body.client_name = client[0].name;

  return body;
}

app.post('/api/tasks', async (req, res) => {
  // converte descri????o para html
  req.body.Task.description = converter.makeHtml(req.body.Task.description);
  var requestOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(process.env.SORT_API_USER_KEY +":"+process.env.SORT_API_USER_SECRET).toString('base64'),
      'Origin': process.env.SORT_API_ORIGIN,
    },
    body: JSON.stringify(req.body)
  };

  fetch(`${sortURL}/api/tasks.json`, requestOptions)
  .then(response => {
    if (response.status == 201) {
      return response.json();
    } else {
      return Promise.reject(response);
    }
  })
  .then((resp) => {
    res.json(resp);
  })
  .catch(async (error) => {
    if (error.status) {
      var statusCode = error.status;
      try {
        var resolvedError = await error.json();
        res.status(error.status).json(resolvedError);
      } catch (e) {
        console.log(e);
        res.status(error.status).json({
          "success": false,
          "message": "Erro de permiss??o ao conectar-se ?? API do Sortweb."
        });
      }
    } else {
      res.status(500).json({
        "success": false,
        "message": "Ocorreu um erro ao conectar-se ?? API do Sortweb.",
      });
    }
  });
});


app.post('/api/atendimentos', async (req, res) => {

  let body;
  try {
    body = await validateNewAtendimento(req.body);
  } catch (err) {
    return res.status(400).json({
      "error": err.message,
    });
  }
  try {
    const newAtd = await db.insertAtendimento(req.body);

    db.auditLog("insert", "atendimentos", body.user_id, newAtd.insertId)
      .then((log) => db.getLog(log.insertId))
      .then((getlog) => {

        io.fetchSockets()
        .then((sockets) => {
          sockets[0].emit('log', getlog[0]);
        });

      });

    return res.json({
      success: true,
      atendimento: {
        id:{
          id: newAtd.insertId,
          usuario: body.username,
        },
        status: body.status_name,
        client: {
          name: body.client_name,
          id: body.client_id,
        },
        ticket: req.body.ticket,
        data_atendimento: req.body.data_atendimento,
        data_retorno: req.body.data_retorno,
        plataforma: req.body.plataforma,
        obs: req.body.obs
      }
    });
  } catch(err) {
    console.log(err);
    if (err.sqlMessage) {
      const payLoadKeys = Object.keys(req.body);
      for (var i = 0; i < payLoadKeys.length; i ++) {
        if (err.sqlMessage.indexOf(payLoadKeys[i]) !== -1) {
          res.status(400).json({
            "error": err.sqlMessage,
            "info": `Verifique o preenchimento do campo ${payLoadKeys[i]}.`
          });
          break;
        }
      }
    }
  }

});


io.on('connection', (socket) => {

  var total = io.engine.clientsCount;
  io.emit("user count", total);

  socket.on('add ticket', (addedTicket) => {
    socket.broadcast.emit('add ticket', addedTicket);
  })

  socket.on('novo atendimento', (newAtd) => {
    socket.broadcast.emit('novo atendimento', newAtd);
  });

  socket.on('atualiza obs', (newObs) => {
    socket.broadcast.emit('atualiza obs', newObs);
  });

  socket.on('atualiza status', (newStatus) => {
    switch (parseInt(newStatus.status_id)) {
      case 2:
        newStatus.status_name = "fechado";
        break;
      case 3:
        newStatus.status_name = "deletado";
        break;
      default:
        newStatus.status_name = "aberto";
    }
    socket.broadcast.emit('atualiza status', newStatus);
  });

  socket.on('disconnect', () => {
    var total = io.engine.clientsCount;
    io.emit("user count", total);
  });

});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
