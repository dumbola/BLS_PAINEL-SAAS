const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4001;

app.use(cors());
app.use(express.json());

const processes = {
    gagaoolala: { scraper: null, discovery: null },
    iqiyi: { scraper: null, discovery: null }
};

const processLogs = {
    gagaoolala: { scraper: [], discovery: [] },
    iqiyi: { scraper: [], discovery: [] }
};

function addLog(system, type, category, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] [${category}] ${message.trim()}`;
    processLogs[system][type].push(logLine);
    if (processLogs[system][type].length > 100) {
        processLogs[system][type].shift();
    }
}

const config = {
    gagaoolala: {
        cwd: "C:\\Users\\Dumbola\\Desktop\\BL's\\sistema_gagaoolala",
        scraper: 'run_vps2.py',
        discovery: 'run_discovery2.py',
        listFile: 'global_bl_list.txt'
    },
    iqiyi: {
        cwd: "C:\\Users\\Dumbola\\Desktop\\BL's\\sistema_iqiyi",
        scraper: 'run_vps.py',
        discovery: 'run_discovery.py',
        listFile: 'global_bl_list.txt'
    }
};

app.get('/api/automation/status', (req, res) => {
    res.json({
        gagaoolala: {
            scraper: { running: !!processes.gagaoolala.scraper, logs: processLogs.gagaoolala.scraper },
            discovery: { running: !!processes.gagaoolala.discovery, logs: processLogs.gagaoolala.discovery }
        },
        iqiyi: {
            scraper: { running: !!processes.iqiyi.scraper, logs: processLogs.iqiyi.scraper },
            discovery: { running: !!processes.iqiyi.discovery, logs: processLogs.iqiyi.discovery }
        }
    });
});

app.get('/api/automation/list', (req, res) => {
    try {
        // Usa o iqiyi como base
        const listPath = path.join(config.iqiyi.cwd, config.iqiyi.listFile);
        if (fs.existsSync(listPath)) {
            const content = fs.readFileSync(listPath, 'utf-8');
            res.json({ success: true, content });
        } else {
            res.json({ success: true, content: '' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/automation/list', (req, res) => {
    try {
        const { content } = req.body;
        // Salva e sincroniza em ambos
        fs.writeFileSync(path.join(config.iqiyi.cwd, config.iqiyi.listFile), content, 'utf-8');
        fs.writeFileSync(path.join(config.gagaoolala.cwd, config.gagaoolala.listFile), content, 'utf-8');
        res.json({ success: true, message: 'Lista salva e sincronizada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/automation/start/:system/:type', (req, res) => {
    const { system, type } = req.params;
    
    if (!config[system] || !config[system][type]) {
        return res.status(400).json({ error: 'Sistema ou tipo inválido' });
    }

    if (processes[system][type]) {
        return res.status(400).json({ error: 'Processo já está rodando' });
    }

    try {
        processLogs[system][type] = []; 
        addLog(system, type, 'INFO', `Iniciando ${type}: ${config[system][type]}...`);
        
        const child = spawn('python', [config[system][type]], {
            cwd: config[system].cwd,
            env: process.env 
        });

        child.stdout.on('data', (data) => addLog(system, type, 'STDOUT', data.toString()));
        child.stderr.on('data', (data) => addLog(system, type, 'STDERR', data.toString()));
        
        child.on('close', (code) => {
            addLog(system, type, 'INFO', `Processo encerrado com código ${code}`);
            processes[system][type] = null;
        });

        child.on('error', (err) => {
            addLog(system, type, 'ERROR', `Erro ao iniciar: ${err.message}`);
            processes[system][type] = null;
        });

        processes[system][type] = child;
        res.json({ success: true, message: `${system} ${type} iniciado` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/automation/stop/:system/:type', (req, res) => {
    const { system, type } = req.params;
    
    if (!config[system] || !processes[system][type]) {
        return res.status(400).json({ error: 'Processo não está rodando' });
    }

    try {
        addLog(system, type, 'INFO', 'Enviando sinal de parada...');
        processes[system][type].kill();
        res.json({ success: true, message: `${system} ${type} sinalizado para parar` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Local Worker rodando na porta ${port}`);
});
