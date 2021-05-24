class Socket {

  constructor() {
    this.socket = io();
    this.userCounter = document.querySelector('#active-users-count');

  }

  setHandlers() {
    this.socket.on('user count', this.updateUserCounter(total));
  }

  /**
  * Atualizar contagem de usuários online
  */
  
  updateUserCounter(total) {
    this.userCounter.innerHTML = total;
  }

}
