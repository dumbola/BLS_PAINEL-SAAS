import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega o .env da raiz do projeto local
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERRO: Configure o DATABASE_URL no arquivo .env');
    process.exit(1);
}

const db = new Pool({
    connectionString: DATABASE_URL,
    // ssl: { rejectUnauthorized: false } // Descomente caso o DB exija SSL
});

async function insertNewEpisode() {
    console.log('--- Publicador Local de Episódios (PostgreSQL Direto) ---');
    
    const novoEpisodio = {
        nome_obra: 'Solo Leveling',
        numero_ep: 16,
        data_lancamento: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        horario_lancamento: new Date().toLocaleTimeString('pt-BR', { hour12: false }).substring(0, 5), // HH:MM
        link: 'https://site-fansub.com/assista/solo-leveling/ep-16',
        processado: false // Começa como false
    };

    console.log('Enviando dados do novo episódio para o banco de dados...', novoEpisodio);

    try {
        const query = `
            INSERT INTO episodios_lancamentos 
            (nome_obra, numero_ep, data_lancamento, horario_lancamento, link, processado) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        await db.query(query, [
            novoEpisodio.nome_obra,
            novoEpisodio.numero_ep,
            novoEpisodio.data_lancamento,
            novoEpisodio.horario_lancamento,
            novoEpisodio.link,
            novoEpisodio.processado
        ]);
        
        console.log('✅ Episódio inserido com sucesso! O Worker na VPS cuidará do envio em até 1 minuto.');
    } catch (error: any) {
        console.error('❌ Falha ao inserir episódio:', error.message);
    } finally {
        await db.end(); // Fecha a conexão
    }
}

insertNewEpisode();
