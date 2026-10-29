// Word, number and quick-reaction games on DOM.
const SQ = [100, 100]
const WORDS = {
    4: 'moon star fire wind rain snow wave leaf rose lake rock gold wolf bear frog bird jump play game cake road tree ship'.split(' '),
    5: 'apple brave candy dream eagle flame ghost heart ivory joker karma lemon magic night ocean pearl queen river storm tiger ultra vivid whale'.split(' '),
    6: 'bridge castle dragon flower garden hunter island jungle knight marble nature orange planet rocket silver tunnel violet window'.split(' '),
    7: 'balance captain dolphin emerald fantasy gallery harvest journey kingdom lantern mystery network penguin rainbow sunrise thunder'.split(' ')
}
const ALL = [].concat(...Object.values(WORDS))
const KB = ['QWERTYUIOP', 'ASDFGHJKL⌫', 'ZXCVBNM↵  ']

// On-screen keyboard for remotes and touch: arrows move, OK types. Physical keys type too.
function osk(env, onKey, css = 'inset:auto 0 0 0;height:30%;gap:.3em;padding:.5em'){
    let g = env.grid(10, 3, (c, i) => {
        let ch = KB[(i / 10) | 0][i % 10]
        c.textContent = ch.trim()
        c.style.fontSize = '1.5em'
        c.style.visibility = ch == ' ' ? 'hidden' : ''
        c.dataset.k = ch
    }, i => { let ch = KB[(i / 10) | 0][i % 10]; if(ch != ' ') onKey(ch) }, {css, start: 10})
    env.on('key', e => {
        if(e.target && e.target.tagName == 'INPUT') return
        if(e.keyCode == 8) onKey('⌫')
        else if(e.keyCode == 13) onKey('↵')
        else if(/^[a-z]$/i.test(e.key)) onKey(e.key.toUpperCase())
    })
    return g
}

function numberGame(env, speak){
    let target = env.rnd(1, 101) | 0, tries = 0, val = '', max = 7
    let say = document.createElement('div')
    say.style.cssText = 'position:absolute;left:0;right:0;top:8%;text-align:center'
    say.innerHTML = '<div style="font-size:1.2em;opacity:.6">I picked a number from 1 to 100</div><div class="n" style="font-size:5em;font-weight:800;height:1.3em;margin-top:.2em"></div><div class="m" style="font-size:1.4em;height:1.4em"></div><div class="t" style="opacity:.5;margin-top:.5em"></div>'
    env.el.appendChild(say)
    const show = (m, col) => { say.querySelector('.n').textContent = val; say.querySelector('.m').textContent = m || ''; say.querySelector('.m').style.color = col || ''; say.querySelector('.t').textContent = `Tries left: ${max - tries}` }
    function guess(n){
        if(!(n >= 1 && n <= 100)) return show('Say a number from 1 to 100', '#FF9F0A')
        tries++; val = String(n)
        if(n == target){ env.score(Math.max(10, (max + 1 - tries) * 14), 1); show('Correct!', '#30D158'); return env.after(() => env.over(`It was ${target}`, true), 600) }
        if(tries >= max){ show(''); return env.over(`It was ${target}`) }
        show(n < target ? 'Higher ↑' : 'Lower ↓', n < target ? '#64D2FF' : '#FF9F0A'); env.sfx('tap')
        if(!speak) val = ''
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const NUM = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100}
    if(speak && SR){
        let b = env.buttons(['🎤 Speak a number'], () => {
            let r = new SR(); r.lang = 'en-US'; show('Listening…')
            r.onresult = e => { let t = e.results[0][0].transcript.toLowerCase(), n = parseInt(t.replace(/\D/g, '')) || t.split(/[\s-]+/).reduce((a, w) => a + (NUM[w] || 0), 0); guess(n) }
            r.onerror = () => show('Could not hear you · try again', '#FF9F0A')
            try { r.start() } catch(e){}
        }, {modal: false})
        env.on('press', k => k == 'ok' && b.bs[0].click())
        show('Tap the mic and say your guess')
        return
    }
    // typed: number pad
    let pad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']
    env.grid(3, 4, (c, i) => { c.textContent = pad[i]; c.style.fontSize = '1.6em' }, i => {
        let k = pad[i]
        if(k == '⌫') val = val.slice(0, -1)
        else if(k == '✓'){ if(val) guess(+val) ; return }
        else if(val.length < 3) val += k
        show('')
    }, {css: 'inset:auto 22% 2% 22%;height:42%;gap:.3em;padding:0', start: 4})
    env.on('key', e => { if(/^\d$/.test(e.key) && val.length < 3){ val += e.key; show('') } else if(e.keyCode == 8){ val = val.slice(0, -1); show('') } else if(e.keyCode == 13 && val) guess(+val) })
    show('')
}

