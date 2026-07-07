import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carrega as variáveis do .env
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN não encontrado!');
    process.exit(1);
}

const bot = new Telegraf(TOKEN);

// =========================================================
// 🛠️ CONFIGURAÇÕES
// =========================================================

// Coloque o ID do seu grupo aqui (ex: -10012345678)
const CHAT_ID = process.env.TELEGRAM_TARGET_CHAT_ID || '-10000000000'; 

// =========================================================
// 🎨 TEMPLATE DA MENSAGEM (Com Emojis Universais)
// =========================================================
// Como os emojis personalizados exigem códigos complexos que só o Telegram sabe,
// a melhor prática profissional é usar um BANNER DE IMAGEM no topo e usar
// Emojis Universais que funcionam perfeitamente para todos os membros!

const mensagemRegras = `
🚨 <b>Informamos que o DESCUMPRIMENTO de qualquer regra abaixo acarretará em sua EXPULSÃO.</b>
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️

<b>1.</b> 🚫 Proibido conteúdo ofensivo, desrespeitoso ou preconceituoso.
<b>2.</b> 🤫 Evite dar spoilers soltos! Se for comentar sobre o episódio, use a formatação correta de spoiler do Telegram (||texto||).
<b>3.</b> ✨ Aproveitem o espaço para surtar muito com os lançamentos GL e BL! 💖🏳️‍🌈

<i>Atenciosamente, a Staff.</i>
`;

// =========================================================
// 🚀 FUNÇÃO PRINCIPAL
// =========================================================
async function run() {
    try {
        console.log(`Enviando o Banner de Regras para o chat ${CHAT_ID}...`);
        
        // Caminho da imagem de banner maravilhosa que eu gerei para você:
        // (Se você quiser usar outra imagem, basta colocar o caminho dela aqui)
        const imagePath = '/root/.gemini/antigravity-ide/brain/69308b10-32a2-4a29-9ac5-cf103e74b3cf/regras_banner_1783194109363.png';
        
        if (fs.existsSync(imagePath)) {
            const sent = await bot.telegram.sendPhoto(
                CHAT_ID, 
                { source: imagePath }, 
                { 
                    caption: mensagemRegras,
                    parse_mode: 'HTML'
                }
            );
            console.log(`✅ Regras enviadas com sucesso com o Banner Dourado! ID: ${sent.message_id}`);
        } else {
            console.log("Imagem não encontrada. Enviando apenas o texto...");
            const sent = await bot.telegram.sendMessage(CHAT_ID, `👑 <b>R E G R A S</b> 👑\n` + mensagemRegras, {
                parse_mode: 'HTML'
            });
            console.log(`✅ Regras enviadas com sucesso! ID: ${sent.message_id}`);
        }
        
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Erro ao enviar a mensagem:', error.message);
        process.exit(1);
    }
}

// Executa a função
run();
