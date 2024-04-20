export default {
    table: {
        _id: '',
        name: 'План 1',
        plans_id: [],
        _createdAt: '',
    },
    category: {
        _id: '',
        name: 'Расходы 1',
        status: 'expense', // in income, expense
        type: 'default', // in default, savings
        _createdAt: '',
    },
    action: {
        _id: '',
        category_id: '',
        sum: 0,
        date: '',
        comment: '',
        _createdAt: '',
    },
    plan: {
        _id: '',
        category_id: '',
        sum: 0,
        date: '',
        comment: '',
        _createdAt: '',
    },
    config: {
        start_balance: 0,
        start_savings: 0,
        checked_balance: null,
        checked_savings: null,
        checking_date: '',
    },
};
