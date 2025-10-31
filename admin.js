class AdminPanel {
    constructor() {
        this.socket = null;
        this.currentTab = 'dashboard';
        this.selectedClick = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupTabs();
        this.loadDashboard();
        this.setupEventListeners();
    }

    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('click', (data) => {
            console.log('New click received:', data);
            this.handleNewClick(data);
        });

        this.socket.on('redirect', (data) => {
            console.log('New redirect received:', data);
            this.handleNewRedirect(data);
        });

        this.socket.on('lead_created', (data) => {
            console.log('New lead created:', data);
            this.handleNewLead(data);
        });
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connection-status');
        if (connected) {
            status.className = 'badge bg-success pulse';
            status.innerHTML = '<i class="fas fa-circle me-1"></i>Подключено';
        } else {
            status.className = 'badge bg-danger';
            status.innerHTML = '<i class="fas fa-circle me-1"></i>Отключено';
        }
    }

    setupTabs() {
        const tabLinks = document.querySelectorAll('[data-tab]');
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = link.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabName).style.display = 'block';
        
        // Add active class to selected nav link
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch(tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'clicks':
                this.loadClicks();
                break;
            case 'cta':
                this.loadCtaClicks();
                break;
            case 'redirects':
                this.loadRedirects();
                break;
            case 'leads':
                this.loadLeads();
                break;
            case 'chat-links':
                this.loadChatLinks();
                break;
            case 'pixel-settings':
                this.loadPixelSettings();
                break;
            case 'logs':
                this.loadLogs();
                break;
            case 'users':
                this.loadUsers();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load stats
            const stats = await this.fetchData('/api/dashboard/stats');
            this.updateStats(stats);

            // Load charts data
            const chartData = await this.fetchData('/api/dashboard/charts');
            this.updateCharts(chartData);

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async loadClicks() {
        try {
            const clicks = await this.fetchData('/api/clicks');
            this.renderClicksTable(clicks);
        } catch (error) {
            console.error('Error loading clicks:', error);
        }
    }

    async loadCtaClicks() {
        try {
            const ctaClicks = await this.fetchData('/api/cta-clicks');
            this.renderCtaClicksTable(ctaClicks);
        } catch (error) {
            console.error('Error loading CTA clicks:', error);
        }
    }

    async loadRedirects() {
        try {
            const redirects = await this.fetchData('/api/redirects');
            this.renderRedirectsTable(redirects);
        } catch (error) {
            console.error('Error loading redirects:', error);
        }
    }

    async loadLeads() {
        try {
            const leads = await this.fetchData('/api/leads');
            this.renderLeadsTable(leads);
        } catch (error) {
            console.error('Error loading leads:', error);
        }
    }

    async loadChatLinks() {
        try {
            const chatLinks = await this.fetchData('/api/chat-links');
            this.chatLinks = chatLinks;
            this.renderChatLinksTable(chatLinks);
        } catch (error) {
            console.error('Error loading chat links:', error);
        }
    }

    async loadPixelSettings() {
        try {
            const settings = await this.fetchData('/api/pixel-settings');
            this.pixelSettings = settings;
            this.renderPixelSettingsTable(settings);
        } catch (error) {
            console.error('Error loading pixel settings:', error);
        }
    }

    async loadUsers() {
        try {
            const users = await this.fetchData('/api/users');
            this.users = users;
            this.renderUsersTable(users);
        } catch (e) {
            console.error('Error loading users', e);
            alert('Ошибка загрузки пользователей (доступ только для админа)');
        }
    }

    async loadLogs() {
        const linesInput = document.getElementById('logs-lines');
        const lines = Math.max(50, parseInt(linesInput ? linesInput.value : '200', 10) || 200);
        try {
            const res = await fetch(`/api/logs/capi?lines=${encodeURIComponent(lines)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const pre = document.getElementById('logs-content');
            if (pre) pre.textContent = (data.lines || []).join('\n');
        } catch (e) {
            console.error('Error loading logs:', e);
        }
    }

    toggleLogsAutoRefresh() {
        if (this._logsTimer) {
            clearInterval(this._logsTimer);
            this._logsTimer = null;
            const btn = document.getElementById('logs-autorefresh-toggle');
            if (btn) btn.classList.remove('active');
        } else {
            this._logsTimer = setInterval(() => {
                if (this.currentTab === 'logs') this.loadLogs();
            }, 5000);
            const btn = document.getElementById('logs-autorefresh-toggle');
            if (btn) btn.classList.add('active');
        }
    }

    async clearLogs() {
        try {
            // Admin can choose scope; for simplicity detect via button confirm
            let scope = 'mine';
            if (confirm('Очистить все логи? Нажмите Отмена для очистки только ваших.')) {
                scope = 'all';
            }
            const res = await fetch('/api/logs/capi/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                this.loadLogs();
                alert('Логи очищены');
            } else {
                alert('Не удалось очистить логи');
            }
        } catch (e) {
            console.error('Error clearing logs', e);
            alert('Ошибка очистки логов');
        }
    }

    async fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    updateStats(stats) {
        document.getElementById('total-clicks').textContent = stats.total_clicks || 0;
        document.getElementById('total-cta').textContent = stats.total_cta || 0;
        document.getElementById('total-redirects').textContent = stats.total_redirects || 0;
        document.getElementById('total-leads').textContent = stats.total_leads || 0;
    }

    updateCharts(data) {
        // Clicks chart
        const clicksCtx = document.getElementById('clicksChart');
        if (clicksCtx && data.clicks_by_day) {
            // Destroy previous instance to avoid stacking
            if (this.charts.clicks && typeof this.charts.clicks.destroy === 'function') {
                this.charts.clicks.destroy();
            }
            const clicksData = (data.clicks_by_day.data || []).map(v => Number(v) || 0);
            const suggestedMax = Math.max(5, Math.max(...clicksData, 0) * 1.2);
            this.charts.clicks = new Chart(clicksCtx, {
                type: 'line',
                data: {
                    labels: data.clicks_by_day.labels,
                    datasets: [{
                        label: 'Клики',
                        data: clicksData,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.25,
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: suggestedMax
                        }
                    },
                    animation: {
                        duration: 400
                    }
                }
            });
        }

        // Sources chart
        const sourcesCtx = document.getElementById('sourcesChart');
        if (sourcesCtx && data.sources) {
            if (this.charts.sources && typeof this.charts.sources.destroy === 'function') {
                this.charts.sources.destroy();
            }
            this.charts.sources = new Chart(sourcesCtx, {
                type: 'doughnut',
                data: {
                    labels: data.sources.labels,
                    datasets: [{
                        data: (data.sources.data || []).map(v => Number(v) || 0),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    renderClicksTable(clicks) {
        const tbody = document.getElementById('clicks-table-body');
        tbody.innerHTML = '';

        clicks.forEach(click => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${click.id}</td>
                <td>${new Date(click.ts).toLocaleString()}</td>
                <td>${click.ip}</td>
                <td>${click.utm_source || 'Прямой'}</td>
                <td>${click.utm_campaign || '-'}</td>
                <td>${click.fbclid ? click.fbclid.substring(0, 20) + '...' : '-'}</td>
                <td>${click.chat_link ? click.chat_link.slug : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.showClickDetails('${click.server_sub_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderCtaClicksTable(ctaClicks) {
        const tbody = document.getElementById('cta-table-body');
        tbody.innerHTML = '';

        ctaClicks.forEach(cta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cta.id}</td>
                <td>${cta.server_sub_id}</td>
                <td>${new Date(cta.ts).toLocaleString()}</td>
                <td>${cta.click.ip}</td>
                <td>${cta.click.utm_source || 'Прямой'}</td>
                <td>${cta.click.utm_campaign || '-'}</td>
                <td>${cta.click.fbclid ? cta.click.fbclid.substring(0, 20) + '...' : '-'}</td>
                <td>${cta.click.chat_link ? `${cta.click.chat_link.slug} ${cta.click.chat_link.marker || ''}` : '-'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" title="Lead" onclick="adminPanel.createLeadFromCta('Lead','${cta.server_sub_id}')"><i class="fas fa-check"></i></button>
                        <button class="btn btn-warning" title="Subscribe" onclick="adminPanel.createLeadFromCta('Subscribe','${cta.server_sub_id}')"><i class="fas fa-bell"></i></button>
                        <button class="btn btn-danger" title="Reject" onclick="adminPanel.createLeadFromCta('Reject','${cta.server_sub_id}')"><i class="fas fa-times"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderRedirectsTable(redirects) {
        const tbody = document.getElementById('redirects-table-body');
        tbody.innerHTML = '';

        redirects.forEach(redirect => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${redirect.id}</td>
                <td>${redirect.server_sub_id}</td>
                <td>${new Date(redirect.ts).toLocaleString()}</td>
                <td><a href="${redirect.target_url}" target="_blank">${redirect.target_url}</a></td>
                <td>${redirect.click.ip}</td>
                <td>${redirect.click.utm_source || 'Прямой'}</td>
                <td>${redirect.click.utm_campaign || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderLeadsTable(leads) {
        const tbody = document.getElementById('leads-table-body');
        tbody.innerHTML = '';

        leads.forEach(lead => {
            const statusClass = this.getStatusClass(lead.status);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lead.id}</td>
                <td>${lead.server_sub_id}</td>
                <td>${new Date(lead.ts).toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${lead.status}</span></td>
                <td>${lead.pixel_id}</td>
                <td>${lead.manager}</td>
                <td>${lead.click.ip}</td>
                <td>${lead.click.utm_source || 'Прямой'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderChatLinksTable(chatLinks) {
        const tbody = document.getElementById('chat-links-table-body');
        tbody.innerHTML = '';

        chatLinks.forEach(link => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${link.id}</td>
                <td>${link.slug}</td>
                <td>${link.title}</td>
                <td>${link.message || '-'}</td>
                <td>${link.marker || '-'}</td>
                <td>${link.views}</td>
                <td><span class="badge ${link.active ? 'bg-success' : 'bg-secondary'}">${link.active ? 'Активна' : 'Неактивна'}</span></td>
                <td>${new Date(link.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="adminPanel.editChatLink(${link.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteChatLink(${link.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPixelSettingsTable(settings) {
        const tbody = document.getElementById('pixel-settings-table-body');
        tbody.innerHTML = '';

        settings.forEach(setting => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${setting.id}</td>
                <td>${setting.pixel_id}</td>
                <td>${setting.name}</td>
                <td><span class="badge ${setting.active ? 'bg-success' : 'bg-secondary'}">${setting.active ? 'Активен' : 'Неактивен'}</span></td>
                <td>${new Date(setting.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="adminPanel.editPixel(${setting.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deletePixel(${setting.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'bg-dark' : 'bg-primary'}">${u.role}</span></td>
                <td>${u.slug || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getStatusClass(status) {
        switch(status) {
            case 'success': return 'bg-success';
            case 'Lead': return 'bg-primary';
            case 'Subscribe': return 'bg-warning';
            case 'Reject': return 'bg-danger';
            case 'error': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    async showClickDetails(serverSubId) {
        try {
            const click = await this.fetchData(`/api/clicks/${serverSubId}`);
            this.selectedClick = click;
            this.renderClickModal(click);
            
            const modal = new bootstrap.Modal(document.getElementById('clickModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading click details:', error);
            alert('Ошибка загрузки деталей клика');
        }
    }

    renderClickModal(click) {
        const modalBody = document.getElementById('click-modal-body');
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Основная информация</h6>
                    <table class="table table-sm">
                        <tr><td><strong>ID:</strong></td><td>${click.server_sub_id}</td></tr>
                        <tr><td><strong>Время:</strong></td><td>${new Date(click.ts).toLocaleString()}</td></tr>
                        <tr><td><strong>IP:</strong></td><td>${click.ip}</td></tr>
                        <tr><td><strong>User Agent:</strong></td><td>${click.ua}</td></tr>
                        <tr><td><strong>Referrer:</strong></td><td>${click.referrer || '-'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>UTM параметры</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Source:</strong></td><td>${click.utm_source || '-'}</td></tr>
                        <tr><td><strong>Medium:</strong></td><td>${click.utm_medium || '-'}</td></tr>
                        <tr><td><strong>Campaign:</strong></td><td>${click.utm_campaign || '-'}</td></tr>
                        <tr><td><strong>Content:</strong></td><td>${click.utm_content || '-'}</td></tr>
                        <tr><td><strong>Term:</strong></td><td>${click.utm_term || '-'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6>Facebook параметры</h6>
                    <table class="table table-sm">
                        <tr><td><strong>fbclid:</strong></td><td>${click.fbclid || '-'}</td></tr>
                        <tr><td><strong>fbp:</strong></td><td>${click.fbp || '-'}</td></tr>
                        <tr><td><strong>fbc:</strong></td><td>${click.fbc || '-'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Дополнительно</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Keitaro Sub ID:</strong></td><td>${click.keitaro_sub_id || '-'}</td></tr>
                        <tr><td><strong>Route:</strong></td><td>${click.route || '-'}</td></tr>
                        <tr><td><strong>Chat Link:</strong></td><td>${click.chat_link ? click.chat_link.slug + ' ' + (click.chat_link.marker || '') : '-'}</td></tr>
                    </table>
                </div>
            </div>
        `;
    }

    async createLead(status) {
        if (!this.selectedClick) {
            alert('Не выбран клик');
            return;
        }
        // Fetch stored pixel settings and let user choose one
        let settings = [];
        try {
            settings = await this.fetchData('/api/pixel-settings');
        } catch (e) {
            console.error(e);
        }
        if (!settings.length) {
            alert('Нет настроенных Pixel. Добавьте Pixel в разделе "Настройки Pixel".');
            return;
        }
        const list = settings.map(s => `${s.id}: ${s.name || 'Без названия'} (${s.pixel_id})`).join('\n');
        const input = prompt(`Выберите ID Pixel из списка:\n${list}\n\nВведите ID:`, settings[0].id);
        if (input === null) return;
        const pixelSettingId = parseInt(input, 10);
        if (!settings.find(s => s.id === pixelSettingId)) {
            alert('Неверный ID Pixel');
            return;
        }

        try {
            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    server_sub_id: this.selectedClick.server_sub_id,
                    status: status,
                    pixel_setting_id: pixelSettingId,
                    manager: 'admin'
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Лид создан: ${result.status}`);
                bootstrap.Modal.getInstance(document.getElementById('clickModal')).hide();
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating lead:', error);
            alert('Ошибка создания лида');
        }
    }

    async createLeadFromCta(status, serverSubId) {
        // Fetch stored pixels and choose one
        let settings = [];
        try {
            settings = await this.fetchData('/api/pixel-settings');
        } catch (e) {
            console.error(e);
        }
        if (!settings.length) {
            alert('Нет настроенных Pixel. Добавьте Pixel в разделе "Настройки Pixel".');
            return;
        }
        const list = settings.map(s => `${s.id}: ${s.name || 'Без названия'} (${s.pixel_id})`).join('\n');
        const input = prompt(`Выберите ID Pixel из списка:\n${list}\n\nВведите ID:`, settings[0].id);
        if (input === null) return;
        const pixelSettingId = parseInt(input, 10);
        if (!settings.find(s => s.id === pixelSettingId)) {
            alert('Неверный ID Pixel');
            return;
        }

        try {
            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server_sub_id: serverSubId,
                    status: status,
                    pixel_setting_id: pixelSettingId,
                    manager: 'admin'
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Лид создан: ${result.status}`);
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating lead:', error);
            alert('Ошибка создания лида');
        }
    }

    handleNewClick(data) {
        // Update stats
        const totalClicks = document.getElementById('total-clicks');
        totalClicks.textContent = parseInt(totalClicks.textContent) + 1;

        // If on clicks tab, add to table
        if (this.currentTab === 'clicks') {
            this.loadClicks();
        }
    }

    handleNewRedirect(data) {
        // Update stats
        const totalRedirects = document.getElementById('total-redirects');
        totalRedirects.textContent = parseInt(totalRedirects.textContent) + 1;

        // If on redirects tab, add to table
        if (this.currentTab === 'redirects') {
            this.loadRedirects();
        }
    }

    handleNewLead(data) {
        // Update stats
        const totalLeads = document.getElementById('total-leads');
        totalLeads.textContent = parseInt(totalLeads.textContent) + 1;

        // If on leads tab, add to table
        if (this.currentTab === 'leads') {
            this.loadLeads();
        }
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }

    // Filtering methods
    async filterClicks() {
        const search = document.getElementById('search-clicks').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const source = document.getElementById('source-filter').value;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (source) params.append('source', source);

        try {
            const clicks = await this.fetchData(`/api/clicks?${params.toString()}`);
            this.renderClicksTable(clicks);
        } catch (error) {
            console.error('Error filtering clicks:', error);
        }
    }

    async filterCtaClicks() {
        const search = document.getElementById('search-cta').value;
        const dateFrom = document.getElementById('cta-date-from').value;
        const dateTo = document.getElementById('cta-date-to').value;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);

        try {
            const ctaClicks = await this.fetchData(`/api/cta-clicks?${params.toString()}`);
            this.renderCtaClicksTable(ctaClicks);
        } catch (error) {
            console.error('Error filtering CTA clicks:', error);
        }
    }

    async filterRedirects() {
        const search = document.getElementById('search-redirects').value;
        const dateFrom = document.getElementById('redirects-date-from').value;
        const dateTo = document.getElementById('redirects-date-to').value;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);

        try {
            const redirects = await this.fetchData(`/api/redirects?${params.toString()}`);
            this.renderRedirectsTable(redirects);
        } catch (error) {
            console.error('Error filtering redirects:', error);
        }
    }

    async filterLeads() {
        const search = document.getElementById('search-leads').value;
        const status = document.getElementById('status-filter').value;
        const dateFrom = document.getElementById('leads-date-from').value;
        const dateTo = document.getElementById('leads-date-to').value;
        const manager = document.getElementById('manager-filter').value;

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (manager) params.append('manager', manager);

        try {
            const leads = await this.fetchData(`/api/leads?${params.toString()}`);
            this.renderLeadsTable(leads);
        } catch (error) {
            console.error('Error filtering leads:', error);
        }
    }

    // Chat Links management
    showAddChatLinkModal() {
        document.getElementById('chat-link-form').reset();
        const saveBtn = document.querySelector('#addChatLinkModal .btn.btn-primary');
        if (saveBtn) saveBtn.dataset.editId = '';
        const title = document.querySelector('#addChatLinkModal .modal-title');
        if (title) title.textContent = 'Добавить бизнес-ссылку';
        const modal = new bootstrap.Modal(document.getElementById('addChatLinkModal'));
        modal.show();
    }

    async saveChatLink() {
        const saveBtn = document.querySelector('#addChatLinkModal .btn.btn-primary');
        const editId = saveBtn ? saveBtn.dataset.editId : '';
        const isEdit = !!editId;
        const formData = {
            action: isEdit ? 'update' : 'create',
            id: isEdit ? parseInt(editId, 10) : undefined,
            slug: document.getElementById('link-slug').value,
            title: document.getElementById('link-title').value,
            message: document.getElementById('link-message').value,
            marker: document.getElementById('link-marker').value,
            active: document.getElementById('link-active').checked
        };

        try {
            const response = await fetch('/api/chat-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addChatLinkModal')).hide();
                this.loadChatLinks();
                alert(isEdit ? 'Ссылка обновлена успешно' : 'Ссылка создана успешно');
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.error}`);
            }
        } catch (error) {
            console.error('Error saving chat link:', error);
            alert('Ошибка сохранения ссылки');
        }
    }

    async editChatLink(id) {
        try {
            let link = (this.chatLinks || []).find(l => l.id === id);
            if (!link) {
                await this.loadChatLinks();
                link = (this.chatLinks || []).find(l => l.id === id);
            }
            if (!link) {
                alert('Ссылка не найдена');
                return;
            }
            document.getElementById('link-slug').value = link.slug || '';
            document.getElementById('link-title').value = link.title || '';
            document.getElementById('link-message').value = link.message || '';
            document.getElementById('link-marker').value = link.marker || '';
            document.getElementById('link-active').checked = !!link.active;
            const saveBtn = document.querySelector('#addChatLinkModal .btn.btn-primary');
            if (saveBtn) saveBtn.dataset.editId = String(id);
            const title = document.querySelector('#addChatLinkModal .modal-title');
            if (title) title.textContent = 'Изменить бизнес-ссылку';
            const modal = new bootstrap.Modal(document.getElementById('addChatLinkModal'));
            modal.show();
        } catch (e) {
            console.error('Edit chat link error', e);
            alert('Ошибка загрузки данных ссылки');
        }
    }

    async deleteChatLink(id) {
        if (confirm('Вы уверены, что хотите удалить эту ссылку?')) {
            try {
                const response = await fetch('/api/chat-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id: id })
                });

                if (response.ok) {
                    this.loadChatLinks();
                    alert('Ссылка удалена успешно');
                } else {
                    const error = await response.json();
                    alert(`Ошибка: ${error.error}`);
                }
            } catch (error) {
                console.error('Error deleting chat link:', error);
                alert('Ошибка удаления ссылки');
            }
        }
    }

    // Pixel Settings management
    showAddPixelModal() {
        document.getElementById('pixel-form').reset();
        const saveBtn = document.querySelector('#addPixelModal .btn.btn-primary');
        if (saveBtn) saveBtn.dataset.editId = '';
        const title = document.querySelector('#addPixelModal .modal-title');
        if (title) title.textContent = 'Добавить Pixel';
        const modal = new bootstrap.Modal(document.getElementById('addPixelModal'));
        modal.show();
    }

    async savePixel() {
        const saveBtn = document.querySelector('#addPixelModal .btn.btn-primary');
        const editId = saveBtn ? saveBtn.dataset.editId : '';
        const isEdit = !!editId;
        const formData = {
            action: isEdit ? 'update' : 'create',
            id: isEdit ? parseInt(editId, 10) : undefined,
            pixel_id: document.getElementById('pixel-id').value,
            name: document.getElementById('pixel-name').value,
            allowed_domain: document.getElementById('pixel-allowed-domain').value,
            access_token: document.getElementById('pixel-token').value,
            active: document.getElementById('pixel-active').checked
        };

        try {
            const response = await fetch('/api/pixel-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addPixelModal')).hide();
                this.loadPixelSettings();
                alert(isEdit ? 'Pixel обновлен успешно' : 'Pixel создан успешно');
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.error}`);
            }
        } catch (error) {
            console.error('Error saving pixel:', error);
            alert('Ошибка сохранения Pixel');
        }
    }

    async editPixel(id) {
        try {
            let pixel = (this.pixelSettings || []).find(p => p.id === id);
            if (!pixel) {
                await this.loadPixelSettings();
                pixel = (this.pixelSettings || []).find(p => p.id === id);
            }
            if (!pixel) {
                alert('Pixel не найден');
                return;
            }
            document.getElementById('pixel-id').value = pixel.pixel_id || '';
            document.getElementById('pixel-name').value = pixel.name || '';
            document.getElementById('pixel-allowed-domain').value = pixel.allowed_domain || '';
            document.getElementById('pixel-token').value = '';
            document.getElementById('pixel-active').checked = !!pixel.active;
            const saveBtn = document.querySelector('#addPixelModal .btn.btn-primary');
            if (saveBtn) saveBtn.dataset.editId = String(id);
            const title = document.querySelector('#addPixelModal .modal-title');
            if (title) title.textContent = 'Изменить Pixel';
            const modal = new bootstrap.Modal(document.getElementById('addPixelModal'));
            modal.show();
        } catch (e) {
            console.error('Edit pixel error', e);
            alert('Ошибка загрузки Pixel');
        }
    }

    async deletePixel(id) {
        if (confirm('Вы уверены, что хотите удалить этот Pixel?')) {
            try {
                const response = await fetch('/api/pixel-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id: id })
                });

                if (response.ok) {
                    this.loadPixelSettings();
                    alert('Pixel удален успешно');
                } else {
                    const error = await response.json();
                    alert(`Ошибка: ${error.error}`);
                }
            } catch (error) {
                console.error('Error deleting pixel:', error);
                alert('Ошибка удаления Pixel');
            }
        }
    }

    // Database management
    showClearDbModal() {
        const modal = new bootstrap.Modal(document.getElementById('clearDbModal'));
        modal.show();
    }

    // Users management
    showAddUserModal() {
        const form = document.getElementById('user-form');
        if (form) form.reset();
        const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
        modal.show();
    }

    async saveUser() {
        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;
        const slug = document.getElementById('user-slug').value;
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', email, password, role: 'manager', slug })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            this.loadUsers();
            alert('Менеджер создан');
        } catch (e) {
            console.error('Create user error', e);
            alert('Ошибка создания пользователя: ' + e.message);
        }
    }

    async deleteUser(id) {
        if (!confirm('Удалить пользователя?')) return;
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            this.loadUsers();
            alert('Пользователь удален');
        } catch (e) {
            console.error('Delete user error', e);
            alert('Ошибка удаления пользователя: ' + e.message);
        }
    }

    async clearDatabase() {
        const password = document.getElementById('clear-password').value;
        if (password !== '7788') {
            alert('Неверный пароль!');
            return;
        }

        if (confirm('Вы уверены, что хотите удалить ВСЕ данные из базы? Это действие необратимо!')) {
            try {
                const response = await fetch('/api/clear-database', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                });

                if (response.ok) {
                    bootstrap.Modal.getInstance(document.getElementById('clearDbModal')).hide();
                    this.loadDashboard();
                    alert('База данных очищена успешно');
                } else {
                    const error = await response.json();
                    alert(`Ошибка: ${error.error}`);
                }
            } catch (error) {
                console.error('Error clearing database:', error);
                alert('Ошибка очистки базы данных');
            }
        }
    }

    // Export methods
    exportClicks() {
        console.log('Exporting clicks...');
    }

    exportCtaClicks() {
        console.log('Exporting CTA clicks...');
    }

    exportRedirects() {
        console.log('Exporting redirects...');
    }

    exportLeads() {
        console.log('Exporting leads...');
    }
}

