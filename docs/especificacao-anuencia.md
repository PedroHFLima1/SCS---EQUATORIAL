# Especificação Funcional: Regra de Bloqueio e Histórico da Anuência

## 1. Resumo da Regra de Negócio
A fila de Anuência tem precedência sobre os demais embargos (Travessia e Ambiental). Se um processo possuir pendência em Anuência, ele ficará temporariamente retido (bloqueado) para os módulos subsequentes até que a Anuência seja aprovada. 
Além disso, cada módulo deve manter sua independência no registro de histórico (movements) para evitar colisões ou confusão nas datas de status entre os diferentes setores, preservando as datas originais da Triagem e Anuência para correta visualização posterior.

## 2. Cenários Possíveis

*   **Cenário A**: Processo possui apenas pendência de Anuência.
*   **Cenário B**: Processo possui pendência de Anuência + Travessia e/ou Ambiental.
*   **Cenário C**: Processo tem a Anuência reprovada ou cancelada.

## 3. Comportamento Esperado em Cada Cenário

*   **Cenário A**: 
    *   Exibido somente na aba de Anuência.
    *   Quando aprovado, atinge seu estado terminal e é finalizado.
*   **Cenário B**: 
    *   Inicialmente oculto nas filas de Travessia e Ambiental.
    *   Aparece e permite edição apenas na fila de Anuência.
    *   Após Anuência receber o status "APROVADO", a trava é removida (`pendenciaAnuencia` = false) e o status do processo é definido como "NOVO" para ser capturado nas próximas filas.
*   **Cenário C**:
    *   A tramitação do processo encerra naquela via, ou deve seguir o fluxo de correção para voltar à mesa de Anuência.

## 4. Regras para Exibição nas Filas

*   **Bloqueio Condicional**: A lógica de fetch para Travessia e Ambiental deve continuar exigindo `pendenciaAnuencia: false` para mostrar o processo.
*   **Exibição de Datas**:
    *   Quando o processo estiver em Travessia ou Ambiental, devem constar visualmente a **Data da Triagem** (Data em que a triagem aprovou) e a **Data da Anuência** (Data da movimentação de aprovação em Anuência).
    *   Estas colunas informativas ajudam o analista a contextualizar de onde e quando o processo chegou para ele.

## 5. Regras para Controle de Histórico

*   **Independência de Módulos**: Inserir na descrição do `movement` uma tag visível ou estrutural. Ex: `[ANUENCIA]`, `[TRAVESSIA]`, `[AMBIENTAL]`. Isso previne que a "Data de Aprovação" de Anuência seja confundida com a "Data de Aprovação" em Travessia.
*   A leitura de aprovações no front-end para exibir as datas deverá filtrar os históricos usando essas tags.

## 6. Critérios de Aceite

*   [x] Processos com anuência pendente não podem aparecer nas tabelas de Travessia e Ambiental no dashboard.
*   [x] Aprovar processo na Anuência deve enviá-lo automaticamente e imediatamente para Travessia/Ambiental com os metadados corretos.
*   [x] Os históricos de atualização de status disparam logs independentes e tagueados por módulo.
*   [x] A tabela de detalhamento exibe precisamente a data da triagem e da anuência nos processos herdados.

## 7. Possíveis Casos de Teste

1.  **Bloqueio inicial**: Criar processo com Anuência e Travessia. Validar que apenas o gestor de Anuência enxerga o card.
2.  **Aprovação**: Dar "Aprovado" na Anuência. Validar se o processo sumiu da fila de Anuência e apareceu na de Travessia.
3.  **Registro de histórico**: Validar na timeline do processo de Travessia se os logs de "Aprovado em Anuência" não sobrepuseram o status atual em Travessia.
4.  **Colunas de data**: Verificar se a Data de Triagem e Data de Aprovação na Anuência aparecem corretas na listagem da Travessia.
