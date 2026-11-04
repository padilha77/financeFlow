# Dashboard: guia de uso e estudo

Esta versão adiciona uma interface completa em HTML, CSS e JavaScript nativos. O Spring Boot serve os arquivos em `src/main/resources/static`. O banco e os endpoints Java permanecem os mesmos.

## Abrir no seu computador

Com o PostgreSQL iniciado, no PowerShell, na pasta do projeto:

```powershell
docker compose up -d --wait db
$env:PORT = "18081"
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.addResources=true"
```

Abra `http://localhost:18081/`. Mantenha uma única instância da aplicação nessa porta. Se ela já estiver em execução com `addResources=true`, basta atualizar o navegador com Ctrl + F5 depois de baixar os arquivos.

## Baixar esta versão pelo Git

No terminal do VS Code, na pasta do projeto:

```powershell
git stash push -u -m "backup do front antes do novo visual" -- README.md src/main/resources/static
git fetch origin
git switch feat/dashboard-visual
git pull --ff-only origin feat/dashboard-visual
```

O primeiro comando guarda como backup as alterações locais do README e do frontend, incluindo arquivos novos; a instalação local da skill permanece fora desse backup. Se aparecer `No local changes to save`, siga com os próximos comandos. Evite aplicar esse backup automaticamente sobre o visual novo; ele fica disponível em `git stash list` para consulta.

Com a aplicação já iniciada com `addResources=true`, use **Ctrl + F5** no navegador. Caso esteja parada, use os comandos de execução acima.

## O que funciona

- Cadastro de receitas e despesas, edição e confirmação de exclusão pela API real.
- Saldo, entradas, saídas e taxa de economia no período selecionado.
- Períodos: todo o histórico, mês atual, mês anterior e últimos 90 dias.
- Histórico com busca pela descrição, filtro de tipo, ordenação e paginação.
- Navegação entre visão geral, transações e análise, com links diretos e voltar/avançar do navegador.
- Gráfico com abas para saldo, entradas e saídas acumuladas, com exploração pelo cursor e pelas setas.
- Maior saída, média por saída e dias com movimento calculados na tela de análise.
- Tema claro/escuro e ocultação de valores, com preferências salvas no navegador.
- Fundo com auroras em movimento, profundidade sutil pelo cursor e transições nos filtros, gráfico, vistas e formulários.
- Botão para pausar animações; a preferência de movimento reduzido do sistema é respeitada automaticamente.
- Atalho `N` para novo lançamento e `/` para buscar, quando o foco está fora de um campo.
- Fonte Inter local e layout adaptado ao celular, com navegação compacta, formulários com foco e fechamento por Escape.
- Estados vazios e erros: falhas de atualização preservam os últimos dados recebidos.

As capturas usam dados temporários de teste. A interface não cadastra dados de demonstração automaticamente. No seu computador aparecem somente os registros da sua API.

![Dashboard com dados de teste](images/dashboard.png)

[Ver captura do celular](images/dashboard-mobile.png) · [Transações](images/dashboard-transactions.png) · [Análise](images/dashboard-analysis.png)

A [revisão visual](design-review.md) registra a direção da skill, as exceções para preservar o fundo aprovado e a validação.

## Como estudar, sem misturar os assuntos

1. **HTML e semântica:** acompanhe as seções da página, os identificadores (`id`) e as classes. O `dialog` é um elemento nativo que oferece a base de foco e navegação do formulário.
2. **CSS e layout:** comece pelas variáveis de cores; depois veja Grid, Flexbox, bordas, espaçamentos e os pontos de adaptação em `@media`. O fundo usa gradientes e uma textura SVG local.
3. **Dados no JavaScript:** leia `refresh()`, `periodRows()`, `totals()` e `render()`. Um GET da lista alimenta todos os indicadores do período, mantendo o mesmo conjunto de dados como referência.
4. **DOM e eventos:** acompanhe `renderTransactions()` e os `addEventListener`. Descrições do usuário entram por `textContent`; os SVGs dos botões são constantes do próprio código.
5. **Formulários e API:** leia `openTransaction()`, `saveTransaction()` e `confirmDelete()`. Eles usam POST, PUT e DELETE que já testamos no backend.
6. **Gráfico:** `buildSeries()` acumula entradas e saídas por data; `renderChart()` converte esses valores em posições SVG. Em intervalos longos, o gráfico agrupa os pontos, mantendo o valor acumulado nas datas exibidas.

Não é necessário instalar React, bibliotecas de gráficos, fontes ou outro servidor para executar esta versão.

## Camada de movimento

O movimento fica separado em **`css/motion.css`** e **`js/motion.js`**. A ordem no HTML é importante: primeiro `styles.css`, depois `motion.css`; primeiro `motion.js`, depois `app.js` (ambos com `defer`).

