# Validação — Prisma IA Vector OTC

## Restauração do arquivo original

O arquivo enviado foi auditado. Ele calculava a força Touros × Ursos somando o deslocamento dos corpos das microvelas reais de 1 segundo; não havia uma fonte de book ou fluxo institucional de Big Players. Também havia EMAs e linhas de grade no SVG, mas não níveis horizontais persistentes de suporte e resistência.

## Implementação restaurada

O projeto agora expõe as microvelas 1S reais no contrato de tick, calcula a pressão estimada Big Players no cliente e recalcula níveis horizontais de suporte e resistência a partir de swings e clusters dos candles reais. Os níveis são atualizados quando chega uma nova vela 1M e aparecem no gráfico com etiquetas SUPORTE e RESISTÊNCIA.

Foi incluída uma opção de entrada automática por sinal confirmado, desligada por padrão e limitada ao registro DEMO. Há uma chave por ativo e vela para impedir múltiplos registros na mesma vela. Nenhuma ordem real é enviada por esse fluxo.

## Verificações

| Verificação | Resultado |
|---|---|
| `pnpm test` | 5 arquivos e 11 testes aprovados |
| `pnpm check` | TypeScript aprovado |
| `pnpm build` | Build de produção aprovado |
| Prévia desktop | Cartão Big Players, legenda dos níveis horizontais e layout renderizados |
| Prévia móvel 390 × 844 | Gráfico real, força estimada, suporte/resistência, sinal e execução DEMO sem overflow |

## Observação de segurança

“Big Players” é um nome visual para pressão estimada a partir do OHLC de microvelas. O feed consultado não fornece identificação de participantes, ordens institucionais ou book; portanto o painel não deve ser interpretado como leitura direta de grandes players.


## Lista ampliada e quatro linhas

A prévia hidratada mostrou o feed real OPTGO, o ativo EUR/USD OTC e a lista lateral ampliada com AUD/JPY e USD/JPY, confirmando que os ativos do arquivo original estão disponíveis para seleção. O gráfico exibiu simultaneamente EMA 9 laranja, EMA 21 azul, suporte horizontal amarelo e resistência horizontal lilás, com seus valores no rodapé e etiquetas no gráfico. As zonas são recalculadas a cada atualização real do snapshot, enquanto o sinal continua baseado na vela fechada para evitar repintura.
