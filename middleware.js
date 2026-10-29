/**
 * Vercel Routing Middleware: link-preview bots (Telegram, Viber, Facebook, X, ...)
 * do not run the app, so "/" and "/movie/123-title" are answered by api/title.js with
 * Open Graph tags. People are not affected: everyone else gets the app as usual.
 *
 * Old "/?card=123&media=tv" links are sent to "/tv/123" for everybody.
 */

// the same address as parseCardPath() in api/_slug.js (the edge runtime has no require)
function parseCardPath(pathname){
    let m = /^\/(movie|tv)\/(\d{1,12})(?:-[^/]*)?\/?$/.exec(pathname)

    return m ? {media: m[1], id: m[2]} : null
}

export const BOTS = /facebookexternalhit|facebot|twitterbot|slackbot|telegrambot|whatsapp|discordbot|linkedinbot|googlebot|bingbot|applebot|yandex|vkshare|viber|skypeuripreview|pinterest|redditbot|embedly|iframely|mastodon|bluesky|signal/i

export const config = {matcher: ['/', '/movie/:path*', '/tv/:path*']}

export default function middleware(request){
    let url = new URL(request.url)
    let card = url.searchParams.get('card')

    // an old shared link: one address per title
    if(url.pathname == '/' && /^\d{1,12}$/.test(card || '') && (url.searchParams.get('source') || 'tmdb') == 'tmdb'){
        return Response.redirect(url.origin + '/' + (url.searchParams.get('media') == 'tv' ? 'tv' : 'movie') + '/' + card, 301)
    }

    if(!BOTS.test(request.headers.get('user-agent') || '')) return

    let title = parseCardPath(url.pathname)

    url.pathname = '/api/title'
    url.search = ''

    if(title){
        url.searchParams.set('card', title.id)
        url.searchParams.set('media', title.media)
        url.searchParams.set('source', 'tmdb')
    }
    else{
        // keep the query of "/" as it was
        new URL(request.url).searchParams.forEach((v, k)=>url.searchParams.set(k, v))
    }

    url.searchParams.set('preview', '1')

    // same as @vercel/functions rewrite(), without adding the dependency
    return new Response(null, {headers: {'x-middleware-rewrite': url.toString()}})
}
