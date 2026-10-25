import request from './client.js'
import uuid from './uuid.js'

const TTL = 5 * 60 * 1000
const INTERVAL = 2000

/**
 * Создать билет входа для ТВ. id уходит в QR-код, secret остается на ТВ.
 * Строку не читаем: у анонимного пользователя нет SELECT на signin_tickets.
 * @returns {Promise<{id: string, secret: string, expires_at: number}>}
 */
function createTicket(){
    let ticket = {
        id: uuid(),
        secret: uuid(),
        expires_at: Date.now() + TTL
    }

    return request('signin_tickets', {
        method: 'POST',
        headers: {Prefer: 'return=minimal'},
        body: {id: ticket.id, secret: ticket.secret}
    }).then(()=> ticket)
}

/**
 * Опрашивать билет, пока телефон его не подтвердит или он не истек
 * @param {{id: string, secret: string, expires_at: number}} ticket
 * @param {function(object): void} onApproved - получает сессию Supabase
 * @param {function(): void} onExpired
 * @returns {{stop: function(): void}}
 */
function poll(ticket, onApproved, onExpired){
    let timer = setInterval(()=>{
        if(Date.now() >= ticket.expires_at){
            stop()

            onExpired()

            return
        }

        request('rpc/claim_signin_ticket', {
            method: 'POST',
            body: {p_id: ticket.id, p_secret: ticket.secret}
        }).then(rows=>{
            if(rows && rows.length){
                stop()

                onApproved(rows[0])
            }
        }).catch(()=>{})
    }, INTERVAL)

    function stop(){
        clearInterval(timer)
    }

    return {stop}
}

/**
 * Подтвердить билет с телефона. Вызывается страницей входа с уже полученной сессией.
 * @param {string} id - id билета из QR-кода
 * @param {{token: string, refresh_token: string, expires_at: number, user_id: string, email: string}} session
 * @returns {Promise<boolean>} true, если билет был подтвержден
 */
function approve(id, session){
    return request('rpc/approve_signin_ticket', {
        method: 'POST',
        token: session.token,
        body: {p_id: id, p_session: session}
    })
}

export default {
    createTicket,
    poll,
    approve
}
