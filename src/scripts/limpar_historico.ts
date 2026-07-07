import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { db } from '../../src/core/db';
import { TMDBService } from '../../src/modules/automation/tmdbService';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const CHAT_ID = process.env.TELEGRAM_TARGET_CHAT_ID || '-1004361743372'; 

const LIMIT_MESSAGES = 200; // Quantas mensagens olhar para trás

async function limparHistorico() {
    console.log(`\n🧹 Iniciando Operação Limpa-Histórico (Verificando as últimas ${LIMIT_MESSAGES} mensagens)...\n`);

    if (!API_ID || !API_HASH) {
        console.error('❌ API_ID ou API_HASH ausentes. Abortando.');
        return;
    }

    try {
        // 1. Busca a sessão do banco de dados (MTProto já conectado)
        const res = await db.query(`SELECT session_string FROM telegram_sessions ORDER BY created_at DESC LIMIT 1`);
        if (res.rows.length === 0) {
            console.error('❌ Nenhuma sessão do Telegram encontrada no banco de dados. O bot precisa estar logado no painel.');
            return;
        }

        const stringSession = new StringSession(res.rows[0].session_string);
        const client = new TelegramClient(stringSession, API_ID, API_HASH, {
            connectionRetries: 5,
        });

        await client.connect();
        
        const isAuth = await client.checkAuthorization();
        if (!isAuth) {
            console.error('❌ Sessão inválida. Faça login novamente no painel SaaS.');
            return;
        }

        console.log('✅ Conectado ao Telegram! Buscando histórico...\n');

        // 2. Busca o histórico de mensagens
        const messages = await client.getMessages(CHAT_ID, { limit: LIMIT_MESSAGES });
        
        let encontradas = 0;
        let editadas = 0;

        for (const msg of messages) {
            const text = msg.message || '';
            
            // Verifica se é uma das mensagens feias do Crawler
            if (text.includes('Crawler Autônomo')) {
                encontradas++;
                console.log(`[🔎] Encontrada mensagem feia (ID: ${msg.id})`);
                
                try {
                    // Tenta extrair o nome da série e episódio
                    let titleLine = text.split('\n')[0];
                    // Remove emojis e tags no formato [tag] para sobrar o nome limpo
                    titleLine = titleLine.replace(/🎬/g, '').replace(/\[.*?\]/g, '').trim();
                    
                    const match = titleLine.match(/(.*?)\s*-\s*Episódio\s*(\d+)/i);
                    let nomeObra = 'Série Desconhecida';
                    let numeroEp = 'X';

                    if (match) {
                        nomeObra = match[1].trim();
                        numeroEp = match[2];
                    }

                    console.log(`     -> Extraído: Obra: ${nomeObra} | Ep: ${numeroEp}`);

                    // Chama a Inteligência (TMDB)
                    const summary = await TMDBService.getSeriesSummary(nomeObra);

                    // Cria o novo layout elegante
                    const novoTexto = `✦ ⊹ ࣪ ˖ 【 **${nomeObra}** 】 ˖ ࣪ ⊹ ✦\n` +
                                      `🌸 _Episódio ${numeroEp}_\n\n` +
                                      `❝ _${summary}_ ❞\n\n` +
                                      `⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤\n` +
                                      `🍿 **Qualidade:** 4K Ultra | Legendado PT-BR\n` +
                                      `💌 _Trazido com muito carinho para a nossa comunidade._`;

                    // 3. Edita a mensagem retroativamente!
                    await client.editMessage(CHAT_ID, {
                        message: msg.id,
                        text: novoTexto,
                        parseMode: 'markdown'
                    });

                    console.log(`     ✨ Editada com SUCESSO!\n`);
                    editadas++;

                    // Pausa de 2 segundos para não tomar block do Telegram (Flood limit)
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (editError: any) {
                    console.error(`     ❌ Falha ao editar mensagem ${msg.id}: ${editError.message}`);
                }
            }
        }

        console.log(`\n🎉 Operação Concluída!`);
        console.log(`👉 Total de mensagens verificadas: ${messages.length}`);
        console.log(`👉 Total de mensagens feias encontradas: ${encontradas}`);
        console.log(`👉 Total de mensagens corrigidas com sucesso: ${editadas}`);

    } catch (error: any) {
        console.error('❌ Erro fatal no script:', error.message);
    } finally {
        process.exit(0);
    }
}

limparHistorico();
