# 🤖 Manual do Scraper (Localhost)

Este documento dita as **regras exatas** de como o seu sistema local (Scraper/Downloader) deve se comportar para conversar perfeitamente com a VPS, sem quebrar a harmonia do sistema.

A única forma do Localhost falar com a VPS é através do **PostgreSQL**.

---

## 1. O Algoritmo Principal (O que o Localhost deve fazer)

O seu Scraper local deve rodar em um loop ou cron job (ex: a cada 10 minutos) e seguir **estritamente** os 4 passos abaixo:

### Passo 1: Olhar a Fila de Espera (Tabela `download_queue`)
A VPS coloca os lançamentos do dia nesta tabela. O Localhost deve buscar apenas o que está pendente.
```sql
-- Query a ser executada no Localhost:
SELECT id, nome_obra, numero_ep, data_lancamento 
FROM download_queue 
WHERE status = 'pending';
```

### Passo 2: Ação Pesada (Scraping e Upload)
Para cada episódio retornado do Passo 1:
- O Localhost vai no iQIYI (ou outro site).
- Tenta raspar (scrape) e encontrar o vídeo daquele episódio.
  - **E se não achar o vídeo?** Não faça nada! Ignore e pule pro próximo. O status no banco continua `pending`, então no próximo ciclo o Localhost tentará de novo.
  - **Se achar o vídeo:** Baixe, processe e faça o Upload pro Telegram usando o seu Bot Token. Pegue o Link da postagem do Telegram (ou do seu site).

### Passo 3: Avisar a VPS para Notificar (Tabela `episodios_lancamentos`)
Quando o upload terminar, o Localhost tem que colocar os dados na tabela oficial de lançamentos. **ATENÇÃO:** Você deve colocar `processado = false` (isso é o gatilho que avisa a VPS para enviar o alerta no grupo).
```sql
-- Query a ser executada no Localhost:
INSERT INTO episodios_lancamentos 
(nome_obra, numero_ep, data_lancamento, horario_lancamento, link, processado) 
VALUES 
('Nome da Série', 5, '2024-03-30', '19:00', 'https://t.me/seucanal/123', false);
```

### Passo 4: Dar Baixa na Fila (Tabela `download_queue`)
Para o Localhost não tentar baixar a mesma coisa de novo no próximo ciclo, ele precisa "Dar Baixa" na tarefa.
```sql
-- Query a ser executada no Localhost (use o ID que você pegou no Passo 1):
UPDATE download_queue 
SET status = 'completed' 
WHERE id = 'uuid-do-episodio-aqui';
```

---

## 🧑‍💻 Exemplo de Código (Pseudocódigo para o Localhost)

Aqui está um esqueleto de código Node.js/TypeScript perfeito para o seu Localhost:

```typescript
import { Client } from 'pg';

async function rodarScraperLocal() {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    // 1. Pega os pendentes
    const { rows: pendentes } = await db.query("SELECT * FROM download_queue WHERE status = 'pending'");

    for (const ep of pendentes) {
        console.log(`Buscando ${ep.nome_obra} - Episódio ${ep.numero_ep} no site...`);
        
        // 2. Faz o Scraping (Simulação)
        const videoEncontrado = await tentarBaixarDoSite(ep.nome_obra, ep.numero_ep);

        if (videoEncontrado) {
            const linkTelegram = await uparParaTelegram(videoEncontrado);

            // 3. Insere na fila de Notificação da VPS (Gatilho)
            await db.query(`
                INSERT INTO episodios_lancamentos 
                (nome_obra, numero_ep, data_lancamento, horario_lancamento, link, processado) 
                VALUES ($1, $2, $3, $4, $5, false)
            `, [ep.nome_obra, ep.numero_ep, ep.data_lancamento, '12:00', linkTelegram]);

            // 4. Dá baixa na Fila
            await db.query("UPDATE download_queue SET status = 'completed' WHERE id = $1", [ep.id]);

            console.log(`✅ Episódio processado e engatilhado para a VPS!`);
        } else {
            console.log(`⏳ Vídeo não saiu ainda no iQIYI. Tentaremos de novo mais tarde.`);
        }
    }

    await db.end();
}
```

## ⚠️ Resumo de Segurança
- A tabela `series` **nunca deve ser modificada** pelos robôs, apenas pelo seu Painel Admin humano. A VPS apenas a **LÊ**.
- A tabela `download_queue` é regida pelo `status` (`pending` e `completed`). A **VPS INSERE** e o **LOCAL ATUALIZA**.
- A tabela `episodios_lancamentos` é regida pelo `processado` (`false` e `true`). O **LOCAL INSERE** e a **VPS ATUALIZA**.

Se seguir essa estrutura cruzarada em X, é matematicamente impossível dar erro, loop infinito ou conflito!
