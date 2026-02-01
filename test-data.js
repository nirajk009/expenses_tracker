// Test Data Script for MoneyVibe
// Paste this entire script into the browser console to populate test data

(function() {
    'use strict';
    
    // Helper to create dates
    const daysAgo = (n) => {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString();
    };
    
    // Test expenses data
    const testExpenses = [
        // Today
        { id: Date.now(), description: 'Uber to office', amount: 100, category: 'transport', date: new Date().toISOString() },
        { id: Date.now() - 1, description: 'Brunch at cafe', amount: 120, category: 'food', date: new Date(Date.now() - 3600000).toISOString() },
        { id: Date.now() - 2, description: 'Evening snacks', amount: 50, category: 'snacks', date: new Date(Date.now() - 7200000).toISOString() },
        { id: Date.now() - 3, description: 'Netflix subscription', amount: 199, category: 'entertainment', date: new Date(Date.now() - 10800000).toISOString() },
        
        // Yesterday
        { id: Date.now() - 1000, description: 'Ola ride', amount: 85, category: 'transport', date: daysAgo(1) },
        { id: Date.now() - 1001, description: 'Lunch', amount: 150, category: 'food', date: daysAgo(1) },
        { id: Date.now() - 1002, description: 'Cold drink', amount: 40, category: 'snacks', date: daysAgo(1) },
        
        // 2 days ago
        { id: Date.now() - 2000, description: 'Auto ride', amount: 60, category: 'transport', date: daysAgo(2) },
        { id: Date.now() - 2001, description: 'Dinner with friends', amount: 350, category: 'food', date: daysAgo(2) },
        { id: Date.now() - 2002, description: 'Movie tickets', amount: 300, category: 'entertainment', date: daysAgo(2) },
        
        // 3 days ago
        { id: Date.now() - 3000, description: 'Uber', amount: 120, category: 'transport', date: daysAgo(3) },
        { id: Date.now() - 3001, description: 'Groceries', amount: 450, category: 'shopping', date: daysAgo(3) },
        { id: Date.now() - 3002, description: 'Tea and biscuits', amount: 30, category: 'snacks', date: daysAgo(3) },
        
        // 4 days ago
        { id: Date.now() - 4000, description: 'Bus pass', amount: 50, category: 'transport', date: daysAgo(4) },
        { id: Date.now() - 4001, description: 'Biryani', amount: 200, category: 'food', date: daysAgo(4) },
        
        // 5 days ago
        { id: Date.now() - 5000, description: 'Petrol', amount: 500, category: 'transport', date: daysAgo(5) },
        { id: Date.now() - 5001, description: 'New t-shirt', amount: 599, category: 'shopping', date: daysAgo(5) },
        
        // 6 days ago
        { id: Date.now() - 6000, description: 'Taxi', amount: 150, category: 'transport', date: daysAgo(6) },
        { id: Date.now() - 6001, description: 'Street food', amount: 80, category: 'food', date: daysAgo(6) },
        
        // Last week
        { id: Date.now() - 7000, description: 'Metro recharge', amount: 200, category: 'transport', date: daysAgo(8) },
        { id: Date.now() - 7001, description: 'Pizza', amount: 400, category: 'food', date: daysAgo(9) },
        { id: Date.now() - 7002, description: 'Gaming credits', amount: 250, category: 'entertainment', date: daysAgo(10) },
        { id: Date.now() - 7003, description: 'Shoes', amount: 1200, category: 'shopping', date: daysAgo(12) },
        { id: Date.now() - 7004, description: 'Random stuff', amount: 150, category: 'other', date: daysAgo(14) },
    ];
    
    // Save to localStorage
    localStorage.setItem('moneyvibe_expenses', JSON.stringify(testExpenses));
    
    console.log('✅ Test data loaded successfully!');
    console.log(`📊 Total expenses: ${testExpenses.length}`);
    console.log(`💰 Total amount: ₹${testExpenses.reduce((sum, e) => sum + e.amount, 0)}`);
    
    // Show breakdown by category
    const byCategory = {};
    testExpenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    
    console.log('\n📈 Breakdown by category:');
    Object.entries(byCategory).forEach(([cat, amount]) => {
        console.log(`   ${cat}: ₹${amount}`);
    });
    
    // Show today's expenses
    const today = new Date().toDateString();
    const todayExpenses = testExpenses.filter(e => new Date(e.date).toDateString() === today);
    console.log(`\n📅 Today's expenses (${todayExpenses.length}):`);
    todayExpenses.forEach(e => {
        console.log(`   - ${e.description}: ₹${e.amount}`);
    });
    
    console.log('\n🔄 Refresh the page to see the data in the app!');
    
    // Return data for inspection
    return testExpenses;
})();
