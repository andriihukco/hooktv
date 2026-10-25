let html = `<div class="search__body">
    <div class="search__input-shell">
        <div class="search__input-icon"><svg><use xlink:href="#sprite-search"></use></svg></div>
        <div class="search__input">#{search_input}...</div>
        <div class="search__keys-toggle selector" aria-label="Keyboard"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="2" y="6" width="20" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></div>
    </div>
    <div class="search__keypad"><div class="simple-keyboard"></div></div>
    <div class="search__history" data-area="history"></div>
    <div class="search__sources" data-area="sources"></div>
    <div class="search__results"></div>
</div>`

export default html