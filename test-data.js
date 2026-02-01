// Test Data Script for MoneyVibe
// Paste this entire script into the browser console to populate test data

(function () {
    'use strict';

    // Helper to create dates
    const daysAgo = (n) => {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString();
    };

    // Test expenses data - Full month of data
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

        // Week 2 (7-13 days ago)
        { id: Date.now() - 7000, description: 'Metro recharge', amount: 200, category: 'transport', date: daysAgo(7) },
        { id: Date.now() - 7001, description: 'Dominos pizza', amount: 450, category: 'food', date: daysAgo(7) },
        { id: Date.now() - 8000, description: 'Swiggy order', amount: 280, category: 'food', date: daysAgo(8) },
        { id: Date.now() - 8001, description: 'Chai and samosa', amount: 35, category: 'snacks', date: daysAgo(8) },
        { id: Date.now() - 9000, description: 'Ola Share', amount: 65, category: 'transport', date: daysAgo(9) },
        { id: Date.now() - 9001, description: 'Spotify premium', amount: 119, category: 'entertainment', date: daysAgo(9) },
        { id: Date.now() - 10000, description: 'Lunch at work', amount: 100, category: 'food', date: daysAgo(10) },
        { id: Date.now() - 10001, description: 'Ice cream', amount: 60, category: 'snacks', date: daysAgo(10) },
        { id: Date.now() - 11000, description: 'Uber pool', amount: 75, category: 'transport', date: daysAgo(11) },
        { id: Date.now() - 11001, description: 'Headphones', amount: 1299, category: 'shopping', date: daysAgo(11) },
        { id: Date.now() - 12000, description: 'KFC bucket', amount: 550, category: 'food', date: daysAgo(12) },
        { id: Date.now() - 12001, description: 'Gaming credits', amount: 250, category: 'entertainment', date: daysAgo(12) },
        { id: Date.now() - 13000, description: 'Auto to mall', amount: 80, category: 'transport', date: daysAgo(13) },
        { id: Date.now() - 13001, description: 'Popcorn at mall', amount: 180, category: 'snacks', date: daysAgo(13) },

        // Week 3 (14-20 days ago)
        { id: Date.now() - 14000, description: 'Petrol refill', amount: 600, category: 'transport', date: daysAgo(14) },
        { id: Date.now() - 14001, description: 'Monthly groceries', amount: 2500, category: 'shopping', date: daysAgo(14) },
        { id: Date.now() - 15000, description: 'Brunch date', amount: 800, category: 'food', date: daysAgo(15) },
        { id: Date.now() - 15001, description: 'Coffee at Starbucks', amount: 350, category: 'snacks', date: daysAgo(15) },
        { id: Date.now() - 16000, description: 'Rapido bike', amount: 45, category: 'transport', date: daysAgo(16) },
        { id: Date.now() - 16001, description: 'Thali lunch', amount: 120, category: 'food', date: daysAgo(16) },
        { id: Date.now() - 17000, description: 'Uber to airport', amount: 450, category: 'transport', date: daysAgo(17) },
        { id: Date.now() - 17001, description: 'Airport food', amount: 380, category: 'food', date: daysAgo(17) },
        { id: Date.now() - 18000, description: 'Return taxi', amount: 500, category: 'transport', date: daysAgo(18) },
        { id: Date.now() - 18001, description: 'New shoes', amount: 2499, category: 'shopping', date: daysAgo(18) },
        { id: Date.now() - 19000, description: 'Dinner at restaurant', amount: 650, category: 'food', date: daysAgo(19) },
        { id: Date.now() - 19001, description: 'Movie night', amount: 400, category: 'entertainment', date: daysAgo(19) },
        { id: Date.now() - 20000, description: 'Local auto', amount: 30, category: 'transport', date: daysAgo(20) },
        { id: Date.now() - 20001, description: 'Juice and snacks', amount: 90, category: 'snacks', date: daysAgo(20) },

        // Week 4 (21-27 days ago)
        { id: Date.now() - 21000, description: 'Uber XL', amount: 220, category: 'transport', date: daysAgo(21) },
        { id: Date.now() - 21001, description: 'Family dinner', amount: 1200, category: 'food', date: daysAgo(21) },
        { id: Date.now() - 22000, description: 'Auto to station', amount: 55, category: 'transport', date: daysAgo(22) },
        { id: Date.now() - 22001, description: 'Train snacks', amount: 70, category: 'snacks', date: daysAgo(22) },
        { id: Date.now() - 23000, description: 'Ola outstation', amount: 800, category: 'transport', date: daysAgo(23) },
        { id: Date.now() - 23001, description: 'Birthday gift', amount: 1500, category: 'shopping', date: daysAgo(23) },
        { id: Date.now() - 24000, description: 'Party food', amount: 900, category: 'food', date: daysAgo(24) },
        { id: Date.now() - 24001, description: 'Drinks', amount: 600, category: 'entertainment', date: daysAgo(24) },
        { id: Date.now() - 25000, description: 'Return Uber', amount: 750, category: 'transport', date: daysAgo(25) },
        { id: Date.now() - 25001, description: 'Breakfast on road', amount: 150, category: 'food', date: daysAgo(25) },
        { id: Date.now() - 26000, description: 'Local transport', amount: 40, category: 'transport', date: daysAgo(26) },
        { id: Date.now() - 26001, description: 'Chai break', amount: 25, category: 'snacks', date: daysAgo(26) },
        { id: Date.now() - 27000, description: 'Metro ride', amount: 35, category: 'transport', date: daysAgo(27) },
        { id: Date.now() - 27001, description: 'Lunch combo', amount: 180, category: 'food', date: daysAgo(27) },

        // Week 5 (28-30 days ago)
        { id: Date.now() - 28000, description: 'Petrol', amount: 550, category: 'transport', date: daysAgo(28) },
        { id: Date.now() - 28001, description: 'Zomato order', amount: 320, category: 'food', date: daysAgo(28) },
        { id: Date.now() - 29000, description: 'Bus ticket', amount: 60, category: 'transport', date: daysAgo(29) },
        { id: Date.now() - 29001, description: 'Evening snacks', amount: 85, category: 'snacks', date: daysAgo(29) },
        { id: Date.now() - 30000, description: 'Uber to mall', amount: 130, category: 'transport', date: daysAgo(30) },
        { id: Date.now() - 30001, description: 'Mall food court', amount: 420, category: 'food', date: daysAgo(30) },
        { id: Date.now() - 30002, description: 'Random purchase', amount: 299, category: 'other', date: daysAgo(30) },
    ];

    // Save to localStorage
    localStorage.setItem('moneyvibe_expenses', JSON.stringify(testExpenses));

    console.log('✅ Test data loaded successfully!');
    console.log(`📊 Total expenses: ${testExpenses.length}`);
    console.log(`💰 Total amount: ₹${testExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}`);

    // Show breakdown by category
    const byCategory = {};
    testExpenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    console.log('\n📈 Breakdown by category:');
    Object.entries(byCategory).forEach(([cat, amount]) => {
        console.log(`   ${cat}: ₹${amount.toLocaleString('en-IN')}`);
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
