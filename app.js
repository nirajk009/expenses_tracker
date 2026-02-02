// N-Money - Gen Z Expense Tracker
// LocalStorage + MySQL sync for fast UI with cloud backup

// API Configuration and Sync Class
class MoneyVibeAPI {
    constructor() {
        this.baseUrl = 'https://shivshaktimultispecialityhospital.com/niraj_api/sql.php';
        this.syncQueue = [];
        this.isSyncing = false;
    }

    // Execute SQL query via API
    async query(sql, params = []) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sql, params: params })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    }

    // User signup - save to database
    async signup(email, password, name) {
        // Simple hash (for demo - use bcrypt in production)
        const hashedPass = btoa(password);
        const result = await this.query(
            'INSERT INTO expenses_users (email, password, name) VALUES (?, ?, ?)',
            [email, hashedPass, name]
        );
        if (result.success) {
            return { success: true, userId: result.lastInsertId };
        }
        return { success: false, error: result.message || 'Signup failed' };
    }

    // User login - verify credentials
    async login(email, password) {
        const hashedPass = btoa(password);
        const result = await this.query(
            'SELECT id, email, name, created_at FROM expenses_users WHERE email = ? AND password = ?',
            [email, hashedPass]
        );
        if (result.success && result.data && result.data.length > 0) {
            return { success: true, user: result.data[0] };
        }
        // Check if user exists with wrong password
        const userExists = await this.query(
            'SELECT id FROM expenses_users WHERE email = ?',
            [email]
        );
        if (userExists.success && userExists.data && userExists.data.length > 0) {
            return { success: false, error: 'Incorrect password' };
        }
        return { success: false, error: 'User not found' };
    }

    // Add expense to database (background sync)
    async addExpense(userId, expense) {
        const result = await this.query(
            'INSERT INTO expenses_data (user_id, description, amount, category, date, local_id) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, expense.description, expense.amount, expense.category, expense.date, expense.id]
        );
        return result;
    }

    // Delete expense from database
    async deleteExpense(userId, localId) {
        const result = await this.query(
            'DELETE FROM expenses_data WHERE user_id = ? AND local_id = ?',
            [userId, localId]
        );
        return result;
    }

    // Get all expenses for user from database
    async getExpenses(userId) {
        const result = await this.query(
            'SELECT * FROM expenses_data WHERE user_id = ? ORDER BY date DESC',
            [userId]
        );
        return result;
    }

    // Sync local expenses to database
    async syncExpenses(userId, localExpenses) {
        if (this.isSyncing || !userId) return;
        this.isSyncing = true;

        try {
            // Get remote expenses
            const remote = await this.getExpenses(userId);
            if (!remote.success) {
                this.isSyncing = false;
                return;
            }

            const remoteIds = new Set(remote.data.map(e => e.local_id));

            // Upload local expenses that don't exist remotely
            for (const expense of localExpenses) {
                if (!remoteIds.has(expense.id)) {
                    await this.addExpense(userId, expense);
                }
            }

            console.log('Sync complete');
        } catch (error) {
            console.error('Sync error:', error);
        }

        this.isSyncing = false;
    }

    // Update user profile
    async updateProfile(userId, name) {
        const result = await this.query(
            'UPDATE expenses_users SET name = ? WHERE id = ?',
            [name, userId]
        );
        return result;
    }

    // Update password
    async updatePassword(userId, currentPass, newPass) {
        const hashedCurrent = btoa(currentPass);
        const hashedNew = btoa(newPass);

        // Verify current password
        const verify = await this.query(
            'SELECT id FROM expenses_users WHERE id = ? AND password = ?',
            [userId, hashedCurrent]
        );

        if (!verify.success || !verify.data || verify.data.length === 0) {
            return { success: false, error: 'Current password is incorrect' };
        }

        // Update password
        const result = await this.query(
            'UPDATE expenses_users SET password = ? WHERE id = ?',
            [hashedNew, userId]
        );
        return result;
    }

    // Clear all expenses for user
    async clearExpenses(userId) {
        const result = await this.query(
            'DELETE FROM expenses_data WHERE user_id = ?',
            [userId]
        );
        return result;
    }
}

