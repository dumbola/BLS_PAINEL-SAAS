# 🧠 Memória do Projeto: Fast Fansub Bot

Este documento serve como a **Base de Conhecimento** e Memória Arquitetural do ecossistema de automação do Fansub. Ele detalha como a VPS e o Localhost trabalham em conjunto para rastrear, baixar e notificar lançamentos de séries asiáticas.

---

## 🏗️ A Arquitetura (Microserviços)

O sistema foi dividido em três partes para garantir resiliência, escalabilidade e evitar bloqueios de IP (como o Cloudflare do iQIYI).

1. **A Inteligência (VPS / TMDB Tracker)**
   - Roda 24/7 gerenciado pelo **PM2** (`fansub-bot`).
   - Todos os dias às 03:00 da manhã, a VPS varre o banco de dados buscando as `series` marcadas como `ongoing`.
   - Ela cruza esses dados com a API do **TMDB** (The Movie Database) para descobrir os lançamentos exatos previstos para a data atual.
   - Caso encontre um lançamento para hoje, insere os dados na tabela `download_queue` com o status `pending`.

2. **O Operário (Localhost / Scraper)**
   - É o robô que roda na máquina local.
   - Ele lê a tabela `download_queue` e, ao encontrar o status `pending`, acessa os sites (iQIYI, etc.) para fazer o download pesado.
   - Após baixar e fazer o upload do vídeo para o Telegram, o Localhost insere as informações (nome, link, etc.) na tabela `episodios_lancamentos` com a flag `processado = false` e atualiza a fila de download para `completed`.

3. **O Emissor (VPS / Telegram Notifier)**
   - A cada 1 minuto, a VPS olha para a tabela `episodios_lancamentos`.
   - Utilizando as funções inteligentes do PostgreSQL (`pg_trgm` e `ILIKE`), ela verifica se a obra lançada corresponde a alguma série cadastrada, mesmo com pequenas diferenças no nome (Fuzzy Match).
   - Se os nomes baterem e a flag estiver `processado = false`, a VPS envia uma mensagem formatada para o grupo oficial no Telegram e atualiza para `processado = true` (Trava Anti-Loop / Anti-Duplicidade).

---

## 🗄️ Estrutura do Banco de Dados (Supabase / PostgreSQL)

A ponte de comunicação entre a VPS e o Localhost é estritamente via Banco de Dados (Producer-Consumer Pattern).

### 1. Tabela: `download_queue`
Fila preenchida pela VPS e consumida pelo Localhost.
- `id` (UUID)
- `nome_obra` (TEXT)
- `numero_ep` (INTEGER)
- `data_lancamento` (DATE)
- `status` (TEXT) -> Padrões: 'pending', 'completed'

### 2. Tabela: `episodios_lancamentos`
Fila preenchida pelo Localhost e consumida (e notificada) pela VPS.
- `id` (UUID)
- `nome_obra` (TEXT)
- `numero_ep` (INTEGER)
- `data_lancamento` (DATE)
- `horario_lancamento` (TIME)
- `link` (TEXT)
- `processado` (BOOLEAN) -> Inicia `false`, a VPS altera para `true` após enviar no Telegram.

---

## 🛠️ Tecnologias e Configurações

- **Stack:** Node.js, TypeScript, PostgreSQL (via driver `pg`), Telegraf (Telegram Bot), Axios.
- **Gerenciador de Processos:** PM2.
- **Conflito de Tokens:** Resolvido! A VPS roda com o `Telegraf` focado apenas no envio de mensagens (sem usar o método `bot.launch()`). Isso permite que o Localhost retenha a exclusividade do Polling e escute os comandos do Telegram sem disparar o `Erro 409: Conflict`.

### Variáveis de Ambiente Necessárias (`.env` na raiz)
```env
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_TARGET_CHAT_ID=...
TMDB_API_KEY=...
```

### Comandos Úteis do PM2 (Na VPS)
- `pm2 logs fansub-bot` (Ver o bot trabalhando em tempo real)
- `pm2 restart fansub-bot` (Reiniciar o processo)
- `pm2 restart fansub-bot --update-env` (Reiniciar o processo aplicando novas variáveis adicionadas ao .env)
- `pm2 stop fansub-bot` (Pausar a automação)

---

## 🧠 Lógica de Similaridade de Textos (Fuzzy Match)
Para lidar com nomes de obras com tags como `[BL]` ou erros de digitação, a query de notificação do `EpisodeService.ts` utiliza o algoritmo `Trigram Similarity` e operadores lógicos do Postgres:

```sql
SELECT DISTINCT el.* 
FROM episodios_lancamentos el
INNER JOIN series s 
  ON el.nome_obra ILIKE '%' || s.titulo_original || '%'
  OR s.titulo_original ILIKE '%' || el.nome_obra || '%'
  OR similarity(s.titulo_original, el.nome_obra) > 0.4
WHERE el.processado = false
```
*(Requer a extensão `pg_trgm` ativada no banco)*
