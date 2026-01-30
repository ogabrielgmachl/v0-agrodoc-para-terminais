# 📚 Guia de Migração: Navios do Vercel Blob para Supabase

## ✅ O que foi feito

1. ✅ **Criada rota API** `/api/ships/route.ts`
   - Consulta o Supabase Postgres diretamente
   - Filtra por ano e mês via query params
   - Agrupa dados por data no formato esperado
   - Server-side (seguro, sem exposição de dados)

2. ✅ **Atualizado** `page.tsx`
   - Removido import de `loadAllShips` e `clearShipCache`
   - Substituída chamada `/api/list-csv-embarque` por `/api/ships?year=YYYY&month=MM`
   - Navios agora são carregados do Supabase via API
   - UI continua 100% igual

3. ✅ **Mantido intacto**
   - `EmbarqueModule.tsx` - sem mudanças visuais
   - `EmbarqueModuleMobile.tsx` - sem mudanças visuais
   - Tipagem `ShipsByDate` - compatível

---

## 🚀 O que você precisa fazer agora

### **Passo 1: Criar as Tabelas no Supabase (IMPORTANTE)**

Acesse: **Supabase Dashboard → SQL Editor**

Execute este script SQL:

```sql
-- Criar tabela de navios
CREATE TABLE IF NOT EXISTS navios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navio TEXT NOT NULL,
  processo TEXT,
  quantidade NUMERIC NOT NULL,
  destino TEXT,
  data_embarque DATE NOT NULL,
  data_prevista DATE,
  cor NUMERIC,
  pol NUMERIC,
  umi NUMERIC,
  cin NUMERIC,
  ri NUMERIC,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_navios_data_embarque ON navios(data_embarque);
CREATE INDEX IF NOT EXISTS idx_navios_navio ON navios(navio);
```

### **Passo 2: Migrar Dados do Blob para Supabase**

Você tem 2 opções:

#### **Opção A: Inserir dados manualmente (rápido)**
1. Pegue os dados dos seus CSVs
2. No Supabase → Table Editor → `navios` → Insert rows
3. Copie os dados manualmente

#### **Opção B: Criar script de migração (automatizado)**
Crie um arquivo `scripts/migrate-ships-to-supabase.ts`:

```typescript
import { createClient } from "@/lib/supabase/server"

async function migrateShips() {
  const supabase = await createClient()
  
  // Exemplo: Inserir dados em lote
  const shipsData = [
    {
      navio: "NAVIO A",
      processo: "PROC-001",
      quantidade: 500,
      destino: "Porto de Santos",
      data_embarque: "2026-01-15",
      data_prevista: "2026-01-20",
      cor: 1200,
      pol: 99.2,
      umi: 0.15,
      cin: 0.18,
      ri: 450,
    },
    // ... mais registros
  ]
  
  const { error } = await supabase
    .from("navios")
    .insert(shipsData)
  
  if (error) {
    console.error("Erro ao migrar:", error)
  } else {
    console.log("✅ Migração completa!")
  }
}
```

### **Passo 3: Testar a Nova Rota**

1. Insira alguns dados de teste na tabela `navios`
2. Na sua aplicação, mude para o mês/ano dos dados de teste
3. Verifique se os navios aparecem no módulo de Embarque
4. Monitore o console para logs em `[v0]`

### **Passo 4: Validar Performance**

Compare antes vs depois:
- **Antes**: Fetching CSV + Parsing (lento)
- **Depois**: Query SQL direto (rápido)

No browser DevTools → Network:
- Anteriormente: `/api/list-csv-embarque` retornava URLs
- Agora: `/api/ships` retorna dados direto

---

## 📊 Estrutura do Banco Esperada

```
Tabela: navios

┌─────────────────────────────────────────┐
│ Coluna          │ Tipo     │ Obrigatório │
├─────────────────────────────────────────┤
│ id              │ UUID     │ ✅          │
│ navio           │ TEXT     │ ✅          │
│ processo        │ TEXT     │             │
│ quantidade      │ NUMERIC  │ ✅          │
│ destino         │ TEXT     │             │
│ data_embarque   │ DATE     │ ✅          │
│ data_prevista   │ DATE     │             │
│ cor             │ NUMERIC  │             │
│ pol             │ NUMERIC  │             │
│ umi             │ NUMERIC  │             │
│ cin             │ NUMERIC  │             │
│ ri              │ NUMERIC  │             │
│ created_at      │ TIMESTAMP│             │
│ updated_at      │ TIMESTAMP│             │
└─────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### ❌ Erro: "Table navios does not exist"
**Solução**: Execute o script SQL no Passo 1

### ❌ Erro: "Missing query parameters"
**Solução**: A rota espera `?year=YYYY&month=MM`

### ❌ Nenhum navio aparecendo
**Checklist**:
1. ✅ Tabela `navios` existe?
2. ✅ Dados foram inseridos?
3. ✅ Data está no formato `YYYY-MM-DD`?
4. ✅ Console mostra logs `[v0]`?

### ❌ Performance lenta
**Dicas**:
- Verifique se os índices foram criados
- Use `EXPLAIN ANALYZE` para otimizar queries

---

## ✨ Próximas Melhorias (Opcional)

1. **Criar rota de upload** para adicionar novos navios sem CSV
2. **Migrar Caminhões** para Supabase também
3. **Adicionar Row Level Security (RLS)** para segurança
4. **Implementar soft delete** (deletar sem remover dados)

---

## 📞 Dúvidas?

Se encontrar problemas:
1. Verifique os logs no console (`[v0]`)
2. Confira se os dados estão na tabela (`Supabase → Table Editor`)
3. Teste a rota diretamente: `http://localhost:3000/api/ships?year=2026&month=1`
