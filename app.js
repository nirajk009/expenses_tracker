// MoneyVibe - Gen Z Expense Tracker
// LocalStorage-based expense management with natural language input

class MoneyVibe {
    constructor() {
        this.expenses = this.loadExpenses();
        this.categories = {
            transport: { name: 'Transport', icon: 'fa-car', color: '#60a5fa' },
            food: { name: 'Food', icon: 'fa-utensils', color: '#fbbf24' },
            snacks: { name: 'Snacks', icon: 'fa-cookie-bite', color: '#f472b6' },
            shopping: { name: 'Shopping', icon: 'fa-shopping-bag', color: '#a78bfa' },
            entertainment: { name: 'Fun', icon: 'fa-gamepad', color: '#34d399' },
            other: { name: 'Other', icon: 'fa-ellipsis-h', color: '#9ca3af' }
        };
        this.currentCategory = 'transport';
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.updateDate();
        this.render();
    }

    cacheDOM() {
        this.dom = {
            currentDate: document.getElementById('currentDate'),
            todayTotal: document.getElementById('todayTotal'),
            weekTotal: document.getElementById('weekTotal'),
            monthTotal: document.getElementById('monthTotal'),
            trendIndicator: document.getElementById('trendIndicator'),
            expenseInput: document.getElementById('expenseInput'),
            addExpenseBtn: document.getElementById('addExpenseBtn'),
            categoriesGrid: document.getElementById('categoriesGrid'),
            expensesList: document.getElementById('expensesList'),
            clearAllBtn: document.getElementById('clearAllBtn'),
            expenseModal: document.getElementById('expenseModal'),
            closeModal: document.getElementById('closeModal'),
            expenseForm: document.getElementById('expenseForm'),
            descInput: document.getElementById('descInput'),
            amountInput: document.getElementById('amountInput'),
            categoryOptions: document.getElementById('categoryOptions'),
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toastMessage'),
            tagBtns: document.querySelectorAll('.tag-btn'),
            // Analytics page elements
            viewAnalyticsBtn: document.getElementById('viewAnalyticsBtn'),
            headerAnalyticsBtn: document.getElementById('headerAnalyticsBtn'),
            analyticsPage: document.getElementById('analyticsPage'),
            backToHome: document.getElementById('backToHome'),
            periodBtns: document.querySelectorAll('.period-btn'),
            analyticsTotal: document.getElementById('analyticsTotal'),
            analyticsCount: document.getElementById('analyticsCount'),
            analyticsAverage: document.getElementById('analyticsAverage'),
            categoryChart: document.getElementById('categoryChart'),
            chartLegend: document.getElementById('chartLegend'),
            trendChart: document.getElementById('trendChart'),
            monthlyChart: document.getElementById('monthlyChart'),
            insightsList: document.getElementById('insightsList'),
            fullExpensesList: document.getElementById('fullExpensesList'),
            filterCategory: document.getElementById('filterCategory'),
            filterSort: document.getElementById('filterSort'),
            pagination: document.getElementById('pagination'),
            // New analytics elements
            monthPicker: document.getElementById('monthPicker'),
            analyticsCategoryFilter: document.getElementById('analyticsCategoryFilter'),
            stockChart: document.getElementById('stockChart'),
            stockCurrent: document.getElementById('stockCurrent'),
            stockChange: document.getElementById('stockChange')
        };
        
            // Analytics state
        this.analyticsState = {
            period: 'week',
            currentPage: 1,
            itemsPerPage: 10,
            filterCategory: 'all',
            filterSort: 'newest',
            selectedMonth: null
        };
        
        // Set default month picker to current month
        const now = new Date();
        this.analyticsState.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    bindEvents() {
        // Quick add expense
        this.dom.addExpenseBtn.addEventListener('click', () => this.handleQuickAdd());
        this.dom.expenseInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleQuickAdd();
        });

