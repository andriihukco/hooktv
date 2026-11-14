export default function canStart(Lampa, alreadyStarted){
    return !alreadyStarted &&
        !!Lampa &&
        !!Lampa.Manifest &&
        Array.isArray(Lampa.Manifest.plugins) &&
        !!Lampa.Component &&
        typeof Lampa.Component.add == 'function' &&
        !!Lampa.Activity &&
        typeof Lampa.Activity.push == 'function'
}
