class Table {

  constructor(s) {
    this.socket = s;
    this.columns = this.checkCols(['Num', 'Cliente', '# Ticket', 'Data - Atendimento', 'Data - Retorno', 'Plataforma', 'Observação']);
    this.parentElement = this.checkSelector('#table-wrapper');
    this.clients = [];
  }

  /**
   * Funções do socket.io
   */
  emitAtendimento(newAtd) {
    s.socket.emit('novo atendimento', newAtd);
  }

  /**
   * Métodos para validar o construtor da classe
   */

  checkCols(columns) {
    if (!Array.isArray(columns)) {
      throw new TypeError('columns deve ser um array');
    } else {
      return columns;
    }
  }

  checkRows(rows) {
    if (!Array.isArray(rows)) {
      throw new TypeError('rows deve ser um array');
    }
    rows.forEach((row) => {
      if (row.length != this.columns.length) {
        throw new Error('as linhas devem ter a mesma quantidade de colunas que o cabeçalho!');
      }
    });
    return rows;
  }

  /**
   * Carrega os clientes cadastrados no banco
   */

  async fetchClients() {
    var clients_list = await fetch('http://localhost:3000/api/clients')
    .then((res) => res.json())
    .then((r) => {
      var clients_list = [];
      r.forEach((client) => {
        clients_list.push([client.id, client.name.toUpperCase()]);
      });
      return clients_list;
    });
    return clients_list;
  }

  /**
   * Cria a estrutura básica da tabela
   */

  createTable() {

    var table = document.createElement('table');
    this.bootstrapIt(table, 'table table-hover');
    table.setAttribute('id', 'todo-table');

    var caption = document.createElement('caption');
    caption.innerHTML = 'Atendimentos';
    table.appendChild(caption);

    var header = document.createElement('thead');
    var tr = header.insertRow(-1);

    this.columns.forEach((col) => {
      var th = document.createElement('th');
      th.scope = "col";
      th.innerHTML = col;
      tr.appendChild(th);
    });

    table.appendChild(header);

    var tbody = document.createElement('tbody');
    table.appendChild(tbody);

    var tfoot = document.createElement('tfoot');
    var tr = tfoot.insertRow(-1);

    var td = document.createElement('td');
    td.setAttribute("colspan", 5);

    var tdErrorWrapper = document.createElement('td');
    tdErrorWrapper.setAttribute("colspan", 4);
    tdErrorWrapper.innerHTML = `<span role='alert' id='error-span' aria-hidden="true" class="text-warning"></span>`;

    var footBtn = document.createElement('button');
    footBtn.id = "addRowBtn";
    footBtn.type = "button";
    footBtn.innerText = "Novo atendimento";
    this.bootstrapIt(footBtn, "btn btn-primary");

    td.appendChild(footBtn);
    tr.appendChild(td);
    tr.appendChild(tdErrorWrapper);
    table.appendChild(tfoot);

    this.parentElement.appendChild(table);
  }

  async loadRowsFromDatabase() {

    // pega atendimentos cadastrados no banco

    var existingRows = await fetch('http://localhost:3000/api/atendimentos')
    .then((res) => res.json())
    .then((r) => {
      var atendimentos = [];
      r.forEach((atd) => {
        atendimentos.push([atd.id, atd.name, atd.ticket, atd.data_atendimento, atd.data_retorno, atd.plataforma, atd.obs]);
      });
      return atendimentos;
    });


    // monta os atendimentos na tabela

    this.appendExistingRows(existingRows);
  }

  /**
   * Adiciona linhas através de um array de arrays
   */

  appendExistingRows(rowsArray) {

    var rows = this.checkRows(rowsArray);
    
    var tbody = document.querySelector('#todo-table > tbody');
    rows.forEach((row) => {
      var tr = tbody.insertRow(-1);
      row.forEach((cell, idx) => {
        if (idx === 0) {
          var td = document.createElement('th');
          td.scope = "row";
        } else {
          var td = document.createElement('td');
        }
        td.innerHTML = cell;
        tr.appendChild(td);
      });
    });
  }

  /**
   * Helper para verificar se foi passado um selector ou htmlElement válido
   */

  checkSelector(x) {
    // valida a variável btnDOM
    if (typeof x == 'string') {
      var x = document.querySelector(x);
      if (!x) throw new TypeError('O Seletor deve ser referente a um elemento existente no DOM!', 'table.js');
    } else {
      // como não é um selector, eu preciso testar se é um elemento html válido
      if (!x instanceof HTMLElement) throw new TypeError('O objeto passado deve ser um HTMLElement válido!','table.js');
    }
    return x;
  }

  /**
   * Método para validar inputs antes do envio
   */