        // Quick tags
        this.dom.tagBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.expenseInput.value = btn.dataset.text;
                this.handleQuickAdd();
            });
        });

        // Clear all
        this.dom.clearAllBtn.addEventListener('click', () => this.clearAllExpenses());

        // Modal
        this.dom.closeModal.addEventListener('click', () => this.closeModal());
        this.dom.expenseModal.addEventListener('click', (e) => {
            if (e.target === this.dom.expenseModal) this.closeModal();
        });

        // Category selection in modal
        this.dom.categoryOptions.querySelectorAll('.cat-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.categoryOptions.querySelectorAll('.cat-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.cat;
            });
        });

        // Form submission
        this.dom.expenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Analytics page navigation
        this.dom.viewAnalyticsBtn.addEventListener('click', () => this.openAnalytics());
        this.dom.headerAnalyticsBtn.addEventListener('click', () => this.openAnalytics());
        this.dom.backToHome.addEventListener('click', () => this.closeAnalytics());

        // Month picker
        if (this.dom.monthPicker) {
            this.dom.monthPicker.value = this.analyticsState.selectedMonth;
            this.dom.monthPicker.addEventListener('change', (e) => {
                this.analyticsState.selectedMonth = e.target.value;
                this.analyticsState.period = 'custom';
                this.dom.periodBtns.forEach(b => b.classList.remove('active'));
                this.renderAnalytics();
            });
        }

        // Analytics category filter
        if (this.dom.analyticsCategoryFilter) {
            this.dom.analyticsCategoryFilter.addEventListener('change', (e) => {
                this.analyticsState.filterCategory = e.target.value;
                this.renderAnalytics();
            });
        }

        // Period selector
        this.dom.periodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.dom.periodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.analyticsState.period = btn.dataset.period;
                this.analyticsState.currentPage = 1;
                this.renderAnalytics();
            });
        });

        // History filters
        this.dom.filterCategory.addEventListener('change', (e) => {
            this.analyticsState.filterCategory = e.target.value;
            this.analyticsState.currentPage = 1;
            this.renderHistory();
        });

        this.dom.filterSort.addEventListener('change', (e) => {
            this.analyticsState.filterSort = e.target.value;
            this.renderHistory();
        });
    }

    // Analytics Methods
    openAnalytics() {
        this.dom.analyticsPage.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.renderAnalytics();
    }

    closeAnalytics() {
        this.dom.analyticsPage.classList.remove('active');
        document.body.style.overflow = '';
    }

    getExpensesByPeriod(period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let filtered = [...this.expenses];
        
        // Apply category filter if set
        if (this.analyticsState.filterCategory && this.analyticsState.filterCategory !== 'all') {
            filtered = filtered.filter(e => e.category === this.analyticsState.filterCategory);
        }
        
        // Apply month filter if custom period selected
        if (period === 'custom' && this.analyticsState.selectedMonth) {
            const [year, month] = this.analyticsState.selectedMonth.split('-').map(Number);
            return filtered.filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === month - 1 && d.getFullYear() === year;
            });
        }
        
        switch(period) {
            case 'week':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return filtered.filter(e => new Date(e.date) >= weekAgo);
            case 'month':
                return filtered.filter(e => {
                    const d = new Date(e.date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            case 'year':
                return filtered.filter(e => new Date(e.date).getFullYear() === now.getFullYear());
            case 'all':
            default:
                return filtered;
        }
    }

    renderAnalytics() {
        const expenses = this.getExpensesByPeriod(this.analyticsState.period);
        this.renderSummaryCards(expenses);
        this.renderCategoryChart(expenses);
        this.renderStockChart(expenses);
        this.renderTrendChart(expenses);
        this.renderMonthlyChart();
        this.renderInsights(expenses);
        this.renderHistory();
    }

    renderStockChart(expenses) {
        if (!this.dom.stockChart) return;
        
        if (expenses.length === 0) {
            this.dom.stockChart.innerHTML = '<div class="empty-state"><p>No data for chart</p></div>';
            this.dom.stockCurrent.textContent = '₹0';
            this.dom.stockChange.textContent = '0%';
            return;
        }

        // Group expenses by day
        const dailyTotals = {};
        expenses.forEach(e => {
            const dateKey = new Date(e.date).toDateString();
            if (!dailyTotals[dateKey]) {
                dailyTotals[dateKey] = { date: new Date(e.date), amount: 0, items: [] };
            }
            dailyTotals[dateKey].amount += e.amount;
            dailyTotals[dateKey].items.push(e.description);
        });

        // Sort by date and get last 14 days
        const sortedDays = Object.values(dailyTotals).sort((a, b) => a.date - b.date);
        const dataPoints = sortedDays.slice(-14); // Show last 14 days

        if (dataPoints.length === 0) {
            this.dom.stockChart.innerHTML = '<div class="empty-state"><p>No data for chart</p></div>';
            return;
        }

        // Calculate stats
        const currentDay = dataPoints[dataPoints.length - 1].amount;
        const prevDay = dataPoints.length > 1 ? dataPoints[dataPoints.length - 2].amount : currentDay;
        const change = prevDay > 0 ? ((currentDay - prevDay) / prevDay) * 100 : 0;

        // Update header
        this.dom.stockCurrent.textContent = this.formatCurrency(currentDay);
        this.dom.stockChange.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs prev`;
        this.dom.stockChange.classList.toggle('negative', change < 0);

        // Create SVG line chart
        const width = 100;
        const height = 60;
        const padding = 8;
        
        const maxVal = Math.max(...dataPoints.map(d => d.amount), 1);
        const minVal = Math.min(...dataPoints.map(d => d.amount), 0);
        const range = maxVal - minVal || 1;

        // Generate smooth line path - simple curved line like the reference image
        let pathD = '';
        let areaD = '';
        
        dataPoints.forEach((point, i) => {
            const x = padding + (i / (dataPoints.length - 1 || 1)) * (width - 2 * padding);
            const y = height - padding - ((point.amount - minVal) / range) * (height - 2 * padding);
            
            if (i === 0) {
                pathD += `M ${x} ${y}`;
                areaD += `M ${x} ${height - padding} L ${x} ${y}`;
            } else {
                // Simple curve control points
                const prevX = padding + ((i - 1) / (dataPoints.length - 1 || 1)) * (width - 2 * padding);
                const prevY = height - padding - ((dataPoints[i - 1].amount - minVal) / range) * (height - 2 * padding);
                const cpX = (prevX + x) / 2;
                pathD += ` Q ${cpX} ${prevY}, ${x} ${y}`;
                areaD += ` Q ${cpX} ${prevY}, ${x} ${y}`;
            }
        });
        
        // Close area path
        const lastX = padding + (width - 2 * padding);
        areaD += ` L ${lastX} ${height - padding} Z`;

        // Generate grid lines (horizontal only)
        let gridLines = '';
        for (let i = 0; i <= 4; i++) {
            const y = padding + (i / 4) * (height - 2 * padding);
            gridLines += `<line class="stock-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" />`;
        }

        // Generate points - only show some points to avoid clutter
        const showEvery = Math.ceil(dataPoints.length / 10);
        const points = dataPoints.map((point, i) => {
            const x = padding + (i / (dataPoints.length - 1 || 1)) * (width - 2 * padding);
            const y = height - padding - ((point.amount - minVal) / range) * (height - 2 * padding);
            const isLast = i === dataPoints.length - 1;
            const shouldShow = isLast || i % showEvery === 0 || dataPoints.length <= 10;
            
            if (!shouldShow) return '';
            
            return `<circle class="stock-point ${isLast ? 'active' : ''}" cx="${x}" cy="${y}" r="${isLast ? 5 : 3}" data-amount="${point.amount}" data-date="${point.date.toLocaleDateString('en-IN', {day:'numeric', month:'short'})}" data-items="${point.items.length}" />`;
        }).join('');

        const lineColor = '#a78bfa';
        const gradientId = 'stockGrad' + Date.now();

        this.dom.stockChart.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${lineColor};stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:${lineColor};stop-opacity:0" />
                    </linearGradient>
                </defs>
                ${gridLines}
                <path class="stock-area" d="${areaD}" fill="url(#${gradientId})" />
                <path class="stock-line" d="${pathD}" stroke="${lineColor}" />
                ${points}
            </svg>
            <div class="stock-tooltip" id="stockTooltip"></div>
        `;

        // Add tooltip events
        const tooltip = this.dom.stockChart.querySelector('#stockTooltip');
        this.dom.stockChart.querySelectorAll('.stock-point').forEach(point => {
            point.addEventListener('mouseenter', (e) => {
                const amount = e.target.dataset.amount;
                const date = e.target.dataset.date;
                const items = e.target.dataset.items;
                tooltip.innerHTML = `<strong>${date}</strong><br/>Spent: ${this.formatCurrency(Number(amount))}<br/>${items} transaction${items > 1 ? 's' : ''}`;
                tooltip.classList.add('visible');
                
                const rect = e.target.getBoundingClientRect();
                const chartRect = this.dom.stockChart.getBoundingClientRect();
                tooltip.style.left = Math.min(rect.left - chartRect.left + 10, chartRect.width - 100) + 'px';
                tooltip.style.top = (rect.top - chartRect.top - 50) + 'px';
            });
            
            point.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
        });
    }

    renderSummaryCards(expenses) {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        const count = expenses.length;
        
        // Calculate daily average based on period
        let days = 1;
        if (this.analyticsState.period === 'week') days = 7;
        else if (this.analyticsState.period === 'month') days = 30;
        else if (this.analyticsState.period === 'year') days = 365;
        else days = Math.max(1, Math.ceil((Date.now() - Math.min(...expenses.map(e => new Date(e.date).getTime()))) / (1000 * 60 * 60 * 24)));
        
        const average = count > 0 ? total / days : 0;

        this.dom.analyticsTotal.textContent = this.formatCurrency(total);
        this.dom.analyticsCount.textContent = count;
        this.dom.analyticsAverage.textContent = this.formatCurrency(Math.round(average));
    }

    renderCategoryChart(expenses) {
        const totals = this.getCategoryTotals(expenses);
        const total = Object.values(totals).reduce((sum, v) => sum + v, 0);
        
        if (total === 0) {
            this.dom.categoryChart.innerHTML = '<div class="empty-state"><p>No data</p></div>';
            this.dom.chartLegend.innerHTML = '';
            return;
        }

        // Create SVG donut chart
        const colors = {
            transport: '#60a5fa',
            food: '#fbbf24',
            snacks: '#f472b6',
            shopping: '#a78bfa',
            entertainment: '#34d399',
            other: '#9ca3af'
        };

        let svgContent = '';
        let legendContent = '';
        let currentAngle = 0;
        const radius = 80;
        const center = 90;

        Object.entries(totals).forEach(([cat, amount]) => {
            if (amount === 0) return;
            
            const percentage = amount / total;
            const angle = percentage * 360;
            const color = colors[cat] || colors.other;
            
            // Calculate SVG arc
            const startAngle = (currentAngle - 90) * Math.PI / 180;
            const endAngle = (currentAngle + angle - 90) * Math.PI / 180;
            
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            svgContent += `<path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" />`;
            
            // Add legend item
            const catName = this.categories[cat]?.name || cat;
            legendContent += `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${color}"></div>
                    <div class="legend-info">
                        <span class="legend-name">${catName}</span>
                        <span class="legend-amount">${this.formatCurrency(amount)} (${Math.round(percentage * 100)}%)</span>
                    </div>
                </div>
            `;
            
            currentAngle += angle;
        });

        // Inner circle for donut effect
        svgContent += `<circle cx="${center}" cy="${center}" r="50" fill="var(--bg-card)" />`;
        svgContent += `<text x="${center}" y="${center - 5}" text-anchor="middle" fill="var(--text-primary)" font-size="14" font-weight="600">${this.formatCurrency(total)}</text>`;
        svgContent += `<text x="${center}" y="${center + 15}" text-anchor="middle" fill="var(--text-muted)" font-size="10">Total</text>`;

        this.dom.categoryChart.innerHTML = `<svg class="donut-chart" viewBox="0 0 180 180">${svgContent}</svg>`;
        this.dom.chartLegend.innerHTML = legendContent;
    }

    renderTrendChart(expenses) {
        // Group by day for the selected period
        const days = {};
        const now = new Date();
        let daysToShow = 7;
        
        if (this.analyticsState.period === 'month') daysToShow = 30;
        else if (this.analyticsState.period === 'year') daysToShow = 12;
        
        // Initialize days
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now);
            if (this.analyticsState.period === 'year') {
                d.setMonth(d.getMonth() - i);
                days[d.getMonth()] = { label: d.toLocaleDateString('en-IN', { month: 'short' }), amount: 0 };
            } else {
                d.setDate(d.getDate() - i);
                days[d.toDateString()] = { label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), amount: 0 };
            }
        }

        // Sum expenses
        expenses.forEach(e => {
            const d = new Date(e.date);
            if (this.analyticsState.period === 'year') {
                if (days[d.getMonth()]) days[d.getMonth()].amount += e.amount;
            } else {
                if (days[d.toDateString()]) days[d.toDateString()].amount += e.amount;
            }
        });

        const values = Object.values(days);
        const max = Math.max(...values.map(v => v.amount), 1);

        this.dom.trendChart.innerHTML = values.map(day => {
            const height = (day.amount / max) * 100;
            return `
                <div class="trend-bar-wrapper">
                    <div class="trend-bar" style="height: ${Math.max(height, 4)}%">
                        <span class="trend-bar-amount">${this.formatCurrency(day.amount)}</span>
                    </div>
                    <span class="trend-bar-label">${day.label}</span>
                </div>
            `;
        }).join('');
    }

    renderMonthlyChart() {
        // Show last 6 months
        const months = {};
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            months[key] = {
                label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                amount: 0
            };
        }

        this.expenses.forEach(e => {
            const d = new Date(e.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (months[key]) months[key].amount += e.amount;
        });

        const values = Object.values(months);
        const max = Math.max(...values.map(v => v.amount), 1);

        this.dom.monthlyChart.innerHTML = values.map(m => `
            <div class="monthly-item">
                <span class="monthly-name">${m.label}</span>
                <div class="monthly-bar-wrapper">
                    <div class="monthly-bar" style="width: ${(m.amount / max) * 100}%">
                        ${m.amount > 0 ? `<span class="monthly-amount">${this.formatCurrency(m.amount)}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderInsights(expenses) {
        if (expenses.length === 0) {
            this.dom.insightsList.innerHTML = '<p class="empty-state">Add some expenses to see insights!</p>';
            return;
        }

        const insights = [];
        const totals = this.getCategoryTotals(expenses);
        const total = Object.values(totals).reduce((sum, v) => sum + v, 0);
        
        // Highest spending category
        const highestCat = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
        if (highestCat && highestCat[1] > 0) {
            const catName = this.categories[highestCat[0]]?.name || highestCat[0];
            const percent = Math.round((highestCat[1] / total) * 100);
            insights.push({
                icon: 'high',
                iconClass: 'fa-fire',
                text: `Your highest spending is on <strong>${catName}</strong> at ${percent}% of total (${this.formatCurrency(highestCat[1])})`
            });
        }

        // Average transaction
        const avgTransaction = total / expenses.length;
        insights.push({
            icon: 'info',
            iconClass: 'fa-calculator',
            text: `Your average transaction is <strong>${this.formatCurrency(Math.round(avgTransaction))}</strong>`
        });

        // Most expensive transaction
        const mostExpensive = expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0]);
        if (mostExpensive) {
            insights.push({
                icon: 'info',
                iconClass: 'fa-tag',
                text: `Your biggest expense was <strong>${this.formatCurrency(mostExpensive.amount)}</strong> on ${mostExpensive.description}`
            });
        }

        // Daily average
        const days = new Set(expenses.map(e => new Date(e.date).toDateString())).size;
        const dailyAvg = total / Math.max(days, 1);
        insights.push({
            icon: 'good',
            iconClass: 'fa-chart-line',
            text: `You're spending about <strong>${this.formatCurrency(Math.round(dailyAvg))}</strong> per day on average`
        });

        this.dom.insightsList.innerHTML = insights.map(i => `
            <div class="insight-item">
                <div class="insight-icon ${i.icon}"><i class="fas ${i.iconClass}"></i></div>
                <span class="insight-text">${i.text}</span>
            </div>
        `).join('');
    }

    renderHistory() {
        let filtered = [...this.expenses];
        
        // Apply category filter
        if (this.analyticsState.filterCategory !== 'all') {
            filtered = filtered.filter(e => e.category === this.analyticsState.filterCategory);
        }
        
        // Apply sort
        switch(this.analyticsState.filterSort) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'highest':
                filtered.sort((a, b) => b.amount - a.amount);
                break;
            case 'lowest':
                filtered.sort((a, b) => a.amount - b.amount);
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        // Pagination
        const totalPages = Math.ceil(filtered.length / this.analyticsState.itemsPerPage);
        const start = (this.analyticsState.currentPage - 1) * this.analyticsState.itemsPerPage;
        const paginated = filtered.slice(start, start + this.analyticsState.itemsPerPage);

        if (paginated.length === 0) {
            this.dom.fullExpensesList.innerHTML = '<div class="empty-state"><p>No expenses found</p></div>';
            this.dom.pagination.innerHTML = '';
            return;
        }

        this.dom.fullExpensesList.innerHTML = paginated.map(expense => {
            const cat = this.categories[expense.category] || this.categories.other;
            const date = new Date(expense.date);
            const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="expense-item ${expense.category}">
                    <div class="expense-icon">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div class="expense-details">
                        <div class="expense-title">${this.escapeHtml(expense.description)}</div>
                        <div class="expense-meta">
                            <span>${cat.name}</span>
                            <span>•</span>
                            <span>${dateStr}, ${timeStr}</span>
                        </div>
                    </div>
                    <div class="expense-amount">${this.formatCurrency(expense.amount)}</div>
                    <div class="expense-actions">
                        <button class="btn-icon" onclick="app.deleteExpense(${expense.id}); app.renderHistory();" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Render pagination
        if (totalPages > 1) {
            let paginationHtml = '';
            
            // Prev button
            paginationHtml += `<button class="page-btn" ${this.analyticsState.currentPage === 1 ? 'disabled' : ''} onclick="app.goToPage(${this.analyticsState.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.analyticsState.currentPage - 1 && i <= this.analyticsState.currentPage + 1)) {
                    paginationHtml += `<button class="page-btn ${i === this.analyticsState.currentPage ? 'active' : ''}" onclick="app.goToPage(${i})">${i}</button>`;
                } else if (i === this.analyticsState.currentPage - 2 || i === this.analyticsState.currentPage + 2) {
                    paginationHtml += `<span style="color: var(--text-muted);">...</span>`;
                }
            }
            
            // Next button
            paginationHtml += `<button class="page-btn" ${this.analyticsState.currentPage === totalPages ? 'disabled' : ''} onclick="app.goToPage(${this.analyticsState.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
            
            this.dom.pagination.innerHTML = paginationHtml;
        } else {
            this.dom.pagination.innerHTML = '';
        }
    }

    goToPage(page) {
        this.analyticsState.currentPage = page;
        this.renderHistory();
    }

    // Natural Language Parser
    parseExpenseInput(input) {
        // Patterns to match:
        // "Uber 100 rs", "Brunch 120", "Evening snacks 50 rs", "Movie 250"
        const patterns = [
            // Description amount rs/rupees/₹
            /(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(?:rs|rupees?|₹)?$/i,
            // ₹ amount description
            /^(?:₹|rs\.?|rupees?)\s*(\d+(?:\.\d{1,2})?)\s+(.+)$/i,
        ];

        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) {
                // First pattern: description first, amount second
                if (match[2] && !isNaN(match[2])) {
                    return {
                        description: match[1].trim(),
                        amount: parseFloat(match[2])
                    };
                }
                // Second pattern: amount first, description second
                if (match[1] && !isNaN(match[1])) {
                    return {
                        description: match[2].trim(),
                        amount: parseFloat(match[1])
                    };
                }
            }
        }

        // Try to extract just numbers
        const numberMatch = input.match(/(\d+(?:\.\d{1,2})?)/);
        if (numberMatch) {
            const amount = parseFloat(numberMatch[1]);
            const description = input.replace(numberMatch[1], '').replace(/rs|rupees|₹/gi, '').trim();
            if (description && amount > 0) {
                return { description, amount };
            }
        }

        return null;
    }

    // Auto-detect category based on description
    detectCategory(description) {
        const desc = description.toLowerCase();
        
        const keywords = {
            transport: ['uber', 'ola', 'taxi', 'cab', 'auto', 'rickshaw', 'bus', 'train', 'metro', 'petrol', 'diesel', 'fuel', 'parking'],
            food: ['brunch', 'breakfast', 'lunch', 'dinner', 'meal', 'biryani', 'pizza', 'burger', 'restaurant', 'hotel', 'cafe', 'dhaba'],
            snacks: ['snack', 'chips', 'biscuit', 'chocolate', 'ice cream', 'juice', 'tea', 'coffee', 'samosa', 'namkeen', 'evening'],
            shopping: ['shopping', 'clothes', 'shoes', 'amazon', 'flipkart', 'myntra', 'grocery', 'market', 'mall', 'store'],
            entertainment: ['movie', 'netflix', 'prime', 'spotify', 'game', 'pubg', 'fun', 'party', 'drinks', 'alcohol', 'concert']
        };

        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => desc.includes(word))) {
                return category;
            }
        }

        return 'other';
    }

    handleQuickAdd() {
        const input = this.dom.expenseInput.value.trim();
        if (!input) {
            this.showToast('Please enter an expense!', 'error');
            return;
        }

        const parsed = this.parseExpenseInput(input);
        
        if (parsed) {
            const category = this.detectCategory(parsed.description);
            this.addExpense({
                description: this.capitalizeFirst(parsed.description),
                amount: parsed.amount,
                category: category
            });
            this.dom.expenseInput.value = '';
            this.showToast(`Added ${parsed.description} - ₹${parsed.amount}`);
        } else {
            // Open manual modal if parsing fails
            this.dom.descInput.value = input;
            this.openModal();
        }
    }

    handleFormSubmit() {
        const description = this.dom.descInput.value.trim();
        const amount = parseFloat(this.dom.amountInput.value);

        if (!description || !amount || amount <= 0) {
            this.showToast('Please fill all fields correctly!', 'error');
            return;
        }

        this.addExpense({
            description: this.capitalizeFirst(description),
            amount: amount,
            category: this.currentCategory
        });

        this.closeModal();
        this.dom.expenseForm.reset();
        this.showToast('Expense added!');
    }

    addExpense(expense) {
        const newExpense = {
            id: Date.now(),
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: new Date().toISOString()
        };

        this.expenses.unshift(newExpense);
        this.saveExpenses();
        this.render();
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.saveExpenses();
        this.render();
        this.showToast('Expense deleted');
    }

    clearAllExpenses() {
        if (this.expenses.length === 0) return;
        
        if (confirm('Are you sure you want to clear all expenses? This cannot be undone.')) {
            this.expenses = [];
            this.saveExpenses();
            this.render();
            this.showToast('All expenses cleared');
        }
    }

    // Storage
    loadExpenses() {
        try {
            const stored = localStorage.getItem('moneyvibe_expenses');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading expenses:', e);
            return [];
        }
    }

    saveExpenses() {
        try {
            localStorage.setItem('moneyvibe_expenses', JSON.stringify(this.expenses));
        } catch (e) {
            console.error('Error saving expenses:', e);
        }
    }

    // Calculations
    getTodayExpenses() {
        const today = new Date().toDateString();
        return this.expenses.filter(e => new Date(e.date).toDateString() === today);
    }

    getYesterdayExpenses() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.expenses.filter(e => new Date(e.date).toDateString() === yesterday.toDateString());
    }

    getWeekExpenses() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.expenses.filter(e => new Date(e.date) >= weekAgo);
    }

    getMonthExpenses() {
        const now = new Date();
        return this.expenses.filter(e => {
            const date = new Date(e.date);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
    }

    getCategoryTotals(expenses) {
        const totals = {};
        Object.keys(this.categories).forEach(cat => totals[cat] = 0);
        
        expenses.forEach(e => {
            if (totals[e.category] !== undefined) {
                totals[e.category] += e.amount;
            } else {
                totals.other += e.amount;
            }
        });
        
        return totals;
    }

    // Rendering
    render() {
        this.renderTotals();
        this.renderCategories();
        this.renderExpensesList();
    }

    renderTotals() {
        const today = this.getTodayExpenses();
        const yesterday = this.getYesterdayExpenses();
        const week = this.getWeekExpenses();
        const month = this.getMonthExpenses();

        const todayTotal = today.reduce((sum, e) => sum + e.amount, 0);
        const yesterdayTotal = yesterday.reduce((sum, e) => sum + e.amount, 0);
        const weekTotal = week.reduce((sum, e) => sum + e.amount, 0);
        const monthTotal = month.reduce((sum, e) => sum + e.amount, 0);

        this.dom.todayTotal.textContent = this.formatCurrency(todayTotal);
        this.dom.weekTotal.textContent = this.formatCurrency(weekTotal);
        this.dom.monthTotal.textContent = this.formatCurrency(monthTotal);

        // Trend indicator
        if (yesterdayTotal > 0) {
            const diff = todayTotal - yesterdayTotal;
            const percent = Math.abs((diff / yesterdayTotal) * 100).toFixed(0);
            
            if (diff > 0) {
                this.dom.trendIndicator.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${percent}% vs yesterday</span>`;
                this.dom.trendIndicator.classList.remove('down');
            } else if (diff < 0) {
                this.dom.trendIndicator.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${percent}% vs yesterday</span>`;
                this.dom.trendIndicator.classList.add('down');
            } else {
                this.dom.trendIndicator.innerHTML = `<i class="fas fa-minus"></i> <span>Same as yesterday</span>`;
                this.dom.trendIndicator.classList.remove('down');
            }
        } else {
            this.dom.trendIndicator.innerHTML = `<i class="fas fa-chart-line"></i> <span>No data for yesterday</span>`;
            this.dom.trendIndicator.classList.remove('down');
        }
    }

    renderCategories() {
        const todayExpenses = this.getTodayExpenses();
        const totals = this.getCategoryTotals(todayExpenses);

        this.dom.categoriesGrid.innerHTML = Object.entries(this.categories).map(([key, cat]) => {
            const amount = totals[key];
            return `
                <div class="category-card ${key}">
                    <div class="category-icon">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div class="category-name">${cat.name}</div>
                    <div class="category-amount">${this.formatCurrency(amount)}</div>
                </div>
            `;
        }).join('');
    }

    renderExpensesList() {
        if (this.expenses.length === 0) {
            this.dom.expensesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No expenses yet. Start tracking!</p>
                </div>
            `;
            return;
        }

        // Show last 20 expenses
        const recentExpenses = this.expenses.slice(0, 20);

        this.dom.expensesList.innerHTML = recentExpenses.map(expense => {
            const cat = this.categories[expense.category] || this.categories.other;
            const date = new Date(expense.date);
            const timeStr = date.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const dateStr = date.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            });

            return `
                <div class="expense-item ${expense.category}">
                    <div class="expense-icon">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div class="expense-details">
                        <div class="expense-title">${this.escapeHtml(expense.description)}</div>
                        <div class="expense-meta">
                            <span>${cat.name}</span>
                            <span>•</span>
                            <span>${dateStr}, ${timeStr}</span>
                        </div>
                    </div>
                    <div class="expense-amount">${this.formatCurrency(expense.amount)}</div>
                    <div class="expense-actions">
                        <button class="btn-icon" onclick="app.deleteExpense(${expense.id})" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Utilities
    updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.dom.currentDate.textContent = new Date().toLocaleDateString('en-IN', options);
    }

    formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openModal() {
        this.dom.expenseModal.classList.add('active');
        this.dom.descInput.focus();
    }

    closeModal() {
        this.dom.expenseModal.classList.remove('active');
    }

    showToast(message, type = 'success') {
        this.dom.toastMessage.textContent = message;
        const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
        this.dom.toast.querySelector('i').className = `fas ${icon}`;
        this.dom.toast.style.borderColor = type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)';
        this.dom.toast.style.color = type === 'error' ? 'var(--danger)' : 'var(--success)';
        
        this.dom.toast.classList.add('show');
        
        setTimeout(() => {
            this.dom.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize app
const app = new MoneyVibe();

// Register service worker for PWA support (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Could add service worker here for offline support
    });
}
