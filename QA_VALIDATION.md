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


## Correção de atualização rápida

Após a última alteração, o terminal foi validado com snapshot de 1 segundo e tick de 500 ms, reaproveitando a mesma conexão persistente do WebSocket. A prévia mostrou feed real OPTGO, preço vivo, sinal PUT, quatro linhas e o nível horizontal de resistência no checklist. A análise continua congelada na vela fechada e o preço vivo somente movimenta a visualização, evitando o atraso visual sem repintura do sinal.


## Correção solicitada: quatro linhas horizontais

A análise do `src/lib/analysis.ts` foi refeita sem EMA, RSI ou Bollinger. Agora as quatro linhas são zonas horizontais reais derivadas dos swings e clusters OHLC: suporte 1, suporte 2, resistência 1 e resistência 2. A vela candidata é comparada às zonas formadas antes dela; assim, uma vela que fecha além do nível é bloqueada e não gera compra/venda. O gráfico e as legendas foram atualizados para essas quatro linhas.

A lista lateral, seletor móvel e scanner usam os 27 ativos do arquivo original sem corte artificial. Não há geração de candles fictícios: quando a corretora não responde, o painel permanece sem dados reais.


## Atualização sem espera do polling

O terminal agora usa o timestamp do tick real de 1 segundo para agrupar a vela. Quando o primeiro tick entra em um novo minuto, o frontend cria imediatamente a vela em formação localmente, atualiza o preço e dispara a análise da vela anterior. Isso evita esperar a próxima resposta completa de candles de 1 minuto para mostrar o nascimento. A validação final passou com 12 testes, checagem TypeScript e build.


## Pullback e falso rompimento

A análise agora identifica falso rompimento usando duas velas: a primeira rompe a zona e a seguinte retorna para dentro. Rompimento falso de suporte com retorno gera R1/compra; rompimento falso de resistência com retorno gera R2/venda. Se o preço permanece fora da zona, o sinal continua bloqueado. Foram adicionados cenários de teste para os dois lados; a suíte final passou com 14 testes.
