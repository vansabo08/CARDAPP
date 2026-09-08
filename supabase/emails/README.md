# Emails

Duas coisas separadas, e convém não as confundir:

| Quem envia | O quê | Onde se configura |
| --- | --- | --- |
| **Supabase Auth** | Confirmação de registo, reposição de palavra-passe | Painel do Supabase (SMTP + moldes) |
| **A aplicação** | Resumo diário de pedidos | Código, `src/lib/email/` |

Ambos saem pelo Resend, mas por caminhos diferentes: o Supabase por SMTP, a
aplicação pela API.

---

## 1. Emails de autenticação

O SMTP que vem de origem no Supabase envia 2 a 3 emails por hora e assina com
um domínio partilhado — os registos ficam bloqueados e as mensagens caem em
spam. Vale a pena trocar já.

### SMTP

**Authentication → Emails → SMTP Settings**, ligar *Enable Custom SMTP*:

| Campo | Valor |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a chave de API do Resend (`re_…`) |
| Sender email | `onboarding@resend.dev` |
| Sender name | `Cardapp` |

> Sem domínio verificado, o Resend só entrega para o email da **sua própria
> conta Resend**. Serve para testar. Para enviar a clientes a sério é preciso
> verificar um domínio e trocar o *Sender email* por algo como
> `nao-responder@cardapp.ao`.

Em **Rate Limits**, o limite de emails por hora pode subir depois disto.

### Moldes

**Authentication → Emails → Templates**. Para cada um, cole o ficheiro no campo
*Message body* e ponha o assunto sugerido:

| Template | Ficheiro | Assunto |
| --- | --- | --- |
| Confirm signup | `confirmar-registo.html` | Confirme o seu email — Cardapp |
| Reset password | `repor-palavra-passe.html` | Repor a palavra-passe — Cardapp |

As variáveis `{{ .ConfirmationURL }}` são do Supabase — não lhes toque.

### Para onde as ligações apontam

**Authentication → URL Configuration**:

- *Site URL*: o mesmo valor que tem em `NEXT_PUBLIC_SITE_URL`
- *Redirect URLs*: acrescente `http://localhost:3100/**` para desenvolvimento

Se isto não bater certo, o link do email manda o utilizador para o sítio errado.

---

## 2. Resumo diário

Sai de `/api/tarefas/resumo-diario` e vai só a quem tem **plano Sala** — as
estatísticas já eram uma funcionalidade desse plano.

Precisa de três segredos em `.env.local` (nenhum com prefixo `NEXT_PUBLIC_`,
senão o Next põe-nos no pacote que o browser descarrega):

```
SUPABASE_SERVICE_ROLE_KEY=   # Project Settings > API > service_role
RESEND_API_KEY=              # resend.com/api-keys
CRON_SECRET=                 # ja gerado no seu .env.local
```

A chave de serviço é precisa porque a rotina lê os pedidos de **todos** os
donos — coisa que a RLS, e ainda bem, não deixa ninguém fazer.

### Experimentar à mão

Com o servidor a correr:

```bash
curl -X POST "http://localhost:3100/api/tarefas/resumo-diario" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Devolve um relatório por restaurante: `enviado`, `falhou` ou `sem email`.

### Agendar

Todos os dias às 07:00 de Luanda (06:00 UTC).

**Vercel** — `vercel.json`:

```json
{ "crons": [{ "path": "/api/tarefas/resumo-diario", "schedule": "0 6 * * *" }] }
```

A Vercel manda o `CRON_SECRET` no cabeçalho `Authorization` sozinha, desde que
a variável esteja definida no projecto.

**Fora da Vercel** — qualquer agendador que saiba fazer um pedido HTTP com um
cabeçalho. A rota aceita `GET` e `POST`, e também `?segredo=` no URL para
agendadores que não deixem pôr cabeçalhos.
