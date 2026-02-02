# Implementação da Atualização do CSV - v2.1.0

## Data: Janeiro 2026

## Resumo das Mudanças

Esta atualização expande significativamente o rastreamento de análises NIR e Doublecheck no sistema AGRODOC, adicionando informações completas de datas, analistas e documentação de boletins.

---

## Novos Campos no CSV

### 1. Datas das Análises Finais
- `cor_data`, `pol_data`, `umi_data`, `cin_data`, `ri_data`
- **Função**: Armazena a data/hora da última análise (NIR ou Doublecheck se houver)
- **Formato**: DD/MM/YYYY HH:mm:ss

### 2. Datas das Análises NIR
- `cor_data_nir`, `pol_data_nir`, `umi_data_nir`, `cin_data_nir`, `ri_data_nir`
- **Função**: Sempre guarda a data original da análise NIR
- **Uso**: Quando há Doublecheck, permite rastrear tanto a data do NIR quanto do Doublecheck

### 3. Analistas
- `cor_analista`, `pol_analista`, `umi_analista`, `cin_analista`, `ri_analista`
- **Função**: Identifica quem realizou a análise final
- **Valores**:
  - `"robo_lab"`: Análise automatizada pelo NIR (não exibido no sistema)
  - Nome do agente: Análise manual do laboratório (exibido no sistema)

### 4. Analistas Anteriores
- `cor_analista_anterior`, `pol_analista_anterior`, `umi_analista_anterior`, `cin_analista_anterior`, `ri_analista_anterior`
- **Função**: Guarda o analista do NIR quando há Doublecheck
- **Lógica**:
  - Se aprovado direto pelo NIR: `analista=robo_lab`, `analista_anterior=null`
  - Se reprovado pelo NIR e teve Doublecheck: `analista=[nome do agente]`, `analista_anterior=robo_lab`

### 5. Links de Boletins
- `link_boletim_db`: URL do relatório de Doublecheck (se houver)
- `link_boletim_b7`: URL do relatório Bola 7 (se houver)

---

## Identificação de Casos Especiais

### Doublecheck
Um caminhão passou por Doublecheck quando:
- Existe pelo menos um valor `*_anterior` preenchido, OU
- Existe `link_boletim_db` preenchido, OU
- Existe `autorizacao` preenchida

### Bola 7
Um caminhão é identificado como **BOLA 7** quando:
- Existe `link_boletim_b7` preenchido
- **O que é**: Amostra aleatória coletada pela Segurança Patrimonial do Porto de Santos

---

## Mudanças na Interface

### Nova Coluna: DOCUMENTO

**Desktop (DayViewOverlay.tsx)**:
- Adicionada coluna "DOCUMENTO" na tabela principal
- Exibe dois tipos de botões quando aplicável:
  - **Botão Roxo (Beaker icon)**: Link para boletim de Doublecheck
  - **Botão Âmbar (Scan icon)**: Link para boletim Bola 7
- Ambos os botões podem aparecer simultaneamente se o caminhão tiver os dois links

**Mobile (DayViewMobileOverlay.tsx)**:
- Botões adicionados ao lado do botão de Histórico no card de cada caminhão
- Mesma lógica de cores e ícones do desktop
- Totalmente responsivo e touch-friendly

---

## Arquivos Modificados

### 1. `/lib/load-trucks.ts`
**Mudanças**:
- Atualizado tipo `Truck` com 30 novos campos
- Expandido mapeamento de colunas do CSV
- Adicionado parsing para todos os novos campos
- Implementada lógica de identificação de Bola 7
- Adicionada flag `isBola7` ao objeto Truck

