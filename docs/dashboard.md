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

## O que funciona

- Cadastro de receitas e despesas, edição e confirmação de exclusão pela API real.
- Saldo, entradas, saídas e taxa de economia no período selecionado.
- Períodos: todo o histórico, mês atual, mês anterior e últimos 90 dias.
- Histórico com busca pela descrição, filtro de tipo, ordenação e paginação.
- Gráfico do resultado acumulado, com exploração pelo cursor e pelas setas do teclado.
- Tema claro/escuro e ocultação de valores, com preferências salvas no navegador.
- Fundo com auroras em movimento, luz sutil pelo cursor e transições nos filtros, gráfico e formulários.
- Botão para pausar animações; a preferência de movimento reduzido do sistema é respeitada automaticamente.
- Atalho `N` para novo lançamento e `/` para buscar, quando o foco está fora de um campo.
- Layout adaptado ao celular, navegação inferior, formulários com foco e fechamento por Escape.
- Estados vazios e erros: falhas de atualização preservam os últimos dados recebidos.

As capturas usam dados temporários de teste. A interface não cadastra dados de demonstração automaticamente. No seu computador aparecem somente os registros da sua API.

![Dashboard com dados de teste](images/dashboard.png)

[Ver captura do celular](images/dashboard-mobile.png)

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
| index.html | 22 | [01. Ícones locais: o painel funciona sem bibliotecas ou fontes externas.](../src/main/resources/static/index.html#L22) |
| index.html | 115 | [02. Navegação e atalhos que abrem o formulário real.](../src/main/resources/static/index.html#L115) |
| index.html | 256 | [03. Indicadores: todos usam dados reais, no período selecionado.](../src/main/resources/static/index.html#L256) |
| index.html | 342 | [04. Gráfico SVG interativo, construído a partir das transações.](../src/main/resources/static/index.html#L342) |
| index.html | 410 | [05. Busca, filtros, ordenação, paginação e ações por registro.](../src/main/resources/static/index.html#L410) |
| index.html | 519 | [06. Formulário compartilhado por cadastro e edição.](../src/main/resources/static/index.html#L519) |
| styles.css | 1 | [01. Tema e cores: mude estas variáveis para transformar o painel inteiro.](../src/main/resources/static/css/styles.css#L1) |
| styles.css | 148 | [02. Fundo: auroras suaves, textura e movimento bem discreto.](../src/main/resources/static/css/styles.css#L148) |
| styles.css | 209 | [03. Estrutura e navegação.](../src/main/resources/static/css/styles.css#L209) |
| styles.css | 648 | [04. Saldo e órbita: o círculo representa a taxa real de economia.](../src/main/resources/static/css/styles.css#L648) |
| styles.css | 882 | [05. Gráfico e comparativo, sem números de demonstração.](../src/main/resources/static/css/styles.css#L882) |
| styles.css | 1091 | [06. Histórico interativo.](../src/main/resources/static/css/styles.css#L1091) |
| styles.css | 1364 | [07. Formulários e confirmação com o elemento nativo dialog.](../src/main/resources/static/css/styles.css#L1364) |
| styles.css | 1571 | [08. Movimento e adaptação para tablets e celulares.](../src/main/resources/static/css/styles.css#L1571) |
| motion.css | 1 | [01. Curvas e tempos compartilhados: o movimento acompanha a ação.](../src/main/resources/static/css/motion.css#L1) |
| motion.css | 7 | [02. Aurora em camadas: só transform e opacity são animados continuamente.](../src/main/resources/static/css/motion.css#L7) |
| motion.css | 138 | [03. Luz acompanha o cursor; o conteúdo dos cards permanece estável.](../src/main/resources/static/css/motion.css#L138) |
| motion.css | 243 | [04. O indicador desliza entre filtros, inclusive pelo teclado.](../src/main/resources/static/css/motion.css#L243) |
| motion.css | 273 | [05. Dialog nativo + starting-style: entrada e saída, com fallback imediato.](../src/main/resources/static/css/motion.css#L273) |
| motion.css | 329 | [06. Troca de tema com View Transitions quando o navegador oferece suporte.](../src/main/resources/static/css/motion.css#L329) |
| motion.css | 353 | [07. Celular e acessibilidade: preferências têm prioridade sobre os efeitos.](../src/main/resources/static/css/motion.css#L353) |
| app.js | 3 | [01. Estado: os filtros ficam no navegador; os registros continuam no PostgreSQL.](../src/main/resources/static/js/app.js#L3) |
| app.js | 79 | [02. Dinheiro: BigInt guarda centavos inteiros, inclusive para valores grandes.](../src/main/resources/static/js/app.js#L79) |
| app.js | 222 | [03. Um mesmo conjunto de registros alimenta indicadores, gráfico e histórico.](../src/main/resources/static/js/app.js#L222) |
| app.js | 426 | [04. SVG: desenhamos apenas o resultado acumulado dos lançamentos existentes.](../src/main/resources/static/js/app.js#L426) |
| app.js | 628 | [05. Cadastro e edição usam o mesmo formulário e os endpoints que estudamos.](../src/main/resources/static/js/app.js#L628) |
| app.js | 802 | [06. Eventos: escutamos ações em vez de colocar JavaScript no HTML.](../src/main/resources/static/js/app.js#L802) |
| app.js | 999 | [07. Inicialização: preferências, data local e primeiro GET.](../src/main/resources/static/js/app.js#L999) |
| motion.js | 3 | [01. Uma camada de movimento independente das regras e dos valores financeiros.](../src/main/resources/static/js/motion.js#L3) |
| motion.js | 94 | [02. O número mostrado é sempre o valor final, mesmo durante a transição.](../src/main/resources/static/js/motion.js#L94) |
| motion.js | 114 | [03. FLIP: comparamos as posições antes/depois, sem animar o layout em si.](../src/main/resources/static/js/motion.js#L114) |
| motion.js | 158 | [04. O traço percorre o caminho real do gráfico; os pontos não são inventados.](../src/main/resources/static/js/motion.js#L158) |
| motion.js | 234 | [05. Profundidade do fundo e luz dos cards: um único requestAnimationFrame.](../src/main/resources/static/js/motion.js#L234) |

## Dinheiro e datas

Os valores monetários são representados em centavos com `BigInt` no JavaScript. O leitor JSON preserva a escrita original dos números em navegadores atuais, evitando perder os centavos de valores grandes. Navegadores antigos recusam valores fora do caminho seguro em vez de apresentá-los arredondados. No formulário, valores como `1.250,50` e `1250.50` são aceitos. O POST/PUT envia o decimal como texto; o Jackson o lê como `BigDecimal` no contrato existente.

Datas de transações são datas sem horário. A apresentação e o gráfico preservam o dia cadastrado. O período usa o calendário local do navegador, inclusive na virada de mês.

A ocultação de valores é uma conveniência visual; a autenticação e a separação de dados entre contas ainda serão construídas antes da publicação para clientes.

## Validação realizada

- `./mvnw verify -Pintegration`: 17 testes unitários e 17 testes de integração, sem falhas ou skips.
- Chromium/Playwright: cadastro, edição, validação, cancelamento e exclusão no PostgreSQL de teste; filtros, pesquisa, ordenação, páginas, gráfico por teclado, persistência de tema e privacidade.
- Erros simulados: falha na leitura mantém os dados anteriores; falha na gravação mantém o formulário preenchido.
- Valor com 17 dígitos inteiros e dois centavos decimais preservado; descrição contendo HTML exibida como texto.
- Larguras de 320, 390, 760, 768, 1024 e 1440 px sem rolagem horizontal.
- Movimento normal: auroras ativas, luz pelo cursor, pausa persistente, loop de cursor encerrado em repouso, gráfico progressivo, FLIP, filtros deslizantes e diálogo com entrada/saída.
- Movimento reduzido e dispositivo touch: efeitos desativados conforme a preferência, formulário funcional e botão indicando o controle pelo sistema.
- Tema testado com View Transitions e também com essa API indisponível.
- Verificação automatizada axe-core, regras WCAG 2 A/AA e 2.1 AA, sem violações detectadas nos temas claro e escuro, com e sem o formulário aberto, nos estados finais das transições. Essa verificação automatizada não substitui avaliação humana de acessibilidade.

## Evolução planejada

Categorias, relatórios agregados no servidor, filtros e paginação no banco para volumes maiores, autenticação e isolamento dos dados de cada usuário. O dashboard atual é uma etapa de desenvolvimento pessoal; não é ainda uma implantação para múltiplos clientes.
