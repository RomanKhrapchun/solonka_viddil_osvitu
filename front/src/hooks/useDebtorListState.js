import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';

const DEFAULT_SORT_CONFIG = {
    sort_by: 'total_debt',
    sort_direction: 'desc'
};

const INITIAL_STATE = {
    isFilterOpen: false,
    selectData: {},
    confirmLoading: false,
    itemId: null,
    sendData: {
        limit: 16,
        page: 1,
        ...DEFAULT_SORT_CONFIG
    }
};

export function useDebtorListState() {
    const [stateDebtor, setStateDebtor, { clearPersistedState, refreshPersistedState }] = 
        usePersistedState('debtorList', INITIAL_STATE, {
            ttl: 30 * 60 * 1000, // 30 хвилин
            saveOnMount: false, // НЕ зберігаємо при монтуванні
            serializer: (state) => ({
                sendData: state.sendData,
                selectData: state.selectData,
                isFilterOpen: state.isFilterOpen
            }),
            deserializer: (savedState) => ({
                ...INITIAL_STATE,
                ...savedState,
                // Забезпечуємо правильне сортування
                sendData: {
                    ...INITIAL_STATE.sendData,
                    ...savedState.sendData,
                    sort_by: savedState.sendData?.sort_by || DEFAULT_SORT_CONFIG.sort_by,
                    sort_direction: savedState.sendData?.sort_direction || DEFAULT_SORT_CONFIG.sort_direction
                }
            })
        });

    // Функція для навігації до боржника (зберігає стан перед переходом)
    const navigateToDebtor = useCallback((debtorId, navigate) => {
        // Оновлюємо час життя перед переходом
        refreshPersistedState();
        navigate(`/debtor/${debtorId}`);
    }, [refreshPersistedState]);

    // Функція для оновлення фільтрів
    const updateFilters = useCallback((newFilters) => {
        setStateDebtor(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                ...newFilters
            }
        }));
    }, [setStateDebtor]);

    // Функція для оновлення параметрів запиту
    const updateSendData = useCallback((newData) => {
        setStateDebtor(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                ...newData
            }
        }));
    }, [setStateDebtor]);

    // Функція для очищення фільтрів
    const resetFilters = useCallback(() => {
        setStateDebtor(prevState => ({
            ...prevState,
            selectData: {},
            isFilterOpen: false,
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: prevState.sendData.sort_by,
                sort_direction: prevState.sendData.sort_direction,
            }
        }));
    }, [setStateDebtor]);

    return {
        stateDebtor,
        setStateDebtor,
        navigateToDebtor,
        updateFilters,
        updateSendData,
        resetFilters,
        clearPersistedState
    };
}