// Global functions for HTML onclick handlers
function refreshDashboard() {
    adminPanel.loadDashboard();
}

function filterClicks() {
    adminPanel.filterClicks();
}

function filterCtaClicks() {
    adminPanel.filterCtaClicks();
}

function filterRedirects() {
    adminPanel.filterRedirects();
}

function filterLeads() {
    adminPanel.filterLeads();
}

function exportClicks() {
    adminPanel.exportClicks();
}

function exportCtaClicks() {
    adminPanel.exportCtaClicks();
}

function exportRedirects() {
    adminPanel.exportRedirects();
}

function exportLeads() {
    adminPanel.exportLeads();
}

function createLead(status) {
    adminPanel.createLead(status);
}

function showAddChatLinkModal() {
    adminPanel.showAddChatLinkModal();
}

function saveChatLink() {
    adminPanel.saveChatLink();
}

function showAddPixelModal() {
    adminPanel.showAddPixelModal();
}

function savePixel() {
    adminPanel.savePixel();
}

function showClearDbModal() {
    adminPanel.showClearDbModal();
}

function clearDatabase() {
    adminPanel.clearDatabase();
}

function showAddUserModal() {
    adminPanel.showAddUserModal();
}

function saveUser() {
    adminPanel.saveUser();
}

// Initialize admin panel
const adminPanel = new AdminPanel();
