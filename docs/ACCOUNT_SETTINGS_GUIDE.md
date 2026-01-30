# Guia de Configurações de Conta - AGRODOC

## O que foi implementado

### 1. Tabela `profiles` no Supabase
- Armazena dados estruturados de usuários
- Campos: `id`, `email`, `first_name`, `last_name`, `phone`, `avatar_url`, `bio`, `company`, `role`
- RLS (Row Level Security) configurado - cada usuário só acessa seus próprios dados
- Triggers automáticos para criar perfil ao registrar e atualizar timestamp

### 2. Página de Configurações da Conta
- Responsiva para mobile e desktop
- Atualização de nome e sobrenome salva na tabela `profiles`
- Alteração de senha via Supabase Auth
- Mensagens de sucesso/erro com auto-dismiss
- Loading states durante operações

## Setup Necessário

### Passo 1: Criar a tabela no Supabase

1. Abra seu Supabase Dashboard
2. Vá para SQL Editor
3. Cole o conteúdo de `/scripts/create-profiles-table.sql`
4. Execute

### Passo 2: Verificar a Integração

A página agora salva dados em:
- ✅ Tabela `profiles` (banco de dados estruturado)
- ✅ `user_metadata` do Auth (backward compatibility)

Isso garante que:
- Os dados estão disponíveis para relatórios
- Você pode fazer queries diretas no banco
- Histórico de alterações (via `updated_at`)
- Melhor performance em consultas

## Sugestões de Melhorias Futuras

### 1. Avatar/Foto de Perfil
```typescript
// Adicionar upload de foto
- Upload para Supabase Storage
- Salvar URL em `avatar_url`
- Exibir preview antes de confirmar
```

### 2. Informações Adicionais
- Adicionar campos: `phone`, `company`, `role`, `bio`
- Formulário progressivo (mostrar/esconder seções)
- Validação de telefone e dados

### 3. Histórico de Atividades
```typescript
// Criar tabela `activity_logs`
- Rastrear mudanças de dados
- Registrar logins
- Exportar relatório de atividades
```

### 4. Autenticação de Dois Fatores (2FA)
- Integrar com Google Authenticator
- Backup codes
- Recuperação de conta

### 5. Sessões Ativas
- Mostrar dispositivos conectados
- Permitir "sair de todos os dispositivos"
- Gerenciar aplicativos com acesso

### 6. Temas e Preferências
```typescript
// Melhorar seção de Preferências
- Notificações (email, SMS, push)
- Tema (claro/escuro) - salvar preferência
- Idioma
- Fuso horário
- Formato de data/hora
```

### 7. Dados de Conta
- Data de criação
- Último acesso
- Status de verificação de email
- Plano/Tipo de conta

### 8. Integração com Dashboard
- Mostrar statísticas de uso
- Gráficos de atividade
- Dados de consumo de API

## Estrutura de Pastas

```
/app
├── settings/
│   └── account/
│       └── page.tsx          # Página de configurações
├── auth/
│   ├── login/
│   ├── register/
│   └── forgot-password/
└── page.tsx

/scripts
└── create-profiles-table.sql # Migration do banco

/docs
└── ACCOUNT_SETTINGS_GUIDE.md # Este arquivo
```

## Troubleshooting

### "Erro ao carregar perfil"
- Verifique se a tabela `profiles` foi criada
- Confira se o RLS está habilitado
- Execute: `SELECT * FROM profiles WHERE id = 'seu_user_id';`

### "Erro ao atualizar dados"
- Verifique o RLS das políticas
- Confirme que o usuário está autenticado
- Cheque os logs do Supabase

### Dados não estão sendo salvos
- Confirme que a função `handle_new_user()` foi criada
- Verifique triggers executando: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'on_%';`

## Próximos Passos

1. Execute o script SQL para criar a tabela
2. Teste a página: Vá para `/settings/account`
3. Atualize seus dados e verifique no Supabase
4. Implemente as sugestões de melhorias conforme necessário
