## DB MIGRATIONS

status do atendimento:

```sql
CREATE TABLE status (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255), PRIMARY KEY(id));
ALTER TABLE atendimentos ADD COLUMN status_id INT NOT NULL DEFAULT 1 AFTER id;
INSERT INTO status (name) VALUES ('aberto'), ('fechado');
ALTER TABLE atendimentos ADD FOREIGN KEY(status_id) REFERENCES status(id);
```

### Implementar

- Adicionar campo com o nome do atendente (deixar pré-populado via cookie/sessão);
- utilizar esquema de popup.
- Filtro por nome de cliente;
- Agora que a lista mostra os clientes inativos, avisar na hora de criar OS
  o status do cliente;
- Remover atendimento / editar atendimento inteiro ?
- Adicionar tabela atendimentos\_status, com registro (data e hora) de quando cada atendimento foi aberto / reaberto / deletado.
- Esquema para "travar" o texto de um status passado. Por ex, quando um atendimento for fechado, o texto dele "aberto" não pode mais ser alterado. Se a pessoa quiser adicionar informações, tem que abrir novamente.
- Permitir escrever nas observações apenas para atendimentos em aberto.

#### GLITCHES
Resolvido, colocando o form de inserção no cabeçalho.
![ordem de inserção por outros usuários](readme/ordem_insercoes.png)

##### Já feito

- Aceitar número de OS;
- Adicionar campo que diz se o atendimento já foi concluído -> Campo "Conclusão": optei por colocar um dropdown com status do atendimento, assim posso criar mais status no futuro;
- Pop up para confirmar deleção de atendimento;
- Paginação, mais novos por último, botão de novo atendimento em cima.
