# Prisma IA Vector OTC — acompanhamento

- [x] Auditar o arquivo original e identificar a lógica real de força Touros × Ursos.
- [x] Remover EMA, RSI, Bollinger e camadas antigas do motor ativo.
- [x] Criar quatro níveis horizontais reais: dois suportes e duas resistências.
- [x] Aplicar R1 isolada para compra e R2 isolada para venda.
- [x] Bloquear compra/venda quando a vela fechar rompendo o nível.
- [x] Adicionar pressão estimada Big Players usando microvelas reais de 1 segundo.
- [x] Usar o timestamp do tick para nascer a nova vela localmente no primeiro segundo do minuto.
- [x] Atualizar zonas automaticamente sem repintar o sinal da vela fechada.
- [x] Adicionar todos os 27 ativos OTC no menu e scanner.
- [x] Manter execução real desligada sem configuração explícita e confirmação do usuário.
- [x] Validar 12 testes, TypeScript e build.