// Initialize API
const api = new MoneyVibeAPI();

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
        this.currentUser = this.loadUser();
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.updateDate();
        this.render();
        // Show profile button on startup (handles both logged in and logged out states)
        this.dom.userProfileBtn.style.display = 'flex';

        // For logged-in users, sync with database on page load
        if (this.currentUser) {
            this.syncOnLoad();
        }
    }

    // Sync expenses on page load for logged-in users
    async syncOnLoad() {
        try {
            // Fetch expenses from database
            const dbResult = await api.getExpenses(this.currentUser.id);

            if (!dbResult.success || !dbResult.data) {
                return; // No DB data, keep local
            }

            const dbExpenses = dbResult.data;
            const localExpenses = this.expenses;

            // Get local IDs and DB local_ids for comparison
            const dbLocalIds = new Set(dbExpenses.map(e => e.local_id || String(e.id)));

            // Find local expenses that are NOT in the database (unsynced)
            const unsyncedLocal = localExpenses.filter(e => !dbLocalIds.has(e.id));

            if (unsyncedLocal.length > 0) {
                // Ask user to sync unsynced local expenses
                this.dom.syncMessage.textContent = `You have ${unsyncedLocal.length} unsynced expense(s) on this device.`;
                const syncChoice = await this.showSyncModal();

                if (syncChoice) {
                    // Merge: keep DB expenses + add unsynced local
                    this.showToast('Syncing...');
                    await api.syncExpenses(this.currentUser.id, unsyncedLocal);
                    // Reload all from DB
                    const refreshed = await api.getExpenses(this.currentUser.id);
                    if (refreshed.success && refreshed.data) {
                        this.expenses = refreshed.data.map(e => ({
                            id: e.local_id || String(e.id),
                            description: e.description,
                            amount: parseFloat(e.amount),
                            category: e.category,
                            date: e.date
                        }));
                        this.saveExpenses();
                        this.render();
                    }
                    this.showToast('Synced!');
                } else {
                    // Discard local, load from DB
                    this.expenses = dbExpenses.map(e => ({
                        id: e.local_id || String(e.id),
                        description: e.description,
                        amount: parseFloat(e.amount),
                        category: e.category,
                        date: e.date
                    }));
                    this.saveExpenses();
                    this.render();
                    this.showToast('Loaded from cloud');
                }
            } else {
                // No unsynced local - just load from DB silently
                if (dbExpenses.length > 0) {
                    this.expenses = dbExpenses.map(e => ({
                        id: e.local_id || String(e.id),
                        description: e.description,
                        amount: parseFloat(e.amount),
                        category: e.category,
                        date: e.date
                    }));
                    this.saveExpenses();
                    this.render();
                }
            }
        } catch (error) {
            console.log('Sync on load failed:', error);
        }
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
            cardAnalyticsBtn: document.getElementById('cardAnalyticsBtn'),
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

        // Auth elements
        this.dom.authModal = document.getElementById('authModal');
        this.dom.authClose = document.getElementById('authClose');
        this.dom.authTabs = document.querySelectorAll('.auth-tab');
        this.dom.loginForm = document.getElementById('loginForm');
        this.dom.signupForm = document.getElementById('signupForm');
        this.dom.userProfileBtn = document.getElementById('userProfileBtn');
        this.dom.userMenu = document.getElementById('userMenu');
        this.dom.userName = document.getElementById('userName');
        this.dom.menuProfile = document.getElementById('menuProfile');
        this.dom.menuLogout = document.getElementById('menuLogout');

        // Profile page elements
        this.dom.profilePage = document.getElementById('profilePage');
        this.dom.backFromProfile = document.getElementById('backFromProfile');
        this.dom.profileName = document.getElementById('profileName');
        this.dom.profileEmail = document.getElementById('profileEmail');
        this.dom.editName = document.getElementById('editName');
        this.dom.editEmail = document.getElementById('editEmail');
        this.dom.profileForm = document.getElementById('profileForm');
        this.dom.passwordForm = document.getElementById('passwordForm');
        this.dom.memberSince = document.getElementById('memberSince');
        this.dom.totalExpensesCount = document.getElementById('totalExpensesCount');

        // Sync modal elements
        this.dom.syncModal = document.getElementById('syncModal');
        this.dom.syncMessage = document.getElementById('syncMessage');
        this.dom.syncYes = document.getElementById('syncYes');
        this.dom.syncNo = document.getElementById('syncNo');
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
        if (this.dom.cardAnalyticsBtn) {
            this.dom.cardAnalyticsBtn.addEventListener('click', () => this.openAnalytics());
        }
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

        // Auth events
        this.bindAuthEvents();

        // Check auth state
        this.checkAuthState();
    }

    // Auth Methods
    bindAuthEvents() {
        // Auth modal close
        this.dom.authClose.addEventListener('click', () => this.closeAuthModal());
        this.dom.authModal.addEventListener('click', (e) => {
            if (e.target === this.dom.authModal) this.closeAuthModal();
        });

        // Auth tabs
        this.dom.authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.dom.authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const formId = tab.dataset.tab === 'login' ? 'loginForm' : 'signupForm';
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                document.getElementById(formId).classList.add('active');
            });
        });

        // Login form
        this.dom.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Signup form
        this.dom.signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // User profile button
        this.dom.userProfileBtn.addEventListener('click', () => {
            if (this.currentUser) {
                // Logged in - show user menu
                this.dom.userMenu.classList.toggle('active');
            } else {
                // Not logged in - show login modal
                this.openAuthModal();
            }
        });

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.dom.userProfileBtn.contains(e.target) && !this.dom.userMenu.contains(e.target)) {
                this.dom.userMenu.classList.remove('active');
            }
        });

        // Menu items
        this.dom.menuProfile.addEventListener('click', () => {
            this.dom.userMenu.classList.remove('active');
            this.openProfilePage();
        });

        this.dom.menuLogout.addEventListener('click', () => {
            this.logout();
        });

        // Profile page
        this.dom.backFromProfile.addEventListener('click', () => this.closeProfilePage());

        this.dom.profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        this.dom.passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });
    }

    // Profile Page Methods
    openProfilePage() {
        this.loadProfileData();
        this.dom.profilePage.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeProfilePage() {
        this.dom.profilePage.classList.remove('active');
        document.body.style.overflow = '';
    }

    loadProfileData() {
        if (!this.currentUser) return;

        // Update display
        this.dom.profileName.textContent = this.currentUser.name || 'User';
        this.dom.profileEmail.textContent = this.currentUser.email || '';
        this.dom.userName.textContent = this.currentUser.name || this.currentUser.email;

        // Update form
        this.dom.editName.value = this.currentUser.name || '';
        this.dom.editEmail.value = this.currentUser.email || '';

        // Update account info
        if (this.currentUser.createdAt) {
            const date = new Date(this.currentUser.createdAt);
            this.dom.memberSince.textContent = date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else {
            this.dom.memberSince.textContent = 'Recently';
        }

        this.dom.totalExpensesCount.textContent = this.expenses.length;
    }

    async updateProfile() {
        const newName = this.dom.editName.value.trim();

        if (!newName) {
            this.showToast('Please enter your name', 'error');
            return;
        }

        // Update locally first (instant)
        this.currentUser.name = newName;
        this.saveUser(this.currentUser);
        this.loadProfileData();
        this.showToast('Profile updated successfully!');

        // Sync to database in background
        if (this.currentUser.id) {
            api.updateProfile(this.currentUser.id, newName);
        }
    }

    async updatePassword() {
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmNewPassword').value;

        if (!currentPass || !newPass || !confirmPass) {
            this.showToast('Please fill all password fields', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            this.showToast('New passwords do not match', 'error');
            return;
        }

        if (newPass.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Update via API
        if (this.currentUser.id) {
            const result = await api.updatePassword(this.currentUser.id, currentPass, newPass);
            if (result.success) {
                this.dom.passwordForm.reset();
                this.showToast('Password updated successfully!');
            } else {
                this.showToast(result.error || 'Failed to update password', 'error');
            }
        } else {
            this.showToast('Please login to change password', 'error');
        }
    }

    checkAuthState() {
        if (this.currentUser) {
            this.showLoggedInState();
        } else {
            this.showLoggedOutState();
        }
    }

    showLoggedInState() {
        this.dom.userProfileBtn.style.display = 'flex';
        this.dom.userName.textContent = this.currentUser.name || this.currentUser.email;
        this.closeAuthModal();
    }

    showLoggedOutState() {
        // Show profile button even when logged out
        this.dom.userProfileBtn.style.display = 'flex';
        this.dom.userMenu.classList.remove('active');

        // Show login modal on new visit (user can close it)
        this.openAuthModal();
    }

    openAuthModal() {
        this.dom.authModal.classList.add('active');
    }

    closeAuthModal() {
        this.dom.authModal.classList.remove('active');
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Show loading
        const btn = this.dom.loginForm.querySelector('.auth-submit');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        btn.disabled = true;

        // Try API login first
        const result = await api.login(email, password);

        if (result.success) {
            const user = {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name || email.split('@')[0],
                createdAt: result.user.created_at,
                loggedInAt: new Date().toISOString()
            };

            this.currentUser = user;
            this.saveUser(user);
            this.showLoggedInState();
            this.showToast(`Welcome back, ${user.name}!`);
            this.dom.loginForm.reset();

            // Check if there are local expenses to sync
            const localExpenses = this.expenses.filter(e => e.id);

            if (localExpenses.length > 0) {
                // Show styled sync modal
                this.dom.syncMessage.textContent = `You have ${localExpenses.length} expense(s) saved on this device.`;

                const syncChoice = await this.showSyncModal();

                if (syncChoice) {
                    // Sync local expenses to cloud
                    this.showToast('Syncing expenses...');
                    await api.syncExpenses(user.id, localExpenses);
                    this.showToast('Expenses synced!');
                } else {
                    // Load expenses from database
                    this.showToast('Loading your expenses...');
                    const dbExpenses = await api.getExpenses(user.id);
                    if (dbExpenses.success && dbExpenses.data) {
                        // Convert DB format to local format
                        this.expenses = dbExpenses.data.map(e => ({
                            id: e.local_id || String(e.id),
                            description: e.description,
                            amount: parseFloat(e.amount),
                            category: e.category,
                            date: e.date
                        }));
                        this.saveExpenses();
                        this.render();
                        this.showToast(`Loaded ${this.expenses.length} expenses`);
                    }
                }
            } else {
                // No local expenses, load from database
                const dbExpenses = await api.getExpenses(user.id);
                if (dbExpenses.success && dbExpenses.data && dbExpenses.data.length > 0) {
                    this.expenses = dbExpenses.data.map(e => ({
                        id: e.local_id || String(e.id),
                        description: e.description,
                        amount: parseFloat(e.amount),
                        category: e.category,
                        date: e.date
                    }));
                    this.saveExpenses();
                    this.render();
                    this.showToast(`Loaded ${this.expenses.length} expenses from cloud`);
                }
            }
        } else {
            this.showToast(result.error || 'Login failed', 'error');
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    }

    // Show sync modal and return promise
    showSyncModal() {
        return new Promise((resolve) => {
            this.dom.syncModal.classList.add('active');

            const handleYes = () => {
                this.dom.syncModal.classList.remove('active');
                this.dom.syncYes.removeEventListener('click', handleYes);
                this.dom.syncNo.removeEventListener('click', handleNo);
                resolve(true);
            };

            const handleNo = () => {
                this.dom.syncModal.classList.remove('active');
                this.dom.syncYes.removeEventListener('click', handleYes);
                this.dom.syncNo.removeEventListener('click', handleNo);
                resolve(false);
            };

            this.dom.syncYes.addEventListener('click', handleYes);
            this.dom.syncNo.addEventListener('click', handleNo);
        });
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;

        if (password !== confirm) {
            this.showToast('Passwords do not match!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Show loading
        const btn = this.dom.signupForm.querySelector('.auth-submit');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        btn.disabled = true;

        // Create user via API
        const result = await api.signup(email, password, name);

        if (result.success) {
            const user = {
                id: result.userId,
                email: email,
                name: name,
                createdAt: new Date().toISOString(),
                loggedInAt: new Date().toISOString()
            };

            this.currentUser = user;
            this.saveUser(user);
            this.showLoggedInState();
            this.showToast(`Welcome to N-Money, ${name}!`);
            this.dom.signupForm.reset();

            // Sync local expenses to cloud in background
            setTimeout(() => api.syncExpenses(user.id, this.expenses), 1000);
        } else {
            // Check if email already exists
            if (result.error && result.error.includes('Duplicate')) {
                this.showToast('Email already registered. Please login.', 'error');
            } else {
                this.showToast(result.error || 'Signup failed', 'error');
            }
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('moneyvibe_user');
        this.dom.userMenu.classList.remove('active');
        this.showLoggedOutState();
        this.showToast('Logged out successfully');
    }

    loadUser() {
        try {
            const stored = localStorage.getItem('moneyvibe_user');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    }

    saveUser(user) {
        localStorage.setItem('moneyvibe_user', JSON.stringify(user));
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

        switch (period) {
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

        // Determine how many days to show based on period
        let daysToShow = 7;
        if (this.analyticsState.period === 'month' || this.analyticsState.period === 'custom') daysToShow = 14;
        else if (this.analyticsState.period === 'year') daysToShow = 12; // months
        else if (this.analyticsState.period === 'all') daysToShow = 14;

        const now = new Date();
        const dailyTotals = {};

        // Initialize all days/months in the period with 0
        if (this.analyticsState.period === 'year') {
            // Show months for year view
            for (let i = daysToShow - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                dailyTotals[key] = { date: d, amount: 0, items: [] };
            }
            // Sum expenses into months
            expenses.forEach(e => {
                const d = new Date(e.date);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (dailyTotals[key]) {
                    dailyTotals[key].amount += e.amount;
                    dailyTotals[key].items.push(e.description);
                }
            });
        } else {
            // Show days for other views
            for (let i = daysToShow - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                d.setHours(0, 0, 0, 0);
                const key = d.toDateString();
                dailyTotals[key] = { date: new Date(d), amount: 0, items: [] };
            }
            // Sum expenses into days
            expenses.forEach(e => {
                const d = new Date(e.date);
                const key = d.toDateString();
                if (dailyTotals[key]) {
                    dailyTotals[key].amount += e.amount;
                    dailyTotals[key].items.push(e.description);
                }
            });
        }

        // Sort by date
        const dataPoints = Object.values(dailyTotals).sort((a, b) => a.date - b.date);

        if (dataPoints.length === 0) {
            this.dom.stockChart.innerHTML = '<div class="empty-state"><p>No data for chart</p></div>';
            this.dom.stockCurrent.textContent = '₹0';
            this.dom.stockChange.textContent = '0%';
            return;
        }

        // Calculate stats
        const currentDay = dataPoints[dataPoints.length - 1].amount;
        const prevDay = dataPoints.length > 1 ? dataPoints[dataPoints.length - 2].amount : currentDay;
        const change = prevDay > 0 ? ((currentDay - prevDay) / prevDay) * 100 : 0;

        // Update header
        this.dom.stockCurrent.textContent = this.formatCurrency(currentDay);
        this.dom.stockChange.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs prev`;
        // For expenses: positive change (spending more) is bad (red), negative (spending less) is good (green)
        this.dom.stockChange.classList.toggle('negative', change > 0);

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

        // Generate dot positions - only show every few points to keep it clean
        const showEvery = Math.max(1, Math.floor(dataPoints.length / 6));
        const dotPositions = dataPoints.map((point, i) => {
            const xPercent = (padding + (i / (dataPoints.length - 1 || 1)) * (width - 2 * padding)) / width * 100;
            const yPercent = (height - padding - ((point.amount - minVal) / range) * (height - 2 * padding)) / height * 100;
            const isLast = i === dataPoints.length - 1;
            const shouldShow = isLast || i === 0 || i % showEvery === 0;
            return { x: xPercent, y: yPercent, amount: point.amount, date: point.date, show: shouldShow, isLast };
        });

        const lineColor = '#f87171';
        const gradientId = 'stockGrad' + Date.now();

        // Generate dots HTML - only key points
        const dotsHtml = dotPositions
            .filter(dot => dot.show)
            .map(dot => `
                <div class="stock-dot ${dot.isLast ? 'active' : ''}" 
                     style="left: ${dot.x}%; top: ${dot.y}%;" 
                     data-amount="${dot.amount}" 
                     data-date="${dot.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}">
                </div>
            `).join('');

        // Generate date labels for x-axis
        const labelIndices = [0, Math.floor(dataPoints.length / 2), dataPoints.length - 1];
        const dateLabels = labelIndices.map(i => {
            if (i >= dataPoints.length) return '';
            const point = dataPoints[i];
            const xPercent = (padding + (i / (dataPoints.length - 1 || 1)) * (width - 2 * padding)) / width * 100;
            return `<span class="stock-date-label" style="left: ${xPercent}%;">${point.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>`;
        }).join('');

        this.dom.stockChart.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${lineColor};stop-opacity:0.2" />
                        <stop offset="100%" style="stop-color:${lineColor};stop-opacity:0" />
                    </linearGradient>
                </defs>
                ${gridLines}
                <path class="stock-area" d="${areaD}" fill="url(#${gradientId})" />
                <path class="stock-line" d="${pathD}" stroke="${lineColor}" />
            </svg>
            <div class="stock-dots-container">${dotsHtml}</div>
            <div class="stock-date-labels">${dateLabels}</div>
            <div class="stock-tooltip" id="stockTooltip"></div>
        `;

        // Add tooltip on tap/click (mobile friendly)
        const tooltip = this.dom.stockChart.querySelector('#stockTooltip');
        let activeTooltip = null;

        this.dom.stockChart.querySelectorAll('.stock-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const amount = e.target.dataset.amount;
                const date = e.target.dataset.date;

                // Toggle tooltip
                if (activeTooltip === e.target) {
                    tooltip.classList.remove('visible');
                    activeTooltip = null;
                    return;
                }

                tooltip.innerHTML = `<strong>₹${Number(amount).toLocaleString('en-IN')}</strong><br/>${date}`;
                tooltip.classList.add('visible');
                activeTooltip = e.target;

                const rect = e.target.getBoundingClientRect();
                const chartRect = this.dom.stockChart.getBoundingClientRect();
                tooltip.style.left = (rect.left - chartRect.left + rect.width / 2) + 'px';
                tooltip.style.top = (rect.top - chartRect.top - 45) + 'px';
            });
        });

        // Hide tooltip when tapping elsewhere
        this.dom.stockChart.addEventListener('click', (e) => {
            if (!e.target.classList.contains('stock-dot')) {
                tooltip.classList.remove('visible');
                activeTooltip = null;
            }
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
        switch (this.analyticsState.filterSort) {
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
        // Format date as local MySQL datetime (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const localDate = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        const newExpense = {
            id: String(Date.now()),
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: localDate
        };

        // Add to local storage immediately (instant UI)
        this.expenses.unshift(newExpense);
        this.saveExpenses();
        this.render();

        // Sync to database in background
        if (this.currentUser && this.currentUser.id) {
            api.addExpense(this.currentUser.id, newExpense).catch(e => console.log('Sync failed:', e));
        }
    }

    deleteExpense(id) {
        // Delete from local storage immediately (instant UI)
        this.expenses = this.expenses.filter(e => e.id !== id && String(e.id) !== String(id));
        this.saveExpenses();
        this.render();
        this.showToast('Expense deleted');

        // Sync to database in background
        if (this.currentUser && this.currentUser.id) {
            api.deleteExpense(this.currentUser.id, String(id)).catch(e => console.log('Sync failed:', e));
        }
    }

    clearAllExpenses() {
        if (this.expenses.length === 0) return;

        if (confirm('Are you sure you want to clear all expenses? This cannot be undone.')) {
            // Clear local storage immediately (instant UI)
            this.expenses = [];
            this.saveExpenses();
            this.render();
            this.showToast('All expenses cleared');

            // Clear from database in background
            if (this.currentUser && this.currentUser.id) {
                api.clearExpenses(this.currentUser.id).catch(e => console.log('Sync failed:', e));
            }
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

        // Trend indicator - .down class = red, no .down = green
        // For expenses: up (spending more) = bad (red), down (spending less) = good (green)
        if (yesterdayTotal > 0) {
            const diff = todayTotal - yesterdayTotal;
            const percent = Math.abs((diff / yesterdayTotal) * 100).toFixed(0);

            if (diff > 0) {
                // Spending MORE = bad → add 'down' class for RED
                this.dom.trendIndicator.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${percent}% vs yesterday</span>`;
                this.dom.trendIndicator.classList.add('down');
            } else if (diff < 0) {
                // Spending LESS = good → remove 'down' class for GREEN
                this.dom.trendIndicator.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${percent}% vs yesterday</span>`;
                this.dom.trendIndicator.classList.remove('down');
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
