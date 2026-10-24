/**
 * Modern Card Component
 * Netflix-inspired card with enhanced interactions
 */

import Base from './base'
import Template from '../template'
import Brand from '../../core/brand'

class ModernCard extends Base {
    constructor(data) {
        super(data)
        
        this.cardSize = data.card_size || 'medium'
        this.showProgress = data.show_progress !== false
        this.showFavorite = data.show_favorite !== false
        this.showBadge = data.show_badge !== false
    }
    
    render() {
        let poster = this.object.poster || this.object.img
        let title = this.object.title || this.object.name
        let year = this.object.year || this.object.release_date
        let rating = this.object.rating || this.object.vote_average
        let quality = this.object.quality
        let isNew = this.object.new
        let isTop = this.object.top_10
        let isWatched = this.object.watched
        let watchProgress = this.object.watch_progress || 0
        let isFavorite = this.object.favorite
        
        let html = Template.render('card_modern', {
            poster: poster,
            title: title,
            year: year,
            rating: rating,
            quality: quality,
            is_new: isNew,
            is_top: isTop,
            is_watched: isWatched,
            watch_progress: watchProgress,
            is_favorite: isFavorite,
            size: this.cardSize,
            show_progress: this.showProgress,
            show_favorite: this.showFavorite,
            show_badge: this.showBadge
        })
        
        this.html = $(html)
        this.bindEvents()
        
        return this.html
    }
    
    bindEvents() {
        // Hover effects
        this.html.on('mouseenter', () => {
            this.emit('hover', this.object)
        })
        
        this.html.on('mouseleave', () => {
            this.emit('hover_out', this.object)
        })
        
        // Click
        this.html.on('click', (e) => {
            if (e.target.closest('.card-modern__favorite')) {
                this.toggleFavorite()
            } else {
                this.emit('click', this.object)
            }
        })
        
        // Focus for TV navigation
        this.html.on('focus', () => {
            this.html.addClass('focus')
            this.emit('focus', this.object)
        })
        
        this.html.on('blur', () => {
            this.html.removeClass('focus')
            this.emit('blur', this.object)
        })
    }
    
    toggleFavorite() {
        this.object.favorite = !this.object.favorite
        this.emit('favorite_toggle', this.object)
        this.updateFavoriteState()
    }
    
    updateFavoriteState() {
        const favoriteEl = this.html.find('.card-modern__favorite')
        if (this.object.favorite) {
            favoriteEl.addClass('card-modern__favorite--active')
        } else {
            favoriteEl.removeClass('card-modern__favorite--active')
        }
    }
    
    updateProgress(progress) {
        this.object.watch_progress = progress
        const progressBar = this.html.find('.card-modern__progress-bar')
        progressBar.css('width', progress + '%')
    }
    
    setLoading() {
        this.html.addClass('card-modern--loading')
    }
    
    setError() {
        this.html.removeClass('card-modern--loading')
        this.html.addClass('card-modern--error')
    }
    
    setLoaded() {
        this.html.removeClass('card-modern--loading')
        this.html.removeClass('card-modern--error')
    }
}

export default ModernCard