- **CSS e compositor:** as auroras movem e alteram a opacidade de três camadas. O desfoque do fundo é fixo, sem recalcular o blur a cada quadro. Os cards aproveitam esse fundo já suavizado, evitando um segundo desfoque pesado em cada painel.
- **Web Animations API:** anima a entrada dos valores, o desenho da linha e as posições do histórico. O dinheiro mostrado é sempre o valor final correto; não há contagem de valores intermediários.
- **FLIP:** captura as posições antigas e novas das linhas; interpola com `transform`, sem animar alturas ou reconstruir o layout em cada quadro.
- **View Transitions:** suaviza a troca de tema quando disponível. O fallback altera o tema normalmente. As cores são aplicadas juntas para evitar misturar texto do novo tema com o fundo anterior. A ocultação de valores interrompe essa transição para remover imediatamente as capturas anteriores.
- **Dialog nativo, `@starting-style` e transições discretas:** suavizam entrada e saída do formulário, preservando o foco e o fechamento por Escape. Navegadores sem suporte mantêm o comportamento nativo imediato.
- **Pointer e `requestAnimationFrame`:** o fundo responde poucos pixels ao mouse em dispositivos com ponteiro preciso. A suavização usa o tempo entre quadros; o loop JavaScript termina quando a posição estabiliza.
- **Pausa:** o botão no cabeçalho salva a preferência no navegador. As auroras também pausam com a página oculta ou um formulário aberto; movimento reduzido desativa os efeitos. No celular, a resposta ao cursor é desativada.

Para estudar, comece pelo CSS do fundo e depois veja `animate()` e `movePointer()` no `motion.js`. As regras financeiras continuam em `app.js` e no backend.


## Mapa de linhas desta entrega

No VS Code, use **Ctrl + G**, digite o número da linha e pressione Enter. As linhas abaixo correspondem aos arquivos desta versão; alterações e formatação posteriores podem deslocá-las. Os comentários numerados identificam os mesmos blocos.

