// The agent roster: each agent's team, hard and soft skills, and the board column it sits in.
// roster.json is written by hand. An agent with a `ledger` takes its column from that ledger's status,
// so the board follows real work; an agent without one keeps the `column` it was given. Read-only.
const fs = require('fs')
const path = require('path')
const {snapshot} = require('./collect.js')

const COLUMNS = ['ready', 'working', 'review', 'blocked', 'done']

/**
 * Picks the column for one agent. A ledger's status wins over the hand-set column.
 * @param {object} agent - one entry from roster.json
 * @param {Array<{name: string, status: string}>} ledgers - the task ledgers from the snapshot
 * @returns {string} one of COLUMNS
 */
function columnFor(agent, ledgers){
    const ledger = agent.ledger && ledgers.find(l => l.name === agent.ledger)

    if(ledger){
        if(ledger.status == 'paused') return 'blocked'
        if(ledger.status == 'active') return 'working'
        if(ledger.status == 'done') return 'done'
    }

    return COLUMNS.includes(agent.column) ? agent.column : 'ready'
}

/**
 * Groups agents by team, in the roster's team order, then by column.
 * An agent whose team is not in the roster lands in a final "Unassigned" team.
 * @param {{teams?: Array<{id: string, name: string}>, agents?: Array<object>}} roster - parsed roster.json
 * @param {Array<{name: string, status: string}>} ledgers - the task ledgers from the snapshot
 * @returns {Array<{id: string, name: string, columns: Array<{id: string, cards: Array<object>}>}>}
 */
function groupByTeam(roster, ledgers){
    const teams = [...(roster.teams || [])]
    const agents = roster.agents || []
    const known = new Set(teams.map(t => t.id))

    if(agents.some(a => !known.has(a.team))) teams.push({id: 'unassigned', name: 'Unassigned'})

    return teams.map(team => ({
        id: team.id,
        name: team.name,
        columns: COLUMNS.map(id => ({
            id,
            cards: agents
                .filter(a => (known.has(a.team) ? a.team : 'unassigned') == team.id && columnFor(a, ledgers) == id)
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    role: a.role || '',
                    ledger: a.ledger || null,
                    hard: a.hard || [],
                    soft: a.soft || []
                }))
        }))
    }))
}

/**
 * The board: the roster grouped by team, read from roster.json and the live ledgers
 * @returns {Array<{id: string, name: string, columns: Array<{id: string, cards: Array<object>}>}>}
 */
function board(){
    const roster = JSON.parse(fs.readFileSync(path.join(__dirname, 'roster.json'), 'utf8'))

    return groupByTeam(roster, snapshot().ledgers)
}

module.exports = {board, groupByTeam, columnFor, COLUMNS}
