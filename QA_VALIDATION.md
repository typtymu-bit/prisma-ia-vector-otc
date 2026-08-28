# Validação visual — Prisma IA Vector OTC

A prévia desktop em 1440 × 900 foi revisada após a hidratação dos dados. O terminal exibe corretamente a identidade Prisma IA, a barra lateral de ativos, o gráfico de 60 velas com a linha laranja (EMA 9) e a linha azul (EMA 21), a área de sinal de reversão, o checklist de bloqueios e o cartão de operação em modo demo.

A tela apresenta dados de simulação enquanto `OPTGO_BROKER_SSID` não é configurado no ambiente do servidor. O indicador de fonte deixa esse estado explícito e a área de execução permanece restrita ao registro demonstrativo. Não há espera artificial de cinco segundos no cliente: a consulta ocorre ao abrir e é repetida em intervalo de um segundo.

Nenhum problema de hierarquia visual, contraste ou corte foi observado na viewport verificada.

A prévia móvel em 390 × 844 também foi revisada após a hidratação. O cabeçalho, a troca entre Terminal e Scanner, a seleção rápida de ativos, o gráfico com duas linhas e a disposição vertical dos cartões mantêm legibilidade sem rolagem horizontal. O gráfico ajusta a densidade das velas e preserva as cores de sinalização em telas estreitas.

A navegação do módulo Scanner foi verificada na prévia do navegador. O estado vazio explica a função do scanner e oferece o botão de varredura, sem quebrar a navegação do terminal. A execução de varredura fica disponível para testar quando a fonte de dados estiver configurada.

Observação de ambiente: as mensagens 403 visíveis no log são chamadas automáticas de identificação de sessão sem cookie na prévia; o app continua renderizando e os dados simulados carregam corretamente.

A varredura simulada foi executada com sucesso e retornou dez estruturas ordenadas por qualidade. A seleção de um resultado (Apple OTC) voltou ao Terminal, carregou o gráfico e atualizou preço, EMA 9, EMA 21 e checklist para o ativo selecionado.