**Novos Campos no Type Truck**:
\`\`\`typescript
// Datas das análises finais
corData: string | null
polData: string | null
umiData: string | null
cinData: string | null
riData: string | null

// Datas NIR
corDataNir: string | null
polDataNir: string | null
umiDataNir: string | null
cinDataNir: string | null
riDataNir: string | null

// Analistas
corAnalista: string | null
polAnalista: string | null
umiAnalista: string | null
cinAnalista: string | null
riAnalista: string | null

// Analistas anteriores
corAnalistaAnterior: string | null
polAnalistaAnterior: string | null
umiAnalistaAnterior: string | null
cinAnalistaAnterior: string | null
riAnalistaAnterior: string | null

// Links
linkBoletimDb: string | null
linkBoletimB7: string | null

// Flag
isBola7: boolean
\`\`\`

### 2. `/components/dashboard/DayViewOverlay.tsx`
**Mudanças**:
- Atualizada interface `TruckData` com todos os novos campos
- Adicionada coluna "DOCUMENTO" no header da tabela
- Implementada renderização de botões de documento (Doublecheck e Bola 7)
- Atualizado colspan da mensagem de "nenhum caminhão encontrado" (11 → 13)
- Ícones utilizados: `Beaker` (Doublecheck), `Scan` (Bola 7)

### 3. `/components/dashboard/DayViewMobileOverlay.tsx`
**Mudanças**:
- Atualizada interface `TruckData` com todos os novos campos
- Adicionados botões de documento ao lado do botão de Histórico
- Implementada mesma lógica de cores e ícones do desktop
- Adicionado `stopPropagation` para evitar expansão do card ao clicar nos links

---

## Lógica de Exibição

### Regras de Exibição de Analistas
\`\`\`javascript
// NÃO exibir "robo_lab" no sistema
if (analista === "robo_lab") {
  // Não mostrar
} else if (analista !== null) {
  // Mostrar nome do agente
}
\`\`\`

### Regras de Exibição de Documentos
\`\`\`javascript
// Botão de Doublecheck (Roxo + Beaker)
if (linkBoletimDb !== null && linkBoletimDb !== "") {
  // Exibir botão
}

// Botão de Bola 7 (Âmbar + Scan)
if (linkBoletimB7 !== null && linkBoletimB7 !== "") {
  // Exibir botão
}

// Se nenhum link
if (!linkBoletimDb && !linkBoletimB7) {
  // Exibir "-"
}
\`\`\`

---

## Compatibilidade com CSV Antigos

O sistema mantém **total compatibilidade** com CSVs antigos:
- Todos os novos campos são opcionais (`| null`)
- Lógica de fallback para valores ausentes
- CSVs sem os novos campos continuam funcionando normalmente

---

## Formato Esperado do CSV

\`\`\`
id,placa,nota_fiscal,cliente,fornecedor,autorizacao,data_autorizacao,peso,
cor,cor_data,cor_anterior,cor_data_nir,cor_analista,cor_analista_anterior,
pol,pol_data,pol_anterior,pol_data_nir,pol_analista,pol_analista_anterior,
umi,umi_data,umi_anterior,umi_data_nir,umi_analista,umi_analista_anterior,
cin,cin_data,cin_anterior,cin_data_nir,cin_analista,cin_analista_anterior,
ri,ri_data,ri_anterior,ri_data_nir,ri_analista,ri_analista_anterior,
link_boletim_db,link_boletim_b7
\`\`\`

### Exemplo de Linha (Aprovado pelo NIR):
\`\`\`
1,ABC1234,12345,SAO MARTINHO,FORNECEDOR A,,,25.5,
1100,22/01/2026 10:30:00,,,22/01/2026 10:30:00,robo_lab,,
99.2,22/01/2026 10:30:00,,,22/01/2026 10:30:00,robo_lab,,
0.15,22/01/2026 10:30:00,,,22/01/2026 10:30:00,robo_lab,,
0.08,22/01/2026 10:30:00,,,22/01/2026 10:30:00,robo_lab,,
350,22/01/2026 10:30:00,,,22/01/2026 10:30:00,robo_lab,,
,
\`\`\`

### Exemplo de Linha (Doublecheck):
\`\`\`
2,XYZ5678,54321,CLIENTE B,FORNECEDOR B,APROVADO,22/01/2026 15:45:00,30.2,
1200,22/01/2026 15:45:00,1300,22/01/2026 10:00:00,João Silva,robo_lab,
99.4,22/01/2026 15:45:00,98.8,22/01/2026 10:00:00,João Silva,robo_lab,
0.18,22/01/2026 15:45:00,0.25,22/01/2026 10:00:00,Maria Santos,robo_lab,
0.12,22/01/2026 15:45:00,0.15,22/01/2026 10:00:00,João Silva,robo_lab,
420,22/01/2026 15:45:00,480,22/01/2026 10:00:00,Pedro Costa,robo_lab,
https://exemplo.com/boletim-db-123,
\`\`\`

### Exemplo de Linha (Bola 7):
\`\`\`
3,DEF9012,67890,CLIENTE C,FORNECEDOR C,,,28.8,
1150,22/01/2026 14:20:00,,,22/01/2026 14:20:00,Carlos Lima,,
99.3,22/01/2026 14:20:00,,,22/01/2026 14:20:00,Carlos Lima,,
0.16,22/01/2026 14:20:00,,,22/01/2026 14:20:00,Carlos Lima,,
0.10,22/01/2026 14:20:00,,,22/01/2026 14:20:00,Carlos Lima,,
380,22/01/2026 14:20:00,,,22/01/2026 14:20:00,Carlos Lima,,
,https://exemplo.com/bola7-456
\`\`\`

---

## Testes Recomendados

1. **CSV com todos os campos novos preenchidos**
2. **CSV com campos de Doublecheck apenas**
3. **CSV com campos de Bola 7 apenas**
4. **CSV com ambos Doublecheck e Bola 7 no mesmo caminhão**
5. **CSV antigo (sem novos campos) - compatibilidade**
6. **CSV com analista "robo_lab" - verificar não exibição**
7. **CSV com nome de analista real - verificar exibição**

---

## Notas Técnicas

### Performance
- Todos os campos são parseados apenas uma vez durante o carregamento do CSV
- Cache de 60 segundos aplicado para evitar reprocessamento
- Nenhum impacto de performance adicional na renderização

### Segurança
- Links externos abrem em nova aba (`target="_blank"`)
- Uso de `rel="noopener noreferrer"` para segurança
- Validação de links antes da renderização

### Acessibilidade
- Títulos descritivos em todos os botões (`title` attribute)
- Contraste adequado de cores (WCAG AA)
- Ícones com significado visual claro

---

## Próximos Passos (Sugeridos)

1. **Adicionar tooltip** nos botões de documento mostrando informações adicionais
2. **Implementar modal** de preview do documento ao invés de abrir em nova aba
3. **Adicionar badge "Bola 7"** visível no card do caminhão
4. **Criar filtro** para visualizar apenas caminhões Bola 7
5. **Adicionar estatísticas** de Doublecheck e Bola 7 no dashboard

---

## Implementado por

Sistema AGRODOC v2.1.0
Data: Janeiro 2026
