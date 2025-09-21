
const DEFAULT_TTL = 30 * 60 * 1000; // 30 хвилин за замовчуванням

class SessionStateManager {
    constructor(keyPrefix = 'app_state') {
        this.keyPrefix = keyPrefix;
    }

    /**
     * Збереження стану в session storage
     * @param {string} key - ключ для збереження
     * @param {Object} state - стан для збереження
     * @param {number} ttl - час життя в мілісекундах
     */
    saveState(key, state, ttl = DEFAULT_TTL) {
        try {
            const stateWithMeta = {
                data: state,
                timestamp: Date.now(),
                ttl: ttl
            };
            
            const fullKey = `${this.keyPrefix}_${key}`;
            sessionStorage.setItem(fullKey, JSON.stringify(stateWithMeta));
            
            console.debug(`State saved for key: ${fullKey}`);
        } catch (error) {
            console.warn(`Failed to save state for key ${key}:`, error);
        }
    }

    /**
     * Завантаження стану з session storage
     * @param {string} key - ключ для завантаження
     * @returns {Object|null} збережений стан або null
     */
    loadState(key) {
        try {
            const fullKey = `${this.keyPrefix}_${key}`;
            const saved = sessionStorage.getItem(fullKey);
            
            if (!saved) {
                console.debug(`No saved state found for key: ${fullKey}`);
                return null;
            }

            const parsed = JSON.parse(saved);
            const { data, timestamp, ttl } = parsed;

            // Перевіряємо чи не застарів стан
            if (Date.now() - timestamp > ttl) {
                console.debug(`State expired for key: ${fullKey}`);
                this.clearState(key);
                return null;
            }

            console.debug(`State loaded for key: ${fullKey}`);
            return data;
        } catch (error) {
            console.warn(`Failed to load state for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Очищення стану
     * @param {string} key - ключ для очищення
     */
    clearState(key) {
        try {
            const fullKey = `${this.keyPrefix}_${key}`;
            sessionStorage.removeItem(fullKey);
            console.debug(`State cleared for key: ${fullKey}`);
        } catch (error) {
            console.warn(`Failed to clear state for key ${key}:`, error);
        }
    }

    /**
     * Перевірка чи існує збережений стан
     * @param {string} key - ключ для перевірки
     * @returns {boolean}
     */
    hasState(key) {
        try {
            const fullKey = `${this.keyPrefix}_${key}`;
            return sessionStorage.getItem(fullKey) !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Оновлення часу життя існуючого стану
     * @param {string} key - ключ стану
     * @param {number} ttl - новий час життя
     */
    refreshState(key, ttl = DEFAULT_TTL) {
        const currentState = this.loadState(key);
        if (currentState) {
            this.saveState(key, currentState, ttl);
        }
    }

    /**
     * Очищення всіх станів з цим префіксом
     */
    clearAllStates() {
        try {
            const keys = Object.keys(sessionStorage);
            const keysToRemove = keys.filter(key => key.startsWith(`${this.keyPrefix}_`));
            
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
            console.debug(`Cleared ${keysToRemove.length} states with prefix: ${this.keyPrefix}`);
        } catch (error) {
            console.warn('Failed to clear all states:', error);
        }
    }
}

// Створюємо інстанс для боржників
export const debtorStateManager = new SessionStateManager('debtor');

// Створюємо універсальний інстанс
export const stateManager = new SessionStateManager('universal');

export default SessionStateManager;