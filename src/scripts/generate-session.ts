import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as readline from 'readline';

dotenv.config();

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const db = new Pool({ connectionString: process.env.DATABASE_URL });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

async function generateSession() {
    console.log('\n--- 🤖 GERADOR DE SESSÃO MTPROTO ---');
    if (!API_ID || !API_HASH) {
        console.error('ERRO: API_ID ou API_HASH ausentes no .env');
        process.exit(1);
    }

    const phone = await question('Digite o número de telefone (com DDI, ex: +5511999999999): ');

    const client = new TelegramClient(new StringSession(''), API_ID, API_HASH, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => phone,
        password: async () => await question('Digite a senha 2FA (se tiver, ou deixe em branco): '),
        phoneCode: async () => await question('O Telegram te mandou um código! Digite ele aqui: '),
        onError: (err) => console.log('Erro:', err),
    });

    console.log('\n✅ Autenticado com sucesso!');
    const sessionStr = client.session.save() as unknown as string;
    
    console.log('Salvando sessão no Banco de Dados (Supabase)...');
    await db.query(`INSERT INTO telegram_sessions (phone, session_string) VALUES ($1, $2)`, [phone, sessionStr]);
    console.log('Sessão salva com sucesso! O Painel SaaS agora tem controle total.');
    
    process.exit(0);
}

generateSession();
