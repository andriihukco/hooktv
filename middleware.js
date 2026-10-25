/**
 * Vercel Routing Middleware: link-preview bots (Telegram, Viber, Facebook, X, ...)
 * do not run the app, so "/" and "/?card=..." are answered by api/title.js with
 * Open Graph tags. People are not affected: everyone else gets the app as usual.
 */

export const BOTS = /facebookexternalhit|facebot|twitterbot|slackbot|telegrambot|whatsapp|discordbot|linkedinbot|googlebot|bingbot|applebot|yandex|vkshare|viber|skypeuripreview|pinterest|redditbot|embedly|iframely|mastodon|bluesky|signal/i

export const config = {matcher: '/'}

export default function middleware(request){
    if(!BOTS.test(request.headers.get('user-agent') || '')) return

    let url = new URL(request.url)

    url.pathname = '/api/title'
    url.searchParams.set('preview', '1')

    // same as @vercel/functions rewrite(), without adding the dependency
    return new Response(null, {headers: {'x-middleware-rewrite': url.toString()}})
}
