const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const db = require('./db/db');
const bodyParser = require('body-parser');

function clientErrorHandler (err, req, res, next) {
  console.log(req.xhr);
  console.log(err);
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' })
  } else {
    if (res.type = 'entity.too.large') {
      res.status(413).json({success:false, message:'Campo muito grande!'})
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

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await db.getAllClients();
    res.json(clients);
  } catch(err) {
    console.log(err);
    res.status(500).send("Erro ao acessar banco de dados.");
  }
});

app.get('/api/atendimentos', async (req, res, next) => {
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
    if (updated.affectedRows == 1 && updated.changedRows == 1) {
      return res.json({
        success: true,
        message: "Salvo."
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Erro ao processar requisição."
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

  socket.on('add ticket', (addedTicket) => {
    console.log(addedTicket);
    socket.broadcast.emit('add ticket', addedTicket);
  })

  socket.on('novo atendimento', (newAtd) => {
    socket.broadcast.emit('novo atendimento', newAtd);
  });

  socket.on('atualiza obs', (newObs) => {
    console.log(newObs);
    socket.broadcast.emit('atualiza obs', newObs);
  });

  socket.on('disconnect', () => {
    var total = io.engine.clientsCount;
    io.emit("user count", total);
  });

});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
