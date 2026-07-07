# Guia de Instalação Local (24/7)

Para que o Painel de Automação funcione e mantenha os seus scrapers rodando 24 horas por dia de forma leve (sem o peso do Docker), usaremos o **Node.js** e o **PM2** no seu computador local.

## Passo 1: Instalar o Node.js
Como o sistema do painel foi feito em React e Node.js (a mesma linguagem do SaaS), você precisa instalá-lo no Windows:
1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS (Recommended for most users)**.
3. Instale normalmente (Next > Next > Finish).
4. Abra um **novo terminal** e digite `node -v` para confirmar que instalou corretamente.

## Passo 2: Instalar o PM2 (Opcional, mas recomendado para rodar 24h)
O PM2 é o que vai manter a API local ligada no fundo.
No terminal, rode:
```bash
npm install -g pm2
```

## Passo 3: Rodando a Local API
A Local API é o "cérebro" que vai ligar/desligar seus robôs em Python quando você clicar no painel.

1. Pelo terminal, entre na pasta do projeto:
```bash
cd "C:\Users\Dumbola\Desktop\BL's\BLS_PAINEL-SAAS\local-worker"
```
2. Instale as dependências:
```bash
npm install
```
3. Inicie o servidor com o PM2 para rodar em segundo plano:
```bash
pm2 start server.js --name "local-automation-api"
```

## Passo 4: Rodando o Painel Dashboard
1. Pelo terminal, entre na pasta do dashboard:
```bash
cd "C:\Users\Dumbola\Desktop\BL's\BLS_PAINEL-SAAS\dashboard"
```
2. Instale as dependências:
```bash
npm install
```
3. Rode em modo de desenvolvimento ou faça o build:
```bash
npm run dev
```

Pronto! Agora acesse o painel, vá até a nova aba "Automação Local" e clique para Iniciar/Parar seus robôs (iQIYI e Gagaoolala). Os logs do Python aparecerão magicamente na sua tela!
