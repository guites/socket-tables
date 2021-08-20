class Table {

  constructor(s) {
    this.socket = s;
    this.columns = this.checkCols(
      ['Num', 'Status', 'Cliente', '# Ticket', 'Data - Atendimento', 'Data - Retorno', 'Plataforma', 'Observação']
    );
    this.parentElement = this.checkSelector('#table-wrapper');
    // listagem de todos os clientes
    this.clients = [];
    // listagem dos clientes que possuem atendimento, para o filtro
    this.clientesAtendimentos = [];

    // guarda o id do ticket caso o filtro estiver ativo
    this.ticket_id = '';

    // guarda a descrição caso o filtro estiver ativo
    this.description = '';

    // guarda o id do cliente caso o filtro estiver ativo
    this.currentClientId = null; 
    // número de linhas por página da planilha
    this.perPage = 25;
    // status marcados no filtro
    this.status_ids = [1, 2];

    // utilizado para verificar se o usuário apertou esc duas vezes
    this.escapeKeyPressed = 0;

    this.usuarios = [];
    this.statuses = [];
    this.apiURL = 'http://192.168.10.104:3000/';
    this.sortwebURL = 'https://app.sortweb.me';
    this.currentPage = 1;
    this.usuario = {};
  }

  /**
   * Funções do socket.io
   */

  emitAtendimento(newAtd) {
    s.socket.emit('novo atendimento', newAtd);
  }

  emitAddTicket(addedTicket) {
    s.socket.emit('add ticket', addedTicket);
  }

  /**
   * Lida com o recebimento da emitAddTicket
   */
  handleAddTicket(addedTicket) {

    var updated = document.querySelector(`#addTicketBtn_${addedTicket.id}`);
    if (updated) {
      // caso o ticket adicionado estiver aparecendo na listagem do usuário
      updated.innerHTML = addedTicket.ticket;
      this.bootstrapIt(updated, 'btn btn-light disabled');
      updated.classList.remove('btn-primary');
      var small = updated.nextElementSibling;
      if (small) {
        small.innerHTML = "Atualizado.";
        small.className = "text-warning";
      }
    }
    var addExistingTicketInput = document.querySelector(`#addExistingTicket_${addedTicket.id}`);
    if (addExistingTicketInput) {
      // caso a outra pessoa estiver com o modal desse atendimento aberto
      addExistingTicketInput.value = addedTicket.ticket;
      addExistingTicketInput.disabled = true;
      var addExistingTicketInputSmall = addExistingTicketInput.nextElementSibling; 
      addExistingTicketInputSmall.innerHTML = 'Ticket atrelado por outro usuário.';
      addExistingTicketInputSmall.className = 'text-warning';
      var addNewTicketBtn = document.querySelector('#createTicketButton');
      addNewTicketBtn.disabled = true;
    }
  }

  emitAtualizaStatus(newStatus) {

    /**
     * newStatus.id: id do atendimento
     * newStatus.status_id: id do status
     */

    s.socket.emit('atualiza status', newStatus);

  }

  handleAtualizaStatus(newStatus) {

    /**
     * Lida com o recebimento da emitAtualizaStatus
     */

    var updated = document.getElementById(`dropdownMenuButton_${newStatus.id}`);

    if (updated) {
      // o atendimento atualizado está na página
      updated.innerHTML = newStatus.status_name;
      var dropdown_menu = updated.nextElementSibling;
      var small = dropdown_menu.nextElementSibling;
      if (small) {
        small.innerHTML = "Atualizado.";
        small.className = "d-block text-warning";
      }
      if (dropdown_menu) {
        dropdown_menu.innerHTML = '';
      }
    } else {
      // o atendimento atualizado não está na página..
    }

  }

  emitAtualizaObs(newObs) {

    /**
     * newObs.id: data-atendimentoid do textarea
     * newObs.obs: novo texto da obs
     */

    s.socket.emit('atualiza obs', newObs);
  }

  atualizaObs(newObs) {

    /**
     * Lida com o recebimento da emitAtualizaObs
     */

    var updated = document.querySelector(`[data-atendimentoid="${newObs.id}"]`);
    if (updated) {
      updated.value = newObs.obs;
      var small = updated.nextElementSibling;
      if (small) {
        small.innerHTML = "Atualizado.";
        small.className = "text-warning";
      }
    } else {
      // o atendimento atualizado não está na página..
    }
  }

  appendLog(log, listDOM) {
    var list = this.checkSelector(listDOM);
    var li = document.createElement('li');
    this.bootstrapIt(li, "list-group-item d-flex justify-content-between align-items-center");
    var date = new Date(log.criado_em);
    if (log.tipo == 'insert') {
      li.innerHTML = `<p>${log.username} <span class="text-info">registrou</span> o atendimento #${log.codigo} para o cliente ${log.name} em ${date.toLocaleString()}.</p>`;
    }
    if (log.tipo == 'update') {
      li.innerHTML = `<p>${log.username} <span class="text-info">atualizou</span> o atendimento #${log.codigo} para o cliente ${log.name} em ${date.toLocaleString()}.</p>`
    }
    list.appendChild(li);
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
      const count = Object.keys(row).length;
      if (count != this.columns.length) {
        throw new Error('as linhas devem ter a mesma quantidade de colunas que o cabeçalho!');
      }
    });
    return rows;
  }

  /**
   * Carrega os status cadastrados no banco
   */

  async fetchStatus() {
    var status_list = await fetch(this.apiURL + 'api/status')
    .then((res) => res.json())
    .then((s) => {
      var status_list = [];
      s.forEach((stat) => {
        status_list.push(stat);
      });
      return status_list;
    });
    return status_list;
  }

  /**
   * Carrega os clientes cadastrados no banco
   */

  async fetchClients() {
    var clients_list = await fetch(this.apiURL + 'api/clients')
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
   * Carrega os clientes com atendimento no banco
   */

  async fetchClientsAtendimentos() {
    this.clientesAtendimentos = [];
    var clients_list = await fetch(this.apiURL + 'api/clients/atendimentos')
    .then((res) => res.json())
    .then((r) => {
      var clients_list = [];
      r.forEach((client) => {
        clients_list.push([client.sort_id, client.name.toUpperCase(), client.count]);
      });
      return clients_list;
    });
    return clients_list;
  }
  /**
   * Carrega os usuarios cadastrados no banco
   */

  async fetchUsuarios() {
    var usuarios_list = await fetch(this.apiURL + 'api/users')
    .then((res) => res.json())
    .then((r) => {
      var usuarios_list = [];
      r.forEach((user) => {
        usuarios_list.push([user.id, user.usuario]);
      });
      return usuarios_list;
    });
    return usuarios_list;
  }

  /**
   * Cria a estrutura básica da tabela
   */

  createTable() {

    var table = document.createElement('table');
    this.bootstrapIt(table, 'table table-hover');
    table.setAttribute('id', 'todo-table');

    this.setPerPageFromCookie();

    var caption = document.createElement('caption');
    caption.innerHTML = 'Atendimentos';
    table.appendChild(caption);

    var header = document.createElement('thead');
    
    // adc nome das colunas -- início
    
    var tr = header.insertRow(0);

    this.columns.forEach((col) => {
      var th = document.createElement('th');
      th.scope = "col";
      th.innerHTML = col;
      tr.appendChild(th);
    });

    // adc nome das colunas -- fim


    table.appendChild(header);

    var tbody = document.createElement('tbody');
    table.appendChild(tbody);

    var tfoot = document.createElement('tfoot');
    table.appendChild(tfoot);

    this.parentElement.appendChild(table);
  }

  /**
   * Puxa atendimentos do banco de dados baseado nos parametros de paginação
   * extendi pra aceitar o id de cliente, uso na paginação
   */

  async loadRowsFromDatabase(
    pg = 1, lmt = this.perPage, order = 'desc',
    client_id = null, status_ids = this.status_ids,
    ticket_id = this.ticket_id, description = this.description)
  {

    const allowed_orders = ['desc', 'asc'];
    const page = parseInt(pg);
    const limit = parseInt(lmt);

    if ( isNaN(page) || isNaN(limit) || allowed_orders.indexOf(order) == -1 ) {
      throw new TypeError("Valores inválidos passados na paginação!");
      return;
    }

    // pega atendimentos cadastrados no banco

    var queryString = 'api/atendimentos?page=' + page;
    queryString += '&limit=' + limit;
    queryString += '&order=' + order;
    queryString += '&client_id=' + client_id;
    queryString += '&status_ids=' + status_ids;
    queryString += '&ticket_id=' + ticket_id;
    queryString += '&description=' + description;
    var existingRows = await fetch(
      this.apiURL + queryString
    )
    .then((res) => res.json())
    .then((r) => {
      var atendimentos = [];
      r.atendimentos.forEach((atd) => {
        atendimentos.push(
          {
            id: {
              id: atd.id,
              usuario: atd.usuario,
            },
            status: atd.status,
            client:{
              name: atd.client_name,
              id: atd.client_id,
            },
            ticket: atd.ticket,
            data_atendimento: atd.data_atendimento,
            data_retorno: atd.data_retorno,
            plataforma: atd.plataforma,
            obs: atd.obs
          });
      });
      return {atendimentos, count: r.count};
    });

    var totalPages = Math.ceil(existingRows.count / limit);
    var currentPage = page;

    // monta os atendimentos na tabela

    this.appendExistingRows(existingRows.atendimentos, this.perPage, totalPages, currentPage, client_id);
  }

  /**
   * Helper para readicionar os event listeners
   * após trocar status do atendimento
   */

  regenerateStatus() {
    /**
     * Fora de uso, após alterar status o usuário precisa
     * atualizar a pagina se quiser alterar novamente
     */
  }

  /**
   * Helper para uso do fetch nas alterações de status
   */

  fetchPutStatus(e, atendimento_id, small, button, dropdown_menu) {

    fetch(`${this.apiURL}api/atendimentos/${atendimento_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type':'application/json'
      },
      body: JSON.stringify({column: "status", value: e.target.id, user_id: this.usuario.id})
    })
    .then((response) => {
      if (!response.ok) {
        return Promise.reject(response);
      }
      return response.json();
    })
    .then((res) => {
      if (res.success) {

        small.innerHTML = "Salvo.";
        small.className = "d-block text-success";
        button.innerHTML = e.target.firstChild.innerHTML;
        dropdown_menu.innerHTML = '';
        this.emitAtualizaStatus({id: atendimento_id, status_id: e.target.id}); // aqui, eu teria que filtrar novamente dentre os status existentes,
        // gerar o html dos dropdown_itens e adicionar os event listeners...

      }
      small.innerHTML = res.message;
    })
    .catch(async (err) => {
      small.className = 'd-block text-danger';
      if (typeof err.json === "function") {
        const jsonErr = await err.json();
        small.innerHTML = jsonErr.message;
      } else {
        console.log(err);
        small.innerHTML = "Erro no servidor.";
      } 
    });

  }

  /**
   * Gera o HTML para o Modal de confirmação: alterar status para deletado
   */

  generateConfirmModal(parentEl, nextSibling) {

    var modal = document.createElement('div');
    modal.className = "modal fade";
    modal.id = "confirmModal";
    modal.tabIndex = -1;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby","confirmModalLabel");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `

      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmModalLabel">Deletar atendimento.</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
              <span aria-hidden="true"></span>
            </button>
          </div>
          <div class="modal-body">
            Atendimentos deletados serão removidos da listagem.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button id="confirmModalBtn" type="button" class="btn btn-primary">Deletar</button>
          </div>
        </div>
      </div>

    `;

    var parentEl = this.checkSelector(parentEl);
    var nextSibling = this.checkSelector(nextSibling);
    parentEl.insertBefore(modal, nextSibling);

  }


  /**
   * Funcionalidade para o campo status na tabela
   */

  statusCell(cell, atendimento_id) {

    var td = document.createElement('td');

    var small = document.createElement("small");
    small.className = 'd-block';


    var dropdown = document.createElement('div');
    dropdown.className = 'dropdown';

    var button = document.createElement("button");
    button.className = "btn btn-secondary btn-sm dropdown-toggle";
    button.id = `dropdownMenuButton_${atendimento_id}`;
    button.setAttribute("data-bs-toggle", "dropdown");
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = cell;

    var dropdown_menu = document.createElement("div");
    dropdown_menu.style.minWidth = 0;
    dropdown_menu.style.maxWidth = "5rem";
    dropdown_menu.className = "dropdown-menu";
    dropdown_menu.setAttribute("aria-labelledby", "dropdownMenuButton");

    var dropdown_itens_statuses = this.statuses.filter(stts => stts.name != cell);

    dropdown_itens_statuses.forEach((st) => {

      var dropdown_item = document.createElement("button");
      dropdown_item.id = st.id;
      dropdown_item.className = "dropdown-item";
      dropdown_item.style.cursor = "pointer";
      dropdown_item.style.padding = "0.25rem 0.5rem";
      if (st.id == 3) {
        dropdown_item.type = "button";
        dropdown_item.classList.add("btn");
        dropdown_item.setAttribute("data-bs-toggle", "modal");
        dropdown_item.setAttribute("data-bs-target", "#confirmModal");
      }

      var span = document.createElement("span");
      span.innerHTML = st.name;
      span.style.pointerEvents = "none";

      dropdown_item.appendChild(span);

      if (st.id != 3){
        dropdown_item.addEventListener("click", (e) => {
          this.fetchPutStatus(e, atendimento_id, small, button, dropdown_menu);
        });
      } else {

        var modalFooter = document.querySelector('#confirmModal .modal-footer');
        var modalClose = document.querySelector('#confirmModal .btn-close');
        var modalBody = document.querySelector('#confirmModal .modal-body');

        dropdown_item.addEventListener("click", (e) => {
          var modalBtn = document.querySelector('#confirmModalBtn');
          var newBtn = modalBtn.cloneNode(true);
          modalFooter.replaceChild(newBtn, modalBtn);
          modalBody.innerHTML = `O atendimento de número <span class="text-warning">#${atendimento_id}</span> será removido da listagem.`;
          newBtn.addEventListener('click', () => {
            this.fetchPutStatus(e, atendimento_id, small, button, dropdown_menu);
            modalClose.click();
          });
        });
      }

      dropdown_menu.appendChild(dropdown_item);
    });

    td.appendChild(button);
    td.appendChild(dropdown_menu);
    td.appendChild(small);
    return td;
  }

  /**
   * Funcionalidade para o campo Num na tabela
   * mostrar nome do atendente no hover / clique
   */

  numCell(cell, atendimento_id) {

  }

  remActivityButton(e) {
    console.log(e.target.parentElement.parentElement.parentElement);
  }

  createTaskApiBtn(btnSelector) {
    var createTaskApiBtn = this.checkSelector(btnSelector);
    createTaskApiBtn.addEventListener('click', (e) => {
      var atdId = this.checkSelector('#createTicketRadio').getAttribute('atendimento-id');
      var submitBtn = e.target;
      submitBtn.disabled = true;
      var form = submitBtn.form;
      var inputs = form.querySelectorAll('input, textarea, select');
      var payload = {
        Task: {
          status_id: 5, // OS sempre criada com status Aberta
        },
        Activity: []
      };
      var validSubmission = true;
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        // nenhum input pode ser vazio
        if (input.value.trim() == '') validSubmission = false;
        switch(input.name) {
          case '[Task]effort':
            var eff = input.value;
            if(!/^[0-9]{2}:[0-9]{2}$/.test(eff)) {
              validSubmission = false;
            }
            break;
        }
        if (!validSubmission) {
          // quando o primeiro não validar, sai do loop
          input.classList.add('is-invalid');
          input.focus();
          break;
        }
        // se chegou aqui, é válido
        input.classList.remove('is-invalid');

        if (input.name.startsWith('[Task]')) {
          if (input.name == '[Task]client_name') {
            payload.Task.client_id = input.getAttribute('data-client-id');
          } else {
            payload.Task[input.name.substr(6)] = input.value;
          }
        }
        if (input.name.startsWith('data[Activity]')){
          if (input.name.endsWith('[user_id]')) {
            payload.Activity.push({user_id: input.value});
          } else {
            var currentActivity = payload.Activity.length - 1;
            if (input.name.endsWith('[order]')) {
              payload.Activity[currentActivity].order = input.value;
            } else if (input.name.endsWith('[description]')) {
              payload.Activity[currentActivity].description = input.value;
            }
          }
        }
      }
      if (validSubmission) {
        this.fetchCreateTask(payload, form, inputs, atdId);
      } else {
        submitBtn.disabled = false;
      }
      return;
    });
  }

  fetchCreateTask(payload, form, inputs, atdId) {
    // adicionar lógica para envio da task na API
    var atdId = atdId;
    const closeModalBtn = this.checkSelector('#addTicketModal .modal-dialog .modal-header button');
    const taskButtons = document.querySelectorAll('#taskButtonsDiv button, .activityClose');
    taskButtons.forEach((btn) => btn.disabled = true);
    inputs.forEach((input) => input.disabled = true);
    const alertsWrapper = this.checkSelector('#alerts-sort-api');
    alertsWrapper.classList = 'show alert alert-info alert-dismissible';
    alertsWrapper.innerHTML = `
      <button type="button" class="btn-close" onclick="document.querySelector('#alerts-sort-api').classList.toggle('show'); return false;"></button>
      <strong>Aguarde</strong>
      <div class="spinner-border spinner-border-sm" role="status">
        <span class="sr-only"></span>
      </div>
      <br/>Criando tarefa para o atendimento #${atdId}.
    `;
    fetch(this.apiURL + 'api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
    })
    .then((response) => {
      taskButtons.forEach((btn) => btn.disabled = false);
      inputs.forEach((input) => input.disabled = false);
      if (!response.ok) {
        return Promise.reject(response);
      }
      return response.json();
    })
    .then((res) => {
      var activitiesFieldset = this.checkSelector('#activitiesFieldset');
      while (activitiesFieldset.children.length > 2) {
        activitiesFieldset.removeChild(activitiesFieldset.lastChild);
      }
      form.reset();
      var taskId = res.id.pop();
      alertsWrapper.classList = 'show alert alert-success alert-dismissible';
      alertsWrapper.innerHTML = `
        <button type="button" class="btn-close" onclick="document.querySelector('#alerts-sort-api').classList.toggle('show'); return false;"></button>
        <strong>Tarefa Registrada!</strong> OS <a class="alert-link" href="${this.sortwebURL}/tasks/adminTaskView/${taskId}" target="_blank">#${taskId}</a> para o atendimento #${atdId}.
      `;
      // atualiza o #ticket do atendimento. deve atualizar via socket
      this.fetchAddCreatedTicketFromApi(atdId, taskId);
    })
    .catch(async (err) => {
      console.log(err.status);
      const errStatus = err.status;
      let wrapperClass;
      let wrapperMessage;
      switch (errStatus) {
        case 403:
          wrapperClass = 'show alert alert-warning alert-dismissible';
          wrapperMessage = 'Erro na autenticação!';
          break;
        case 400: 
          wrapperClass = 'show alert alert-warning alert-dismissible';
          wrapperMessage = 'Parâmetros incorretos enviados! Verifique a aba network.';
          break;
        case '500':
          wrapperClass = 'show alert alert-danger alert-dismissible';
          wrapperMessage = 'Erro interno! Verifique a API do Sortweb.';
          break;
        default:
          wrapperClass = 'show alert alert-danger alert-dismissible';
          wrapperMessage = 'Erro desconhecido! Avise o desenvolvedor.';
      }
      if (typeof err.json === "function") {
        const jsonErr = await err.json();
        alertsWrapper.classList = wrapperClass;
        alertsWrapper.innerHTML = `
          <button type="button" class="btn-close" onclick="document.querySelector('#alerts-sort-api').classList.toggle('show'); return false;"></button>
          <strong>Erro ${errStatus}</strong>: ${wrapperMessage}
        `;
      } else {
        console.log("Fetch error", err);
      } 
    });
    closeModalBtn.click();
  }

  formatEffort(inputSelector) {

    var effortInput = this.checkSelector(inputSelector);
    effortInput.addEventListener('keyup', function(e) {
      var string = e.target.value.replace(/[^0-9]+/, "");
      var length = string.length;
      if (length == 3) {
        string = string.substr(0,2) + ":" + string.substr(-1,1);
      } else if (length >= 4) {
        string = string.substr(0,2) + ":" + string.substr(2,2);
      }
      effortInput.value = string;
    });

  }

  addActivityButton(btnSelector, fieldsetSelector) {
    var addActivityBtn = this.checkSelector(btnSelector);
    var activitiesFieldset = this.checkSelector(fieldsetSelector);
    addActivityBtn.addEventListener('click', function() {
      var activities = activitiesFieldset.querySelectorAll('.mb-2.col-lg-6');
      var activitiesCount = activities.length;
      var activityDiv = activitiesFieldset.querySelector('.mb-2.col-lg-6');
      var newActivityDiv = activityDiv.cloneNode(true);
      var activityNumber = parseInt(activitiesCount);
      newActivityDiv.querySelector('h5').innerText = (activityNumber + 1) + ".";
      var newActivitySelect = newActivityDiv.querySelector('select');
      newActivitySelect.name = `data[Activity][${activityNumber}][user_id]`;
      newActivitySelect.id = `Activity${activityNumber}UserId`;
      newActivityDiv.querySelector('label').setAttribute('for', `Activity${activityNumber}UserId`);

      var newActivityInputHidden = newActivityDiv.querySelector('input[type=hidden]');
      newActivityInputHidden.name = `data[Activity][${activityNumber}][order]`;
      newActivityInputHidden.id = `Activity${activityNumber}order`;
      newActivityInputHidden.value = activityNumber;

      newActivityDiv.querySelector('label:nth-child(1)').setAttribute('for', `Activity${activityNumber}Description`);
      newActivityDiv.querySelector('textarea').name = `data[Activity][${activityNumber}][description]`;
      newActivityDiv.querySelector('textarea').id = `Activity${activityNumber}Description`;

      var activityDivCloseBtn = newActivityDiv.querySelector('button');
      activityDivCloseBtn.disabled = false;
      activityDivCloseBtn.addEventListener(
        'click',
        function(e) {
          e.target.parentElement.parentElement.parentElement.remove();
          var activities = activitiesFieldset.querySelectorAll('.mb-2.col-lg-6');
          for(var x = 0; x < activities.length; x++) {
            activities[x].querySelector('h5').innerText = (x + 1) + '.';

            var newActivitySelect = activities[x].querySelector('select');
            newActivitySelect.name = `data[Activity][${x}][user_id]`;
            newActivitySelect.id = `Activity${x}UserId`;
            activities[x].querySelector('label').setAttribute('for', `Activity${x}UserId`);

            var newActivityInputHidden = activities[x].querySelector('input[type=hidden]');
            newActivityInputHidden.name = `data[Activity][${x}][order]`;
            newActivityInputHidden.id = `Activity${x}order`;
            newActivityInputHidden.value = x;

            activities[x].querySelector('label:nth-child(1)').setAttribute('for', `Activity${x}Description`);
            activities[x].querySelector('textarea').name = `data[Activity][${x}][description]`;
            activities[x].querySelector('textarea').id = `Activity${x}Description`;
          }
        },
        false
      );

      activitiesFieldset.appendChild(newActivityDiv);
    });
  }

  /**
   * Toggle de formulário nos radio button (ticket existente / criar ticket)
   */
  toggleTicketRadio(data_selector) {
    var modalDialog = document.querySelector('#addTicketModal .modal-dialog');
    var radios = document.querySelectorAll(`[${data_selector}]`);
    // considera como atendente o usuário atual das planilhas
    var atd_user_id = this.usuario.id;
    var atd_user_name = this.usuario.username;
    radios.forEach((radio) => {
      radio.addEventListener('click', function(e) {
        var radio_form = document.getElementById(radio.getAttribute(data_selector));
        radio_form.style.display = 'block';
        if (radio_form.id == 'addTicketFormWrapper') {
          // carrega dados do atendimento atual
          modalDialog.classList.add('modal-lg');
          
          // cachear esses seletores, pois é sempre o mesmo form. depois do envio, dou reset.
          var atd_id = e.target.getAttribute('atendimento-id');
          var atd_textarea = document.querySelector(`[data-atendimentoid="${atd_id}"]`);
          var atd_row = atd_textarea.parentElement.parentElement;
          // atendimentos antigos não possuem o nome do atendente atrelado no html
          if (atd_row.children[0].children.length > 1) {
            var atd_user = atd_row.children[0].children[1].innerText;
          }
          
          var atd_client = atd_row.children[2].innerText;
          var atd_client_id = atd_row.children[2].getAttribute('data-client-id');
          // considerar já deixar um data-atd-inicio do seletor pra não precisar manipular por aqui
          var atd_inicio_split = atd_row.children[4].innerText.split('/');
          var atd_inicio = '20' + atd_inicio_split[2] + '-' + atd_inicio_split[1] + '-' + atd_inicio_split[0];
          var atd_fim_split = atd_row.children[5].innerText.split('/');
          var atd_fim = '20' + atd_fim_split[2] + '-' + atd_fim_split[1] + '-' + atd_fim_split[0];
          var atd_plataforma = atd_row.children[6].innerText;

          var taskEffortInput = radio_form.querySelector('#TaskEffort');
          taskEffortInput.focus();
          radio_form.querySelector('#TaskDescription').value = atd_textarea.value;
          radio_form.querySelector('#TaskClientName').value = atd_client;
          radio_form.querySelector('#TaskUserId').value = atd_user_id;
          radio_form.querySelector('#TaskClientName').setAttribute('data-client-id', atd_client_id);
          radio_form.querySelector('#TaskBeginDate').value = atd_inicio;
          radio_form.querySelector('#TaskEndDate').value = atd_fim;

          // marca o atendente na primeira atividade
          radio_form.querySelector(`#Activity0UserId option[value="${atd_user_id}"]`).selected = "selected";
          radio_form.querySelector('#Activity0Description').value = 'atendimento feito via ' + atd_plataforma;
          
        } else {
          modalDialog.classList.remove('modal-lg');
          var addExistingTicketInput = document.querySelector('#addExistingTicketWrapper input');
          addExistingTicketInput.focus();
        }
        radios.forEach((r) => {
          if (r.id != radio.id) {
            var r_form = document.getElementById(r.getAttribute(data_selector));
            r_form.style.display = 'none';
          }
        });
      });
    });
  }

  /**
   * Fetch para adicionar um ticket ao atendimento após criação de ticket pela API
   */

    fetchAddCreatedTicketFromApi(atendimento_id, ticket_id) {
      // este método deve funcionar mesmo que o atendimento não esteja mais aparecendo na tela
      // por ex. colocou pra criar e mudou de página ou adicionou um filtro
      let btnOnScreen = true;
      let btn;
      let small;
      try {
        btn = this.checkSelector(`#addTicketBtn_${atendimento_id}`);
        small = this.checkSelector(btn.nextSibling);
      } catch (e) {
        btnOnScreen = false;
      }
      // fetch para adicionar # do ticket
      fetch(`${table.apiURL}api/atendimentos/${atendimento_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type':'application/json'
        },
        body: JSON.stringify({column: "ticket", value: ticket_id, user_id: this.usuario.id })
      })
      .then((response) => {
        if (!response.ok) {
          return Promise.reject(response);
        }
        return response.json();
      })
      .then((res) => {
        if (res.success) {
          // altera estilos do botão fora do modal
          if (btnOnScreen) {
            small.innerHTML = "Salvo.";
            small.className = "text-success";
            this.bootstrapIt(btn, 'btn btn-light disabled');
            btn.classList.remove('btn-primary');
            btn.innerHTML = ticket_id;
          }
          this.emitAddTicket({id: atendimento_id, ticket: ticket_id});
        }
        if (btnOnScreen) {
          small.innerHTML = res.message;
        }
      })
      .catch(async (err) => {
        if (btnOnScreen) {
          small.className = 'text-danger';
          if (typeof err.json === "function") {
            const jsonErr = await err.json();
            small.innerHTML = jsonErr.message;
          } else {
            console.log(err);
            small.innerHTML = "Erro no servidor.";
          } 
        }
      });
    } 

  /**
   * Fetch para adicionar um ticket já existinte ao atendimento colocando número de ticket no input
   */

  addExistingTicket(modalSmall, createTicketButton, small, btn, table, atendimento_id) {
    // usei o método bind nessa função, o this aqui se refere ao input que está recebendo o event listener
    // table se refere a classe
    
    var radio = document.querySelector('[data-display-target="addExistingTicketWrapper"]');
    if (!radio.checked) return;
    if (this.value != "") {
      var validate = table.validateInput(this);
      modalSmall.innerText = 'Registrando, aguarde...';
      this.disabled = true;
      createTicketButton.disabled = true;
      if (validate.valid) {
        // fetch para adicionar # do ticket
        fetch(`${table.apiURL}api/atendimentos/${atendimento_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type':'application/json'
          },
          body: JSON.stringify({column: "ticket", value: this.value, user_id: table.usuario.id })
        })
        .then((response) => {
          if (!response.ok) {
            return Promise.reject(response);
          }
          return response.json();
        })
        .then((res) => {
          if (res.success) {
            // altera estilos do botão fora do modal
            small.innerHTML = "Salvo.";
            small.className = "text-success";
            table.bootstrapIt(btn, 'btn btn-light disabled');
            btn.classList.remove('btn-primary');
            btn.innerHTML = this.value;
            // altera estilos do input dentro do modal
            modalSmall.className = "text-success";
            modalSmall.innerHTML = "Salvo.";
            table.emitAddTicket({id: atendimento_id, ticket: this.value});
          }
          small.innerHTML = res.message;
        })
        .catch(async (err) => {
          small.className = 'text-danger';
          if (typeof err.json === "function") {
            const jsonErr = await err.json();
            small.innerHTML = jsonErr.message;
          } else {
            console.log(err);
            small.innerHTML = "Erro no servidor.";
          } 
        });
       } else {
         switch (validate.message) {
           case "Digite apenas números no campo <# Ticket>.":
             modalSmall.innerHTML = "Apenas números.";
             break;
           case "O número do Ticket deve ter menos que 6 dígitos (valor máximo 99999).":
             modalSmall.innerHTML = "Valor máx. 99999";
             break;
           default:
             modalSmall.innerHTML = "Erro!";
             break;
         }
         modalSmall.className = "text-warning";
         // em caso de erro, libera o input pro usuário tentar novamente
         createTicketButton.disabled = false;
         this.disabled = false;
       }
     }
  }

  /**
   * Funcionalidade para o campo ticket na tabela
   */

  ticketCell(cell, atendimento_id) {

    if (cell === null) {
      var td = document.createElement('td');
      var btn = document.createElement('button');
      btn.type = "button";
      btn.className = "btn btn-secondary btn-sm d-block";
      btn.innerHTML = 'ticket';
      btn.id = `addTicketBtn_${atendimento_id}`;
      btn.setAttribute('data-bs-target', `#addTicketModal`);
      btn.setAttribute('data-bs-toggle', `modal`);
      var small = document.createElement("small");
      small.className = 'text-info';

      btn.addEventListener('click', (e) => {

        /**
         * Por padrão, adc ticket existente selecionado
         */

        var adcTicketLabel = this.checkSelector('label[for=addExistingTicketRadio]');
        adcTicketLabel.click();

        /**
         * Adicionar ticket já existente
         */
        var ticketsModal = this.checkSelector('#addExistingTicketWrapper');
        var modalSmall = this.checkSelector('#addExistingTicketSmall');

        var addExistingTicketInput = this.checkSelector('#addExistingTicketWrapper input[name=ticket]');
        // substitui o input por um clone pra remover event listeners anteriores
        var newAddExistingTicketInput = addExistingTicketInput.cloneNode(true);
        ticketsModal.replaceChild(newAddExistingTicketInput, addExistingTicketInput);

        /**
         * Criar novo ticket via API
         */
        var createTicketRadio = this.checkSelector('#createTicketRadio');
        //var newCreateTicketButton = createTicketButton.cloneNode(true);
        //ticketsModal.replaceChild(newCreateTicketButton, createTicketButton);

        createTicketRadio.disabled = false;
        createTicketRadio.setAttribute('atendimento-id', atendimento_id);
        newAddExistingTicketInput.disabled = false;
        newAddExistingTicketInput.value = '';
        modalSmall.innerText = 'Adicione um # de ticket existente no Sortweb.';
        modalSmall.className = 'text-info';
        newAddExistingTicketInput.id = `addExistingTicket_${atendimento_id}`;
        var addExistingTicketCallBack = this.addExistingTicket.bind(
          newAddExistingTicketInput, modalSmall, createTicketRadio,
          small, btn, this, atendimento_id
        );
        newAddExistingTicketInput.addEventListener('blur', addExistingTicketCallBack);

        //createTicketFormCallBack = this.createTicketForm.bind();

        //newCreateTicketButton.addEventListener('click', createTicketFormCallBack);
      });
      td.appendChild(btn);
      td.appendChild(small);
    } else {

      var td = document.createElement('td');
      td.innerHTML = "<a target='_blank' href='https://app.sortweb.me/tasks/adminTaskView/" + cell + "'>" + cell + "</a>";

    }

    return td;

  }

  createTicketForm() {

  }

  /**
   * Funcionalidades para o campo observação na tabela 
   */

  observacaoCell(cell, atendimento_id) {

    var td = document.createElement('td');
    var textarea = document.createElement('textarea');
    textarea.value = cell;
    textarea.className = 'form-control border';
    textarea.setAttribute('data-atendimentoid', atendimento_id);
    var span = document.createElement('small');
    span.className = 'text-info';
    td.appendChild(textarea);
    td.appendChild(span);
    textarea.addEventListener('focusin', (e) => {
      var initial_val = e.target.value;
      e.target.setAttribute('data-initial', initial_val);
    });
    textarea.addEventListener('blur', (e) => {
      var blur_initial = e.target.getAttribute('data-initial');
      var blur_now = e.target.value;
      if (blur_initial != blur_now) {
        span.className = 'text-info';
        span.innerHTML = 'Salvando...';

        // fetch para alterar valor da observação
        fetch(`${this.apiURL}api/atendimentos/${atendimento_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type':'application/json'
          },
          body: JSON.stringify({column: "obs", value: blur_now, user_id: this.usuario.id})
        })
        .then((response) => {
          if (!response.ok) {
            return Promise.reject(response);
          }
          return response.json();
        })
        .then((res) => {
          if (res.success) {
            span.className = 'text-success';
            this.emitAtualizaObs({id: atendimento_id, obs: e.target.value});
          }
          span.innerHTML = res.message;
        })
        .catch(async (err) => {
          span.className = 'text-danger';
          if (typeof err.json === "function") {
            const jsonErr = await err.json();
            span.innerHTML = jsonErr.message;
          } else {
            console.log(err);
            span.innerHTML = "Erro no servidor.";
          } 
        })
      }
    }, atendimento_id);
    return td;
  } 

  /**
   * Completa a ultima página com rows vazio pra não quebrar o scroll
   */

  fillerRows(perPage, rowslength, tbody) {

    for (var y = 0; y < (perPage - rowslength); y++) {
      var tr = tbody.insertRow(-1);
      for (var yy = 0; yy < this.columns.length; yy++) {
        var td = document.createElement('td');
        switch (this.columns[yy]) {
          case "Num":
            var td = document.createElement('th');
            td.scope = "row";
            td.innerHTML = 'xx';
            break;
          case "Status":
            var td = document.createElement('td');
            td.innerHTML = '<button disabled="" type="button" class="btn btn-secondary btn-sm d-block">xxxxxx</button>';
            break;
          case "# Ticket":
            var td = document.createElement('td');
            td.innerHTML = '<button disabled="" type="button" class="btn btn-secondary btn-sm d-block">xxxxxx</button>';
            break;
          case "Observação":
            var td = document.createElement('td');
            td.innerHTML = '<textarea disabled="" class="form-control border" data-atendimentoid="22"></textarea>';
            break;
          case "Data - Atendimento":
            var td = document.createElement('td');
            td.innerHTML = 'xx/xx/xxxx';
            break;
          case "Data - Retorno":
            var td = document.createElement('td');
            td.innerHTML = 'xx/xx/xxxx';
            break;
          default:
            var td = document.createElement('td');
            td.innerHTML = 'xxxx';
        }
        tr.appendChild(td);
      }
    }

  }

  /**
   * adiciona linha final com paginação
   */

  setPagination(tbody, totalPages, currentPage, client_id) {

    var tr = tbody.insertRow(-1);
    var th = document.createElement('th');
    th.scope = "row";
    th.innerHTML = "Paginação";
    tr.appendChild(th);

    var td = document.createElement('td');
    td.setAttribute("colspan",7);
    var ul = document.createElement('ul');
    ul.className = "pagination pagination mb-0";
    td.appendChild(ul);

    for (var i = 1; i <= totalPages; i ++) { 

      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "page-link";
      a.href = "#";
      a.innerHTML = i;
      if (i == currentPage) {
        li.className = "page-item active";
      } else {
        li.className = "page-item";
      }

      a.addEventListener("click", async (e) => {
        const pageNum = e.target.innerHTML;
        await this.loadRowsFromDatabase(pageNum, this.perPage, 'desc', client_id);
        this.currentPage = pageNum;
      });

      li.appendChild(a);
      ul.appendChild(li);

    }

    tr.appendChild(td);

  }

  /**
   * Verifica a formatação das horas e corrige, se necessário
   */
  checkDateFormat(date) {

    var rgx = /(\d{4})-(\d{2})-(\d{2})/g;
    var matches = rgx.exec(date);
    var date = date;
    if (matches) {
      date = matches[3] +"/"+matches[2]+"/"+matches[1].substring(2,4);
    }
    return date;

  }

  /**
   * Adiciona linhas através de um array de arrays
   */

  async appendExistingRows(rowsArray, perPage, totalPages, currentPage, client_id = null) {

    var rows = this.checkRows(rowsArray);

    var tbody = document.querySelector('#todo-table > tbody');

    var perPage = parseInt(perPage);
    var totalPages = parseInt(totalPages);
    var currentPage = parseInt(currentPage);

    //se vierem os parametros da paginação, limpo a planilha
    if (!(isNaN(perPage) || isNaN(totalPages) || isNaN(currentPage))) {
      tbody.innerHTML = "";
    } else {
      // se não vierem os parametros, a função está sendo chamado no hook do socket.io
      // só adiciono a nova linha se eu estiver na primeira página
      // se o usuário estiver com um filtro ativo, só adiciono se for referente ao cliente atual
      
      if (this.currentPage != 1) return;
      if (this.currentClientId) {
        if (rowsArray[0].cliente.client_id != this.currentClientId) return;
      }
      // aqui eu vou chamar a função que marca o registro na tela dos usuários, tipo um activity log
    }

    // carrega os status regitrados no banco:
    // se eu já tiver utilizado a fetchStatus(), pego o que tiver na memória
    
    if (this.statuses.length == 0) this.statuses = await this.fetchStatus();

    rows.forEach((row) => {

      if (!(isNaN(perPage) || isNaN(totalPages) || isNaN(currentPage))) {
        var tr = tbody.insertRow(-1);
      } else {
        var tr = tbody.insertRow(0);
      }
      for (const prop in row) {
        switch (prop) {
          case "id":
            var td = document.createElement('th');
            td.scope = "row";
            td.innerHTML = `<span class="d-block">${row[prop].id}</span>`;
            if (row[prop].usuario) {
              td.innerHTML += `<small class="text-primary">${row[prop].usuario}</small>`;
            }
            break;
          case "status":
            var td = this.statusCell(row[prop], row['id'].id);
            break;
          case "ticket":
            var td = this.ticketCell(row[prop], row['id'].id);
            break;
          case "obs":
            var td = this.observacaoCell(row[prop], row['id'].id);
            break;
          case "client":
            var td = document.createElement('td');
            td.innerHTML = row.client.name;
            td.setAttribute('data-client-id', row.client.id);
            break;
          case "data_atendimento":
            var td = document.createElement('td');
            td.innerHTML = this.checkDateFormat(row[prop]);
            break;
          case "data_retorno":
            var td = document.createElement('td');
            td.innerHTML = this.checkDateFormat(row[prop]);
            break;
          default:
            var td = document.createElement('td');
            td.innerHTML = row[prop];
        }
        tr.appendChild(td);
      }
    }, this.statuses);

    if (!(isNaN(perPage) || isNaN(totalPages) || isNaN(currentPage))) {

      //completa rows na última página pra não quebrar o scroll quando clica pra mudar de página
      this.fillerRows(perPage, rows.length, tbody);

      // linha final com a paginação
      var tfoot = tbody.nextElementSibling;
      tfoot.innerHTML = '';

      this.setPagination(tfoot, totalPages, currentPage, client_id);

    }

  }

  /**
   * Helper para verificar se foi passado um selector ou htmlElement válido
   */

  checkSelector(x) {
    // valida a variável btnDOM
    if (typeof x == 'string') {
      var x = document.querySelector(x);
      if (!x) throw new TypeError(`O Seletor deve ser referente a um elemento existente no DOM! ${x}`, 'table.js');
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
      valid: true
    }

    var input = this.checkSelector(input);

    if (input.name == 'ticket' || input.name == 'filter-tickets') {
      var val = input.value.trim();
      if (val[0] == '0') {
        val = val.substring(1,val.length);
      }
      input.value = val;
      if (val != '') {
        if (val.length < 6) {
          // atendimento ref. a OS já existente
          var rgx = /\d+/;
          var match = val.match(rgx);
          if (!(match !== null && match.length == 1 && match == val)) {
            validation.valid = false;
            validation.message = "Digite apenas números no campo <# Ticket>.";
          } else {
            validation.val = val;
          }
        } else {
          validation.valid = false;
          validation.message = "O número do Ticket deve ter menos que 6 dígitos (valor máximo 99999).";
        }
      } else {
        validation.val = '';
      }
    } else
    if (input.name == 'client_id') {
      if (input.value.trim() == '') {
        validation.valid = false;
        validation.message = `O campo Cliente não pode estar vazio.`;
      } else {
        var client_id = input.getAttribute('data-clientid');
        if (!client_id) {
          validation.valid = false;
          validation.message = `O campo Cliente deve estar relacionado a um id válido.`;
        } else {
          validation.val = client_id;
        }
      }
    } else
    if (input.name == 'user_id') {
      if (input.value.trim() == '') {
        validation.valid = false;
        validation.message = `O campo Atendente não pode estar vazio.`;
      } else {
        var usuario_id = input.getAttribute('data-usuarioid');
        if (!usuario_id) {
          validation.valid = false;
          validation.message = `O campo Atendente deve estar relacionado a um id válido.`;
        } else {
          validation.val = usuario_id;
        }
      }
    } else {
      if (input.value != ''){
        validation.val = input.value;
      } else {
        validation.valid = false;
        validation.message = `O campo ${input.name} é de preenchimento obrigatório!`;
      }
    }

    return validation;
  }

  /**
   * Faz o envio do formulário de criação de atendimento
   */

  insertAtendimento(formDOM) {

    var form = this.checkSelector(formDOM);
    var errorWrapper = this.checkSelector('#error-span');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      var atdPayload = {};
      var allValid = true;

      var inputs = document.querySelectorAll('#usuarios_dropdown, #cliente_dropdown, #ticket, #data_atendimento, #data_retorno, #plataforma, #obs');
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
          atdPayload[inputs[x].name] = validation.val;
        }
      }

      if (allValid) {
        errorWrapper.innerHTML = "Campos prenchidos com sucesso. Criando registro...";
        errorWrapper.className = "text-success";

        // adicionar lógica para envio do post

        fetch(this.apiURL + 'api/atendimentos', {
          method: 'POST',
          body: JSON.stringify(atdPayload),
          headers: {
            'content-type': 'application/json',
          },
        })
          .then((response) => {
            if (!response.ok) {
              return Promise.reject(response);
            }
            return response.json();
          })
          .then((res) => {
            if (res.success) {

              this.appendExistingRows([res.atendimento]);

              errorWrapper.className = 'text-info';
              errorWrapper.innerHTML = `<small>Atendimento de ID ${res.atendimento.id.id} adicionado com sucesso.</small>`;

              this.emitAtendimento(res.atendimento);

              e.target.reset();

              this.addFormFunctions(true);

            }
          })
          .catch(async (err) => {
            if (typeof err.json === "function") {
              const jsonErr = await err.json();
              errorWrapper.innerHTML = jsonErr.info ? jsonErr.info : "" + "<small class='text-warning'> Detalhes: " + jsonErr.error + "</small>";
              errorWrapper.className = "text-danger";
            } else {
              console.log("Fetch error", err);
            } 
          });

      } else {
        errorWrapper.className = "text-warning";
      }
    });
  }

  /**
   * Lida com a alteração no nome do usuário (área configurações)
   */

  defineUser(button) {
    var button = this.checkSelector(button);

    button.addEventListener("click", async () => {

      if (this.usuarios.length == 0) this.usuarios = await this.fetchUsuarios();
      var select = this.checkSelector("#defineUsuario");
      if (select.childElementCount == 0) {
        this.setUsuarioFromCookie();
        var small = this.checkSelector(select.nextElementSibling);
        this.usuarios.forEach((usuario) => {
          var option = document.createElement("option");
          if (this.usuario.id == usuario[0]) {
            option.selected = "selected";
          }
          option.innerHTML = usuario[1];
          option.setAttribute('data-usuarioid', usuario[0]);
          select.appendChild(option);
        });
        select.addEventListener("change", (e) => {
          // vou usar um client side cookie pq por enquanto o servidor é reiniciado diariamente.
          const expires = new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toGMTString();
          const planilhaUserId = select.options[ select.selectedIndex ].getAttribute("data-usuarioid");
          const planilhaUserName = select.value;
          document.cookie = `cookie_planilha_usuario=${planilhaUserName}_${planilhaUserId};expires=${expires};path=/;`;
          if (this.setUsuarioFromCookie()) {
            small.innerHTML = "Usuário salvo com sucesso.";
            small.className = "text-success";
          } else {
            small.innerHTML = "Ocorreu um erro ao salvar seu usuário. Verifique a aba Armazenamento no FireFox ou <a href='https://support.google.com/chrome/answer/95647?co=GENIE.Platform%3DDesktop&hl=pt-BR' rel='noopener'>limpe seus cookies no google chrome, e tente novamente.</a>";
            small.className = "text-danger";
          }
        });
      }

      var selectPaginacao = this.checkSelector('#definePaginacao');
      var smallPaginacao = this.checkSelector(selectPaginacao.nextElementSibling);
      if(this.setPerPageFromCookie()) {

        // https://stackoverflow.com/a/37098628/14427854
        var evaluateOption = document.evaluate(`//option[contains(., '${this.perPage}')]`, document, null, XPathResult.ANY_TYPE, null );
        var selectedOption = evaluateOption.iterateNext();
        selectedOption.selected = "selected";

      }
      selectPaginacao.addEventListener("change", (e) => {

        // vou usar um client side cookie pq por enquanto o servidor é reiniciado diariamente.
        const expires = new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toGMTString();
        const paginacaoNum = selectPaginacao.value;
        document.cookie = `cookie_planilha_perpage=${paginacaoNum};expires=${expires};path=/;`;
        if (this.setPerPageFromCookie()) {
          smallPaginacao.innerHTML = "Preferência salva com sucesso.";
          smallPaginacao.className = "text-success";
        } else {
          smallPaginacao.innerHTML = "Ocorreu um erro ao salvar sua configuração. Verifique a aba Armazenamento no FireFox ou <a href='https://support.google.com/chrome/answer/95647?co=GENIE.Platform%3DDesktop&hl=pt-BR' rel='noopener'>limpe seus cookies no google chrome, e tente novamente.</a>";
          smallPaginacao.className = "text-danger";
        }

      })
    });
  }

  /**
   * Puxa o perPage do cookie
   */

  setPerPageFromCookie() {
    const c = document.cookie.match(`(^|;)\\s*cookie_planilha_perpage\\s*=\\s*([^;]+)`);
    if (c) {
      const cookie = c.pop();
      this.perPage = cookie;
      return true;
    }
    // no cookie t_t
    return false
  }

  /**
   * Puxa o username e id do cookie
   */

  setUsuarioFromCookie() {
    const c = document.cookie.match(`(^|;)\\s*cookie_planilha_usuario\\s*=\\s*([^;]+)`);
    if (c) {
      const cookie = c.pop();
      const userData = cookie.split("_");
      this.usuario.id = userData[1];
      this.usuario.username = userData[0];
      return true;
    }
    // no cookie t_t
    return false
  }

  /**
   * Adiciona funcionalidade do filtro por status
   */

  enableStatusFilter() {
    var checkboxes = document.querySelectorAll('#filter-status-aberto, #filter-status-fechado, #filter-status-deletado');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", async (e) => {
        var checked = document.querySelectorAll("#functions-wrapper input:checked");
        var status_ids = [];
        checked.forEach((c) => status_ids.push(c.name.split('-').pop()));
        this.status_ids = status_ids;
        await this.loadRowsFromDatabase(this.pageNum, this.perPage, 'desc', this.currentClientId);
      });
    });
  }

  /**
   * Adiciona funcionalidade do filtro por # de ticket
   */

  async enableTicketsFilter(inputDOM) {
    var input = this.checkSelector(inputDOM);
    var errorSpan = this.checkSelector("#filter-tickets-help");

    // dispara o filtro ao apertar enter
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        this.ticketsFilterFunctionality(e.target);
      }
    });
    input.addEventListener('focusout', (e) => {
      this.ticketsFilterFunctionality(e.target);
    });
  }

  async ticketsFilterFunctionality(input) {
    var ticket_id = input.value.trim();
    var small = input.nextElementSibling;
    var currentPage = this.currentPage;

    // caso a pessoa manter o mesmo valor, não faz nada
    if(this.ticket_id == ticket_id) return;

    //se não tiver valor no input, remove o filtro existente
    if (ticket_id == '') {
      this.ticket_id = '';
      currentPage = 1;
    }

    var validate = this.validateInput(input);

    if (validate.valid) {
      currentPage = 1;
      this.ticket_id = ticket_id;
      if (this.ticket_id == '') {
        small.innerText = 'Filtro removido';
      } else {
        small.innerText = 'Filtro aplicado.';
      }
      small.className = 'form-text text-success';
    } else {
      small.innerText = validate.message;
      small.className = 'form-text text-warning';
    }

    // caso for uma consulta válida ou remoção de filtro, preciso voltar pra pg 1, se não, mantenho na mesma página
    await this.loadRowsFromDatabase(currentPage, this.perPage, 'desc', this.currentClientId, this.status_ids, this.ticket_id);
  }

  /**
   * Filtro por descrição
   */

  async descriptionFilterFunctionality(input) {
    var description = encodeURIComponent(input.value.trim());
    var small = input.nextElementSibling;
    var currentPage = this.currentPage;

    // caso a pessoa manter a mesma busca, não faz nada
    if(this.description == description) return;

    //se não tiver valor no input, remove o filtro existente
    if (description == '') {
      this.description = '';
      currentPage = 1;
    }

    // caso for uma busca válida ou remoção de filtro, preciso voltar pra pg 1, se não, mantenho na mesma página
    
    currentPage = 1;
    this.description = description;
    if (this.description == '') {
      small.innerText = 'Filtro removido';
    } else {
      small.innerText = 'Filtro aplicado.';
    }
    small.className = 'form-text text-success';

    await this.loadRowsFromDatabase(currentPage, this.perPage, 'desc', this.currentClientId, this.status_ids, this.ticket_id, this.description);
  }

  /**
   * Adiciona funcionalidade de busca por descrição de atendimento
   */

  async enableDescriptionFilter(textareaDOM) {
    var textarea = this.checkSelector(textareaDOM);
    var errorSpan = this.checkSelector("#filter-description-help");

    // dispara o filtro ao apertar enter
    textarea.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        this.descriptionFilterFunctionality(e.target);
      }
    });
    textarea.addEventListener('focusout', (e) => {
      this.descriptionFilterFunctionality(e.target);
    });
  }

  /**
   * Adiciona funcionalidade do filtro por cliente
   */

  async enableClientFilter(inputDOM) {
    var input = this.checkSelector(inputDOM);
    var errorSpan = this.checkSelector("#filter-clientes-help");

    // seleciona o primeiro resultado ao apertar enter
    var suggestions_list = this.checkSelector(input.nextElementSibling);
    input.addEventListener('keyup', function(e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        if (suggestions_list.children[0]) {
          suggestions_list.children[0].click();
        }
      }
    });

    // habilita auto complete no filtro por clientes (atendimentos já abertos)
    if (this.clientesAtendimentos.length == 0) this.clientesAtendimentos = await this.fetchClientsAtendimentos();
    this.autoComplete(input, this.clientesAtendimentos, 'clientfilter');
    input.addEventListener('change', async(e) => {
      if (e.target.value == '') {

        e.target.disabled = true;
        errorSpan.innerHTML = "Removendo filtro...";
        errorSpan.className = "text-info";
        this.currentClientId = 0;
        await this.loadRowsFromDatabase(this.pageNum, this.perPage, 'desc');
        e.target.disabled = false;
        errorSpan.innerHTML = "Filtro removido.";
        errorSpan.className = "text-success";

      }
    });
    var observer = new MutationObserver(async (mutations) => {
      for (var x = 0; x < mutations.length; x ++) {
        if (mutations[x].type == "attributes") {

          if (mutations[x].attributeName == 'data-clientfilterid') {
            let client_id = mutations[x].target.getAttribute('data-clientfilterid');
            if (client_id == null) client_id = '';
            if (client_id != '') {

              mutations[x].target.disabled = true;
              errorSpan.innerHTML = "Filtrando...";
              errorSpan.className = "text-info";
              this.currentClientId = client_id;
              await this.loadRowsFromDatabase(this.pageNum, this.perPage, 'desc', client_id);
              mutations[x].target.disabled = false;
              errorSpan.innerHTML = "Filtro aplicado.";
              errorSpan.className = "text-success";

            }
          }

        }
      }
    }, this);
    observer.observe(input, {
      attributes: true //configure it to listen to attribute changes
    });
  }

  /**
   * Habilita o funcionalidades do form de criar novo atendimento
   * formReset = bool
   */

  async addFormFunctions(formReset = false) {

    var inputs = document.querySelectorAll('#usuarios_dropdown, #cliente_dropdown, #ticket, #data_atendimento, #data_retorno, #plataforma, #obs');
    inputs[1].setAttribute('data-clientid', '');
    inputs.forEach((i) => {
      if (i.classList.contains('is-valid')) {
        i.classList.remove('is-valid');
      }
    });

    var date = new Date();
    var todayDate = date.toISOString().split('T')[0]

    var data_atendimento = this.checkSelector("#data_atendimento");
    data_atendimento.value = todayDate;

    var usuarios_input = this.checkSelector('#usuarios_dropdown');
    // se o this.usuario.id não estiver carregado, tento puxar do cookie.
    // se mesmo assim não estiver, desisto
    if (this.usuario.id) {
      usuarios_input.setAttribute('data-usuarioid', this.usuario.id);
      usuarios_input.value = this.usuario.username;
    } else {
      if (this.setUsuarioFromCookie()) {
        usuarios_input.setAttribute('data-usuarioid', this.usuario.id);
        usuarios_input.value = this.usuario.username;
      }
    }

    if (!formReset) {
      var data_retorno = this.checkSelector("#data_retorno");
      data_retorno.min = todayDate;

      // adiciona autoComplete no input "cliente": se eu já tiver utilizado a fetchClients(), pego o que tiver na memória
      var cliente_input = this.checkSelector('#cliente_dropdown');
      if (this.clients.length == 0) this.clients = await this.fetchClients();
      this.autoComplete(cliente_input, this.clients, 'client');

      // adiciona autoComplete no input "atendente": se eu já tiver utilizado a fetchUsuarios(), pego o que tiver na memória
      if (this.usuarios.length == 0) this.usuarios = await this.fetchUsuarios();
      this.autoComplete(usuarios_input, this.usuarios, 'usuario');

      var filter_input = this.checkSelector("#filter-clientes");

      // clica nos elementos pra habilitar o uso das setas nos dropdowns...
      filter_input.click();
      usuarios_input.click();
      cliente_input.click();
    }

  }

  /**
   *Habilita autocomplete no campo
   * campo = HTMLElement ou css selector
   * data = 
   */

  autoComplete(campo, data, identificador) {

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

      e.target.setAttribute(`data-${identificador}id`, "");
    
      if (suggestions_list.classList.contains('show')) {
        e.target.classList.remove('show');
        suggestions_list.classList.remove('show');
      }
      if (incoming == '') return;

      if (identificador == 'usuario') {
        var suggestions = data.filter(usuario => usuario[1].includes(incoming));
      } else {
        var suggestions = data.filter(client => client[1].includes(incoming.toUpperCase()));
      }
      if (suggestions.length > 0) {

        e.target.setAttribute('aria-expanded', true);

        var divider = document.createElement('div');
        divider.classname = 'dropdown-divider';

        suggestions.forEach((sug) => {

          var a = document.createElement('a');
          a.href = "javascript:void(0)";
          a.className = 'dropdown-item';
          a.setAttribute(`data-${identificador}id`, sug[0]);
          a.innerHTML = sug[1];

          a.addEventListener('click', (ev) => {
            e.target.value = ev.target.textContent;
            e.target.setAttribute(`data-${identificador}id`, ev.target.getAttribute(`data-${identificador}id`));
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
   * Previne submissão de forms
   */

  preventFormSubmit(formDOM) {
    const form = this.checkSelector(formDOM);
    form.addEventListener('submit', function(e) {
      e.preventDefault();
    });
  }

  /**
   * Sobrescreve o comando ctrl f para uso na busca por descrição
   */

  focusOnDescriptionFilter(e, textarea) {
    if (e.ctrlKey && e.keyCode == 70) {
        e.preventDefault();
        textarea.focus();
    }
  }

  /**
   * Remove filtros ao pressionar esc duas vezes.
   * Ao apertar a primeira vez, mostra aviso.
   */

  removeAllFilters(e, alertSection) {
    // tecla esc não deve triggar remoção de filtro se algum modal estiver aberto
    if (e.key == 'Escape' && !document.body.classList.contains('modal-open')) {
      this.confirmRemoveAllFilters();
    }
  }

  confirmRemoveAllFilters() {

    if 
    (
      (this.ticket_id == '') &&
      (this.description == '') &&
      ( (this.currentClientId == 0) || (this.currentClientId == null) ) &&
      (this.status_ids.join() == [1, 2].join())
    ){
      //se nenhum filtro estiver marcado, não faço nada
      return;
    }

    if (this.escapeKeyPressed == 1) {
      // segundo aperto na tecla esc, remover filtros
      this.ticket_id = '';
      var tickets_input = this.checkSelector('#filter-tickets');
      tickets_input.value = '';
      tickets_input.nextElementSibling.innerText = '';

      this.description = '';
      var description_input = this.checkSelector('#filter-description');
      description_input.value = '';
      description_input.nextElementSibling.innerText = '';

      this.currentClientId = null; 
      var currentClientInput = this.checkSelector('#filter-clientes');
      currentClientInput.value = '';
      currentClientInput.nextElementSibling.nextElementSibling.innerText = '';

      this.status_ids = [1, 2];
      this.checkSelector('input[name="filter-status-1"]').checked = true;
      this.checkSelector('input[name="filter-status-2"]').checked = true;
      this.checkSelector('input[name="filter-status-3"]').checked = false;

      this.escapeKeyPressed = 0;
      alertSection.innerText = 'Filtros removidos com sucesso!';

      // pega novamente atendimentos do banco
      this.loadRowsFromDatabase(1, this.perPage, 'desc');
      return;
    }

    this.escapeKeyPressed = 1;
    alertSection.classList.add('show');   
    window.setTimeout((e) => {
      this.escapeKeyPressed = 0;
      alertSection.classList.remove('show');
      window.setTimeout(function() {
        alertSection.innerHTML = 'Aperte <kbd>ESC</kbd> novamente para limpar os filtros.';
      }, 150);
    }, 2000);

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

  // método para agilizar depuração
  createAtendimento () {

    var form = document.querySelector('#new-atendimento')
    var inputs = form.querySelectorAll('input');
    var textarea = form.querySelector('textarea');
    var submitBtn = document.querySelector('#addRowBtn');
    inputs.forEach((input) => {
      if (input.name == 'user_id') return;
      if (input.name == 'client_id') {
        input.setAttribute('data-clientid', 219);
        input.value = 'JANTARA';
      }
      if (input.name == 'data_retorno') {
        input.value = '2021-08-28';
      }
      if (input.name == 'plataforma') {
        input.value = 'Depuração';
      }
    });
    textarea.value = 'Teste de registro via socket.io';
    submitBtn.click();

  }
}
