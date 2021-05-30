# Atendimento To-Do!

Planilhas dinâmicas para registro de atendimentos do suporte - Astrusweb.

Objetivos:

1. Agilizar registros de atividades do suporte técnico.
2. Facilitar consulta interna das atividades delegadas para a equipe de desenvolvimento.
3. Contabilizar tempo dedicado no atendimento ao cliente.
4. Integrar com o software Sortweb, buscando melhor prestação de contas do direcionamento do tempo útil da equipe.

Informações técnicas:

- Backend em [node.js](https://nodejs.org/) v15.14.0
- Roteamento e api em [express.js](https://expressjs.com/) v4.17.1
- [socket.io](https://socket.io/) v4.1.2 para manter planilhas sincronizadas entre usuários.
- Banco de dados mysql 5.7, através do [mysql2](https://www.npmjs.com/package/mysql2) v2.2.5
- Lógica do frontend desenvolvido em notação ES6, recomendado uso de navegadores firefox e chrome.
- Estilização e UX em [bootstrap](https://getbootstrap.com/) com o tema [cyborg](https://bootswatch.com/cyborg/)


## GLITCHES

*Pendentes*

- Aplica o filtro com o perPage em 10, num cliente que tem 30 entradas. Altera o perPage pra 100 e clica na terceira página => cai numa página com 100% filler rows.
- Quando um usuário estiver utilizado o filtro, ele já carregou os clientes com atendimento no cache. Se for criado um atendimento pra um cliente diferente dos que existiam, ele não vai aparecer na listagem de clientes pra filtro até que o usuário atualize a página.

*Resolvidos*

- inserção de linhas quando usuário está com o form aberto: resolvido, colocando o form de inserção no cabeçalho.
![ordem de inserção por outros usuários](readme/ordem_insercoes.png)

## Alterações (To-do list da to-do list!)

Implementar

- utilizar esquema de popup.
- Agora que a lista mostra os clientes inativos, avisar na hora de criar OS
  o status do cliente;
- Remover atendimento / editar atendimento inteiro ?
- Adicionar tabela atendimentos\_status, com registro (data e hora) de quando cada atendimento foi aberto / reaberto / deletado.
- Esquema para "travar" o texto de um status passado. Por ex, quando um atendimento for fechado, o texto dele "aberto" não pode mais ser alterado. Se a pessoa quiser adicionar informações, tem que abrir novamente.
- Permitir escrever nas observações apenas para atendimentos em aberto.
- Campo "Conclusão": adicionar um comentário na hora de fechar o atendimento.

Já feito

- Aceitar número de OS;
- Adicionar campo que diz se o atendimento já foi concluído: optei por colocar um dropdown com status do atendimento, assim posso criar mais status no futuro;
- Pop up para confirmar deleção de atendimento;
- Paginação, mais novos por último, botão de novo atendimento em cima.
- Adicionar campo com o nome do atendente (deixar pré-populado via cookie/sessão): optei por um cookie js até que seja definido a forma como vai ser autenticado nos envios pro sortweb. Depois, posso pensar em um sistema de login pra gerar uma chave no sort, algo do tipo.
- Filtro por nome de cliente;

#### DB MIGRATIONS

status do atendimento:

```sql
CREATE TABLE status (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255), PRIMARY KEY(id));
ALTER TABLE atendimentos ADD COLUMN status_id INT NOT NULL DEFAULT 1 AFTER id;
INSERT INTO status (name) VALUES ('aberto'), ('fechado');
ALTER TABLE atendimentos ADD FOREIGN KEY(status_id) REFERENCES status(id);
```

table usuarios:

```sql
CREATE TABLE usuarios (id INT NOT NULL AUTO_INCREMENT, sort_id INT NOT NULL, username VARCHAR(13) NOT NULL, role VARCHAR(25) NOT NULL, active TINYINT NOT NULL DEFAULT 1, PRIMARY KEY(id));
ALTER TABLE atendimentos ADD COLUMN user_id INT(11) AFTER id;
ALTER TABLE usuarios ADD UNIQUE (sort_id);
ALTER TABLE atendimentos ADD FOREIGN KEY(user_id) REFERENCES usuarios(sort_id);
INSERT INTO usuarios (sort_id, username, role) VALUES ("16","jantara","programador"), ("50","murilo","programador"), ("55","gustavo","programador"), ("69","mlucas","programador"), ("70","gabrielb","programador"), ("84","guilhermea","suporte"), ("104","felipe","programador"), ("105","andressa","suporte");
```
