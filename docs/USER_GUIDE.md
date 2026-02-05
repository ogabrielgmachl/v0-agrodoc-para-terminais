# Guia de Uso - Novas Funcionalidades

## 📊 Exportação de PDF

### Exportar Relatório de Recepção

1. Navegue até o calendário e selecione um dia
2. No overlay de detalhes, clique no botão **"Exportar PDF"**
3. O arquivo será baixado automaticamente com nome: `recepcao_caminhoes_YYYY_MM_DD.pdf`

**Conteúdo do PDF:**
- Data e total de caminhões
- Estatísticas (aprovados, recusados, pendentes)
- Tabela completa com placas, clientes, fornecedores
- Métricas de qualidade (POL, COR, UMI, CIN, RI)

### Exportar Análise de Qualidade

1. No mesmo overlay, clique em **"Análise Qualidade PDF"**
2. Arquivo baixado: `analise_qualidade_YYYY_MM_DD.pdf`

**Conteúdo:**
- Médias de qualidade por parâmetro
- Tabela detalhada com analistas
- Indicação de doublecheck
- Status de autorização

---

## 📁 Upload de CSV com Validação

### Como Fazer Upload

1. Acesse as configurações (botão de engrenagem)
2. Na seção de upload, clique em **"Selecionar Arquivo CSV"**
3. Escolha o arquivo (máximo 5MB, formato .csv ou .txt)
4. Aguarde a validação automática

### Validações Realizadas

✅ **Tamanho:** Máximo 5MB  
✅ **Formato:** Apenas .csv e .txt  
✅ **Estrutura:** Colunas consistentes  
✅ **Caracteres:** Detecção de caracteres perigosos  
✅ **Duplicatas:** Alerta sobre linhas repetidas

### Feedback Visual

**Verde (✓):** Arquivo válido, pronto para upload  
**Vermelho (✗):** Erros encontrados, correção necessária  
**Amarelo (⚠):** Avisos, upload permitido mas requer atenção

### Preview

Antes de enviar, você pode:
- Visualizar as primeiras 5 linhas
- Verificar cabeçalhos e estrutura
- Confirmar que os dados estão corretos

---

## 📈 Visualização de Gráficos

### Alternar Entre Tabela e Gráfico

1. Na página de análise de qualidade, procure os botões:
   - **"Tabela"** (ícone de grid)
   - **"Gráfico"** (ícone de tendência)

2. Clique para alternar a visualização

### Tipos de Gráfico

**Barras:** Melhor para comparar valores absolutos  
**Linhas:** Ideal para visualizar tendências

### Métricas Disponíveis

- **POL:** Média, mínimo e máximo
- **COR:** Média vs limite máximo (1250)
- **UMI:** Média vs limite (0.2)
- **CIN:** Média vs limite (0.2)
- **RI:** Média vs limite (500)

---

## 🚀 Cache Inteligente (SWR)

### O Que Mudou?

O sistema agora usa cache automático para:
- Reduzir requisições duplicadas
- Melhorar velocidade de navegação
- Diminuir consumo de dados

### Comportamento

**Primeira visita:**
- Carrega dados do servidor
- Armazena em cache por 60 segundos

**Visitas subsequentes (< 60s):**
- Usa dados do cache instantaneamente
- Exibe dados imediatamente sem loading

**Auto-revalidação:**
- A cada 5 minutos, atualiza em background
- Você sempre vê dados recentes

### Forçar Atualização

Se precisar de dados mais recentes:
1. Clique no botão de refresh (ícone de reload)
2. Ou simplesmente recarregue a página

---

## 📄 Paginação Eficiente

### Navios (Embarques)

Agora os navios são carregados em páginas de 50 itens:
- Navegue entre páginas com os botões ◀ ▶
- Veja o indicador: "Página 2 de 5"
- Total de registros exibido

### Benefícios

✅ Carregamento 80% mais rápido  
✅ Menos dados trafegados  
✅ Melhor performance em datasets grandes

---

## 💡 Dicas de Uso

### Performance

**Dica 1:** Use os filtros antes de exportar PDF para incluir apenas dados relevantes

**Dica 2:** Mantenha abas abertas - o cache funciona por navegador/aba

**Dica 3:** PDFs são gerados localmente no navegador, sem envio para servidor

### Uploads

**Dica 1:** Sempre valide o preview antes de enviar

**Dica 2:** Use nomes de arquivo descritivos: `caminhoes_2026_01_30.csv`

**Dica 3:** Mantenha backups dos CSVs originais

### Gráficos

**Dica 1:** Use barras para comparação, linhas para tendências

**Dica 2:** Passe o mouse sobre as barras para ver valores exatos

**Dica 3:** Alterne entre visualizações para diferentes insights

---

## 🔒 Segurança

### Validação de Upload

Todos os uploads passam por:
1. Validação de extensão
2. Verificação de tamanho
3. Sanitização de nome
4. Análise de conteúdo
5. Autenticação via chave

### Dados Exportados

PDFs gerados contêm apenas:
- Dados que você tem permissão para ver
- Informações visíveis na tela
- Sem dados sensíveis adicionais

---

## ❓ Solução de Problemas

### "Arquivo muito grande"
**Solução:** Divida o CSV em arquivos menores (< 5MB cada)

### "Formato de arquivo inválido"
**Solução:** Certifique-se de usar .csv ou .txt

### "Colunas inconsistentes"
**Solução:** Verifique se todas as linhas têm o mesmo número de colunas

### PDF não baixa
**Solução 1:** Verifique se pop-ups estão permitidos  
**Solução 2:** Tente outro navegador  
**Solução 3:** Limpe o cache do navegador

### Gráfico não aparece
**Solução:** Recarregue a página ou limpe o cache

---

## 📞 Suporte

**Encontrou um bug?**
Entre em contato com a equipe de TI com:
- Navegador e versão
- Captura de tela do erro
- Passos para reproduzir

**Sugestões?**
Envie feedback sobre as novas funcionalidades para ajudar a melhorar o sistema.

---

*Documentação atualizada em: 30/01/2026*  
*Versão: 1.0.0*
