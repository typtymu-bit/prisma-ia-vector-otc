# Prisma IA Vector OTC — acompanhamento

- [x] Auditar o arquivo original e identificar a lógica real de força Touros × Ursos.
- [x] Remover RSI, Bollinger e camadas antigas do motor ativo; manter EMA 9/21 e reversão por vela sem rompimento.
- [x] Adicionar pressão estimada Big Players usando microvelas reais de 1 segundo.
- [x] Adicionar quatro linhas: EMA 9, EMA 21, suporte horizontal e resistência horizontal.
- [x] Recalcular zonas horizontais automaticamente com novos candles reais sem repintar o sinal fechado.
- [x] Adicionar todos os 27 ativos OTC encontrados no arquivo original, com IDs reais.
- [x] Reutilizar uma conexão WebSocket persistente e reduzir as janelas do cliente para atualização rápida.
- [x] Resetar análise e microvelas ao trocar de ativo.
- [x] Adicionar entrada automática limitada ao modo DEMO, desligada por padrão e uma vez por vela.
- [x] Validar testes, TypeScript, build e prévia responsiva.
- [x] Manter execução real desligada sem configuração explícita e confirmação do usuário.
