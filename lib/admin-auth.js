const crypto = require('crypto')

/**
 * Compares two strings in constant time, so the password cannot be guessed by timing
 * @param {string} given - what the client sent
 * @param {string} expected - the configured password
 * @returns {boolean}
 */
function samePassword(given, expected){
    const a = crypto.createHash('sha256').update(String(given)).digest()
    const b = crypto.createHash('sha256').update(String(expected)).digest()

    return crypto.timingSafeEqual(a, b) && given === expected
}

/**
 * Reads the password from a Basic auth header ("Basic base64(user:password)")
 * @param {string} header - the Authorization header
 * @returns {string|null}
 */
function passwordFrom(header){
    const m = /^Basic\s+(.+)$/i.exec(header || '')

    if(!m) return null

    const decoded = Buffer.from(m[1], 'base64').toString('utf8')
    const at = decoded.indexOf(':')

    return at < 0 ? null : decoded.slice(at + 1)
}

/**
 * Middleware to check admin auth on request
 * @param {object} req - request object
 * @param {object} res - response object
 * @returns {boolean} true if authorized, false otherwise
 */
function checkAuth(req, res){
    const expected = process.env.ADMIN_PASSWORD

    if(!expected){
        res.status(503).json({error: 'ADMIN_PASSWORD is not set'})
        return false
    }

    const given = passwordFrom(req.headers.authorization)

    if(given === null || !samePassword(given, expected)){
        res.setHeader('WWW-Authenticate', 'Basic realm="HOOK TV admin", charset="UTF-8"')
        res.status(401).json({error: 'Unauthorized'})
        return false
    }

    return true
}

module.exports = {
    samePassword,
    passwordFrom,
    checkAuth
}
