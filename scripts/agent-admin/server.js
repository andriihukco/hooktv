// Local agent admin: serves the agent snapshot from collect.js at http://127.0.0.1:4777.
// Run: node scripts/agent-admin/server.js. Binds to 127.0.0.1 only and never writes to the repo.
const http = require('http')
const fs = require('fs')
const path = require('path')
const {snapshot} = require('./collect.js')
const {board} = require('./roster.js')

const PORT = +process.env.AGENT_ADMIN_PORT || 4777

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)

    if(url.pathname == '/api/agents'){
        res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'})
        res.end(JSON.stringify(snapshot()))
        return
    }

    if(url.pathname == '/api/roster'){
        try {
            res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'})
            res.end(JSON.stringify({teams: board()}))
        } catch(e){
            res.writeHead(500, {'Content-Type': 'application/json'})
            res.end(JSON.stringify({error: 'roster.json is missing or invalid'}))
        }
        return
    }

    if(url.pathname == '/' || url.pathname == '/index.html'){
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'})
        res.end(fs.readFileSync(path.join(__dirname, 'index.html')))
        return
    }

    if(url.pathname == '/board'){
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'})
        res.end(fs.readFileSync(path.join(__dirname, '../../public/admin/board.html')))
        return
    }

    res.writeHead(404, {'Content-Type': 'text/plain'})
    res.end('Not found')
})

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Agent admin: http://127.0.0.1:${PORT}`)
})
