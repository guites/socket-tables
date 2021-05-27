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
- Paginação, mais novos por último, botão de novo atendimento em cima.
- Filtro por nome de cliente;
- Agora que a lista mostra os clientes inativos, avisar na hora de criar OS
  o status do cliente;
- Remover atendimento / editar atendimento inteiro ?

#### GLITCHES
![ordem de inserção por outros usuários](readme/ordem_insercoes.png)

##### Já feito

- Aceitar número de OS;
- Adicionar campo que diz se o atendimento já foi concluído -> Campo "Conclusão": optei por colocar um dropdown com status do atendimento, assim posso criar mais status no futuro
