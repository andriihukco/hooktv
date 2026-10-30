/**
 * Admin sessions: a signed cookie that lasts 8 hours, set by api/admin/login.js.
 * The signature uses ADMIN_PASSWORD as the HMAC key, so changing the password signs everyone out.
 */

const crypto = require('crypto')

const COOKIE = 'admin_session'
const HOURS = 8

/**
 * Signs an expiry time with the admin password
 * @param {string|number} exp - expiry in ms since the epoch
 * @param {string} secret - ADMIN_PASSWORD
 * @returns {string}
 */
function sign(exp, secret){
    return crypto.createHmac('sha256', secret).update(String(exp)).digest('base64url')
}

/**
 * Makes a new session value that expires in 8 hours
 * @param {string} secret - ADMIN_PASSWORD
 * @returns {{value: string, maxAge: number}}
 */
function issue(secret){
    const exp = Date.now() + HOURS * 3600 * 1000

    return {value: `${exp}.${sign(exp, secret)}`, maxAge: HOURS * 3600}
}

/**
 * The Set-Cookie header for a session. HttpOnly keeps it away from page scripts.
 * @param {string} value - from issue()
 * @param {number} maxAge - seconds
 * @returns {string}
 */
function cookie(value, maxAge){
    return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

/**
 * True when the request carries an unexpired session cookie with a valid signature
 * @param {{headers: object}} req
 * @param {string} secret - ADMIN_PASSWORD
 * @returns {boolean}
 */
function verify(req, secret){
    const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || '')

    if(!m || !secret) return false

    const [exp, sig] = decodeURIComponent(m[1]).split('.')

    if(!exp || !sig || Number(exp) < Date.now()) return false

    const good = sign(exp, secret)

    return sig.length == good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))
}

module.exports = {issue, cookie, verify}
