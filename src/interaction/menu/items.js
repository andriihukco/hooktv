/**
 * Sections of the main menu, in order. The top tab bar follows the same order.
 */
export const menu_items = [
    {action: 'main', title: 'menu_main', sprite: 'home'},
    {action: 'movie', title: 'menu_movies', sprite: 'movie'},
    {action: 'cartoon', title: 'menu_multmovie', sprite: 'cartoon'},
    {action: 'tv', title: 'menu_tv', sprite: 'tv'},
    {action: 'ua_tv', title: 'menu_ua_tv', sprite: 'live_tv'},
    {action: 'video', title: 'menu_video', sprite: 'video'},
    {action: 'catalog', title: 'menu_catalog', sprite: 'catalog'},
    {action: 'filter', title: 'menu_filter', sprite: 'filter'},
    {action: 'favorite', title: 'settings_input_links', sprite: 'favorite'},
    {action: 'history', title: 'menu_history', sprite: 'history'},
    {action: 'timetable', title: 'menu_timeline', sprite: 'calendar'},
    {action: 'mytorrents', title: 'menu_torrents', sprite: 'torrent'},
]

/**
 * Sections kept in minimal UI (the top tab bar)
 */
export const minimalActions = ['main', 'movie', 'tv', 'ua_tv', 'video']
