# Validação visual — Prisma IA Vector OTC

A prévia desktop em 1440 × 900 foi revisada após a hidratação dos dados. O terminal exibe corretamente a identidade Prisma IA, a barra lateral de ativos, o gráfico de candles com a linha laranja (EMA 9) e a linha azul (EMA 21), a área de sinal de reversão, o checklist de bloqueios e o cartão de operação DEMO.

A prévia móvel em 390 × 844 também foi revisada após a hidratação. O cabeçalho, a troca entre Terminal e Scanner, a seleção rápida de ativos, o gráfico com duas linhas e a disposição vertical dos cartões mantêm legibilidade sem rolagem horizontal.

A navegação do módulo Scanner foi verificada na prévia do navegador. O estado vazio explica a função do scanner e oferece o botão de varredura; a varredura retornou dez estruturas reais, ordenadas por qualidade. A seleção de um resultado (Apple OTC) voltou ao Terminal e atualizou preço, EMA 9, EMA 21 e checklist para o ativo selecionado.

## Atualização de feed real

Em 28/08/2026, o preview confirmou a conexão real com a OPTGO: o cabeçalho mostrou “Feed real OPTGO”, o gráfico mostrou 60 candles reais de 1 minuto, a legenda exibiu `60s` e a latência observada foi de 897 ms e depois 574 ms. O preço vivo mudou entre as duas capturas sem substituir a periodicidade do gráfico.

A análise é recalculada somente quando o timestamp da vela 1M muda; o preço/tick é atualizado separadamente a cada segundo e apenas atualiza visualmente a vela aberta. Na segunda captura, o Vector mostrou CALL com 98% e razões de rejeição da vela fechada.

A simulação foi removida: se a corretora falhar, o painel mostra `SEM DADOS REAIS` e não desenha velas fictícias. As mensagens 403 de sessão sem cookie pertencem à identificação automática do preview e não impedem o feed público da tela.

A captura automática feita no instante do checkpoint pegou a inicialização antes da reconexão da sessão e mostrou `Feed real indisponível`; isso foi registrado como estado transitório e será confirmado após a janela de reconexão, sem considerar essa captura isolada como falha definitiva.

## Observação após reinicialização do preview

Após o checkpoint, uma nova sessão do preview conseguiu listar os ativos OTC, mas a requisição de candles retornou timeout de 8 segundos. O painel não exibiu dados fictícios: mostrou `SEM DADOS REAIS` e a mensagem da corretora. A conexão real tinha sido confirmada anteriormente no mesmo ambiente, indicando que o broker pode recusar ou atrasar uma nova sessão após reinicializações; essa condição precisa de reconexão/retry controlado antes de considerar a entrega estável.

Após adicionar retry de reconexão limitado, uma nova captura confirmou a recuperação automática: o cabeçalho voltou a mostrar `Feed real OPTGO`, apareceram 60 candles reais de 1 minuto, o preço vivo voltou a ser exibido e a latência foi de 1.960 ms. O primeiro estado transitório continua sem simulação e a segunda tentativa recupera a sessão real.

A validação final após a correção de UX confirmou o fluxo completo: durante a inicialização o cabeçalho mostra `Conectando feed real`; depois do retry mostra `Feed real OPTGO`, lista os ativos, preço vivo de 1 segundo (`1.16687` na captura), 60 candles reais de 1 minuto, EMA 9/21 e latência real de 2.957 ms. O estado de análise permaneceu separado da vela aberta.