  validateInput(input) {
    var validation = {
      valid: true,
      message: ""
    }
    switch (input.name) {
      case "ticket":
        if (input.value != '') {
          validation.valid = false;
          validation.message = "O valor do ticket não pode ser preenchido manualmente.";
        }
        break;
      case "id":
        if (input.value != '') {
          validation.valid = false;
          validation.message = "O valor do id não pode ser preenchido manualmente.";
        }
        break;
      case "client_id":
        if (input.value.trim() == '') {
          validation.valid = false;
          validation.message = `O campo Cliente não pode estar vazio.`;
        }
        var client_id = input.getAttribute('data-clientid');
        if (!client_id) {
          validation.valid = false;
          validation.message = `O campo Cliente deve estar relacionado a um id válido.`;
        }
        break;
      default:
        if (input.value.trim() == '') {
          validation.valid = false;
          validation.message = `O campo ${input.name} não pode estar vazio.`;
        }
      }
    return validation;
  }

  /**
   * Faz o envio dos campos para criação de nova entrada no banco
   * chama, por sua vez, o método addNewRow
   */

  insertAtendimento(btnDOM) {

    var button = this.checkSelector(btnDOM);
    var errorWrapper = this.checkSelector('#error-span');

    button.addEventListener('click', (e) => {
      var atdPayload = {};
      var allValid = true;
      var inputs = document.querySelectorAll('tr.new-atendimento input');
      for (var x = 0; x < inputs.length; x++) {
        var validation = this.validateInput(inputs[x]);
        if (!validation.valid) {
          inputs[x].classList.add('is-invalid');
          errorWrapper.innerHTML = validation.message;
          inputs[x].focus();
          allValid = false;
          break;
        } else {
          if (inputs[x].classList.contains('is-invalid')) {
            inputs[x].classList.remove('is-invalid');
          }
          inputs[x].classList.add('is-valid');
          if (inputs[x].name == 'client_id') {
            atdPayload[inputs[x].name] = inputs[x].getAttribute('data-clientid');
            atdPayload['name'] = inputs[x].value;
          } else {
            atdPayload[inputs[x].name] = inputs[x].value;
          }
        }
      }

     // inputs.forEach((input) => {
     //   var validation = this.validateInput(input);
     //   if (!validation.valid) {
     //     input.classList.add('is-invalid');
     //     errorWrapper.innerHTML = validation.message;
     //     allValid = false;
     //   } else {
     //     if (input.classList.contains('is-invalid')) {
     //       input.classList.remove('is-invalid');
     //     }
     //     input.classList.add('is-valid');
     //     if (input.name == 'client_id') {
     //       atdPayload[input.name] = input.getAttribute('data-clientid');
     //       atdPayload['name'] = input.value;
     //     } else {
     //       atdPayload[input.name] = input.value;
     //     }
     //   }
     // });

      if (allValid) {
        console.log(allValid);
        errorWrapper.innerHTML = "Campos prenchidos com sucesso. Criando registro...";
        errorWrapper.className = "text-success";

        // adicionar lógica para envio do post

        fetch('http://localhost:3000/api/atendimentos', {
          method: 'POST',
          body: JSON.stringify(atdPayload),
          headers: {
            'content-type': 'application/json',
          },
        })
          .then((response) => {
            if (!response.ok) {
              console.log('promise.reject');
              return Promise.reject(response);
            }
            return response.json();
          })
          .then((res) => {
            if (res.success) {

              this.appendExistingRows([res.atendimento]);

              var formRow = document.querySelector('tr.new-atendimento');
              formRow.remove();

              errorWrapper.className = 'text-info';
              errorWrapper.innerHTML = `<small>Atendimento de ID ${res.atendimento[0]} adicionado com sucesso.</small>`;

              this.emitAtendimento(res.atendimento);

              var newBtn = e.target.cloneNode(true);
              newBtn.innerHTML = 'Novo atendimento';
              e.target.parentNode.replaceChild(newBtn, e.target);
              this.addNewRow(newBtn);

            }
          })
          .catch(async (err) => {
            if (typeof err.json === "function") {
              const jsonErr = await err.json();
              errorWrapper.innerHTML = jsonErr.info + "<small class='text-warning'> Detalhes: " + jsonErr.error + "</small>";
              errorWrapper.className = "text-danger";
            } else {
              console.log("Fetch error");
              console.log(err);
            } 
          });

      } else {
        errorWrapper.className = "text-warning";
      }
    });
  }

  /**
   * Habilita o botão para adicionar novas linhas
   * Retorna o HTMLElement do botão
   */

