# Prisma IA Vector OTC — acompanhamento

- [x] Manter os IDs OPTGO originais dos 12 pares e 10 ações solicitados.
- [x] Validar timestamps exclusivos e intervalo de 60 segundos.
- [x] Validar OHLC coerente em cada candle.
- [x] Rejeitar feed plano ou duplicado para não desenhar quatro linhas no mesmo preço.
- [x] Mostrar indisponibilidade em vez de reutilizar dados de outro ativo.
- [x] Preservar R1 compra, R2 venda, pullback e bloqueio por rompimento.
- [x] Validar 14 testes, TypeScript e build.
