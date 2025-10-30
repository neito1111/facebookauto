class LandingTracker {
    constructor() {
        this.serverSubId = null;
        this.payload = {};
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.collectData();
            this.trackClick();
            this.setupCtaHandler();
        });
    }

    collectData() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Get Facebook cookies
        const fbp = this.getCookie('_fbp');
        const fbc = this.getCookie('_fbc');
        
        // Generate fbc if not exists but fbclid is present
        let generatedFbc = fbc;
        if (!fbc && urlParams.get('fbclid')) {
            const fbclid = urlParams.get('fbclid');
            const timestamp = Math.floor(Date.now() / 1000);
            generatedFbc = `fb.1.${timestamp}.${fbclid}`;
        }

        // Collect all tracking data
        this.payload = {
            full_url: window.location.href,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent,
            ip: '', // Will be filled by server
            utm_source: urlParams.get('utm_source') || '',
            utm_medium: urlParams.get('utm_medium') || '',
            utm_campaign: urlParams.get('utm_campaign') || '',
            utm_content: urlParams.get('utm_content') || '',
            utm_term: urlParams.get('utm_term') || '',
            fbclid: urlParams.get('fbclid') || '',
            fbp: fbp || '',
            fbc: generatedFbc || '',
            keitaro_sub_id: urlParams.get('sub_id') || urlParams.get('subid') || '',
            route: this.detectRoute(),
            manager: urlParams.get('m') || urlParams.get('manager') || ''
        };

        // Store in localStorage for 7 days
        this.storePayload();
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    detectRoute() {
        // Detect route based on URL or other parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('route') || 'default';
    }

    storePayload() {
        const storageData = {
            payload: this.payload,
            timestamp: Date.now(),
            expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        };
        localStorage.setItem('tracking_data', JSON.stringify(storageData));
    }

    async trackClick() {
        try {
            const response = await fetch('/api/track-click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.serverSubId = data.server_sub_id;
            
            // Store server_sub_id
            this.payload.server_sub_id = this.serverSubId;
            this.storePayload();

            console.log('Click tracked:', data);
            
            // Show chat link info if available
            if (data.chat_link) {
                this.showChatInfo(data.chat_link);
            }

        } catch (error) {
            console.error('Error tracking click:', error);
        }
    }

    showChatInfo(chatLink) {
        // You can show some info about the chat link if needed
        console.log('Chat link assigned:', chatLink);
    }

    setupCtaHandler() {
        const ctaButton = document.getElementById('cta');
        if (ctaButton) {
            ctaButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCtaClick();
            });
        }
    }

    async handleCtaClick() {
        if (!this.serverSubId) {
            console.error('No server_sub_id available');
            return;
        }

        try {
            const response = await fetch('/api/track-cta-click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    server_sub_id: this.serverSubId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Redirect to the provided URL
            if (data.redirect) {
                window.location.href = data.redirect;
            }

        } catch (error) {
            console.error('Error tracking CTA click:', error);
            // Fallback: try to redirect anyway
            if (this.serverSubId) {
                window.location.href = `/u?ref=${this.serverSubId}`;
            }
        }
    }

    // Utility method to get stored data
    getStoredData() {
        try {
            const stored = localStorage.getItem('tracking_data');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.expires > Date.now()) {
                    return data.payload;
                } else {
                    localStorage.removeItem('tracking_data');
                }
            }
        } catch (error) {
            console.error('Error reading stored data:', error);
        }
        return null;
    }
}

// Initialize tracker
new LandingTracker();
