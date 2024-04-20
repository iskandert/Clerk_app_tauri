import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const defaultCategories = {
    income: [
        //
        'Зарплата 1',
        'Зарплата 2',
        'Подарки',
        'Банк начисления',
        'Из накоплений',
    ],
    expense: [
        //
        'Еда',
        'Рестораны',
        'ЖКХ',
        'Связь',
        'Домашние питомцы',
        'Крупные траты',
        'Ремонт',
        'Накопления',
        'Обучение 1',
        'Обучение 2',
        'Спорт 1',
        'Спорт 2',
        'Одежда 1',
        'Одежда 2',
        'Подарки',
        'Путешествия',
        'Развлечения',
        'Транспорт',
        'Такси',
        'Автомобиль',
        'Здоровье',
        'Бытовое',
        'Прочее',
    ],
};

const defaultActions = Array(5)
    .fill()
    .map((_, idx) => ({
        sum: Math.round(Math.random() * 10000) / 10,
        // category_id: `${Math.round(Math.random() * 26)}`,
        category_id: `${(idx % 28) * 2}`,
    }));

const defaultPlans = Array(28)
    .fill()
    .map((_, idx) => ({
        sum: Math.round(Math.random() * 10000),
        category_id: `${idx}`,
    }));

const initEntities = () => {
    return {
        tables: {
            data: [
                {
                    _id: uuidv4(),
                    name: 'План 1',
                    plans_id: [],
                    _createdAt: dayjs().format(),
                },
            ],
        },
        categories: {
            data: [
                ...defaultCategories.income.map((name, idx) => ({
                    // _id: uuidv4(),
                    _id: `${idx}`,
                    name,
                    status: 'income',
                    type: idx === 4 ? 'savings' : 'default',
                    _createdAt: dayjs().format(),
                })),
                ...defaultCategories.expense.map((name, idx) => ({
                    // _id: uuidv4(),
                    _id: `${idx + 5}`,
                    name,
                    status: 'expense',
                    type: [12, 20].includes(idx + 5) ? 'savings' : 'default',
                    _createdAt: dayjs().format(),
                })),
            ],
        },
        // actions: [],
        actions: {
            data: defaultActions.map(act => ({
                ...act,
                _id: uuidv4(),
                comment: 'Комментарий',
                date: dayjs()
                    .subtract(Math.floor(Math.random() * 3), 'day')
                    .format(),
                _createdAt: dayjs().format(),
            })),
        },
        // plans: [],
        plans: {
            data: [...defaultPlans, ...defaultPlans, ...defaultPlans].map((plan, idx) => ({
                ...plan,
                _id: uuidv4(),
                comment: 'Комментарий',
                date: dayjs()
                    .subtract(1, 'month')
                    .add(Math.floor(idx / 28), 'month')
                    .format('YYYY-MM'),
                _createdAt: dayjs().format(),
            })),
        },
        config: {
            data: {
                start_balance: 0,
                start_savings: 0,
                checked_balance: null,
                checked_savings: null,
                checked_balance_date: '',
            },
        },
    };
};

export {
    //
    initEntities,
};