  addNewRow(btnDOM) {

    var button = this.checkSelector(btnDOM);

    button.addEventListener('click', async (e) => {
      var tbody = document.querySelector('#todo-table > tbody');
      var tr = tbody.insertRow(-1);
      // adiciona classe na nova linha para identificá-la nos outro métodos
      var oldAtendimento = document.querySelector('.new-atendimento');
      if (oldAtendimento) oldAtendimento.classList.remove('new-atendimento');
      tr.classList.add('new-atendimento');
      this.columns.forEach((col, idx) => {
        var input = document.createElement('input');
        input.type = 'text';
        input.placeholder = col;
        input.className = "form-control";
        var date = new Date();
        var todayDate = date.toISOString().split('T')[0]
        switch (col.toLowerCase().trim()) {
          case "num":
            input.disabled = "true";
            input.name = "id";
            break;
          case "# ticket":
            input.disabled = "true";
            input.name = "ticket";
            break;
          case "data - atendimento":
            input.type = "date";
            input.required = "true";
            input.name = "data_atendimento";
            input.value = todayDate;
            break;
          case "data - retorno":
            input.name = "data_retorno";
            input.type = "date";
            input.required = "true";
            input.min = todayDate;
            break;
          case "cliente":
            input.name = "client_id";
            input.type = "text";
            input.required = "true";
            input.classList.add("dropdown-toggle");
            input.setAttribute("data-bs-toggle","dropdown");
            input.setAttribute("aria-expanded", false);
            break;
          case "plataforma":
            input.name = "plataforma";
            input.type = "text";
            input.required = "true";
            break;
          case "observação":
            input.name = "obs";
            input.type = "text";
            input.required = "true";
            break;
          default:
            input.type = "text";
            input.required = "true";
        }
        var td = document.createElement('td');
        td.appendChild(input);
        if (col.toLowerCase().trim() == 'cliente') {
          var dropdown = document.createElement('div');
          dropdown.className = 'dropdown-menu';
          dropdown.role = "menu";
          td.appendChild(dropdown);
        }
        tr.appendChild(td);
      });
      var cliente_input = document.querySelector('table > tbody > tr:last-child > td:nth-child(2) input');

      // adiciona autoComplete no input "cliente": se eu já tiver utilizado a fetchClients(), pego o que tiver na memória
      if (this.clients.length == 0) this.clients = await this.fetchClients();


      this.autoComplete(cliente_input, this.clients);
       
      // põe o foco no input "cliente"
      cliente_input.focus();
      cliente_input.click();

      // altera funcionalidade do botão para "Salvar"
      var newBtn = e.target.cloneNode(true);
      newBtn.innerHTML = 'Salvar';
      e.target.parentNode.replaceChild(newBtn, e.target);
      this.insertAtendimento(newBtn);
    });

    return button;
  }

  /**
   *Habilita autocomplete no campo
   * campo = HTMLElement ou css selector
   * data = 
   */

  autoComplete(campo, data) {

    var input = this.checkSelector(campo);

    /**
     * todo:
     * verificar se a variável data está no formato certo
     */
    
    input.addEventListener('keyup', (e) => {

      var incoming = e.target.value;

      var suggestions_list = e.target.nextElementSibling;
      suggestions_list.innerHTML = '';

      e.target.setAttribute('aria-expanded', false);

      e.target.setAttribute('data-clientid', "");
    
      if (suggestions_list.classList.contains('show')) {
        e.target.classList.remove('show');
        suggestions_list.classList.remove('show');
      }
      if (incoming == '') return;

      var suggestions = data.filter(client => client[1].includes(incoming.toUpperCase()));
      if (suggestions.length > 0) {

        e.target.setAttribute('aria-expanded', true);

        suggestions.forEach((sug) => {

          var a = document.createElement('a');
          a.href = "javascript:void(0)";
          a.className = 'dropdown-item';
          a.setAttribute('data-clientid', sug[0]);
          a.innerHTML = sug[1];

          var divider = document.createElement('div');
          divider.classname = 'dropdown-divider';

          a.addEventListener('click', (ev) => {
            e.target.value = ev.target.textContent;
            e.target.setAttribute('data-clientid', ev.target.getAttribute('data-clientid'));
            e.target.click();
          });

          suggestions_list.appendChild(a);
          suggestions_list.appendChild(divider);

        });
        if (!suggestions_list.classList.contains('show')) {
          e.target.classList.add('show');
          suggestions_list.classList.add('show');
        }
      }
    });
  }

  /**
   * Adiciona as classes para estilização
   */

  bootstrapIt(selector, classes) {

    var current = this.checkSelector(selector);

    // valida a variável classes
    if (typeof classes != 'string') throw new TypeError('As classes adicionadas devem ser em forma de string, separadas por espaços.');

    current.className = current.className + ' ' + classes;

  }
}