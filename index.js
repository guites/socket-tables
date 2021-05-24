const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const db = require('./db/db');
const bodyParser = require('body-parser');

app.use(bodyParser.json());

app.get('/', (req, res) => {
  app.use(express.static(__dirname));
  res.sendFile(__dirname + '/index.html');
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

app.get('/api/atendimentos', async (req, res) => {
  try {
    const atendimentos = await db.getAllAtendimentos();
    res.json(atendimentos);
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }
});

app.put('/api/atendimentos/:id', async(req, res) => {
  try {
    const updated = await db.updateAtendimento(
      req.params.id,
      req.body.column,
      req.body.value
    );
    console.log(updated);
    return res.json(updated);
  } catch (err) {
    console.log(err);
    res.status(500).send("Erro ao interagir com banco de dados.");
  }
});

app.post('/api/atendimentos', async (req, res) => {
  console.log(req.body);
  try {
    const newAtd = await db.insertAtendimento(req.body);
    return res.json({
      success: true,
      atendimento: [
        newAtd.insertId,
        req.body.name,
        req.body.ticket,
        req.body.data_atendimento,
        req.body.data_retorno,
        req.body.plataforma,
        req.body.obs
      ]
    });
  } catch(err) {
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
    console.log(err);
  }
});


io.on('connection', (socket) => {

  var total = io.engine.clientsCount;
  io.emit("user count", total);

  socket.on('novo atendimento', (newAtd) => {
    socket.broadcast.emit('novo atendimento', newAtd);
  });

  socket.on('disconnect', () => {
    var total = io.engine.clientsCount;
    io.emit("user count", total);
  });

});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
