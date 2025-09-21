
import { useState, useEffect, useRef } from 'react';
import { stateManager } from '../utils/sessionStateManager';

/**
 * Хук для збереження стану в session storage
 * @param {string} key - ключ для збереження
 * @param {*} initialState - початковий стан
 * @param {Object} options - опції
 * @param {number} options.ttl - час життя в мілісекундах
 * @param {boolean} options.saveOnMount - чи зберігати при монтуванні
 * @param {Function} options.serializer - функція серіалізації
 * @param {Function} options.deserializer - функція десеріалізації
 */
export function usePersistedState(key, initialState, options = {}) {
    const {
        ttl = 30 * 60 * 1000, // 30 хвилин
        saveOnMount = false,
        serializer = (value) => value,
        deserializer = (value) => value
    } = options;

    const isInitialMount = useRef(true);
    const hasLoadedFromStorage = useRef(false);

    // Ініціалізуємо стан
    const [state, setState] = useState(() => {
        // Спробуємо завантажити збережений стан
        const savedState = stateManager.loadState(key);
        
        if (savedState) {
            hasLoadedFromStorage.current = true;
            try {
                return deserializer(savedState);
            } catch (error) {
                console.warn(`Failed to deserialize state for key ${key}:`, error);
            }
        }
        
        return typeof initialState === 'function' ? initialState() : initialState;
    });

    // Зберігаємо стан при змінах (але не при першому рендері)
    useEffect(() => {
        // Пропускаємо перший рендер, якщо не потрібно зберігати при монтуванні
        if (isInitialMount.current) {
            isInitialMount.current = false;
            
            // Якщо стан не був завантажений зі storage і потрібно зберегти при монтуванні
            if (!hasLoadedFromStorage.current && saveOnMount) {
                try {
                    const serializedState = serializer(state);
                    stateManager.saveState(key, serializedState, ttl);
                } catch (error) {
                    console.warn(`Failed to serialize and save state for key ${key}:`, error);
                }
            }
            return;
        }

        // Зберігаємо стан при подальших змінах
        try {
            const serializedState = serializer(state);
            stateManager.saveState(key, serializedState, ttl);
        } catch (error) {
            console.warn(`Failed to serialize and save state for key ${key}:`, error);
        }
    }, [state, key, ttl, saveOnMount, serializer]);

    // Функція для очищення збереженого стану
    const clearPersistedState = () => {
        stateManager.clearState(key);
    };

    // Функція для оновлення часу життя
    const refreshPersistedState = () => {
        stateManager.refreshState(key, ttl);
    };

    return [
        state, 
        setState, 
        {
            clearPersistedState,
            refreshPersistedState,
            hasLoadedFromStorage: hasLoadedFromStorage.current
        }
    ];
}