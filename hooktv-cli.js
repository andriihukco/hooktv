#!/usr/bin/env node
const https = require('https');
const readline = require('readline');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TIMEOUT_MS = 15000;
const PAGE_SIZE = 10;

// Alcopa's /capi/* endpoints are not usable from this script:
//  - /capi/streams answers {"error":"app"} without the app's signed headers
//    (X-Alpac-Sig, X-Alpac-Nonce, ...), and its JSON bodies are encrypted ({ct, iv}).
//  - /capi/history returns 403 without those headers and is watch history, not sources.
//  - /capi/releases and /capi/details return 404.
// Reproducing the app's request signing or decrypting its responses is out of scope,
// so the details screen reports this instead of guessing at stream data.
const STREAM_STATUS_MESSAGE =
    'Stream sources are not available here: Alcopa requires the official app\'s signed requests.';

if (!TMDB_API_KEY) {
    console.error('Set TMDB_API_KEY in your environment and run again.');
    console.error('  TMDB_API_KEY=... node hooktv-cli.js');
    process.exit(1);
}

function getJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', ...headers },
            timeout: REQUEST_TIMEOUT_MS
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let json;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    reject(new Error(`HTTP ${res.statusCode}: non-JSON response`));
                    return;
                }
                resolve({ status: res.statusCode, json });
            });
        });
        req.on('timeout', () => req.destroy(new Error(`Timed out after ${REQUEST_TIMEOUT_MS} ms`)));
        req.on('error', reject);
    });
}

async function searchMedia(query) {
    const q = encodeURIComponent(query);
    const urls = [
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${q}&language=ru-RU`,
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${q}`
    ];
    let lastError = null;
    for (const url of urls) {
        try {
            const { status, json } = await getJson(url);
            if (status !== 200) {
                lastError = new Error(`TMDB HTTP ${status}: ${json.status_message || 'request failed'}`);
                continue;
            }
            if (json.results && json.results.length > 0) return json.results;
        } catch (e) {
            lastError = e;
        }
    }
    if (lastError) throw lastError;
    return [];
}

function mediaTypeLabel(item) {
    return (item.media_type || 'unknown').toUpperCase();
}

function titleOf(item) {
    return item.title || item.name || item.original_title || 'Unnamed';
}

function yearOf(item) {
    return (item.release_date || item.first_air_date || '').slice(0, 4);
}

function clearScreen() {
    console.clear();
    console.log('========================================================');
    console.log('                 HOOKTV — CLI lookup                    ');
    console.log('========================================================\n');
}

const rl = require.main === module
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;

function promptSearch() {
    clearScreen();
    rl.question('Search query (Eng/Cyrillic, e.g. "Невский" or "Шрек"): ', async (query) => {
        if (!query.trim()) { promptSearch(); return; }
        console.log(`\nSearching for "${query}"...`);
        try {
            const results = (await searchMedia(query.trim()))
                .filter((i) => i.media_type === 'movie' || i.media_type === 'tv');
            if (results.length === 0) {
                rl.question('\nNo results found. Try another spelling. Press Enter...', promptSearch);
                return;
            }
            selectResult(results);
        } catch (err) {
            rl.question(`\nSearch failed: ${err.message}\nPress Enter to try again...`, promptSearch);
        }
    });
}

function selectResult(results) {
    const shown = results.slice(0, PAGE_SIZE);
    clearScreen();
    console.log('--- SEARCH RESULTS (Top 10) ---');
    shown.forEach((item, idx) => {
        const year = yearOf(item);
        console.log(`[${idx + 1}] ${titleOf(item)} ${year ? `(${year})` : ''} [${mediaTypeLabel(item)}] — ID: ${item.id}`);
    });
    console.log('[0] Back to Search');

    rl.question('\nSelect number to open title details: ', async (input) => {
        const choice = parseInt(input.trim(), 10);
        if (choice === 0 || Number.isNaN(choice)) { promptSearch(); return; }
        const selected = shown[choice - 1];
        if (!selected) { selectResult(results); return; }
        showDetails(selected);
    });
}

function showDetails(item) {
    clearScreen();
    const year = yearOf(item);
    console.log(`Title: ${titleOf(item)} ${year ? `(${year})` : ''}`);
    console.log(`Type: ${mediaTypeLabel(item)} | TMDB ID: ${item.id}`);
    console.log(`Overview: ${item.overview || 'No description available.'}\n`);
    console.log(`--- STREAMING SOURCES ---\n${STREAM_STATUS_MESSAGE}`);
    rl.question('\nPress Enter to return to search...', promptSearch);
}

if (require.main === module) {
    rl.on('close', () => process.exit(0));
    promptSearch();
}


module.exports = { searchMedia, titleOf, yearOf, mediaTypeLabel, getJson };
