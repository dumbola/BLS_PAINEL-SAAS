import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega o .env da raiz do projeto local
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function setupDatabase() {
    console.log('Conectando ao banco de dados...');
    const client = new Client({
        connectionString: DATABASE_URL,
    });

    try {
        await client.connect();
        
        const query = `
            CREATE TABLE IF NOT EXISTS episodios_lancamentos (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                nome_obra TEXT NOT NULL,
                numero_ep INTEGER NOT NULL,
                data_lancamento DATE NOT NULL,
                horario_lancamento TIME NOT NULL,
                link TEXT NOT NULL,
                processado BOOLEAN DEFAULT false NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `;
        
        await client.query(query);
        console.log('✅ Tabela "episodios_lancamentos" criada com sucesso!');
        
    } catch (error: any) {
        console.error('❌ Erro ao criar tabela:', error.message);
    } finally {
        await client.end();
    }
}

setupDatabase();