| Arquivo | Linha inicial | Bloco |
| --- | --- | --- |
| index.html | 29 | [01. Ícones e fonte locais: sem dependências externas durante o uso.](../src/main/resources/static/index.html#L29) |
| index.html | 123 | [02. Três vistas reais; o endereço e os botões voltar/avançar acompanham a navegação.](../src/main/resources/static/index.html#L123) |
| index.html | 241 | [03. Um conjunto de indicadores; o saldo é sempre receitas menos despesas.](../src/main/resources/static/index.html#L241) |
| index.html | 304 | [04. Gráfico explorável: cada aba muda a série, sem inventar previsões.](../src/main/resources/static/index.html#L304) |
| index.html | 451 | [05. A lista preserva busca, filtros, ordenação, paginação, edição e exclusão.](../src/main/resources/static/index.html#L451) |
| index.html | 577 | [06. Formulário compartilhado por cadastro e edição.](../src/main/resources/static/index.html#L577) |
| styles.css | 1 | [01. Inter local + tokens: um sistema de cores, medidas e tipografia.](../src/main/resources/static/css/styles.css#L1) |
| styles.css | 198 | [02. Fundo aurora aprovado: textura e movimento ficam na camada de trás.](../src/main/resources/static/css/styles.css#L198) |
| styles.css | 271 | [03. Moldura: marca, navegação e conteúdo compartilham a mesma coluna.](../src/main/resources/static/css/styles.css#L271) |
| styles.css | 552 | [04. Indicadores: tipografia tabular, superfícies sem sombras e hierarquia clara.](../src/main/resources/static/css/styles.css#L552) |
| styles.css | 667 | [05. Análise: linhas reais, eixos legíveis, exploração por cursor e teclado.](../src/main/resources/static/css/styles.css#L667) |
| styles.css | 950 | [06. Histórico: valores alinhados, ações claras e paginação sem deslocamentos.](../src/main/resources/static/css/styles.css#L950) |
| styles.css | 1218 | [07. Formulários: controles nativos, labels explícitos e foco preservado.](../src/main/resources/static/css/styles.css#L1218) |
| styles.css | 1400 | [08. Tablet e celular: cada composição é adaptada, sem rolagem horizontal.](../src/main/resources/static/css/styles.css#L1400) |
| motion.css | 1 | [01. Curvas e tempos compartilhados: o movimento acompanha a ação.](../src/main/resources/static/css/motion.css#L1) |
| motion.css | 7 | [02. Aurora em camadas: só transform e opacity são animados continuamente.](../src/main/resources/static/css/motion.css#L7) |
| motion.css | 138 | [03. Feedback discreto: contraste neutro; o movimento fica no fundo.](../src/main/resources/static/css/motion.css#L138) |
| motion.css | 210 | [04. O indicador desliza entre filtros, inclusive pelo teclado.](../src/main/resources/static/css/motion.css#L210) |
| motion.css | 238 | [05. Dialog nativo + starting-style: entrada e saída, com fallback imediato.](../src/main/resources/static/css/motion.css#L238) |
| motion.css | 294 | [06. Troca de tema com View Transitions quando o navegador oferece suporte.](../src/main/resources/static/css/motion.css#L294) |
| motion.css | 318 | [07. Celular e acessibilidade: preferências têm prioridade sobre os efeitos.](../src/main/resources/static/css/motion.css#L318) |
| app.js | 3 | [01. Estado: os filtros ficam no navegador; os registros continuam no PostgreSQL.](../src/main/resources/static/js/app.js#L3) |
| app.js | 81 | [02. Dinheiro: BigInt guarda centavos inteiros, inclusive para valores grandes.](../src/main/resources/static/js/app.js#L81) |
| app.js | 224 | [03. Um mesmo conjunto de registros alimenta indicadores, gráfico e histórico.](../src/main/resources/static/js/app.js#L224) |
| app.js | 462 | [04. SVG: desenhamos apenas o resultado acumulado dos lançamentos existentes.](../src/main/resources/static/js/app.js#L462) |
| app.js | 695 | [05. Cadastro e edição usam o mesmo formulário e os endpoints que estudamos.](../src/main/resources/static/js/app.js#L695) |
| app.js | 872 | [06. Eventos: escutamos ações em vez de colocar JavaScript no HTML.](../src/main/resources/static/js/app.js#L872) |
| app.js | 1066 | [07. Navegação nativa por hash: voltar/avançar funciona e os filtros sobrevivem.](../src/main/resources/static/js/app.js#L1066) |
| app.js | 1118 | [08. Inicialização: preferências, data local e primeiro GET.](../src/main/resources/static/js/app.js#L1118) |
| motion.js | 3 | [01. Uma camada de movimento independente das regras e dos valores financeiros.](../src/main/resources/static/js/motion.js#L3) |
| motion.js | 93 | [02. O número mostrado é sempre o valor final, mesmo durante a transição.](../src/main/resources/static/js/motion.js#L93) |
| motion.js | 113 | [03. FLIP: comparamos as posições antes/depois, sem animar o layout em si.](../src/main/resources/static/js/motion.js#L113) |
| motion.js | 157 | [04. O traço percorre o caminho real do gráfico; os pontos não são inventados.](../src/main/resources/static/js/motion.js#L157) |
| motion.js | 246 | [05. Profundidade do fundo e luz dos cards: um único requestAnimationFrame.](../src/main/resources/static/js/motion.js#L246) |

## Dinheiro e datas

Os valores monetários são representados em centavos com `BigInt` no JavaScript. O leitor JSON preserva a escrita original dos números em navegadores atuais, evitando perder os centavos de valores grandes. Navegadores antigos recusam valores fora do caminho seguro em vez de apresentá-los arredondados. No formulário, valores como `1.250,50` e `1250.50` são aceitos. O POST/PUT envia o decimal como texto; o Jackson o lê como `BigDecimal` no contrato existente.

Datas de transações são datas sem horário. A apresentação e o gráfico preservam o dia cadastrado. O período usa o calendário local do navegador, inclusive na virada de mês.

A ocultação protege também a taxa de economia e os novos indicadores. Ela é uma conveniência visual; a autenticação e a separação de dados entre contas ainda serão construídas antes da publicação para clientes.

## Validação realizada

Esta entrega passou por **30 grupos de verificações de interface**, além dos testes Maven. A [revisão visual](design-review.md) detalha as evidências e as exceções de design.

- `./mvnw verify -Pintegration`: 17 testes unitários e 17 testes de integração, sem falhas ou skips.
- Chromium/Playwright: cadastro, edição, validação, cancelamento e exclusão no PostgreSQL de teste; filtros, pesquisa, ordenação, páginas, gráfico por teclado, persistência de tema e privacidade.
- Erros simulados: falha na leitura mantém os dados anteriores; falha na gravação mantém o formulário preenchido.
- Valor com 17 dígitos inteiros e duas casas decimais preservado; descrição contendo HTML exibida como texto.
- Larguras de 320, 390, 760, 768, 1024 e 1440 px sem rolagem horizontal.
- Movimento normal: auroras ativas, profundidade pelo cursor, pausa persistente, loop de cursor encerrado em repouso, gráfico progressivo, FLIP, filtros deslizantes e diálogo com entrada/saída.
- Movimento reduzido e dispositivo touch: efeitos desativados conforme a preferência, formulário funcional e botão indicando o controle pelo sistema.
- Tema testado com View Transitions e também com essa API indisponível.
- Verificação automatizada axe-core, regras WCAG 2 A/AA e 2.1 AA, sem violações detectadas nos temas claro e escuro, com e sem o formulário aberto, nos estados finais das transições. Essa verificação automatizada não substitui avaliação humana de acessibilidade.

## Evolução planejada

Categorias, relatórios agregados no servidor, filtros e paginação no banco para volumes maiores, autenticação e isolamento dos dados de cada usuário. O dashboard atual é uma etapa de desenvolvimento pessoal; não é ainda uma implantação para múltiplos clientes.
