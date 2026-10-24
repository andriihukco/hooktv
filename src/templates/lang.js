let html = `<div class="lang">
    <div class="lang__backdrop"></div>
    <div class="lang__body">
        <div class="lang__header">
            <div class="lang__logo">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="5"/>
                    <path d="M50 20 L50 50 L70 65" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
                    <circle cx="50" cy="50" r="6" fill="currentColor"/>
                </svg>
            </div>
            <div class="lang__brand">HOOK</div>
        </div>

        <div class="lang__title">Welcome</div>
        <div class="lang__subtitle">Choose your language to get started</div>

        <div class="lang__suggested">
            <div class="selector lang__card lang__card--suggested" data-action="continue-suggested">
                <div class="lang__card-top">
                    <span class="lang__card-badge">
                        <span class="lang__card-flag">🌐</span>
                        <span class="lang__card-badge-text">Recommended</span>
                    </span>
                </div>
                <div class="lang__card-main">
                    <div class="lang__card-title">Continue in English</div>
                    <div class="lang__card-hint">Based on your location</div>
                </div>
                <div class="lang__card-arrow">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </div>

            <div class="selector lang__card lang__card--secondary" data-action="view-all">
                <div class="lang__card-secondary-left">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span class="lang__card-secondary-title">View all languages</span>
                </div>
                <span class="lang__card-count">10</span>
            </div>
        </div>

        <div class="lang__all hide">
            <div class="selector lang__back" data-action="back-suggested">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span class="lang__back-text">Back to recommendation</span>
            </div>
            <div class="lang__selector"></div>
        </div>
    </div>
</div>`

export default html