export default [
{
    id: 'wordle', options: [{id: 'letters', label: 'Word length', def: 1, values: [{id: 4, label: '4 letters'}, {id: 5, label: '5 letters'}, {id: 6, label: '6 letters'}, {id: 7, label: '7 letters'}]}], title: 'Wordle', emoji: '🔤', c1: '#30D158', c2: '#FFD60A', size: [100, 110], hint: 'Guess the hidden word · green = right spot, yellow = wrong spot',
    start(env){
        let n, word, row = 0, cur = '', board, kb
        const colors = {g: '#2f9e44', y: '#d1a000', x: '#3a3a40'}
        function begin(len){
            n = len; word = env.pick(WORDS[n]).toUpperCase()
            board = env.grid(n, 6, c => { c.style.fontSize = (n > 5 ? 2.2 : 2.8) + 'em'; c.style.fontWeight = 800 }, null, {static: true, css: `inset:2% auto auto 50%;transform:translateX(-50%);height:62%;width:${11.2 * n}%;gap:.3em;padding:0`})
            kb = osk(env, key)
            tick()
        }
        const tick = () => board.cells.forEach((c, i) => { if((i / n | 0) == row){ c.textContent = cur[i % n] || ''; c.style.boxShadow = cur[i % n] ? '0 0 0 .1em rgba(255,255,255,.5)' : '' } })
        function key(k){
            if(row > 5) return
            if(k == '⌫') cur = cur.slice(0, -1)
            else if(k == '↵'){ if(cur.length == n) submit() ; return }
            else if(cur.length < n) cur += k
            env.sfx('tap'); tick()
        }
        function submit(){
            let res = Array(n).fill('x'), left = word.split('')
            for(let i = 0; i < n; i++) if(cur[i] == word[i]){ res[i] = 'g'; left[i] = null }
            for(let i = 0; i < n; i++) if(res[i] == 'x' && left.includes(cur[i])){ res[i] = 'y'; left[left.indexOf(cur[i])] = null }
            res.forEach((r, i) => { let c = board.cells[row * n + i]; c.style.background = colors[r]; c.style.boxShadow = '' })
            kb.cells.forEach(c => { let j = cur.indexOf(c.dataset.k); if(j > -1){ let r = res[j], old = c.dataset.s; if(old != 'g'){ c.style.background = colors[r]; c.dataset.s = r } } })
            if(cur == word){ env.score((6 - row) * 20, 1); env.sfx('win'); return env.after(() => env.over('Solved!', true), 600) }
            row++; cur = ''
            if(row == 6) env.over(`The word was ${word}`)
        }
        begin(+env.opts.letters)
    }
},
{
    id: 'hangman', title: 'Hangman', emoji: '🪢', c1: '#FF9F0A', c2: '#FF453A', size: [100, 110], hint: 'Pick letters · 6 wrong guesses and it is over',
    start(env){
        let word = env.pick(ALL).toUpperCase(), got = new Set(), wrong = 0
        let art = document.createElement('div')
        art.style.cssText = 'position:absolute;left:0;right:0;top:2%;height:34%;display:flex;align-items:center;justify-content:center'
        let wd = document.createElement('div')
        wd.style.cssText = 'position:absolute;left:0;right:0;top:38%;text-align:center;font-size:3em;font-weight:800;letter-spacing:.25em;font-variant-numeric:tabular-nums'
        env.el.append(art, wd)
        const parts = ['<circle cx="60" cy="30" r="10"/>', '<path d="M60 40v35"/>', '<path d="M60 48l-16 14"/>', '<path d="M60 48l16 14"/>', '<path d="M60 75l-14 22"/>', '<path d="M60 75l14 22"/>']
        const draw = () => {
            art.innerHTML = `<svg viewBox="0 0 120 110" style="height:100%" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"><path d="M20 105h50M35 105V8h25v14" stroke="#8E8E93"/><g stroke="#FF453A">${parts.slice(0, wrong).join('')}</g></svg>`
            wd.textContent = [...word].map(c => got.has(c) ? c : '_').join(' ')
        }
        osk(env, k => {
            if(!/^[A-Z]$/.test(k)) return
            let cell = [...env.el.querySelectorAll('[data-k]')].find(c => c.dataset.k == k)
            if(got.has(k) || (cell && cell.dataset.used)) return
            got.add(k); cell && (cell.dataset.used = 1)
            if(word.includes(k)){ cell.style.background = '#2f9e44'; env.sfx('good'); env.score(10, 1) } else { cell.style.background = '#7a1f1f'; wrong++; env.sfx('bad') }
            draw()
            if([...word].every(c => got.has(c))) env.after(() => env.over('You saved him!', true), 500)
            else if(wrong >= 6) env.over(`The word was ${word}`)
        })
        draw()
    }
},
{
    id: 'rps', title: 'Rock Paper Scissors', emoji: '✂️', c1: '#FF375F', c2: '#FF9F0A', size: SQ, hint: 'First to lose 3 rounds ends the run · score is your wins',
    start(env){
        const H = ['✊', '✋', '✌️'], N = ['Rock', 'Paper', 'Scissors']
        let lives = 3, you = document.createElement('div'), cpu = document.createElement('div'), msg = document.createElement('div')
        const st = 'position:absolute;top:18%;width:40%;text-align:center;font-size:6em;line-height:1.2'
        you.style.cssText = st + ';left:5%'; cpu.style.cssText = st + ';right:5%;transform:scaleX(-1)'
        msg.style.cssText = 'position:absolute;left:0;right:0;top:55%;text-align:center;font-size:2em;font-weight:800'
        you.textContent = cpu.textContent = '❔'
        env.el.append(you, cpu, msg)
        const hearts = () => '❤️'.repeat(lives) + '🖤'.repeat(3 - lives)
        let top = document.createElement('div'); top.style.cssText = 'position:absolute;left:0;right:0;top:4%;text-align:center;font-size:1.6em'; top.textContent = hearts(); env.el.appendChild(top)
        let busy = false
        env.buttons(H.map((h, i) => `<span style="font-size:1.8em">${h}</span>`), i => {
            if(busy) return; busy = true
            let c = env.rnd(3); you.textContent = H[i]; cpu.textContent = H[c]
            let r = (i - c + 3) % 3 // 0 draw, 1 win, 2 lose
            msg.textContent = ['Draw', 'You win!', 'You lose'][r]; msg.style.color = ['#fff', '#30D158', '#FF453A'][r]
            if(r == 1){ env.score(1, 1); env.sfx('good') } else if(r == 2){ lives--; env.sfx('bad') }
            top.textContent = hearts()
            if(!lives) return env.after(() => env.over('Computer wins'), 700)
            env.after(() => { busy = false; you.textContent = cpu.textContent = '❔'; msg.textContent = '' }, 900)
        })
    }
},
{
    id: 'numtype', title: 'Number Guess', emoji: '🔟', c1: '#64D2FF', c2: '#0A84FF', size: SQ, hint: 'Find the number between 1 and 100 in 7 tries',
    start(env){ numberGame(env, false) }
},
{
    id: 'typing', title: 'Typing Test', emoji: '⌨️', c1: '#5E5CE6', c2: '#64D2FF', size: SQ, hint: 'Type the sentence · accuracy and speed are scored',
    start(env){
        const S = ['the quick brown fox jumps over the lazy dog', 'streaming is better when the couch is comfortable', 'small steps every day make a big difference', 'practice makes progress not perfection', 'a good story keeps you watching until the end', 'kyiv is a city of chestnuts and golden domes', 'every great film begins with a single idea', 'focus on the signal and ignore the noise']
        let list = env.shuffle(S).slice(0, 5), i = 0, t0 = 0, chars = 0, errs = 0
        let box = document.createElement('div'); box.style.cssText = 'position:absolute;left:6%;right:6%;top:12%;font-size:2.2em;line-height:1.5;font-weight:500;word-break:break-word'
        let info = document.createElement('div'); info.style.cssText = 'position:absolute;left:0;right:0;top:3%;text-align:center;opacity:.55'
        env.el.append(box, info)
        let inp = env.input('Start typing…')
        const draw = () => {
            let s = list[i], v = inp.value
            box.innerHTML = [...s].map((c, k) => `<span style="color:${k < v.length ? (v[k] == c ? '#30D158' : '#FF453A') : 'rgba(255,255,255,.5)'};${k == v.length ? 'border-bottom:.08em solid var(--accent,#C8F542)' : ''}">${c == ' ' ? '&nbsp;' : c}</span>`).join('')
            info.textContent = `Sentence ${i + 1}/5`
        }
        inp.oninput = () => {
            if(!t0) t0 = Date.now()
            let s = list[i], v = inp.value
            if(v.length && v[v.length - 1] != s[v.length - 1]){ errs++; env.sfx('bad') }
            draw()
            if(v == s){
                chars += s.length; i++; inp.value = ''; env.sfx('good')
                if(i == list.length){
                    let min = (Date.now() - t0) / 60000, wpm = Math.round(chars / 5 / min), acc = Math.max(0, Math.round(100 - errs / (chars + errs) * 100))
                    env.score(Math.round(wpm * acc / 100)); return env.over(`${wpm} WPM · ${acc}% accuracy`, true)
                }
                draw()
            }
        }
        draw()
    }
},
{
    id: 'speedtype', title: 'Speed Typing', emoji: '⚡', c1: '#FFD60A', c2: '#FF375F', size: SQ, hint: 'Type each word and press space · 45 seconds',
    start(env){
        let left = 45, streak = 0
        let w = document.createElement('div'); w.style.cssText = 'position:absolute;left:0;right:0;top:25%;text-align:center;font-size:5em;font-weight:800;letter-spacing:.02em'
        let t = document.createElement('div'); t.style.cssText = 'position:absolute;left:0;right:0;top:6%;text-align:center;font-size:2em;opacity:.8;font-variant-numeric:tabular-nums'
        let s = document.createElement('div'); s.style.cssText = 'position:absolute;left:0;right:0;top:52%;text-align:center;font-size:1.3em;opacity:.6'
        env.el.append(w, t, s)
        let word = env.pick(ALL), inp = env.input('Type here')
        const show = () => { let v = inp.value; w.innerHTML = [...word].map((c, k) => `<span style="color:${k < v.length ? (v[k] == c ? '#30D158' : '#FF453A') : '#fff'}">${c}</span>`).join(''); t.textContent = left + 's'; s.textContent = streak > 2 ? `🔥 streak ${streak}` : '' }
        inp.oninput = () => {
            let v = inp.value
            if(v.endsWith(' ') || v == word){
                if(v.trim() == word){ streak++; env.score(word.length * (1 + Math.min(streak, 10) / 10) | 0, 1); env.sfx('good') } else { streak = 0; env.sfx('bad') }
                word = env.pick(ALL); inp.value = ''
            }
            show()
        }
        env.timer(() => { left--; show(); if(left <= 0) env.over("Time's up") }, 1000)
        show()
    }
},
]
