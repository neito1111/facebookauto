class AdminPanel {
    constructor() {
        this.socket = null;
        this.currentClicksPage = 1;
        this.currentClicksPerPage = 25;
        this.currentCtaPage = 1;
        this.currentCtaPerPage = 25;
        this.currentLeadsPage = 1;
        this.currentLeadsPerPage = 25;
        this.currentPurchasesPage = 1;
        this.currentPurchasesPerPage = 25;
        this.currentKeitaroPage = 1;
        this.currentKeitaroPerPage = 25;
        this.currentInvalidPage = 1;
        this.currentInvalidPerPage = 25;
        this.currentUsersPage = 1;
        this.currentUsersPerPage = 25;
        this.currentPixelPage = 1;
        this.currentPixelPerPage = 25;
        this.currentLandingsPage = 1;
        this.currentLandingsPerPage = 25;
        this.currentRedirectsPage = 1;
        this.currentRedirectsPerPage = 25;
        this.currentReportsManagerPage = 1;
        this.currentReportsManagerPerPage = 25;
        this.currentReportsCampaignPage = 1;
        this.currentReportsCampaignPerPage = 25;
        this.currentManagersAnalyticsPage = 1;
        this.currentManagersAnalyticsPerPage = 25;
        this.currentTab = 'dashboard';
        this.selectedClick = null;
        this.charts = {};
        this.selectedManagerId = '';
        this.selectedManagerSlug = '';
        this.currentUser = null;
        const savedTz = localStorage.getItem('display_timezone');
        this.timezone = savedTz && savedTz !== 'auto' ? savedTz : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        this.init();
    }

    // Helper function to format date in selected timezone
    formatKyivTime(dateString) {
        if (!dateString) return '-';
        let date;
        // Server sends ISO strings, typically without 'Z' - treat as UTC
        if (typeof dateString === 'string') {
            // Check if string has timezone info
            const hasTimezone = dateString.includes('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/);

            if (hasTimezone) {
                // Has timezone info, parse as-is
                date = new Date(dateString);
            } else {
                // No timezone info - parse as UTC explicitly
                // Extract date components and create UTC date
                const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
                if (match) {
                    // Create date in UTC explicitly
                    const [, year, month, day, hour, minute, second, ms] = match;
                    const msPart = ms ? parseFloat(ms) * 1000 : 0;
                    date = new Date(Date.UTC(
                        parseInt(year, 10),
                        parseInt(month, 10) - 1,
                        parseInt(day, 10),
                        parseInt(hour, 10),
                        parseInt(minute, 10),
                        parseInt(second, 10),
                        msPart
                    ));
                } else {
                    // Fallback: try with 'Z' suffix
                    date = new Date(dateString + 'Z');
                }
            }
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return '-';

        // Ensure we have a valid timezone
        const tz = this.timezone === 'auto' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : this.timezone;
        return date.toLocaleString('ru-RU', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    formatKyivDate(dateString) {
        if (!dateString) return '-';
        let date;
        // Server sends ISO strings, typically without 'Z' - treat as UTC
        if (typeof dateString === 'string') {
            // Check if string has timezone info
            const hasTimezone = dateString.includes('Z') || dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/);

            if (hasTimezone) {
                // Has timezone info, parse as-is
                date = new Date(dateString);
            } else {
                // No timezone info - parse as UTC explicitly
                // Extract date components and create UTC date
                const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/);
                if (match) {
                    // Create date in UTC explicitly
                    const [, year, month, day, hour, minute, second, ms] = match;
                    const msPart = ms ? parseFloat(ms) * 1000 : 0;
                    date = new Date(Date.UTC(
                        parseInt(year, 10),
                        parseInt(month, 10) - 1,
                        parseInt(day, 10),
                        parseInt(hour, 10),
                        parseInt(minute, 10),
                        parseInt(second, 10),
                        msPart
                    ));
                } else {
                    // Fallback: try with 'Z' suffix
                    date = new Date(dateString + 'Z');
                }
            }
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return '-';

        const tz = this.timezone === 'auto' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : this.timezone;
        return date.toLocaleDateString('ru-RU', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    init() {
        this.setupSocket();
        this.setupTabs();
        this.loadDashboard();
        this.setupEventListeners();
        this.setupMobileMenu();
        this.loadCurrentUser();
        this.setupTimezoneControl();
        this.setupDashboardDateRange();
    }

    setupTimezoneControl() {
        try {
            const select = document.getElementById('timezone-select');
            if (!select) return;
            const zones = [
                { v: 'auto', t: `Авто (${Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'})` },
                { v: 'UTC', t: 'UTC (GMT+0)' },
                { v: 'Europe/London', t: 'GMT+0' },
                { v: 'Europe/Paris', t: 'GMT+1' },
                { v: 'Europe/Berlin', t: 'GMT+1' },
                { v: 'Europe/Athens', t: 'GMT+2' },
                { v: 'Europe/Helsinki', t: 'GMT+2' },
                { v: 'Europe/Minsk', t: 'GMT+3' },
                { v: 'Europe/Moscow', t: 'GMT+3' },
                { v: 'Asia/Dubai', t: 'GMT+4' },
                { v: 'Asia/Karachi', t: 'GMT+5' },
                { v: 'Asia/Dhaka', t: 'GMT+6' },
                { v: 'Asia/Bangkok', t: 'GMT+7' },
                { v: 'Asia/Hong_Kong', t: 'GMT+8' },
                { v: 'Asia/Tokyo', t: 'GMT+9' },
                { v: 'Australia/Sydney', t: 'GMT+10' },
                { v: 'Pacific/Auckland', t: 'GMT+12' },
                { v: 'America/New_York', t: 'GMT-5' },
                { v: 'America/Chicago', t: 'GMT-6' },
                { v: 'America/Denver', t: 'GMT-7' },
                { v: 'America/Los_Angeles', t: 'GMT-8' }
            ];
            select.innerHTML = '';
            zones.forEach(z => {
                const opt = document.createElement('option');
                opt.value = z.v;
                opt.textContent = z.t;
                select.appendChild(opt);
            });
            const saved = localStorage.getItem('display_timezone');
            select.value = saved ? saved : 'auto';
            // Initialize timezone properly
            if (!saved || saved === 'auto') {
                this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            } else {
                this.timezone = saved;
            }
            select.addEventListener('change', () => {
                const val = select.value;
                if (val === 'auto') {
                    localStorage.removeItem('display_timezone');
                    this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                } else {
                    localStorage.setItem('display_timezone', val);
                    this.timezone = val;
                }
                // Reload current tab to re-render times
                this.loadTabData(this.currentTab);
            });
        } catch (_) { }
    }

    async loadCurrentUser() {
        try {
            const user = await this.fetchData('/api/current-user');
            this.currentUser = user;
            const emailEl = document.getElementById('current-user-email');
            if (emailEl) {
                const base = user.email;
                const imp = user.impersonating ? ` (имперс. от ${user.impersonator_email || 'admin'})` : '';
                emailEl.textContent = base + imp;
                emailEl.title = `Роль: ${user.role}${user.slug ? ` | Slug: ${user.slug}` : ''}`;
            }
            // If impersonating, show a quick button in sidebar header to stop
            if (user.impersonating) {
                let container = document.getElementById('current-user-info');
                if (container && !document.getElementById('stop-impersonate-btn')) {
                    const btn = document.createElement('button');
                    btn.id = 'stop-impersonate-btn';
                    btn.className = 'btn btn-xs btn-warning ms-2';
                    btn.style.padding = '2px 6px';
                    btn.style.fontSize = '11px';
                    btn.innerHTML = '<i class="fas fa-user-shield me-1"></i>Назад к админу';
                    btn.onclick = () => this.stopImpersonate();
                    container.appendChild(btn);
                }
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    setupSocket() {
        try {
            if (typeof io !== 'function') {
                console.warn('Socket.io client not available; running without realtime');
                return;
            }
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
        } catch (e) {
            console.error('Socket setup failed, continuing without realtime:', e);
        }
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

        // Setup dropdown toggles
        const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const dropdownId = toggle.getAttribute('data-dropdown');
                const menu = document.getElementById(`${dropdownId}-dropdown`);
                if (menu) {
                    const isOpen = menu.classList.contains('show');
                    if (isOpen) {
                        menu.classList.remove('show');
                        toggle.classList.add('collapsed');
                    } else {
                        // Close other dropdowns
                        document.querySelectorAll('.nav-dropdown-menu.show').forEach(m => {
                            m.classList.remove('show');
                        });
                        document.querySelectorAll('.nav-dropdown-toggle').forEach(t => {
                            t.classList.add('collapsed');
                        });
                        // Open this dropdown
                        menu.classList.add('show');
                        toggle.classList.remove('collapsed');
                    }
                }
            });
        });
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });

        // Remove active class from all nav links and dropdown items
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll('.nav-dropdown-item').forEach(item => {
            item.classList.remove('active');
        });

        // Clear bot status timer if switching away from keitaro tab
        if (this.currentTab === 'keitaro' && tabName !== 'keitaro') {
            if (this._tgbotStatusTimer) {
                clearInterval(this._tgbotStatusTimer);
                this._tgbotStatusTimer = null;
            }
        }

        // Show selected tab
        const tab = document.getElementById(tabName);
        if (tab) {
            tab.style.display = 'block';
        }

        // Add active class to selected nav link or dropdown item
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            // If it's a dropdown item, open the parent dropdown
            if (activeLink.classList.contains('nav-dropdown-item')) {
                const dropdown = activeLink.closest('.nav-dropdown-menu');
                if (dropdown) {
                    dropdown.classList.add('show');
                    const toggle = document.querySelector(`[data-dropdown="${dropdown.id.replace('-dropdown', '')}"]`);
                    if (toggle) {
                        toggle.classList.remove('collapsed');
                    }
                }
            }
        }

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch (tabName) {
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
            case 'purchases':
                this.loadPurchases();
                break;
            case 'keitaro':
                this.loadKeitaroClicks();
                this.loadKeitaroConfig();
                this.loadTgbotManagers(); // Initial load
                // Start status refresh timer for bot managers
                if (this._tgbotStatusTimer) {
                    clearInterval(this._tgbotStatusTimer);
                }
                this._tgbotStatusTimer = setInterval(() => {
                    this.loadTgbotManagers();
                }, 5000); // Update every 5 seconds
                break;
            case 'invalid-clicks':
                this.loadInvalidClicks();
                break;
            case 'reports':
                this.initReportsFilters();
                this.loadReports();
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
            case 'bot-logs':
                this.initBotLogsTab();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'landings':
                this.initLandingsTab();
                break;
            case 'managers-analytics':
                this.loadManagersAnalytics();
                break;
        }
    }

    async initLandingsTab() {
        // Populate manager dropdown
        try {
            const usersResponse = await this.fetchData('/api/users');
            const users = usersResponse.items || usersResponse || [];
            const managers = users.filter(u => u.role === 'manager');
            const container = document.getElementById('landings');
            if (!container) {
                console.error('Landings container not found');
                return;
            }

            // Ensure selector exists (id: landings-manager-select)
            let sel = document.getElementById('landings-manager-select');
            if (!sel) {
                const toolbar = container.querySelector('.btn-toolbar');
                if (!toolbar) {
                    console.error('Toolbar not found in landings tab');
                    return;
                }

                // Create wrapper and select element
                const wrap = document.createElement('div');
                wrap.className = 'ms-2 me-2';
                wrap.innerHTML = `
                    <div class="input-group input-group-sm" style="width: 280px;">
                        <span class="input-group-text">Менеджер</span>
                        <select class="form-select" id="landings-manager-select">
                            <option value="">Выберите менеджера...</option>
                        </select>
                    </div>`;
                toolbar.prepend(wrap);

                sel = document.getElementById('landings-manager-select');
                if (!sel) {
                    console.error('Failed to create landings-manager-select');
                    return;
                }

                // Add event listener
                sel.addEventListener('change', () => {
                    this.selectedManagerId = sel.value || '';
                    const mgr = managers.find(m => String(m.id) === this.selectedManagerId);
                    this.selectedManagerSlug = mgr && mgr.slug ? mgr.slug : '';
                    // Disable actions until manager chosen
                    this.toggleLandingActions(!!this.selectedManagerId);
                    // Reset to page 1 when manager changes
                    this.currentLandingsPage = 1;
                    this.loadLandings();
                });
            }
            sel.innerHTML = '<option value="">Выберите менеджера...</option>';
            managers.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.email}${m.slug ? ` (${m.slug})` : ''}`;
                sel.appendChild(opt);
            });
            // Initially disable actions
            this.toggleLandingActions(false);
            // Clear table
            this.renderLandingsTable([]);
        } catch (e) {
            console.error('Init landings tab error', e);
        }
    }

    toggleLandingActions(enabled) {
        const ids = ['landing-file', 'landing-name', 'landing-folder', 'landing-utm-source', 'landing-utm-campaign', 'landing-param-key', 'landing-param-value'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !enabled; });
        const buttons = [
            'showUploadLandingModal', 'showAddLandingModal', 'saveLanding', 'uploadLanding'
        ];
        // No direct refs; rely on toolbar buttons
        const landingsTab = document.getElementById('landings');
        if (landingsTab) {
            landingsTab.querySelectorAll('button').forEach(btn => {
                if (btn.textContent && (btn.textContent.includes('Загрузить ZIP') || btn.textContent.includes('Добавить лендинг'))) {
                    btn.disabled = !enabled;
                }
            });
        }
    }

    async loadDashboard() {
        try {
            // Get date range
            const range = this.dashboardDateRange || { type: 'today' };
            const dates = this.calculateDateRange(range.type);

            // Update label
            const labelEl = document.getElementById('dashboard-date-range-label');
            if (labelEl) {
                const labels = {
                    'today': 'Сегодня',
                    'yesterday': 'Вчера',
                    'week': 'Текущая неделя',
                    'last7': 'Последние 7 дней',
                    'month': 'Текущий месяц',
                    'last30': 'Последние 30 дней',
                    'prev_month': 'Предыдущий месяц',
                    'custom': 'Интервал'
                };
                labelEl.textContent = labels[range.type] || 'Сегодня';
            }

            const params = new URLSearchParams();
            if (dates.from) params.append('date_from', dates.from);
            if (dates.to) params.append('date_to', dates.to);
            const qs = params.toString() ? '?' + params.toString() : '';

            // Load stats
            const stats = await this.fetchData(`/api/dashboard/stats${qs}`);
            this.updateStats(stats);

            // Load charts data
            const chartData = await this.fetchData(`/api/dashboard/charts${qs}`);
            this.updateCharts(chartData);

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    calculateDateRange(type) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let from, to;

        switch (type) {
            case 'today':
                from = new Date(today);
                to = new Date(today);
                to.setHours(23, 59, 59, 999);
                break;
            case 'yesterday':
                from = new Date(today);
                from.setDate(from.getDate() - 1);
                to = new Date(from);
                to.setHours(23, 59, 59, 999);
                break;
            case 'week': // Current week (starting Monday)
                const day = today.getDay() || 7; // 1 (Mon) to 7 (Sun)
                from = new Date(today);
                from.setDate(from.getDate() - day + 1);
                to = new Date(today);
                to.setHours(23, 59, 59, 999);
                break;
            case 'last7':
                from = new Date(today);
                from.setDate(from.getDate() - 6);
                to = new Date(today);
                to.setHours(23, 59, 59, 999);
                break;
            case 'month': // Current month
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = new Date(today);
                to.setHours(23, 59, 59, 999);
                break;
            case 'last30':
                from = new Date(today);
                from.setDate(from.getDate() - 29);
                to = new Date(today);
                to.setHours(23, 59, 59, 999);
                break;
            case 'prev_month':
                from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                to = new Date(today.getFullYear(), today.getMonth(), 0);
                to.setHours(23, 59, 59, 999);
                break;
            case 'custom':
                if (this.dashboardDateRange && this.dashboardDateRange.from && this.dashboardDateRange.to) {
                    return {
                        from: this.dashboardDateRange.from,
                        to: this.dashboardDateRange.to
                    };
                }
                return { from: null, to: null };
        }

        // Format as ISO string (YYYY-MM-DDTHH:mm:ss)
        const formatDate = (d) => {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        return {
            from: formatDate(from),
            to: formatDate(to)
        };
    }

    setupDashboardDateRange() {
        const menu = document.getElementById('dashboard-date-range-menu');
        if (!menu) return;

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const type = item.getAttribute('data-range');

                // Update active state
                menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (type === 'custom') {
                    const modal = new bootstrap.Modal(document.getElementById('dashboardDateRangeModal'));
                    modal.show();
                } else {
                    this.dashboardDateRange = { type };
                    this.loadDashboard();
                }
            });
        });
    }

    applyCustomDashboardDate() {
        const from = document.getElementById('dashboard-date-from').value;
        const to = document.getElementById('dashboard-date-to').value;

        if (!from || !to) {
            alert('Выберите обе даты');
            return;
        }

        // Add time to make it end of day for 'to' date
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        const pad = (n) => n.toString().padStart(2, '0');
        const toIso = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}T23:59:59`;

        this.dashboardDateRange = {
            type: 'custom',
            from: from + 'T00:00:00',
            to: toIso
        };

        const modalEl = document.getElementById('dashboardDateRangeModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        this.loadDashboard();
    }

    async loadClicks(page = 1, perPage = 25) {
        try {
            const response = await this.fetchData(`/api/clicks?page=${page}&per_page=${perPage}`);
            if (response.items) {
                // New pagination format
                this.renderClicksTable(response.items);
                this.renderPagination('clicks', response.pagination, 'loadClicks');
                this.currentClicksPage = page;
                this.currentClicksPerPage = perPage;
            } else {
                // Legacy format (array)
                this.renderClicksTable(response);
            }
        } catch (error) {
            console.error('Error loading clicks:', error);
        }
    }

    async loadCtaClicks(page = this.currentCtaPage || 1, perPage = this.currentCtaPerPage || 25) {
        try {
            const search = document.getElementById('search-cta')?.value || '';
            const dateFrom = document.getElementById('cta-date-from')?.value;
            const dateTo = document.getElementById('cta-date-to')?.value;

            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);
            if (search) params.append('search', search);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await this.fetchData(`/api/cta-clicks?${params.toString()}`);
            if (response.items) {
                this.renderCtaClicksTable(response.items);
                this.renderPagination('cta', response.pagination, 'loadCtaClicks');
                this.currentCtaPage = response.pagination.page;
                this.currentCtaPerPage = response.pagination.per_page;
            } else {
                this.renderCtaClicksTable(response);
                this.renderPagination('cta', null, 'loadCtaClicks');
            }
        } catch (error) {
            console.error('Error loading CTA clicks:', error);
        }
    }

    async loadRedirects(page = this.currentRedirectsPage || 1, perPage = this.currentRedirectsPerPage || 25) {
        try {
            const search = document.getElementById('search-redirects')?.value || '';
            const dateFrom = document.getElementById('redirects-date-from')?.value;
            const dateTo = document.getElementById('redirects-date-to')?.value;

            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);
            if (search) params.append('search', search);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await this.fetchData(`/api/redirects?${params.toString()}`);
            if (response.items) {
                this.renderRedirectsTable(response.items);
                this.renderPagination('redirects', response.pagination, 'loadRedirects');
                this.currentRedirectsPage = page;
                this.currentRedirectsPerPage = perPage;
            } else {
                this.renderRedirectsTable(response);
            }
        } catch (error) {
            console.error('Error loading redirects:', error);
        }
    }

    async loadLeads(page = this.currentLeadsPage || 1, perPage = this.currentLeadsPerPage || 25) {
        try {
            const search = document.getElementById('search-leads')?.value || '';
            const status = document.getElementById('status-filter')?.value || '';
            const dateFrom = document.getElementById('leads-date-from')?.value;
            const dateTo = document.getElementById('leads-date-to')?.value;
            const manager = document.getElementById('manager-filter')?.value || '';

            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            if (manager) params.append('manager', manager);

            const response = await this.fetchData(`/api/leads?${params.toString()}`);
            if (response.items) {
                this.renderLeadsTable(response.items);
                this.renderPagination('leads', response.pagination, 'loadLeads');
                this.currentLeadsPage = page;
                this.currentLeadsPerPage = perPage;
            } else {
                this.renderLeadsTable(response);
            }
        } catch (error) {
            console.error('Error loading leads:', error);
        }
    }

    async loadPurchases(page = this.currentPurchasesPage || 1, perPage = this.currentPurchasesPerPage || 25) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);

            const response = await this.fetchData(`/api/purchases?${params.toString()}`);
            if (response.items) {
                this.renderPurchasesTable(response.items);
                this.renderPagination('purchases', response.pagination, 'loadPurchases');
                this.currentPurchasesPage = page;
                this.currentPurchasesPerPage = perPage;
            } else {
                this.renderPurchasesTable(response);
            }
        } catch (error) {
            console.error('Error loading purchases:', error);
        }
    }

    async loadInvalidClicks(page = this.currentInvalidPage || 1, perPage = this.currentInvalidPerPage || 25) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);

            const response = await this.fetchData(`/api/invalid-clicks?${params.toString()}`);
            const tbody = document.getElementById('invalid-clicks-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            const items = response.items || response || [];
            items.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.id}</td>
                    <td>${this.formatKyivTime(r.ts)}</td>
                    <td>${r.ip || '-'}</td>
                    <td>${(r.country || '-')}${r.city ? ', ' + r.city : ''}</td>
                    <td>${r.utm_source || '-'}</td>
                    <td>${r.utm_campaign || '-'}</td>
                    <td>${r.fbclid ? String(r.fbclid).substring(0, 20) + '...' : '-'}</td>
                    <td><span class="badge bg-warning text-dark">${r.reason}</span></td>
                    <td>${r.landing_url ? `<a href="${r.landing_url}" target="_blank">ссылка</a>` : '-'}</td>
                    <td><code style="font-size:11px;">${r.details ? JSON.stringify(r.details) : '-'}</code></td>
                `;
                tbody.appendChild(tr);
            });

            if (response.pagination) {
                this.renderPagination('invalid-clicks', response.pagination, 'loadInvalidClicks');
                this.currentInvalidPage = page;
                this.currentInvalidPerPage = perPage;
            }
        } catch (e) {
            console.error('Error loading invalid clicks', e);
        }
    }

    async clearInvalidClicks() {
        try {
            let scope = 'mine';
            if (this.currentUser && this.currentUser.role === 'admin') {
                if (confirm('Очистить все некорректные клики? Нажмите Отмена для очистки только ваших.')) {
                    scope = 'all';
                }
            }
            const res = await fetch('/api/invalid-clicks/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                this.loadInvalidClicks(this.currentInvalidPage || 1, this.currentInvalidPerPage || 25);
                alert('Некорректные клики очищены');
            } else {
                alert('Не удалось очистить некорректные клики');
            }
        } catch (e) {
            console.error('Error clearing invalid clicks', e);
            alert('Ошибка очистки: ' + e.message);
        }
    }

    async loadReports() {
        try {
            // Build filters
            const dfEl = document.getElementById('reports-date-from');
            const dtEl = document.getElementById('reports-date-to');
            const campEl = document.getElementById('reports-campaign');
            const mgrEl = document.getElementById('reports-manager');
            const params = new URLSearchParams();
            if (dfEl && dfEl.value) params.append('date_from', dfEl.value);
            if (dtEl && dtEl.value) params.append('date_to', dtEl.value);
            if (campEl && campEl.value) params.append('utm_campaign', campEl.value);
            if (mgrEl && mgrEl.value) params.append('manager_id', mgrEl.value);

            const data = await this.fetchData(`/api/reports${params.toString() ? ('?' + params.toString()) : ''}`);
            const tbodyM = document.getElementById('reports-by-manager');
            const tbodyC = document.getElementById('reports-by-campaign');
            const totalsWrap = document.getElementById('reports-totals');
            if (totalsWrap && data.totals) {
                const t = data.totals;
                totalsWrap.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-3">
                            <div class="card shadow-sm border-0 bg-dark text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="small text-secondary">Клики</div>
                                            <div class="fs-4 fw-bold">${t.clicks}</div>
                                        </div>
                                        <i class="fas fa-mouse-pointer fa-2x text-secondary"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card shadow-sm border-0 bg-dark text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="small text-secondary">CTA</div>
                                            <div class="fs-4 fw-bold">${t.cta}</div>
                                        </div>
                                        <i class="fas fa-hand-pointer fa-2x text-secondary"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card shadow-sm border-0 bg-dark text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="small text-secondary">Лиды</div>
                                            <div class="fs-4 fw-bold">${t.leads}</div>
                                        </div>
                                        <i class="fas fa-user-plus fa-2x text-secondary"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card shadow-sm border-0 bg-dark text-white">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="small text-secondary">Покупки</div>
                                            <div class="fs-4 fw-bold">${t.purchases}</div>
                                        </div>
                                        <i class="fas fa-shopping-cart fa-2x text-secondary"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }
            // Store full data for client-side pagination
            this.reportsData = data;
            this.renderReportsTables(data, this.currentReportsManagerPage || 1, this.currentReportsManagerPerPage || 25, this.currentReportsCampaignPage || 1, this.currentReportsCampaignPerPage || 25);
        } catch (e) {
            console.error('Error loading reports', e);
        }
    }

    renderReportsTables(data, managerPage = 1, managerPerPage = 25, campaignPage = 1, campaignPerPage = 25) {
        const tbodyM = document.getElementById('reports-by-manager');
        const tbodyC = document.getElementById('reports-by-campaign');

        if (tbodyM && data.by_manager) {
            const allManagers = data.by_manager || [];
            const total = allManagers.length;
            const pages = Math.ceil(total / managerPerPage) || 1;
            const start = (managerPage - 1) * managerPerPage;
            const end = start + managerPerPage;
            const paginatedManagers = allManagers.slice(start, end);

            tbodyM.innerHTML = '';
            paginatedManagers.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${m.email || m.slug || ('#' + m.manager_id)}</td>
                    <td>${m.clicks}</td>
                    <td>${m.cta}</td>
                    <td>${m.redirects}</td>
                    <td>${m.leads}</td>
                    <td>${m.purchases}</td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span>${m.cta_rate}%</span>
                            <div class="progress w-100" style="height:6px;">
                                <div class="progress-bar bg-info" role="progressbar" style="width: ${m.cta_rate}%"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span>${m.lead_rate}%</span>
                            <div class="progress w-100" style="height:6px;">
                                <div class="progress-bar bg-success" role="progressbar" style="width: ${m.lead_rate}%"></div>
                            </div>
                        </div>
                    </td>
                `;
                tbodyM.appendChild(tr);
            });

            this.renderPagination('reports-manager', {
                page: managerPage,
                pages: pages,
                per_page: managerPerPage,
                total: total,
                has_next: managerPage < pages,
                has_prev: managerPage > 1
            }, (p, pp) => {
                this.currentReportsManagerPage = p;
                this.currentReportsManagerPerPage = pp;
                this.renderReportsTables(this.reportsData, p, pp, this.currentReportsCampaignPage || 1, this.currentReportsCampaignPerPage || 25);
            });
        }

        if (tbodyC && data.by_campaign) {
            const allCampaigns = data.by_campaign || [];
            const total = allCampaigns.length;
            const pages = Math.ceil(total / campaignPerPage) || 1;
            const start = (campaignPage - 1) * campaignPerPage;
            const end = start + campaignPerPage;
            const paginatedCampaigns = allCampaigns.slice(start, end);

            tbodyC.innerHTML = '';
            paginatedCampaigns.forEach(c => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c.utm_campaign}</td>
                    <td>${c.clicks}</td>
                    <td>${c.leads ?? 0}</td>
                    <td>${c.purchases ?? 0}</td>
                    <td>${c.lead_rate ?? 0}%</td>
                    <td>${c.purchase_rate ?? 0}%</td>
                `;
                tbodyC.appendChild(tr);
            });

            this.renderPagination('reports-campaign', {
                page: campaignPage,
                pages: pages,
                per_page: campaignPerPage,
                total: total,
                has_next: campaignPage < pages,
                has_prev: campaignPage > 1
            }, (p, pp) => {
                this.currentReportsCampaignPage = p;
                this.currentReportsCampaignPerPage = pp;
                this.renderReportsTables(this.reportsData, this.currentReportsManagerPage || 1, this.currentReportsManagerPerPage || 25, p, pp);
            });
        }
    }

    async initReportsFilters() {
        try {
            // Managers list for admin
            const user = await this.fetchData('/api/current-user');
            if (user.role === 'admin') {
                const users = await this.fetchData('/api/users');
                const managers = (users || []).filter(u => u.role === 'manager');
                const sel = document.getElementById('reports-manager');
                if (sel) {
                    sel.innerHTML = '<option value="">Все менеджеры</option>';
                    managers.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.id;
                        opt.textContent = `${m.email}${m.slug ? ` (${m.slug})` : ''}`;
                        sel.appendChild(opt);
                    });
                    sel.disabled = false;
                }
            }
        } catch (_) { }
    }

    async loadKeitaroClicks(page = this.currentKeitaroPage || 1, perPage = this.currentKeitaroPerPage || 25) {
        try {
            const search = document.getElementById('search-keitaro')?.value || '';
            const dateFrom = document.getElementById('keitaro-date-from')?.value;
            const dateTo = document.getElementById('keitaro-date-to')?.value;

            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);
            if (search) params.append('search', search);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await this.fetchData(`/api/keitaro/clicks?${params.toString()}`);
            if (response.items) {
                this.renderKeitaroClicksTable(response.items);
                this.renderPagination('keitaro', response.pagination, 'loadKeitaroClicks');
                this.currentKeitaroPage = page;
                this.currentKeitaroPerPage = perPage;
            } else {
                this.renderKeitaroClicksTable(response);
            }
        } catch (error) {
            console.error('Error loading Keitaro clicks:', error);
        }
    }

    renderKeitaroClicksTable(clicks) {
        const tbody = document.getElementById('keitaro-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        clicks.forEach(click => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${click.id}</td>
                <td><code>${click.server_sub_id.substring(0, 8)}...</code></td>
                <td><code>${click.keitaro_sub_id}</code></td>
                <td>${this.formatKyivTime(click.ts)}</td>
                <td>${click.ip || '-'}</td>
                <td>${click.utm_source || 'Прямой'}</td>
                <td>${click.utm_campaign || '-'}</td>
                <td>${click.fbclid ? click.fbclid.substring(0, 20) + '...' : '-'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" title="Отбить Lead" onclick="adminPanel.createLeadFromKeitaro('Lead','${click.server_sub_id}')"><i class="fas fa-check"></i></button>
                        <button class="btn btn-warning" title="Отбить Purchase" onclick="adminPanel.createLeadFromKeitaro('Purchase','${click.server_sub_id}')"><i class="fas fa-shopping-cart"></i></button>
                        <button class="btn btn-danger" title="Отбить Reject" onclick="adminPanel.createLeadFromKeitaro('Reject','${click.server_sub_id}')"><i class="fas fa-times"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async createLeadFromKeitaro(status, serverSubId) {
        // Pixel is optional - user can skip Facebook CAPI if they only want to send to Keitaro
        let pixelSettingIds = [];

        // Fetch stored pixels and ask user (optional)
        let settings = [];
        try {
            settings = await this.fetchData('/api/pixel-settings');
        } catch (e) {
            console.error(e);
        }

        if (settings.length > 0) {
            const list = settings.map(s => `${s.id}: ${s.name || 'Без названия'} (${s.pixel_id})`).join('\n');
            const input = prompt(`Выберите ID Pixel для отправки в Facebook (необязательно):\n${list}\n\nВведите один или несколько ID через запятую или пробел, либо оставьте пустым для отправки только в Keitaro:`, '');
            if (input !== null && input.trim() !== '') {
                const parsedIds = input
                    .split(/[,\s]+/)
                    .map(part => parseInt(part, 10))
                    .filter(num => !isNaN(num));
                const uniqueIds = Array.from(new Set(parsedIds));
                const validIds = uniqueIds.filter(id => settings.some(s => s.id === id));
                if (validIds.length === 0) {
                    alert('Не найдено валидных ID Pixel, продолжаем без отправки в Facebook');
                } else {
                    pixelSettingIds = validIds;
                }
            }
        }

        try {
            // Create lead first (with manual Keitaro send flag)
            const leadResponse = await fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server_sub_id: serverSubId,
                    status: status,
                    pixel_setting_ids: pixelSettingIds,
                    pixel_setting_id: pixelSettingIds.length ? pixelSettingIds[0] : null,
                    manager: 'admin',
                    manual_keitaro_send: true  // Always send to Keitaro when manually creating from Keitaro tab
                })
            });

            if (!leadResponse.ok) {
                const error = await leadResponse.json().catch(() => ({}));
                throw new Error(error.error || `HTTP ${leadResponse.status}`);
            }

            const leadResult = await leadResponse.json();

            // If status is Purchase, also create purchase
            if (status === 'Purchase') {
                const amount = prompt('Введите сумму покупки (необязательно):', '');
                const purchasePayload = { server_sub_id: serverSubId };
                if (amount && !isNaN(parseFloat(amount))) {
                    purchasePayload.amount = parseFloat(amount);
                }

                await fetch('/api/purchases', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(purchasePayload)
                });
            }

            let message = `Лид создан: ${leadResult.status}`;
            if (leadResult.keitaro_response) {
                message += `\nKeitaro: ${leadResult.keitaro_response.success ? '✅ Успешно отправлено' : '❌ Ошибка: ' + (leadResult.keitaro_response.error || 'Неизвестная ошибка')}`;
            } else {
                message += '\nKeitaro: ⚠️ Не отправлено (нет keitaro_sub_id)';
            }
            if (pixelSettingIds.length > 0) {
                const responses = Array.isArray(leadResult.pixel_response) ? leadResult.pixel_response : (leadResult.pixel_response ? [leadResult.pixel_response] : []);
                if (responses.length === 0) {
                    message += '\nFacebook: ⚠️ Не отправлено';
                } else {
                    const summary = responses.map(item => {
                        const result = item?.response || {};
                        const success = result.success;
                        const emoji = success ? '✅' : (success === false ? '❌' : '⚠️');
                        const label = item?.pixel_id || `ID ${item?.pixel_setting_id ?? '?'}`;
                        const errorText = success || !result.error ? '' : ` (${result.error})`;
                        return `${label}: ${emoji}${errorText}`;
                    }).join(', ');
                    message += `\nFacebook: ${summary}`;
                }
            }
            alert(message);
            this.loadKeitaroClicks();
        } catch (error) {
            console.error('Error creating lead from Keitaro:', error);
            alert('Ошибка создания лида: ' + error.message);
        }
    }

    async sendToKeitaro(serverSubId, status) {
        try {
            const res = await fetch('/api/keitaro/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_sub_id: serverSubId, status: status })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                alert('Отправлено в Keitaro успешно');
            } else {
                alert('Ошибка отправки в Keitaro: ' + (data.keitaro_response?.error || 'Unknown error'));
            }

            this.loadKeitaroData();
        } catch (e) {
            console.error('Error sending to Keitaro', e);
            alert('Ошибка отправки в Keitaro: ' + e.message);
        }
    }

    async filterKeitaroClicks() {
        const page = 1;
        const perPage = this.currentKeitaroPerPage || 25;
        this.loadKeitaroClicks(page, perPage);
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

    async loadPixelSettings(page = this.currentPixelPage || 1, perPage = this.currentPixelPerPage || 25) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);

            const response = await this.fetchData(`/api/pixel-settings?${params.toString()}`);
            const settings = response.items || response || [];
            this.pixelSettings = settings;
            this.renderPixelSettingsTable(settings);

            if (response.pagination) {
                this.renderPagination('pixel-settings', response.pagination, 'loadPixelSettings');
                this.currentPixelPage = page;
                this.currentPixelPerPage = perPage;
            }

            // Load app config and populate controls
            try {
                const cfg = await this.fetchData('/api/app-config');
                const checkbox = document.getElementById('auto-send-cta');
                const select = document.getElementById('auto-pixel-select');

                if (select) {
                    // Fill select with current pixel settings
                    select.innerHTML = '';
                    const selectedIds = new Set();
                    if (cfg) {
                        if (Array.isArray(cfg.pixel_setting_ids)) {
                            cfg.pixel_setting_ids.forEach(id => selectedIds.add(String(id)));
                        }
                        if (cfg.pixel_setting_id && selectedIds.size === 0) {
                            selectedIds.add(String(cfg.pixel_setting_id));
                        }
                    }

                    (settings || []).forEach(ps => {
                        const opt = document.createElement('option');
                        opt.value = ps.id;
                        opt.textContent = `${ps.name || ps.pixel_id}`;
                        if (selectedIds.has(String(ps.id))) {
                            opt.selected = true;
                        }
                        select.appendChild(opt);
                    });
                }
                if (checkbox) {
                    checkbox.checked = !!(cfg && cfg.auto_send_cta);
                }
            } catch (e) {
                console.error('Error loading app config', e);
            }
        } catch (error) {
            console.error('Error loading pixel settings:', error);
        }
    }

    async loadKeitaroConfig() {
        try {
            const cfg = await this.fetchData('/api/app-config');
            const checkbox = document.getElementById('auto-send-keitaro');
            if (checkbox) {
                checkbox.checked = !!(cfg && cfg.auto_send_keitaro);
            }
            // Load bot managers list
            await this.loadTgbotManagers();
        } catch (e) {
            console.error('Error loading Keitaro config', e);
        }
    }

    async loadTgbotManagers() {
        try {
            // Load all managers
            const usersResponse = await this.fetchData('/api/users');
            const managers = (usersResponse.items || usersResponse || []).filter(u => u.role === 'manager' && u.slug);

            // Load bot statuses
            let botStatuses = {};
            try {
                const botStatusResponse = await this.fetchData('/api/tgbot/status');
                botStatuses = botStatusResponse || {};
            } catch (e) {
                console.warn('Could not load bot statuses:', e);
            }

            // Load managers.json to check credentials
            const managersList = document.getElementById('tgbot-managers-list');
            if (!managersList) return;

            if (managers.length === 0) {
                managersList.innerHTML = '<div class="text-muted">Нет менеджеров с slug</div>';
                return;
            }

            let html = '';
            managers.forEach(manager => {
                const slug = manager.slug;
                const botStatus = botStatuses[slug] || {};
                const hasCreds = botStatus.has_credentials || false;
                const isRunning = botStatus.running || false;

                // Get detailed status
                let statusDetails = '';
                if (isRunning) {
                    statusDetails = `<span class="badge bg-success ms-2">Запущен (PID: ${botStatus.pid || '?'})</span>`;
                } else {
                    statusDetails = '<span class="badge bg-secondary ms-2">Остановлен</span>';
                    if (botStatus.error) {
                        const errorShort = botStatus.error.length > 50 ? botStatus.error.substring(0, 50) + '...' : botStatus.error;
                        statusDetails += `<span class="badge bg-danger ms-1" title="${botStatus.error.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}">Ошибка</span>`;
                    }
                }

                html += `
                    <div class="form-check mb-2">
                        <input class="form-check-input tgbot-manager-checkbox" type="checkbox" 
                               value="${slug}" id="tgbot-manager-${slug}"
                               ${!hasCreds ? 'disabled' : ''}>
                        <label class="form-check-label" for="tgbot-manager-${slug}">
                            <strong>${manager.email}</strong> (${slug})
                            ${!hasCreds ? '<span class="badge bg-warning ms-2">Нет credentials</span>' : ''}
                            ${statusDetails}
                        </label>
                    </div>
                `;
            });

            managersList.innerHTML = html;
        } catch (e) {
            console.error('Error loading Telegram bot managers:', e);
            const managersList = document.getElementById('tgbot-managers-list');
            if (managersList) {
                managersList.innerHTML = '<div class="text-danger">Ошибка загрузки менеджеров</div>';
            }
        }
    }

    selectAllManagers() {
        document.querySelectorAll('.tgbot-manager-checkbox:not(:disabled)').forEach(cb => {
            cb.checked = true;
        });
    }

    deselectAllManagers() {
        document.querySelectorAll('.tgbot-manager-checkbox').forEach(cb => {
            cb.checked = false;
        });
    }

    async startSelectedBots() {
        const selected = Array.from(document.querySelectorAll('.tgbot-manager-checkbox:checked')).map(cb => cb.value);

        if (selected.length === 0) {
            alert('Выберите хотя бы одного менеджера');
            return;
        }

        if (!confirm(`Запустить ботов для ${selected.length} менеджер(ов)?`)) return;

        const results = [];
        for (const slug of selected) {
            try {
                const res = await fetch(`/api/tgbot/start/${slug}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await res.json();
                results.push({ slug, success: res.ok, message: result.message || result.error });
            } catch (e) {
                results.push({ slug, success: false, message: e.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) {
            alert(`Запущено: ${successCount}, Ошибок: ${failed.length}\n${failed.map(f => `${f.slug}: ${f.message}`).join('\n')}`);
        } else {
            alert(`Успешно запущено ботов: ${successCount}`);
        }

        await this.loadTgbotManagers();
    }

    async stopAllBots() {
        if (!confirm('Остановить всех ботов?')) return;

        try {
            const botStatusResponse = await this.fetchData('/api/tgbot/status');
            const runningBots = Object.keys(botStatusResponse).filter(slug => botStatusResponse[slug].running);

            if (runningBots.length === 0) {
                alert('Нет запущенных ботов');
                return;
            }

            const results = [];
            for (const slug of runningBots) {
                try {
                    const res = await fetch(`/api/tgbot/stop/${slug}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const result = await res.json();
                    results.push({ slug, success: res.ok, message: result.message || result.error });
                } catch (e) {
                    results.push({ slug, success: false, message: e.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            alert(`Остановлено ботов: ${successCount}`);
            await this.loadTgbotManagers();
        } catch (e) {
            console.error('Error stopping bots:', e);
            alert('Ошибка остановки ботов: ' + e.message);
        }
    }

    async loadTgbotStatus() {
        try {
            const status = await this.fetchData('/api/tgbot/status');
            const badge = document.getElementById('tgbot-status-badge');
            if (badge) {
                if (status.running) {
                    badge.textContent = `Запущен (PID: ${status.pid})`;
                    badge.className = 'badge bg-success';
                    badge.title = 'Бот работает и слушает сообщения';
                } else if (status.enabled) {
                    badge.textContent = 'Остановлен (включен, но не запущен)';
                    badge.className = 'badge bg-warning';
                    badge.title = 'Бот включен в настройках, но процесс не запущен. Нажмите "Сохранить" для запуска.';
                } else {
                    badge.textContent = 'Выключен';
                    badge.className = 'badge bg-secondary';
                    badge.title = 'Бот отключен в настройках';
                }
            }
        } catch (e) {
            console.error('Error loading Telegram bot status', e);
            const badge = document.getElementById('tgbot-status-badge');
            if (badge) {
                badge.textContent = 'Ошибка загрузки';
                badge.className = 'badge bg-danger';
                badge.title = 'Не удалось получить статус бота';
            }
        }
    }

    async saveAppConfig() {
        try {
            const checkbox = document.getElementById('auto-send-cta');
            const select = document.getElementById('auto-pixel-select');
            const keitaroCheckbox = document.getElementById('auto-send-keitaro');
            const tgbotCheckbox = document.getElementById('tgbot-enabled');
            const selectedOptions = select ? Array.from(select.selectedOptions || []).filter(opt => opt.value && opt.value !== '') : [];
            const selectedPixelIds = Array.from(new Set(
                selectedOptions
                    .map(opt => parseInt(opt.value, 10))
                    .filter(id => !Number.isNaN(id))
            ));
            const primaryPixelId = selectedPixelIds.length ? selectedPixelIds[0] : null;

            // ИСПРАВЛЕНИЕ: Отправляем только те параметры, элементы которых найдены на странице
            // Это предотвращает сброс настроек при сохранении с других вкладок
            const payload = {};

            // Отправляем auto_send_cta только если чекбокс найден
            if (checkbox) {
                payload.auto_send_cta = checkbox.checked;
            }

            // Отправляем pixel settings только если select найден
            if (select) {
                payload.pixel_setting_id = primaryPixelId;
                payload.pixel_setting_ids = selectedPixelIds;
            }

            // ВАЖНО: Отправляем auto_send_keitaro только если чекбокс найден на странице
            // Иначе при сохранении с вкладки Pixels эта настройка сбрасывается в false
            if (keitaroCheckbox) {
                payload.auto_send_keitaro = keitaroCheckbox.checked;
            }

            // Отправляем tgbot_enabled только если чекбокс найден
            if (tgbotCheckbox) {
                payload.tgbot_enabled = tgbotCheckbox.checked;
            }

            const res = await fetch('/api/app-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            alert('Настройки сохранены');
            // Update bot status after saving
            if (tgbotCheckbox) {
                await this.loadTgbotStatus();
            }
        } catch (e) {
            console.error('Error saving app config', e);
            alert('Ошибка сохранения настроек');
        }
    }

    async loadUsers(page = this.currentUsersPage || 1, perPage = this.currentUsersPerPage || 25) {
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', perPage);

            const response = await this.fetchData(`/api/users?${params.toString()}`);
            const users = response.items || response || [];
            this.users = users;

            // Load bot statuses for all managers
            let botStatuses = {};
            try {
                const botStatusResponse = await this.fetchData('/api/tgbot/status');
                botStatuses = botStatusResponse || {};
            } catch (e) {
                console.warn('Could not load bot statuses:', e);
            }

            this.renderUsersTable(users, botStatuses);

            if (response.pagination) {
                this.renderPagination('users', response.pagination, 'loadUsers');
                this.currentUsersPage = page;
                this.currentUsersPerPage = perPage;
            }
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

    async initBotLogsTab() {
        // Небольшая задержка для гарантии, что DOM полностью загружен
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.loadBotLogsManagers();
        // Не загружаем логи сразу, если менеджер не выбран
        const managerSelect = document.getElementById('bot-logs-manager');
        if (managerSelect && managerSelect.value) {
            await this.loadBotLogs();
        }
    }

    async loadBotLogsManagers() {
        try {
            // Загружаем всех пользователей (большой per_page чтобы получить всех)
            const res = await fetch('/api/users?per_page=1000');
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }
            const data = await res.json();
            
            // API возвращает объект с полем items или массив напрямую
            const users = Array.isArray(data) ? data : (data.items || []);
            
            // Проверяем, что users - это массив
            if (!Array.isArray(users)) {
                console.error('Expected array from /api/users, got:', typeof users, users);
                return;
            }
            
            const select = document.getElementById('bot-logs-manager');
            if (!select) {
                console.error('Element bot-logs-manager not found');
                return;
            }
            
            // Сохраняем текущее значение
            const currentValue = select.value;
            
            // Очищаем и добавляем опции
            select.innerHTML = '<option value="">Выберите менеджера</option>';
            
            // Фильтруем только менеджеров (role = 'manager' или 'admin')
            const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');
            
            if (managers.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Нет менеджеров';
                option.disabled = true;
                select.appendChild(option);
                return;
            }
            
            managers.forEach(manager => {
                const option = document.createElement('option');
                // Используем slug, если есть, иначе id, иначе email
                option.value = manager.slug || String(manager.id) || manager.email;
                const displayName = manager.email || `Менеджер #${manager.id}`;
                option.textContent = `${displayName}${manager.slug ? ` (${manager.slug})` : ''}`;
                select.appendChild(option);
            });
            
            // Восстанавливаем выбранное значение
            if (currentValue) {
                select.value = currentValue;
            }
        } catch (e) {
            console.error('Error loading bot logs managers:', e);
            const select = document.getElementById('bot-logs-manager');
            if (select) {
                select.innerHTML = '<option value="">Ошибка загрузки менеджеров</option>';
            }
        }
    }

    async loadBotLogs() {
        const managerSelect = document.getElementById('bot-logs-manager');
        const linesInput = document.getElementById('bot-logs-lines');
        const managerSlug = managerSelect ? managerSelect.value : '';
        const lines = Math.max(50, parseInt(linesInput ? linesInput.value : '200', 10) || 200);
        
        if (!managerSlug) {
            const pre = document.getElementById('bot-logs-content');
            if (pre) pre.textContent = 'Выберите менеджера для просмотра логов';
            return;
        }
        
        try {
            const res = await fetch(`/api/logs/bot?manager=${encodeURIComponent(managerSlug)}&lines=${encodeURIComponent(lines)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const pre = document.getElementById('bot-logs-content');
            if (pre) {
                if (data.error) {
                    pre.textContent = `Ошибка: ${data.error}`;
                } else {
                    pre.textContent = (data.lines || []).join('\n');
                    // Автопрокрутка вниз
                    pre.scrollTop = pre.scrollHeight;
                }
            }
        } catch (e) {
            console.error('Error loading bot logs:', e);
            const pre = document.getElementById('bot-logs-content');
            if (pre) pre.textContent = `Ошибка загрузки логов: ${e.message}`;
        }
    }

    toggleBotLogsAutoRefresh() {
        if (this._botLogsTimer) {
            clearInterval(this._botLogsTimer);
            this._botLogsTimer = null;
            const btn = document.getElementById('bot-logs-autorefresh-toggle');
            if (btn) btn.classList.remove('active');
        } else {
            this._botLogsTimer = setInterval(() => {
                if (this.currentTab === 'bot-logs') this.loadBotLogs();
            }, 5000);
            const btn = document.getElementById('bot-logs-autorefresh-toggle');
            if (btn) btn.classList.add('active');
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

        const bestNameEl = document.getElementById('best-landing-name');
        const bestFolderEl = document.getElementById('best-landing-folder');
        const bestMetaEl = document.getElementById('best-landing-meta');
        if (bestNameEl && bestFolderEl && bestMetaEl) {
            const best = stats.best_landing;
            if (best) {
                const displayValue = best.value || best.name || best.folder || '—';
                bestNameEl.textContent = displayValue;
                const managerLabel = best.manager_display || '-';
                bestFolderEl.innerHTML = `Менеджер: <strong>${managerLabel}</strong>`;
                const badges = [];
                if (best.price) {
                    badges.push(`<span class="badge bg-info text-dark me-1">₴${best.price}</span>`);
                }
                if (best.clicks) {
                    badges.push(`<span class="badge bg-primary me-1">${best.clicks} кликов</span>`);
                }
                if (best.marker) {
                    badges.push(`<span class="badge bg-secondary">${best.marker}</span>`);
                }
                if (best.folder) {
                    badges.push(`<span class="badge bg-light text-dark">Папка: ${best.folder}</span>`);
                }
                bestMetaEl.innerHTML = badges.join(' ') || '<span class="text-muted">Недостаточно данных</span>';
            } else {
                bestNameEl.textContent = '—';
                bestFolderEl.textContent = 'Нет данных';
                bestMetaEl.innerHTML = '<span class="text-muted">Недостаточно данных</span>';
            }
        }

        const landingBody = document.getElementById('landing-stats-body');
        const landingTotal = document.getElementById('landing-stats-total');
        if (landingBody) {
            landingBody.innerHTML = '';
            const rows = Array.isArray(stats.landings) ? stats.landings : [];
            rows.forEach((landing, idx) => {
                const tr = document.createElement('tr');
                const valueDisplay = `${landing.value || landing.name || landing.folder || '-'}` + (landing.marker ? ` ${landing.marker}` : '');
                const managerDisplay = landing.manager_display || '-';
                const crLead = Number.isFinite(landing.cr_lead) ? `${landing.cr_lead.toFixed(2)}%` : '0%';
                const crSale = Number.isFinite(landing.cr_sale) ? `${landing.cr_sale.toFixed(2)}%` : '0%';
                const priceDisplay = landing.price ? `₴${landing.price}` : '-';
                tr.innerHTML = `
                    <td class="text-muted">${idx + 1}</td>
                    <td><strong>${valueDisplay}</strong></td>
                    <td>${managerDisplay}</td>
                    <td>${landing.clicks || 0}</td>
                    <td>${crLead}</td>
                    <td>${crSale}</td>
                    <td>${priceDisplay}</td>
                `;
                landingBody.appendChild(tr);
            });
            if (landingTotal) {
                landingTotal.textContent = rows.length ? `Всего лендингов: ${rows.length}` : 'Нет данных';
            }
        }
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
            const ctaData = (data.clicks_by_day.cta_data || []).map(v => Number(v) || 0);
            const leadsData = (data.clicks_by_day.leads_data || []).map(v => Number(v) || 0);
            const purchasesData = (data.clicks_by_day.purchases_data || []).map(v => Number(v) || 0);

            const allValues = [...clicksData, ...ctaData, ...leadsData, ...purchasesData];
            const suggestedMax = Math.max(5, Math.max(...allValues, 0) * 1.2);

            // Check toggle states
            const showClicks = document.getElementById('toggle-clicks')?.checked ?? true;
            const showCta = document.getElementById('toggle-cta')?.checked ?? true;
            const showLeads = document.getElementById('toggle-leads')?.checked ?? true;
            const showPurchases = document.getElementById('toggle-purchases')?.checked ?? true;

            this.charts.clicks = new Chart(clicksCtx, {
                type: 'line',
                data: {
                    labels: data.clicks_by_day.labels,
                    datasets: [
                        {
                            label: 'Клики',
                            data: clicksData,
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            hidden: !showClicks
                        },
                        {
                            label: 'CTA',
                            data: ctaData,
                            borderColor: '#ffc107',
                            backgroundColor: 'rgba(255, 193, 7, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            hidden: !showCta
                        },
                        {
                            label: 'Лиды',
                            data: leadsData,
                            borderColor: '#198754',
                            backgroundColor: 'rgba(25, 135, 84, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            hidden: !showLeads
                        },
                        {
                            label: 'Покупки',
                            data: purchasesData,
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            hidden: !showPurchases
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            suggestedMax: suggestedMax,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
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

    toggleChartDataset(index) {
        if (this.charts.clicks) {
            const checkboxIds = ['toggle-clicks', 'toggle-cta', 'toggle-leads', 'toggle-purchases'];
            const checkbox = document.getElementById(checkboxIds[index]);
            if (checkbox) {
                this.charts.clicks.setDatasetVisibility(index, checkbox.checked);
            }
            this.charts.clicks.update();
        }
    }

    renderClicksTable(clicks) {
        const tbody = document.getElementById('clicks-table-body');
        tbody.innerHTML = '';

        clicks.forEach(click => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${click.id}</td>
                <td>${this.formatKyivTime(click.ts)}</td>
                <td>${click.ip}</td>
                <td>${(click.country || '-')}${click.city ? ', ' + click.city : ''}</td>
                <td>${click.utm_source || click.site_source_name || 'Прямой'}</td>
                <td>${click.utm_campaign || click.campaign_name || '-'}</td>
                <td>${click.fbclid ? click.fbclid.substring(0, 20) + '...' : '-'}</td>
                <td>
                    ${click.params && (click.params['placement'] || click.params['utm_placement']) ? `<span class="badge bg-secondary" title="placement">${click.params['placement'] || click.params['utm_placement']}</span>` : ''}
                    ${click.params && (click.params['ad_name'] || click.params['ad.name']) ? `<span class="badge bg-dark" title="ad_name">${click.params['ad_name'] || click.params['ad.name']}</span>` : ''}
                    ${click.params && (click.params['adset_name'] || click.params['adset.name']) ? `<span class="badge bg-dark" title="adset_name">${click.params['adset_name'] || click.params['adset.name']}</span>` : ''}
                    ${click.params && (click.params['campaign_id'] || click.params['campaign.id']) ? `<span class="badge bg-secondary" title="campaign_id">${click.params['campaign_id'] || click.params['campaign.id']}</span>` : ''}
                    ${click.params && (click.params['adset_id']) ? `<span class="badge bg-secondary" title="adset_id">${click.params['adset_id']}</span>` : ''}
                    ${click.params && (click.params['ad_id']) ? `<span class="badge bg-secondary" title="ad_id">${click.params['ad_id']}</span>` : ''}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminPanel.showClickDetails('${click.server_sub_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderClicksPagination(pagination) {
        let paginationContainer = document.getElementById('clicks-pagination');
        if (!paginationContainer) {
            // Create pagination container if it doesn't exist
            const clicksTab = document.getElementById('clicks');
            const tableContainer = clicksTab.querySelector('.table-responsive');
            if (tableContainer) {
                paginationContainer = document.createElement('div');
                paginationContainer.id = 'clicks-pagination';
                paginationContainer.className = 'd-flex justify-content-between align-items-center mt-3 mb-3';
                tableContainer.parentNode.insertBefore(paginationContainer, tableContainer.nextSibling);
            } else {
                return;
            }
        }

        if (!pagination) {
            paginationContainer.innerHTML = '';
            return;
        }

        const { page, pages, per_page, total, has_next, has_prev } = pagination;

        // Per page selector
        const perPageOptions = [25, 50, 100, 200, 500, 1000];
        const perPageSelect = `
            <select class="form-select form-select-sm" id="clicks-per-page" style="width: auto;" onchange="adminPanel.changeClicksPerPage(this.value)">
                ${perPageOptions.map(opt => `<option value="${opt}" ${opt == per_page ? 'selected' : ''}>${opt} на странице</option>`).join('')}
            </select>
        `;

        // Page navigation
        const pageNav = `
            <nav>
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${!has_prev ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="adminPanel.loadClicks(${page - 1}, ${per_page}); return false;">Предыдущая</a>
                    </li>
                    ${Array.from({ length: Math.min(pages, 10) }, (_, i) => {
            let pageNum;
            if (pages <= 10) {
                pageNum = i + 1;
            } else if (page <= 5) {
                pageNum = i + 1;
            } else if (page >= pages - 4) {
                pageNum = pages - 9 + i;
            } else {
                pageNum = page - 4 + i;
            }
            return `<li class="page-item ${pageNum == page ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="adminPanel.loadClicks(${pageNum}, ${per_page}); return false;">${pageNum}</a>
                        </li>`;
        }).join('')}
                    <li class="page-item ${!has_next ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="adminPanel.loadClicks(${page + 1}, ${per_page}); return false;">Следующая</a>
                    </li>
                </ul>
            </nav>
        `;

        const info = `<span class="text-muted">Страница ${page} из ${pages} (всего: ${total})</span>`;

        // Always show per-page selector and info, nav only if pages > 1
        paginationContainer.innerHTML = `
            <div>${perPageSelect}</div>
            <div>${info}</div>
            ${pages > 1 ? `<div>${pageNav}</div>` : ''}
        `;
    }

    changeClicksPerPage(perPage) {
        this.loadClicks(1, parseInt(perPage));
    }

    changeCtaPerPage(perPage) {
        this.loadCtaClicks(1, parseInt(perPage));
    }

    async updateClicksGeo() {
        if (!confirm('Обновить гео-данные для кликов без гео? Это может занять некоторое время.')) {
            return;
        }

        try {
            const response = await fetch('/api/clicks/update-geo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ limit: 100 })
            });

            const data = await response.json();
            alert(`Обновлено: ${data.updated} из ${data.processed} кликов`);
            this.loadClicks(this.currentClicksPage || 1, this.currentClicksPerPage || 25);
        } catch (error) {
            console.error('Error updating geo:', error);
            alert('Ошибка при обновлении гео-данных');
        }
    }

    // Telegram Bot Management Methods
    async loadTgbotManagers() {
        try {
            const container = document.getElementById('tgbot-managers-list');
            if (!container) return;

            // Загружаем список менеджеров
            const usersResponse = await this.fetchData('/api/users');
            const users = usersResponse.items || usersResponse || [];
            const managers = users.filter(u => u.role === 'manager');

            if (managers.length === 0) {
                container.innerHTML = '<div class="text-muted">Нет менеджеров</div>';
                return;
            }

            // Загружаем статусы всех менеджеров
            const statuses = {};
            for (const manager of managers) {
                if (!manager.slug) continue;
                try {
                    const status = await this.fetchData(`/api/tgbot/status/${manager.slug}`);
                    statuses[manager.slug] = status;
                } catch (e) {
                    console.error(`Error loading status for ${manager.slug}:`, e);
                }
            }

            // Отображаем список
            let html = '';
            for (const manager of managers) {
                if (!manager.slug) continue;

                const status = statuses[manager.slug] || { running: false, has_credentials: false };
                const isRunning = status.running;
                const needsAuth = status.needs_authorization || false;
                const hasCredentials = status.has_credentials || false;
                const errorMsg = status.error || '';

                html += `
                    <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                        <div class="flex-grow-1">
                            <strong>${manager.email}</strong>
                            ${manager.slug ? `<small class="text-muted ms-1">(${manager.slug})</small>` : ''}
                            <div class="small mt-1">
                                ${isRunning ?
                        '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Запущен</span>' :
                        '<span class="badge bg-secondary"><i class="fas fa-stop-circle me-1"></i>Остановлен</span>'}
                                ${!hasCredentials ?
                        '<span class="badge bg-warning text-dark ms-1"><i class="fas fa-exclamation-triangle me-1"></i>Нет credentials</span>' : ''}
                                ${needsAuth ?
                        '<span class="badge bg-danger ms-1"><i class="fas fa-key me-1"></i>Требуется авторизация</span>' : ''}
                            </div>
                            ${errorMsg ? `<div class="small text-danger mt-1"><i class="fas fa-exclamation-circle me-1"></i>${errorMsg}</div>` : ''}
                        </div>
                        <div class="btn-group btn-group-sm ms-2">
                            <button class="btn btn-outline-secondary" onclick="adminPanel.showEditCredentialsModal('${manager.slug}', '${manager.email}')" title="Настроить Telegram API">
                                <i class="fas fa-cog me-1"></i>Настроить
                            </button>
                            ${needsAuth ? `
                                <button class="btn btn-warning" onclick="tgAuth.show('${manager.slug}', '${manager.email}')" title="Авторизовать Telegram">
                                    <i class="fas fa-key me-1"></i>Авторизовать
                                </button>
                            ` : ''}
                            ${isRunning ? `
                                <button class="btn btn-danger" onclick="adminPanel.stopTgbot('${manager.slug}')" title="Остановить бота">
                                    <i class="fas fa-stop me-1"></i>Остановить
                                </button>
                            ` : `
                                <button class="btn btn-success" onclick="adminPanel.startTgbot('${manager.slug}')" 
                                        ${!hasCredentials ? 'disabled title="Сначала настройте credentials"' : 'title="Запустить бота"'}>
                                    <i class="fas fa-play me-1"></i>Запустить
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading tgbot managers:', error);
            const container = document.getElementById('tgbot-managers-list');
            if (container) {
                container.innerHTML = '<div class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Ошибка загрузки менеджеров</div>';
            }
        }
    }

    async startTgbot(managerSlug) {
        try {
            const response = await fetch(`/api/tgbot/start/${managerSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка запуска бота');
            }

            alert('✅ Бот успешно запущен для ' + managerSlug);
            this.loadTgbotManagers();
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
            console.error('Start tgbot error:', error);
        }
    }

    async stopTgbot(managerSlug) {
        if (!confirm(`Остановить бота для ${managerSlug}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/tgbot/stop/${managerSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка остановки бота');
            }

            alert('✅ Бот остановлен для ' + managerSlug);
            this.loadTgbotManagers();
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
            console.error('Stop tgbot error:', error);
        }
    }

    selectAllManagers() {
        // TODO: Implement select all managers functionality
        console.log('Select all managers - not implemented yet');
    }

    deselectAllManagers() {
        // TODO: Implement deselect all managers functionality
        console.log('Deselect all managers - not implemented yet');
    }

    async startSelectedBots() {
        // TODO: Implement start selected bots functionality
        alert('Функция в разработке. Используйте кнопки "Запустить" для каждого менеджера отдельно.');
    }

    async stopAllBots() {
        if (!confirm('Остановить всех ботов?')) {
            return;
        }

        try {
            const usersResponse = await this.fetchData('/api/users');
            const users = usersResponse.items || usersResponse || [];
            const managers = users.filter(u => u.role === 'manager' && u.slug);

            let stopped = 0;
            for (const manager of managers) {
                try {
                    const response = await fetch(`/api/tgbot/stop/${manager.slug}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (response.ok) stopped++;
                } catch (e) {
                    console.error(`Error stopping bot for ${manager.slug}:`, e);
                }
            }

            alert(`✅ Остановлено ботов: ${stopped} из ${managers.length}`);
            this.loadTgbotManagers();
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
            console.error('Stop all bots error:', error);
        }
    }

    async showEditCredentialsModal(managerSlug, managerEmail) {
        // Load current credentials
        try {
            const response = await this.fetchData('/api/managers/credentials');
            const credentials = response[managerSlug] || {};

            // Set values in modal
            document.getElementById('edit-creds-manager-slug').value = managerSlug;
            document.getElementById('edit-creds-manager-email').textContent = managerEmail;
            document.getElementById('edit-creds-api-id').value = credentials.api_id || '';
            document.getElementById('edit-creds-api-hash').value = credentials.api_hash || '';
            document.getElementById('edit-creds-session-name').value = credentials.session_name || `${managerSlug}_session`;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editCredentialsModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading credentials:', error);
            alert('Ошибка загрузки credentials');
        }
    }

    async saveManagerCredentials() {
        const managerSlug = document.getElementById('edit-creds-manager-slug').value;
        const apiId = document.getElementById('edit-creds-api-id').value.trim();
        const apiHash = document.getElementById('edit-creds-api-hash').value.trim();
        const sessionName = document.getElementById('edit-creds-session-name').value.trim();

        if (!apiId || !apiHash) {
            alert('API ID и API Hash обязательны');
            return;
        }

        try {
            const response = await fetch('/api/managers/update-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manager_slug: managerSlug,
                    api_id: apiId,
                    api_hash: apiHash,
                    session_name: sessionName || `${managerSlug}_session`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка сохранения credentials');
            }

            alert('✅ ' + data.message);

            // Close modal
            const modalEl = document.getElementById('editCredentialsModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Reload managers list
            this.loadTgbotManagers();
        } catch (error) {
            alert('❌ Ошибка: ' + error.message);
            console.error('Save credentials error:', error);
        }
    }

    async loadKeitaroClicks() {
        // Stub method - implement if needed
        console.log('loadKeitaroClicks called');
    }

    async loadKeitaroConfig() {
        // Stub method - implement if needed
        console.log('loadKeitaroConfig called');
    }

    renderCtaClicksTable(ctaClicks) {
        const tbody = document.getElementById('cta-table-body');
        tbody.innerHTML = '';

        ctaClicks.forEach(cta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cta.id}</td>
                <td>${cta.server_sub_id}</td>
                <td>${this.formatKyivTime(cta.ts)}</td>
                <td>${cta.click.ip}</td>
                <td>${cta.click.utm_source || 'Прямой'}</td>
                <td>${cta.click.utm_campaign || '-'}</td>
                <td>${cta.click.fbclid ? cta.click.fbclid.substring(0, 20) + '...' : '-'}</td>
                <td>${cta.tg_slug ? '@' + cta.tg_slug : '-'} ${cta.marker ? ` ${cta.marker}` : ''}${(cta.landing_price || cta.landing_price === 0) ? ` <span class="badge bg-info">₴${cta.landing_price}</span>` : ''}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-success" title="Lead" onclick="adminPanel.createLeadFromCta('Lead','${cta.server_sub_id}')"><i class="fas fa-check"></i></button>
                        <button class="btn btn-warning" title="Purchase" onclick="adminPanel.createLeadFromCta('Purchase','${cta.server_sub_id}')"><i class="fas fa-shopping-cart"></i></button>
                        <button class="btn btn-danger" title="Reject" onclick="adminPanel.createLeadFromCta('Reject','${cta.server_sub_id}')"><i class="fas fa-times"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderCtaPagination(pagination) {
        let container = document.getElementById('cta-pagination');
        if (!container) {
            const ctaTab = document.getElementById('cta');
            const tableContainer = ctaTab.querySelector('.table-responsive');
            if (tableContainer) {
                container = document.createElement('div');
                container.id = 'cta-pagination';
                container.className = 'd-flex justify-content-between align-items-center mt-3 mb-3';
                tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);
            } else {
                return;
            }
        }

        if (!pagination) {
            container.innerHTML = '';
            return;
        }

        const { page, pages, per_page, total, has_next, has_prev } = pagination;
        const perPageOptions = [25, 50, 100, 200, 500, 1000];
        const perPageSelect = `
            <select class="form-select form-select-sm" id="cta-per-page" style="width: auto;" onchange="adminPanel.changeCtaPerPage(this.value)">
                ${perPageOptions.map(opt => `<option value="${opt}" ${opt == per_page ? 'selected' : ''}>${opt} на странице</option>`).join('')}
            </select>
        `;

        // Always show per-page selector and info, nav only if pages > 1
        let nav = '';
        if (pages > 1) {
            const pageButtons = Array.from({ length: Math.min(pages, 10) }, (_, i) => {
                let pageNum;
                if (pages <= 10) {
                    pageNum = i + 1;
                } else if (page <= 5) {
                    pageNum = i + 1;
                } else if (page >= pages - 4) {
                    pageNum = pages - 9 + i;
                } else {
                    pageNum = page - 4 + i;
                }
                return `<li class="page-item ${pageNum === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminPanel.loadCtaClicks(${pageNum}, ${per_page}); return false;">${pageNum}</a>
                </li>`;
            }).join('');

            nav = `
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${!has_prev ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="adminPanel.loadCtaClicks(${page - 1}, ${per_page}); return false;">Предыдущая</a>
                        </li>
                        ${pageButtons}
                        <li class="page-item ${!has_next ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="adminPanel.loadCtaClicks(${page + 1}, ${per_page}); return false;">Следующая</a>
                        </li>
                    </ul>
                </nav>
            `;
        }

        const info = `<span class="text-muted">Страница ${page} из ${pages} (всего: ${total})</span>`;

        container.innerHTML = `
            <div>${perPageSelect}</div>
            <div>${info}</div>
            ${nav ? `<div>${nav}</div>` : ''}
        `;
    }

    renderPagination(prefix, pagination, loadFnName) {
        let container = document.getElementById(`${prefix}-pagination`);
        if (!container) {
            // Try to find the table container and add pagination after it
            let tab = document.getElementById(prefix);
            if (!tab) {
                // Try alternative selectors
                tab = document.querySelector(`[data-tab="${prefix}"]`);
            }
            if (!tab && prefix.includes('-')) {
                // Try with different separators
                const altId = prefix.replace('-', '');
                tab = document.getElementById(altId);
            }

            if (tab) {
                // Find table container - try multiple strategies
                let tableContainer = tab.querySelector('.table-responsive');
                if (!tableContainer) {
                    tableContainer = tab.querySelector('table')?.closest('.table-responsive');
                }
                if (!tableContainer) {
                    tableContainer = tab.querySelector('table')?.parentElement;
                }
                if (!tableContainer) {
                    // Last resort: find any table in the tab
                    const table = tab.querySelector('table');
                    if (table) {
                        tableContainer = table.parentElement;
                    }
                }

                if (tableContainer) {
                    container = document.createElement('div');
                    container.id = `${prefix}-pagination`;
                    container.className = 'd-flex justify-content-between align-items-center mt-3 mb-3 flex-wrap gap-2';
                    // Insert after table container
                    if (tableContainer.nextSibling) {
                        tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);
                    } else {
                        tableContainer.parentNode.appendChild(container);
                    }
                } else {
                    console.warn(`Could not find table container for pagination: ${prefix}`);
                    return;
                }
            } else {
                console.warn(`Could not find tab element for pagination: ${prefix}`);
                return;
            }
        }

        if (!pagination) {
            container.innerHTML = '';
            return;
        }

        const { page, pages, per_page, total, has_next, has_prev } = pagination;
        const perPageOptions = [25, 50, 100, 200, 500, 1000];
        const perPageSelect = `
            <select class="form-select form-select-sm" id="${prefix}-per-page" style="width: auto;" onchange="adminPanel.changePerPage('${prefix}', this.value, '${loadFnName}')">
                ${perPageOptions.map(opt => `<option value="${opt}" ${opt == per_page ? 'selected' : ''}>${opt} на странице</option>`).join('')}
            </select>
        `;

        // Always show per-page selector and info
        let nav = '';
        if (pages > 1) {
            const pageButtons = Array.from({ length: Math.min(pages, 10) }, (_, i) => {
                let pageNum;
                if (pages <= 10) {
                    pageNum = i + 1;
                } else if (page <= 5) {
                    pageNum = i + 1;
                } else if (page >= pages - 4) {
                    pageNum = pages - 9 + i;
                } else {
                    pageNum = page - 4 + i;
                }
                return `<li class="page-item ${pageNum === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminPanel.${loadFnName}(${pageNum}, ${per_page}); return false;">${pageNum}</a>
                </li>`;
            }).join('');

            nav = `
                <nav>
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${!has_prev ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="adminPanel.${loadFnName}(${page - 1}, ${per_page}); return false;">Предыдущая</a>
                        </li>
                        ${pageButtons}
                        <li class="page-item ${!has_next ? 'disabled' : ''}">
                            <a class="page-link" href="#" onclick="adminPanel.${loadFnName}(${page + 1}, ${per_page}); return false;">Следующая</a>
                        </li>
                    </ul>
                </nav>
            `;
        }

        const info = `<span class="text-muted">Страница ${page} из ${pages} (всего: ${total})</span>`;

        container.innerHTML = `
            <div>${perPageSelect}</div>
            <div>${info}</div>
            ${nav ? `<div>${nav}</div>` : ''}
        `;
    }

    changePerPage(prefix, perPage, loadFnName) {
        this[loadFnName](1, parseInt(perPage));
    }

    renderRedirectsTable(redirects) {
        const tbody = document.getElementById('redirects-table-body');
        tbody.innerHTML = '';

        redirects.forEach(redirect => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${redirect.id}</td>
                <td>${redirect.server_sub_id}</td>
                <td>${this.formatKyivTime(redirect.ts)}</td>
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

            // Determine which services were used
            const pixelResponses = Array.isArray(lead.pixel_resp) ? lead.pixel_resp : (lead.pixel_resp ? [lead.pixel_resp] : []);
            const pixelIds = Array.isArray(lead.pixel_ids) ? lead.pixel_ids : (lead.pixel_id ? [lead.pixel_id] : []);
            const hasFacebook = pixelIds.length > 0 || pixelResponses.length > 0;
            const hasKeitaroSubId = lead.click && lead.click.keitaro_sub_id;
            const hasKeitaroResponse = lead.keitaro_resp !== null && lead.keitaro_resp !== undefined;
            const hasKeitaro = hasKeitaroSubId || hasKeitaroResponse;

            // Visual indicators
            let serviceBadges = '';
            if (hasFacebook) {
                const fbBadgeClass = pixelResponses.some(item => item?.response?.success)
                    ? 'bg-success'
                    : (pixelResponses.some(item => item?.response?.success === false) ? 'bg-danger' : 'bg-primary');
                const fbSummary = pixelResponses.length
                    ? pixelResponses.map(item => {
                        const result = item?.response || {};
                        const success = result.success;
                        const status = success ? 'Успешно' : (success === false ? `Ошибка${result.error ? `: ${result.error}` : ''}` : 'Неизвестно');
                        const label = item?.pixel_id || `ID ${item?.pixel_setting_id ?? '?'}`;
                        return `${label}: ${status}`;
                    }).join('\n')
                    : (pixelIds.length > 0 ? 'Нет ответа от API' : 'Не отправлено');
                serviceBadges += `<span class="badge ${fbBadgeClass} me-1" title="Facebook: ${fbSummary}"><i class="fab fa-facebook"></i> FB</span>`;
            }
            if (hasKeitaro) {
                const keitaroText = lead.keitaro_resp?.success ? 'Успешно' : (lead.keitaro_resp ? 'Ошибка: ' + (lead.keitaro_resp.error || 'Неизвестная ошибка') : 'Не отправлено');
                const badgeClass = lead.keitaro_resp?.success ? 'bg-success' : (lead.keitaro_resp ? 'bg-danger' : 'bg-secondary');
                serviceBadges += `<span class="badge ${badgeClass} me-1" title="Keitaro: ${keitaroText}"><i class="fas fa-exchange-alt"></i> KT</span>`;
            }
            const pixelIdText = pixelIds.length ? pixelIds.join(', ') : '-';

            // Row styling based on services
            const row = document.createElement('tr');
            if (hasFacebook && !hasKeitaro) {
                row.classList.add('table-primary');
                row.style.opacity = '0.9';
            } else if (hasKeitaro && !hasFacebook) {
                row.classList.add('table-info');
                row.style.opacity = '0.9';
            } else if (hasFacebook && hasKeitaro) {
                row.classList.add('table-success');
                row.style.opacity = '0.95';
            }

            row.innerHTML = `
                <td>${lead.id}</td>
                <td>${lead.server_sub_id}</td>
                <td>${this.formatKyivTime(lead.ts)}</td>
                <td>
                    <span class="badge ${statusClass}">${lead.status}</span>
                    ${serviceBadges}
                </td>
                <td>${pixelIdText}</td>
                <td>${lead.manager}</td>
                <td>${lead.click.ip}</td>
                <td>${lead.click.utm_source || 'Прямой'}</td>
                <td>
                    <button class="btn btn-sm btn-success" title="Отметить покупку" onclick="adminPanel.markPurchase('${lead.server_sub_id}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPurchasesTable(purchases) {
        const tbody = document.getElementById('purchases-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        (purchases || []).forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${this.formatKyivTime(p.ts)}</td>
                <td>${p.server_sub_id}</td>
                <td>${p.amount}</td>
                <td>${p.currency}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async markPurchase(serverSubId) {
        try {
            const amount = prompt('Введите сумму покупки (необязательно):', '');
            const payload = { server_sub_id: serverSubId };
            if (amount && !isNaN(parseFloat(amount))) payload.amount = parseFloat(amount);
            const res = await fetch('/api/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            alert('Покупка зафиксирована');
            this.loadPurchases();
        } catch (e) {
            console.error('Error creating purchase', e);
            alert('Ошибка создания покупки');
        }
    }

    renderChatLinksTable(chatLinks) {
        const tbody = document.getElementById('chat-links-table-body');
        tbody.innerHTML = '';

        chatLinks.forEach(link => {
            const row = document.createElement('tr');
            // Format owner info
            const ownerInfo = link.owner_email
                ? `${link.owner_email}${link.owner_slug ? ` (${link.owner_slug})` : ''}`
                : '<span class="text-muted">Нет владельца</span>';

            row.innerHTML = `
                <td>${link.id}</td>
                <td>${link.slug}</td>
                <td>${link.title}</td>
                <td>${link.message || '-'}</td>
                <td>${link.marker || '-'}</td>
                <td>${link.views}</td>
                <td>${ownerInfo}</td>
                <td><span class="badge ${link.active ? 'bg-success' : 'bg-secondary'}">${link.active ? 'Активна' : 'Неактивна'}</span></td>
                <td>${this.formatKyivDate(link.created_at)}</td>
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
                <td><span class="badge bg-info">${setting.event_type || 'Lead'}</span></td>
                <td><span class="badge ${setting.active ? 'bg-success' : 'bg-secondary'}">${setting.active ? 'Активен' : 'Неактивен'}</span></td>
                <td>${this.formatKyivDate(setting.created_at)}</td>
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

    renderUsersTable(users, botStatuses = {}) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(u => {
            const row = document.createElement('tr');
            const canImpersonate = this.currentUser && this.currentUser.role === 'admin';
            const slug = u.slug || '';
            const botStatus = botStatuses[slug] || {};
            const hasCreds = botStatus.has_credentials || false;
            const isRunning = botStatus.running || false;

            // Bot status cell
            let botStatusHtml = '<span class="text-muted">-</span>';
            if (u.role === 'manager' && slug) {
                if (!hasCreds) {
                    botStatusHtml = '<span class="badge bg-warning">Нет credentials</span>';
                } else if (isRunning) {
                    botStatusHtml = `
                        <span class="badge bg-success me-2">Запущен</span>
                        <button class="btn btn-sm btn-danger" onclick="adminPanel.stopBot('${slug}')" title="Остановить">
                            <i class="fas fa-stop"></i>
                        </button>
                    `;
                } else {
                    botStatusHtml = `
                        <span class="badge bg-secondary me-2">Остановлен</span>
                        <button class="btn btn-sm btn-success" onclick="adminPanel.startBot('${slug}')" title="Запустить">
                            <i class="fas fa-play"></i>
                        </button>
                    `;
                }
            }

            row.innerHTML = `
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'bg-dark' : 'bg-primary'}">${u.role}</span></td>
                <td>${slug || '-'}</td>
                <td>${botStatusHtml}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" title="Редактировать" onclick="adminPanel.editUser(${u.id}, '${u.email.replace(/'/g, "\\'")}', '${u.role}', '${slug.replace(/'/g, "\\'")}')"><i class="fas fa-user-edit"></i></button>
                    ${u.role === 'manager' && slug ? `<button class="btn btn-sm btn-info me-1" title="Редактировать Telegram" onclick="adminPanel.showEditCredentialsModal('${slug}', '${u.email}')"><i class="fab fa-telegram"></i></button>` : ''}
                    ${canImpersonate ? `<button class="btn btn-sm btn-secondary me-1" title="Войти" onclick="adminPanel.impersonate(${u.id})"><i class=\"fas fa-user-secret\"></i></button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    editUser(id, email, role, slug) {
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-user-email').value = email;
        document.getElementById('edit-user-role').value = role;
        document.getElementById('edit-user-slug').value = slug || '';
        document.getElementById('edit-user-password').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    }

    async updateUser() {
        const id = document.getElementById('edit-user-id').value;
        const email = document.getElementById('edit-user-email').value.trim();
        const role = document.getElementById('edit-user-role').value;
        const slug = document.getElementById('edit-user-slug').value.trim();
        const password = document.getElementById('edit-user-password').value;

        if (!email) {
            alert('Email обязателен');
            return;
        }

        try {
            const data = {
                action: 'update',
                id: parseInt(id),
                email: email,
                role: role,
                slug: slug || null
            };

            if (password) {
                data.password = password;
            }

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка сохранения');
            }

            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            alert('Пользователь успешно обновлен');
            this.loadUsers();
        } catch (e) {
            console.error('Error updating user:', e);
            alert('Ошибка: ' + e.message);
        }
    }

    async startBot(managerSlug) {
        if (!confirm(`Запустить Telegram бот для менеджера ${managerSlug}?`)) return;

        try {
            const res = await fetch(`/api/tgbot/start/${managerSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await res.json();

            if (!res.ok) {
                let errorMsg = result.error || result.message || `HTTP ${res.status}`;
                if (result.message && result.message.includes('Process exited')) {
                    errorMsg += '\n\nПроверьте логи бота для деталей.';
                }
                throw new Error(errorMsg);
            }

            // Wait a bit and check status
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if bot is actually running
            const statusRes = await fetch(`/api/tgbot/status/${managerSlug}`);
            const status = await statusRes.json();

            if (status.running) {
                alert(`✅ Бот успешно запущен (PID: ${status.pid})`);
            } else {
                let errorMsg = 'Бот запущен, но процесс завершился. ';
                if (status.error) {
                    errorMsg += `\nОшибка: ${status.error}`;
                }
                alert(errorMsg);
            }

            this.loadUsers(); // Reload to update status
            await this.loadTgbotManagers(); // Also update managers list
        } catch (e) {
            console.error('Error starting bot:', e);
            alert('Ошибка запуска бота: ' + e.message);
        }
    }

    async stopBot(managerSlug) {
        if (!confirm(`Остановить Telegram бот для менеджера ${managerSlug}?`)) return;

        try {
            const res = await fetch(`/api/tgbot/stop/${managerSlug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const result = await res.json();
            alert(result.message || 'Бот остановлен');
            this.loadUsers(); // Reload to update status
        } catch (e) {
            console.error('Error stopping bot:', e);
            alert('Ошибка остановки бота: ' + e.message);
        }
    }

    async impersonate(userId) {
        try {
            const res = await fetch('/api/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            // Reload to reflect new session user
            window.location.reload();
        } catch (e) {
            console.error('Impersonate error', e);
            alert('Не удалось войти от имени пользователя');
        }
    }

    async stopImpersonate() {
        try {
            const res = await fetch('/api/impersonate/stop', { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            window.location.reload();
        } catch (e) {
            console.error('Stop impersonation error', e);
            alert('Не удалось вернуться к администратору');
        }
    }

    getStatusClass(status) {
        switch (status) {
            case 'success': return 'bg-success';
            case 'Lead': return 'bg-primary';
            case 'Purchase': return 'bg-warning';
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
                        <tr><td><strong>Время:</strong></td><td>${this.formatKyivTime(click.ts)}</td></tr>
                        <tr><td><strong>IP:</strong></td><td>${click.ip}</td></tr>
                        <tr><td><strong>User Agent:</strong></td><td>${click.ua}</td></tr>
                        <tr><td><strong>Referrer:</strong></td><td>${click.referrer || '-'}</td></tr>
                        <tr><td><strong>Pixel IDs:</strong></td><td>${Array.isArray(click.pixel_ids) && click.pixel_ids.length ? click.pixel_ids.join(', ') : '-'}</td></tr>
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
        const input = prompt(`Выберите ID Pixel из списка:\n${list}\n\nВведите один или несколько ID через запятую или пробел:`, settings[0].id);
        if (input === null) return;
        const parsedIds = input
            .split(/[,\s]+/)
            .map(part => parseInt(part, 10))
            .filter(num => !isNaN(num));
        const uniqueIds = Array.from(new Set(parsedIds));
        const validIds = uniqueIds.filter(id => settings.some(s => s.id === id));
        if (!validIds.length) {
            alert('Не найдено валидных ID Pixel');
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
                    pixel_setting_ids: validIds,
                    pixel_setting_id: validIds[0],
                    manager: 'admin'
                })
            });

            if (response.ok) {
                const result = await response.json();
                const pixelResponses = Array.isArray(result.pixel_response) ? result.pixel_response : (result.pixel_response ? [result.pixel_response] : []);
                const fbSummary = pixelResponses.length
                    ? pixelResponses.map(item => {
                        const res = item?.response || {};
                        const success = res.success;
                        const statusText = success ? 'Успешно' : (success === false ? `Ошибка${res.error ? `: ${res.error}` : ''}` : 'Неизвестно');
                        const label = item?.pixel_id || `ID ${item?.pixel_setting_id ?? '?'}`;
                        return `${label}: ${statusText}`;
                    }).join('\n')
                    : 'Не отправлено';
                alert(`Лид создан: ${result.status}\nFacebook: ${fbSummary}`);
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
        const input = prompt(`Выберите ID Pixel из списка:\n${list}\n\nВведите один или несколько ID через запятую или пробел:`, settings[0].id);
        if (input === null) return;
        const parsedIds = input
            .split(/[,\s]+/)
            .map(part => parseInt(part, 10))
            .filter(num => !isNaN(num));
        const uniqueIds = Array.from(new Set(parsedIds));
        const validIds = uniqueIds.filter(id => settings.some(s => s.id === id));
        if (!validIds.length) {
            alert('Не найдено валидных ID Pixel');
            return;
        }

        try {
            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server_sub_id: serverSubId,
                    status: status,
                    pixel_setting_ids: validIds,
                    pixel_setting_id: validIds[0],
                    manager: 'admin'
                })
            });

            if (response.ok) {
                const result = await response.json();
                const pixelResponses = Array.isArray(result.pixel_response) ? result.pixel_response : (result.pixel_response ? [result.pixel_response] : []);
                const fbSummary = pixelResponses.length
                    ? pixelResponses.map(item => {
                        const res = item?.response || {};
                        const success = res.success;
                        const statusText = success ? 'Успешно' : (success === false ? `Ошибка${res.error ? `: ${res.error}` : ''}` : 'Неизвестно');
                        const label = item?.pixel_id || `ID ${item?.pixel_setting_id ?? '?'}`;
                        return `${label}: ${statusText}`;
                    }).join('\n')
                    : 'Не отправлено';
                alert(`Лид создан: ${result.status}\nFacebook: ${fbSummary}`);
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

    setupMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (btn && sidebar) {
            btn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
        // Close sidebar when switching tabs on mobile
        const tabLinks = document.querySelectorAll('[data-tab]');
        tabLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768 && sidebar) sidebar.classList.remove('open');
            });
        });
        // Resize charts on orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.currentTab === 'dashboard') this.loadDashboard();
            }, 300);
        });
    }

    // Filtering methods
    async filterClicks() {
        const search = document.getElementById('search-clicks').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const source = document.getElementById('source-filter').value;
        // Reset to page 1 when filtering
        const page = 1;
        const perPage = this.currentClicksPerPage || 25;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('per_page', perPage);
        if (search) params.append('search', search);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (source) params.append('source', source);

        try {
            const response = await this.fetchData(`/api/clicks?${params.toString()}`);
            if (response.items) {
                this.renderClicksTable(response.items);
                this.renderPagination('clicks', response.pagination, 'loadClicks');
                this.currentClicksPage = page;
                this.currentClicksPerPage = perPage;
            } else {
                this.renderClicksTable(response);
            }
        } catch (error) {
            console.error('Error filtering clicks:', error);
        }
    }

    async filterCtaClicks() {
        const search = document.getElementById('search-cta').value;
        const dateFrom = document.getElementById('cta-date-from').value;
        const dateTo = document.getElementById('cta-date-to').value;

        this.currentCtaPage = 1;
        const perPage = this.currentCtaPerPage || 25;

        try {
            await this.loadCtaClicks(1, perPage);
        } catch (error) {
            console.error('Error filtering CTA clicks:', error);
        }
    }

    async filterRedirects() {
        const page = 1;
        const perPage = this.currentRedirectsPerPage || 25;
        this.loadRedirects(page, perPage);
    }

    async filterLeads() {
        const page = 1;
        const perPage = this.currentLeadsPerPage || 25;
        this.loadLeads(page, perPage);
    }

    // Chat Links management
    async showAddChatLinkModal() {
        document.getElementById('chat-link-form').reset();
        const saveBtn = document.querySelector('#addChatLinkModal .btn.btn-primary');
        if (saveBtn) saveBtn.dataset.editId = '';
        const title = document.querySelector('#addChatLinkModal .modal-title');
        if (title) title.textContent = 'Добавить бизнес-ссылку';

        // Show/hide owner selector based on user role
        await this.setupOwnerSelector();

        const modal = new bootstrap.Modal(document.getElementById('addChatLinkModal'));
        modal.show();
    }

    async setupOwnerSelector() {
        const ownerContainer = document.getElementById('link-owner-container');
        const ownerSelect = document.getElementById('link-owner');

        if (!ownerContainer || !ownerSelect) return;

        try {
            const currentUser = await this.fetchData('/api/current-user');

            if (currentUser.role === 'admin') {
                // Load managers for admin
                ownerContainer.style.display = 'block';
                ownerSelect.innerHTML = '<option value="">Выберите менеджера...</option>';

                const users = await this.fetchData('/api/users');
                const managers = users.filter(u => u.role === 'manager');

                managers.forEach(manager => {
                    const option = document.createElement('option');
                    option.value = manager.id;
                    option.textContent = `${manager.email}${manager.slug ? ` (${manager.slug})` : ''}`;
                    ownerSelect.appendChild(option);
                });
            } else {
                // Hide for managers (they can only create links for themselves)
                ownerContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error setting up owner selector:', error);
            ownerContainer.style.display = 'none';
        }
    }

    async saveChatLink() {
        const saveBtn = document.querySelector('#addChatLinkModal .btn.btn-primary');
        const editId = saveBtn ? saveBtn.dataset.editId : '';
        const isEdit = !!editId;

        const ownerSelect = document.getElementById('link-owner');
        const ownerId = ownerSelect && ownerSelect.value ? parseInt(ownerSelect.value, 10) : undefined;

        const formData = {
            action: isEdit ? 'update' : 'create',
            id: isEdit ? parseInt(editId, 10) : undefined,
            slug: document.getElementById('link-slug').value,
            title: document.getElementById('link-title').value,
            message: document.getElementById('link-message').value,
            marker: document.getElementById('link-marker').value,
            active: document.getElementById('link-active').checked
        };

        // Add owner_id for admins
        if (ownerId !== undefined) {
            formData.owner_id = ownerId;
        }

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

            // Setup owner selector and set current owner
            await this.setupOwnerSelector();
            const ownerSelect = document.getElementById('link-owner');
            if (ownerSelect && link.owner_id) {
                ownerSelect.value = link.owner_id;
            }

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
        document.getElementById('pixel-event-type').value = 'Lead';
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
            event_type: document.getElementById('pixel-event-type').value,
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
            document.getElementById('pixel-event-type').value = pixel.event_type || 'Lead';
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

    toggleTelegramFields() {
        const enableTelegram = document.getElementById('user-enable-telegram').checked;
        const telegramFields = document.getElementById('telegram-fields');
        if (telegramFields) {
            telegramFields.style.display = enableTelegram ? 'block' : 'none';
            // Make slug required if Telegram is enabled
            const slugField = document.getElementById('user-slug');
            if (slugField) {
                slugField.required = enableTelegram;
            }
        }
    }

    async saveUser() {
        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;
        const slug = document.getElementById('user-slug').value;
        const enableTelegram = document.getElementById('user-enable-telegram').checked;

        const body = { action: 'create', email, password, role: 'manager', slug };

        if (enableTelegram) {
            body.enable_telegram = true;
            body.tg_api_id = document.getElementById('user-tg-api-id').value;
            body.tg_api_hash = document.getElementById('user-tg-api-hash').value;
            body.tg_session_name = document.getElementById('user-tg-session-name').value;

            if (!body.tg_api_id || !body.tg_api_hash || !body.tg_session_name) {
                alert('Заполните все поля Telegram');
                return;
            }
            if (!slug) {
                alert('Slug обязателен для Telegram интеграции');
                return;
            }
        }

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            const result = await res.json();
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            this.loadUsers();
            if (enableTelegram && result.telegram_verified) {
                alert(`Менеджер создан. Telegram аккаунт верифицирован: ${result.telegram_user?.first_name || result.telegram_user?.username || 'OK'}`);
            } else {
                alert('Менеджер создан');
            }
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

    // Landings management
    async loadLandings(page = this.currentLandingsPage || 1, perPage = this.currentLandingsPerPage || 25) {
        if (!this.selectedManagerId) {
            this.renderLandingsTable([]);
            return;
        }
        try {
            const params = new URLSearchParams();
            params.append('manager_id', this.selectedManagerId);
            params.append('page', page);
            params.append('per_page', perPage);

            const response = await this.fetchData(`/api/landings?${params.toString()}`);
            const landings = response.items || response || [];
            this.landings = landings;
            this.renderLandingsTable(landings);

            if (response.pagination) {
                this.renderPagination('landings', response.pagination, 'loadLandings');
                this.currentLandingsPage = page;
                this.currentLandingsPerPage = perPage;
            }
        } catch (e) {
            console.error('Error loading landings', e);
            alert('Ошибка загрузки лендингов (доступ только для админа)');
        }
    }

    renderLandingsTable(landings) {
        const tbody = document.getElementById('landings-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        landings.forEach(l => {
            const row = document.createElement('tr');
            // Highlight rows that are not in database
            if (!l.in_database) {
                row.classList.add('table-warning');
            }
            // Build Keitaro-ready link template
            const key = (l.param_key && l.param_key.trim()) ? l.param_key.trim() : 'landing';
            // If значение не задано в БД, используем имя папки как дефолт
            const value = (l.param_value && String(l.param_value).trim()) || (l.folder ? String(l.folder).trim() : '');
            const slug = (l.manager && l.manager.slug) ? l.manager.slug : this.selectedManagerSlug;
            const base = `${location.origin}/?manager=${encodeURIComponent(slug)}${`&${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`}`;
            const keitaroParams = `&subid={subid}`;
            // Use Keitaro single-brace macros (standard format)
            // Keitaro will replace these macros with actual values
            const fbParams =
                `&fbclid={fbclid}` +
                `&utm_campaign={campaign.name}&campaign_name={campaign.name}` +
                `&utm_source={site_source_name}` +
                `&utm_placement={placement}` +
                `&campaign_id={campaign.id}` +
                `&adset_id={adset.id}` +
                `&ad_id={ad.id}` +
                `&adset_name={adset.name}` +
                `&ad_name={ad.name}` +
                `&pixel={pixel}`;
            const fullLink = base + keitaroParams + fbParams;
            const encodedFullLink = encodeURIComponent(fullLink);
            row.innerHTML = `
                <td>${l.id || '-'}</td>
                <td>${l.name} ${!l.in_database ? '<span class="badge bg-warning text-dark ms-1">Не в БД</span>' : ''}</td>
                <td><code>${l.folder}</code></td>
                <td>${l.manager ? l.manager.email : '-'}</td>
                <td>${l.param_key || '-'}</td>
                <td>${l.param_value || '-'}</td>
                <td>${l.marker || '-'}</td>
                <td>${l.price ? parseFloat(l.price).toFixed(2) : '-'}</td>
                <td>${l.utm_source || '-'}</td>
                <td>${l.utm_campaign || '-'}</td>
                <td><span class="badge ${l.active ? 'bg-success' : 'bg-secondary'}">${l.active ? 'Да' : 'Нет'}</span></td>
                <td>${this.formatKyivTime(l.created_at)}</td>
                <td>
                    ${l.id ? `
                        <button class="btn btn-sm btn-primary me-1" onclick="editLanding(${l.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger me-1" onclick="deleteLanding(${l.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" title="Копировать ссылку" onclick="copyLandingLink(decodeURIComponent('${encodedFullLink}'))">
                            <i class="fas fa-copy"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-success me-1" onclick="addLandingFromFolder('${l.folder}')" title="Добавить в базу данных">
                            <i class="fas fa-plus"></i> В БД
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteLandingFolder('${l.folder}')" title="Удалить папку с файлами">
                            <i class="fas fa-folder-minus"></i>
                        </button>
                    `}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async showAddLandingModal(folder = null) {
        const form = document.getElementById('landing-form');
        if (form) form.reset();
        document.getElementById('landing-id').value = '';
        document.getElementById('landing-modal-title').textContent = 'Добавить лендинг';
        document.getElementById('landing-folder').readOnly = false;

        // If folder is provided, pre-fill it
        if (folder) {
            document.getElementById('landing-folder').value = folder;
            document.getElementById('landing-name').value = folder; // Use folder name as default name
            document.getElementById('landing-folder').readOnly = true; // Don't allow changing existing folder
        }

        // Load users for manager dropdown and set selected manager
        await this.populateManagerDropdown();
        const sel = document.getElementById('landing-manager');
        if (sel && this.selectedManagerId) sel.value = String(this.selectedManagerId);

        const modal = new bootstrap.Modal(document.getElementById('addLandingModal'));
        modal.show();
    }

    async populateManagerDropdown() {
        try {
            const response = await this.fetchData('/api/users');
            const select = document.getElementById('landing-manager');
            if (!select) return;

            // Clear existing options except first one
            select.innerHTML = '<option value="">Не назначен</option>';

            // Handle different response formats
            let users = [];
            if (Array.isArray(response)) {
                users = response;
            } else if (response && Array.isArray(response.items)) {
                users = response.items;
            } else if (response && typeof response === 'object') {
                // If it's an object, try to extract users
                users = Object.values(response).filter(item => item && typeof item === 'object');
            }

            if (!Array.isArray(users)) {
                console.warn('Unexpected users format:', response);
                return;
            }

            users.forEach(u => {
                if (u.role === 'manager') {
                    const option = document.createElement('option');
                    option.value = u.id;
                    option.textContent = u.email;
                    select.appendChild(option);
                }
            });
        } catch (e) {
            console.error('Error loading users for dropdown', e);
        }
    }

    async editLanding(id) {
        const landing = this.landings?.find(l => l.id === id);
        if (!landing) {
            alert('Лендинг не найден');
            return;
        }

        document.getElementById('landing-id').value = landing.id;
        document.getElementById('landing-name').value = landing.name;
        document.getElementById('landing-folder').value = landing.folder;
        document.getElementById('landing-folder').readOnly = true; // Don't allow changing folder
        document.getElementById('landing-utm-source').value = landing.utm_source || '';
        document.getElementById('landing-utm-campaign').value = landing.utm_campaign || '';
        document.getElementById('landing-param-key').value = landing.param_key || '';
        document.getElementById('landing-param-value').value = landing.param_value || '';
        document.getElementById('landing-marker').value = landing.marker || '';
        document.getElementById('landing-price').value = landing.price || '';
        document.getElementById('landing-active').checked = landing.active;
        document.getElementById('landing-modal-title').textContent = 'Редактировать лендинг';

        // Load users and set manager
        await this.populateManagerDropdown();
        document.getElementById('landing-manager').value = landing.manager_id || '';

        const modal = new bootstrap.Modal(document.getElementById('addLandingModal'));
        modal.show();
    }

    async saveLanding() {
        const id = document.getElementById('landing-id').value;
        const name = document.getElementById('landing-name').value;
        const folder = document.getElementById('landing-folder').value;
        const managerId = this.selectedManagerId || document.getElementById('landing-manager').value;
        const utmSource = document.getElementById('landing-utm-source').value;
        const utmCampaign = document.getElementById('landing-utm-campaign').value;
        const paramKey = document.getElementById('landing-param-key').value;
        const paramValue = document.getElementById('landing-param-value').value;
        const marker = document.getElementById('landing-marker').value;
        const price = document.getElementById('landing-price').value;
        const active = document.getElementById('landing-active').checked;

        if (!name || !folder) {
            alert('Название и папка обязательны');
            return;
        }

        try {
            const action = id ? 'update' : 'create';
            const body = {
                action,
                name,
                folder,
                manager_id: managerId || null,
                utm_source: utmSource || null,
                utm_campaign: utmCampaign || null,
                param_key: paramKey || null,
                param_value: paramValue || null,
                marker: marker || null,
                price: price ? parseFloat(price) : null,
                active
            };

            if (id) {
                body.id = parseInt(id);
            }

            const res = await fetch('/api/landings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const result = await res.json();

            // If landing needs phrase, show phrase input modal
            if (result.needs_phrase && !id) {
                bootstrap.Modal.getInstance(document.getElementById('addLandingModal')).hide();
                this.showPhraseModal(result.phrase_key, result.param_value, result.utm_campaign, result.manager_slug);
            } else {
                bootstrap.Modal.getInstance(document.getElementById('addLandingModal')).hide();
                this.loadLandings();
                alert(id ? 'Лендинг обновлен' : 'Лендинг создан');
            }
        } catch (e) {
            console.error('Save landing error', e);
            alert('Ошибка сохранения лендинга: ' + e.message);
        }
    }

    showPhraseModal(phraseKey, paramValue, utmCampaign, managerSlug = null) {
        document.getElementById('phrase-key').value = phraseKey || '';
        document.getElementById('phrase-message').value = '';
        
        // Сохраняем manager_slug для использования при сохранении
        if (managerSlug) {
            this.phraseManagerSlug = managerSlug;
        } else {
            // Используем выбранного менеджера как fallback
            this.phraseManagerSlug = this.selectedManagerSlug;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('addPhraseModal'));
        modal.show();
    }

    async savePhrase() {
        const message = document.getElementById('phrase-message').value.trim();
        const key = document.getElementById('phrase-key').value.trim();

        if (!message || !key) {
            alert('Сообщение и ключ обязательны');
            return;
        }

        // Получаем manager_slug из сохраненного при показе модального окна или из выбранного менеджера
        const managerSlug = this.phraseManagerSlug || this.selectedManagerSlug;
        if (!managerSlug) {
            alert('Менеджер не выбран. Выберите менеджера перед добавлением фразы.');
            return;
        }
        
        console.log(`Saving phrase for manager: ${managerSlug}`);

        try {
            const res = await fetch('/api/landings/add-phrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, key, manager_slug: managerSlug })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            bootstrap.Modal.getInstance(document.getElementById('addPhraseModal')).hide();
            this.loadLandings();
            alert('Лендинг создан и фраза добавлена');
        } catch (e) {
            console.error('Save phrase error', e);
            alert('Ошибка сохранения фразы: ' + e.message);
        }
    }

    async deleteLanding(id) {
        if (!confirm('Удалить лендинг из базы данных?')) return;

        try {
            const res = await fetch('/api/landings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            this.loadLandings();
            alert('Лендинг удален из базы данных');
        } catch (e) {
            console.error('Delete landing error', e);
            alert('Ошибка удаления лендинга: ' + e.message);
        }
    }

    showUploadLandingModal() {
        const form = document.getElementById('upload-landing-form');
        if (form) form.reset();
        const modal = new bootstrap.Modal(document.getElementById('uploadLandingModal'));
        modal.show();
    }

    async uploadLanding() {
        const fileInput = document.getElementById('landing-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Выберите ZIP файл');
            return;
        }
        if (!this.selectedManagerId) {
            alert('Сначала выберите менеджера');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('manager_id', this.selectedManagerId);

        try {
            const res = await fetch('/api/landings/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            bootstrap.Modal.getInstance(document.getElementById('uploadLandingModal')).hide();
            alert(data.message || 'Лендинг загружен успешно! Папка: ' + data.folder);

            // Reload landings to show newly uploaded landing
            this.loadLandings();
        } catch (e) {
            console.error('Upload landing error', e);
            alert('Ошибка загрузки лендинга: ' + e.message);
        }
    }

    async clearDatabase() {
        const password = document.getElementById('clear-password').value;
        if (!password) {
            alert('Введите пароль!');
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

    // Managers Analytics
    async loadManagersAnalytics() {
        try {
            // Check if user is admin
            const user = await this.fetchData('/api/current-user');
            if (user.role !== 'admin') {
                const tabContent = document.getElementById('managers-analytics');
                if (tabContent) {
                    tabContent.innerHTML = '<div class="alert alert-warning">Доступ только для администраторов</div>';
                }
                return;
            }

            const analytics = await this.fetchData('/api/analytics/managers');
            this.renderManagersAnalytics(analytics);
        } catch (error) {
            console.error('Error loading managers analytics:', error);
            alert('Ошибка загрузки аналитики по менеджерам');
        }
    }

    renderManagersAnalytics(analytics) {
        // Render stats cards
        const cardsContainer = document.getElementById('managers-stats-cards');
        if (cardsContainer) {
            const totalClicks = analytics.reduce((sum, m) => sum + m.clicks, 0);
            const totalCta = analytics.reduce((sum, m) => sum + m.cta_clicks, 0);
            const totalRedirects = analytics.reduce((sum, m) => sum + m.redirects, 0);
            const totalLeads = analytics.reduce((sum, m) => sum + m.leads, 0);

            cardsContainer.innerHTML = `
                <div class="col-md-3">
                    <div class="stats-card text-center">
                        <h6 class="text-muted">Всего менеджеров</h6>
                        <h3>${analytics.length}</h3>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card text-center">
                        <h6 class="text-muted">Всего кликов</h6>
                        <h3>${totalClicks}</h3>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card text-center">
                        <h6 class="text-muted">Всего CTA</h6>
                        <h3>${totalCta}</h3>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card text-center">
                        <h6 class="text-muted">Всего лидов</h6>
                        <h3>${totalLeads}</h3>
                    </div>
                </div>
            `;
        }

        // Store full data for client-side pagination
        this.managersAnalyticsData = analytics;
        this.renderManagersAnalyticsTable(analytics, this.currentManagersAnalyticsPage || 1, this.currentManagersAnalyticsPerPage || 25);
    }

    renderManagersAnalyticsTable(analytics, page = 1, perPage = 25) {
        // Render table
        const tbody = document.getElementById('managers-analytics-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (analytics.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">Нет данных</td></tr>';
            return;
        }

        const total = analytics.length;
        const pages = Math.ceil(total / perPage) || 1;
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const paginatedAnalytics = analytics.slice(start, end);

        paginatedAnalytics.forEach(manager => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${manager.email}</strong></td>
                <td>${manager.email}</td>
                <td><code>${manager.slug}</code></td>
                <td><span class="badge bg-primary">${manager.clicks}</span></td>
                <td><span class="badge bg-info">${manager.cta_clicks}</span></td>
                <td><span class="badge bg-warning">${manager.redirects}</span></td>
                <td><span class="badge bg-success">${manager.leads}</span></td>
                <td><span class="badge bg-secondary">${manager.chat_links}</span></td>
                <td>${manager.cta_rate.toFixed(2)}%</td>
                <td>${manager.lead_rate.toFixed(2)}%</td>
                <td>${manager.recent_clicks}</td>
            `;
            tbody.appendChild(row);
        });

        this.renderPagination('managers-analytics', {
            page: page,
            pages: pages,
            per_page: perPage,
            total: total,
            has_next: page < pages,
            has_prev: page > 1
        }, (p, pp) => {
            this.currentManagersAnalyticsPage = p;
            this.currentManagersAnalyticsPerPage = pp;
            this.renderManagersAnalyticsTable(this.managersAnalyticsData, p, pp);
        });

        // Render chart
        const chartCtx = document.getElementById('managersChart');
        if (chartCtx && analytics.length > 0) {
            // Destroy previous instance
            if (this.charts.managers && typeof this.charts.managers.destroy === 'function') {
                this.charts.managers.destroy();
            }

            const labels = analytics.map(m => m.email || m.slug || `Менеджер #${m.id}`);
            const clicksData = analytics.map(m => m.clicks);

            this.charts.managers = new Chart(chartCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Клики',
                        data: clicksData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
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

function filterKeitaroClicks() {
    adminPanel.filterKeitaroClicks();
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

// Landing functions
async function loadLandings() {
    adminPanel.loadLandings();
}

function showAddLandingModal() {
    adminPanel.showAddLandingModal();
}

function showUploadLandingModal() {
    adminPanel.showUploadLandingModal();
}

function saveLanding() {
    adminPanel.saveLanding();
}

function editLanding(id) {
    adminPanel.editLanding(id);
}

function deleteLanding(id) {
    adminPanel.deleteLanding(id);
}

function uploadLanding() {
    adminPanel.uploadLanding();
}

function addLandingFromFolder(folder) {
    adminPanel.showAddLandingModal(folder);
}

async function deleteLandingFolder(folder) {
    try {
        if (!confirm(`Удалить папку лендинга "${folder}"?`)) return;
        const res = await fetch('/api/landings/delete-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder, manager_id: adminPanel.selectedManagerId })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        alert('Папка удалена');
        adminPanel.loadLandings();
    } catch (e) {
        console.error('Delete folder error', e);
        alert('Ошибка удаления папки: ' + e.message);
    }
}

function copyLandingLink(link) {
    if (!link) return;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                alert('Скопировано:\n' + link);
            }).catch(() => fallbackCopy(link));
        } else {
            fallbackCopy(link);
        }
    } catch (e) {
        fallbackCopy(link);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
    alert('Скопировано:\n' + text);
}

// Initialize admin panel
const adminPanel = new AdminPanel();
