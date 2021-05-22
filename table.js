class Table {
  constructor(columns, parentSelector, rows) {
    this.columns = this.checkCols(columns);
    this.parentElement = this.checkParentSelector(parentSelector);
    this.rows = this.checkRows(rows);
  }
  checkCols(columns) {
    if (!Array.isArray(columns)) {
      throw new TypeError('columns deve ser um array');
    } else {
      return columns;
    }
  }
  checkParentSelector(parentSelector) {
    const parentElement = document.querySelector(parentSelector);
    if (!parentElement) {
      throw new Error("A tabela deve ser anexada à um elemento existente no DOM.");
    } else {
      return parentElement;
    }
  }
  checkRows(rows) {
    if (!Array.isArray(columns)) {
      throw new TypeError('columns deve ser um array');
    }
    rows.forEach((row) => {
      if (row.length != this.columns.length) {
        throw new Error('as linhas devem ter a mesma quantidade de colunas que o cabeçalho!');
      }
    });
    return rows;
  }
  createTable() {

    var table = document.createElement('table');
    table.setAttribute('id', 'todo-table');

    var caption = document.createElement('caption');
    caption.innerHTML = 'Atendimentos';
    table.appendChild(caption);

    var header = document.createElement('thead');
    var tr = header.insertRow(-1);

    this.columns.forEach((col) => {
      var th = document.createElement('th');
      th.innerHTML = col;
      tr.appendChild(th);
    });

    table.appendChild(header);
    this.parentElement.appendChild(table);
  }
}

// function Table(columns) {
// 
//   this.columns = columns;
//   this.checkCols() {
//     return Array.isArray(this.columns);
//   },
//   createTable() {
//     if (this.checkCols()) {
//         console.log('i can return yes');
//     } else {
//       console.error('wrong argument type');
//     }
//   },
// }

// Table.prototype.checkCols = function() {
//   return Array.isArray(this.columns);
// }
// 
// Table.prototype.createTable = function() {
//   if (this.checkCols()) {
//     console.log('i can return yes');
//   } else {
//     console.error('wrong argument type');
//   }
// }
