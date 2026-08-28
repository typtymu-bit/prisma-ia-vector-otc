# Validação visual — Prisma IA Vector OTC

A prévia desktop em 1440 × 900 foi revisada após a hidratação dos dados. O terminal exibe corretamente a identidade Prisma IA, a barra lateral de ativos, o gráfico de candles com a linha laranja (EMA 9) e a linha azul (EMA 21), a área de sinal de reversão, o checklist de bloqueios e o cartão de operação DEMO.

A prévia móvel em 390 × 844 também foi revisada após a hidratação. O cabeçalho, a troca entre Terminal e Scanner, a seleção rápida de ativos, o gráfico com duas linhas e a disposição vertical dos cartões mantêm legibilidade sem rolagem horizontal.

A navegação do módulo Scanner foi verificada na prévia do navegador. O estado vazio explica a função do scanner e oferece o botão de varredura; a varredura retornou dez estruturas reais, ordenadas por qualidade. A seleção de um resultado (Apple OTC) voltou ao Terminal e atualizou preço, EMA 9, EMA 21 e checklist para o ativo selecionado.

## Atualização de feed real

Em 28/08/2026, o preview confirmou a conexão real com a OPTGO: o cabeçalho mostrou “Feed real OPTGO”, o gráfico mostrou 60 candles reais de 1 minuto, a legenda exibiu `60s` e a latência observada foi de 897 ms e depois 574 ms. O preço vivo mudou entre as duas capturas sem substituir a periodicidade do gráfico.

A análise é recalculada somente quando o timestamp da vela 1M muda; o preço/tick é atualizado separadamente a cada segundo e apenas atualiza visualmente a vela aberta. Na segunda captura, o Vector mostrou CALL com 98% e razões de rejeição da vela fechada.

A simulação foi removida: se a corretora falhar, o painel mostra `SEM DADOS REAIS` e não desenha velas fictícias. As mensagens 403 de sessão sem cookie pertencem à identificação automática do preview e não impedem o feed público da tela.
