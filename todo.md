# Prisma IA Vector OTC — acompanhamento

- [x] Auditar o arquivo original e identificar a lógica real de força Touros × Ursos.
- [x] Remover EMA, RSI, Bollinger e camadas antigas do motor ativo.
- [x] Criar quatro níveis horizontais reais: dois suportes e duas resistências.
- [x] Aplicar R1 isolada para compra e R2 isolada para venda.
- [x] Bloquear rompimento confirmado.
- [x] Detectar falso rompimento com pullback para dentro da zona.
- [x] Validar gap: não sinalizar enquanto a vela ficar do lado errado; aguardar fechamento.
- [x] Gerar compra somente com fechamento de retorno acima do suporte.
- [x] Gerar venda somente com fechamento de retorno abaixo da resistência.
- [x] Usar ticks reais para nascer a nova vela no primeiro segundo do minuto.
- [x] Manter os 27 ativos OTC no menu e scanner.
- [x] Manter execução real desligada sem configuração explícita e confirmação do usuário.
- [x] Validar 14 testes, TypeScript e build.
