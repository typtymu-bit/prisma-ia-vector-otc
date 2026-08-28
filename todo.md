# Prisma IA Vector OTC — acompanhamento

- [x] Auditar o arquivo original e identificar a lógica real de força Touros × Ursos.
- [x] Remover EMA, RSI, Bollinger e camadas antigas do motor ativo.
- [x] Criar quatro níveis horizontais reais: dois suportes e duas resistências.
- [x] Bloquear compra/venda quando a vela fechar rompendo o nível.
- [x] Adicionar pressão estimada Big Players usando microvelas reais de 1 segundo.
- [x] Atualizar zonas automaticamente com novos candles reais sem repintar o sinal fechado.
- [x] Adicionar todos os 27 ativos OTC encontrados no arquivo original, com IDs únicos.
- [x] Liberar todos os ativos no seletor móvel e no scanner.
- [x] Reutilizar uma conexão WebSocket persistente e reduzir as janelas do cliente para atualização rápida.
- [x] Adicionar entrada automática limitada ao modo DEMO, desligada por padrão e uma vez por vela.
- [x] Validar testes, TypeScript, build e prévia responsiva.
- [x] Manter execução real desligada sem configuração explícita e confirmação do usuário.
