// tests/setup.js
// Jest глобальна конфігурація для всіх тестів

// Встановлюємо тайм-аут для тестів
jest.setTimeout(10000);

// Глобальні моки для console (щоб не засмічувати вивід тестів)
global.console = {
    ...console,
    // Залишаємо error та warn для важливих повідомлень
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Зберігаємо error та warn
    error: console.error,
    warn: console.warn,
};

// Мокаємо process.env для тестів
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Глобальні помічники для тестів
global.testHelpers = {
    // Помічник для створення mock даних користувача
    createMockUser: (overrides = {}) => ({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        ...overrides
    }),

    // Помічник для створення mock request
    createMockRequest: (overrides = {}) => ({
        params: {},
        body: {},
        query: {},
        user: global.testHelpers.createMockUser(),
        ip: '127.0.0.1',
        ...overrides
    }),

    // Помічник для створення mock reply
    createMockReply: () => {
        const reply = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            code: jest.fn().mockReturnThis(),
        };
        return reply;
    },

    // Помічник для очищення всіх моків
    clearAllMocks: () => {
        jest.clearAllMocks();
    }
};

// Автоматично очищуємо моки після кожного тесту
afterEach(() => {
    global.testHelpers.clearAllMocks();
});