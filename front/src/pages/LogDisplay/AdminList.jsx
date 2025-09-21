import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import Modal from "../../components/common/Modal/Modal";
import "../../components/common/Dropdown/FilterDropdown.css";
import {Transition} from "react-transition-group";

const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const refreshIcon = generateIcon(iconMap.refresh, null, 'currentColor', 20, 20)
const exportIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const viewIcon = generateIcon(iconMap.view, null, 'currentColor', 16, 16)
const forceIcon = generateIcon(iconMap.lightning, null, 'currentColor', 16, 16)
const diagnosticIcon = generateIcon(iconMap.bug, null, 'currentColor', 16, 16)
const statsIcon = generateIcon(iconMap.chart, null, 'currentColor', 20, 20)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

const AdminLog = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const [stateLog, setStateLog] = useState({
        isFilterOpen: false,
        selectData: {},
        updateAllLoading: false,
        statsModalOpen: false,
        diagnosticModalOpen: false,
        diagnosticData: null,
        diagnosticLoading: false,
        statsData: null,
        sendData: {
            limit: 16,
            page: 1,
        }
    })

    const statsNodeRef = useRef(null)
    const diagnosticNodeRef = useRef(null)

    const isFirstRun = useRef(true)
    
    // Основний запит даних
    const {error, status, data, retryFetch} = useFetch('api/log/admin-search', {
        method: 'post',
        data: stateLog.sendData
    })

    // Запит статистики готовності
    const {data: statsData, retryFetch: retryStatsFetch} = useFetch('api/log/admin-search/check-readiness-stats', {
        method: 'get'
    })

    const startRecord = ((stateLog.sendData.page || 1) - 1) * stateLog.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateLog.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        retryFetch('api/log/admin-search', {
            method: 'post',
            data: stateLog.sendData,
        })
    }, [stateLog.sendData, retryFetch])

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateLog.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateLog.selectData])

    const columnTable = useMemo(() => {
        return [
            {
                title: 'П.І.Б адміністратора', 
                dataIndex: 'admin_full_name',
                width: '140px'
            },
            {
                title: 'Username', 
                dataIndex: 'username',
                width: '100px'
            },
            {
                title: 'Кого шукав', 
                dataIndex: 'searched_person_name',
                width: '150px'
            },
            {
                title: 'Результат пошуку', 
                dataIndex: 'search_result',
                width: '120px',
                render: (text, record) => getSearchResultBadge(text, record.found_count)
            },
            {
                title: 'Статус оплати', 
                dataIndex: 'payment_status',
                width: '160px',
                render: (status, record) => getPaymentStatusBadge(status, record)
            },
            {
                title: 'Готовність', 
                dataIndex: 'check_readiness',
                width: '120px',
                render: (readiness) => getReadinessBadge(readiness)
            },
            {
                title: 'Ефективність', 
                dataIndex: 'admin_was_effective',
                width: '100px',
                render: (value, record) => getEffectivenessBadge(value, record.search_result, record.payment_status)
            },
            {
                title: 'Сума оплати', 
                dataIndex: 'payment_amount',
                width: '110px',
                render: (value, record) => getPaymentAmountDisplay(value, record.payment_status)
            },
            {
                title: 'Зміна боргу', 
                dataIndex: 'debt_change',
                width: '110px',
                render: (value, record) => getDebtChangeDisplay(value, record.old_total_debt, record.new_total_debt)
            },
            {
                title: 'Дата пошуку', 
                dataIndex: 'formatted_search_date',
                width: '130px'
            },
            {
                title: 'Дії',
                dataIndex: 'action',
                width: '120px',
                render: (_, record) => (
                    <div className="btn-sticky" style={{
                        justifyContent: 'center', 
                        gap: '2px', 
                        flexWrap: 'wrap'
                    }}>
                        {/* Кнопка звичайної перевірки */}
                        {record.can_check_now && (
                            <Button
                                title="Перевірити оплату"
                                icon={refreshIcon}
                                size="small"
                                onClick={() => handleUpdatePaymentStatus(record.search_id)}
                            />
                        )}
                        
                        {/* Кнопка примусової перевірки */}
                        {!record.can_check_now && (
                            <Button
                                title="Примусово перевірити"
                                icon={forceIcon}
                                size="small"
                                type="warning"
                                onClick={() => handleForceUpdatePaymentStatus(record.search_id)}
                            />
                        )}
                        
                        {/* Діагностика */}
                        <Button
                            title="Діагностика"
                            icon={diagnosticIcon}
                            size="small"
                            type="secondary"
                            onClick={() => handleDiagnostic(record.search_id)}
                        />
                        
                        {/* Деталі */}
                        <Button
                            title="Деталі"
                            icon={viewIcon}
                            size="small"
                            onClick={() => navigate(`/admin-search/${record.search_id}`)}
                        />
                    </div>
                ),
            }
        ]
    }, [navigate])

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data?.items?.map((el, index) => ({
                key: index,
                search_id: el.search_id,
                admin_full_name: el.admin_full_name || 'Невідомо',
                username: el.username || 'Невідомо',
                access_group_name: el.access_group_name || 'Невідомо',
                searched_person_name: el.searched_person_name || 'Невідомо',
                search_result: el.search_result || 'Невідомо',
                formatted_search_date: el.formatted_search_date || 'Невідомо',
                client_addr: el.client_addr || 'Невідомо',
                is_successful: el.is_successful,
                found_count: el.found_count,
                search_month_name: el.search_month_name,
                email: el.email,
                phone: el.phone,
                // Нові поля з системи оплат
                payment_status: el.payment_status,
                result_display: el.result_display,
                payment_amount: el.payment_amount,
                admin_was_effective: el.admin_was_effective,
                debt_change: el.debt_change,
                old_total_debt: el.old_total_debt,
                new_total_debt: el.new_total_debt,
                payment_percentage: el.payment_percentage,
                payment_check_date: el.payment_check_date,
                // Готовність до перевірки
                check_readiness: el.check_readiness,
                days_since_check: el.days_since_check,
                priority: el.priority,
                can_check_now: el.can_check_now,
            }))
        }
        return []
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateLog.sendData.limit !== 16) {
                    setStateLog(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 16,
                            page: 1,
                        }
                    }))
                }
            },
        },
        {
            label: '32',
            key: '32',
            onClick: () => {
                if (stateLog.sendData.limit !== 32) {
                    setStateLog(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 32,
                            page: 1,
                        }
                    }))
                }
            },
        },
        {
            label: '48',
            key: '48',
            onClick: () => {
                if (stateLog.sendData.limit !== 48) {
                    setStateLog(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 48,
                            page: 1,
                        }
                    }))
                }
            },
        },
        {
            label: '64',
            key: '64',
            onClick: () => {
                if (stateLog.sendData.limit !== 64) {
                    setStateLog(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 64,
                            page: 1,
                        }
                    }))
                }
            },
        },
    ]
// Покращені функції рендерингу для AdminLog компонента

// Функція для результату пошуку з іконками та деталізацією
const getSearchResultBadge = (result, foundCount) => {
    if (result === 'not_found') {
        return (
            <span className="badge badge--danger" title="Особу не знайдено в реєстрі">
                🚫 Не знайдено
            </span>
        )
    }
    
    if (result === 'found' || result?.startsWith('found_')) {
        // Різні відтінки для різної кількості знайдених записів
        let badgeClass = 'badge--success'
        let icon = '✅'
        let title = 'Особу знайдено'
        
        if (foundCount > 1) {
            badgeClass = 'badge--success-bright'
            icon = '🎯'
            title = `Знайдено ${foundCount} записів`
        }
        
        return (
            <span className={`badge ${badgeClass}`} title={title}>
                {icon} Знайдено {foundCount > 1 ? `(${foundCount})` : ''}
            </span>
        )
    }
    
    return (
        <span className="badge badge--secondary" title="Невідомий результат">
            ❓ {result}
        </span>
    )
}

// Покращена функція для статусу оплати
const getPaymentStatusBadge = (paymentStatus, record) => {
    if (!paymentStatus) {
        return (
            <span className="badge badge--neutral" title="Статус оплати ще не перевірено">
                ⏸️ Не перевірено
            </span>
        )
    }
    
    const statusConfig = {
        'paid_system': {
            class: 'badge--success-bright',
            icon: '💳',
            text: 'Оплачено (система)',
            title: 'Оплачено через платіжну систему'
        },
        'paid_full_external': {
            class: 'badge--success',
            icon: '💰',
            text: 'Оплачено (зовні)',
            title: 'Повністю оплачено поза системою'
        },
        'paid_partial_external': {
            class: 'badge--warning',
            icon: '💸',
            text: 'Частково оплачено',
            title: 'Частково оплачено поза системою'
        },
        'not_paid': {
            class: 'badge--danger',
            icon: '❌',
            text: 'Не оплачено',
            title: 'Оплату не виявлено'
        },
        'debt_increased': {
            class: 'badge--danger-dark',
            icon: '📈',
            text: 'Борг збільшився',
            title: 'Борг зріс у наступному періоді'
        },
        'fake_search': {
            class: 'badge--warning-dark',
            icon: '🎭',
            text: 'Фіктивний пошук',
            title: 'Особи не було в реєстрі боржників'
        },
        'no_debt_initially': {
            class: 'badge--info',
            icon: '🤷',
            text: 'Не було боргу',
            title: 'Особа не мала боргу на момент пошуку'
        },
        'registry_missing': {
            class: 'badge--warning',
            icon: '📋',
            text: 'Немає реєстру',
            title: 'Реєстр за цей період відсутній'
        },
        'no_registry': {
            class: 'badge--warning',
            icon: '📋',
            text: 'Немає реєстру',
            title: 'Реєстр за цей період відсутній'
        },
        'pending_check': {
            class: 'badge--info',
            icon: '⏳',
            text: 'Очікування',
            title: 'Очікування наступного реєстру для перевірки'
        }
    }
    
    const config = statusConfig[paymentStatus] || {
        class: 'badge--secondary',
        icon: '❓',
        text: record?.result_display || paymentStatus,
        title: 'Невідомий статус'
    }
    
    return (
        <span className={`badge ${config.class}`} title={config.title}>
            {config.icon} {config.text}
        </span>
    )
}

// Покращена функція для готовності
const getReadinessBadge = (readiness) => {
    if (!readiness) return '-'
    
    if (readiness.includes('✅')) {
        return (
            <span className="badge badge--success" title={readiness}>
                🟢 Готово
            </span>
        )
    } else if (readiness.includes('⏳')) {
        return (
            <span className="badge badge--warning" title={readiness}>
                🟡 Очікування
            </span>
        )
    } else if (readiness.includes('❌')) {
        return (
            <span className="badge badge--danger" title={readiness}>
                🔴 Помилка
            </span>
        )
    }
    
    return (
        <span className="badge badge--secondary" title={readiness}>
            ⚪ {readiness}
        </span>
    )
}

// Покращена функція для ефективності
const getEffectivenessBadge = (value, searchResult, paymentStatus) => {
    if (value === null || value === undefined) return '-'
    
    if (value) {
        return (
            <span className="badge badge--success" title="Пошук був ефективним - призвів до оплати">
                🎯 Так
            </span>
        )
    } else {
        // Різні причини неефективності
        let icon = '❌'
        let title = 'Пошук не призвів до оплати'
        let className = 'badge--danger'
        
        if (searchResult === 'not_found') {
            icon = '🚫'
            title = 'Особу не знайдено'
            className = 'badge--secondary'
        } else if (paymentStatus === 'fake_search') {
            icon = '🎭'
            title = 'Фіктивний пошук'
            className = 'badge--warning'
        }
        
        return (
            <span className={`badge ${className}`} title={title}>
                {icon} Ні
            </span>
        )
    }
}

// Покращена функція для суми оплати
const getPaymentAmountDisplay = (value, paymentStatus) => {
    if (!value || value === 0) return '-'
    
    const amount = Number(value) / 100 // З копійок в гривні
    let color = '#27ae60' // зелений за замовчуванням
    let icon = '💰'
    
    // Різні кольори для різних типів оплат
    if (paymentStatus === 'paid_system') {
        color = '#2ecc71' // яскравіший зелений
        icon = '💳'
    } else if (paymentStatus === 'paid_partial_external') {
        color = '#f39c12' // помаранчевий
        icon = '💸'
    }
    
    return (
        <span style={{
            color: color,
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        }}>
            <span>{icon}</span>
            {amount.toFixed(2)} ₴
        </span>
    )
}

// Покращена функція для зміни боргу
const getDebtChangeDisplay = (value, oldDebt, newDebt) => {
    if (!value || value === 0) return '-'
    
    const change = Number(value)
    const isDecrease = change < 0
    const isSignificant = Math.abs(change) > 1000 // Більше 10 грн
    
    let icon = isDecrease ? '📉' : '📈'
    let color = isDecrease ? '#27ae60' : '#e74c3c'
    let title = `Зміна: ${change.toFixed(2)} коп. (${oldDebt} → ${newDebt})`
    
    if (isSignificant) {
        color = isDecrease ? '#2ecc71' : '#c0392b' // Яскравіші кольори для значних змін
    }
    
    return (
        <span 
            style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: color,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
            }}
            title={title}
        >
            <span>{icon}</span>
            {isDecrease ? '' : '+'}{change.toFixed(2)} ₴
        </span>
    )
}


    const filterHandleClick = () => {
        setStateLog(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateLog(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    const onHandleChange = (name, value) => {
        if((name === "year") && (!/^\d*$/.test(value))) {
            return;
        }
        
        // Виправлення для статусу оплати
        if (name === 'payment_status' && value === '') {
            value = 'not_checked'; // Замість пустого рядка
        }
        
        setStateLog(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateLog.selectData).some(value => value)) {
            setStateLog(prevState => ({
                ...prevState,
                selectData: {},
            }));
        }
        const dataReadyForSending = hasOnlyAllowedParams(stateLog.sendData, ['limit', 'page'])
        if (!dataReadyForSending) {
            setStateLog(prevState => ({
                ...prevState,
                sendData: {
                    limit: prevState.sendData.limit,
                    page: 1,
                }
            }))
        }
    }

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateLog.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        })
        if (isAnyInputFilled) {
            const dataValidation = validateFilters(stateLog.selectData)
            if (!dataValidation.error) {
                setStateLog(prevState => ({
                    ...prevState,
                    sendData: {
                        ...dataValidation,
                        limit: prevState.sendData.limit,
                        page: 1,
                    }
                }))
            } else {
                notification({
                    type: 'warning',
                    placement: 'top',
                    title: 'Помилка',
                    message: dataValidation.message ?? 'Щось пішло не так.',
                })
            }
        }
    }

    const onPageChange = useCallback((page) => {
        if (stateLog.sendData.page !== page) {
            setStateLog(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateLog.sendData.page])

    // Функція звичайного оновлення статусу оплати
    const handleUpdatePaymentStatus = async (searchId) => {
        try {
            const result = await fetchFunction(`api/log/admin-search/${searchId}/update-payment`, {
                method: 'post'
            })
            
            notification({
                placement: "top",
                duration: 3,
                title: 'Успіх',
                message: result.data.message || "Статус оплати оновлено.",
                type: 'success'
            })
            
            // Оновлюємо дані в таблиці і статистику
            retryFetch('api/log/admin-search', {
                method: 'post',
                data: stateLog.sendData,
            })
            retryStatsFetch()
            
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                })
                store.logOff()
                return navigate('/')
            }
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error.message,
                placement: 'top',
            })
        }
    }

    // Функція примусового оновлення статусу оплати
    const handleForceUpdatePaymentStatus = async (searchId) => {
        try {
            const result = await fetchFunction(`api/log/admin-search/${searchId}/force-update-payment`, {
                method: 'post'
            })
            
            notification({
                placement: "top",
                duration: 3,
                title: 'Успіх',
                message: result.data.message || "Статус примусово оновлено.",
                type: 'success'
            })
            
            // Оновлюємо дані
            retryFetch('api/log/admin-search', {
                method: 'post',
                data: stateLog.sendData,
            })
            retryStatsFetch()
            
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка примусової перевірки",
                message: error?.response?.data?.message || error.message,
                placement: 'top',
            })
        }
    }

    // Функція діагностики
    const handleDiagnostic = async (searchId) => {
        try {
            //.log('Starting diagnostic for ID:', searchId); // DEBUG
            
            setStateLog(prevState => ({
                ...prevState,
                diagnosticLoading: true,
                diagnosticModalOpen: true,
                diagnosticData: null
            }))
    
            const result = await fetchFunction(`api/log/admin-search/${searchId}/diagnose`, {
                method: 'post'
            })
            
            //////console.log('Diagnostic result:', result.data); // DEBUG
            
            setStateLog(prevState => ({
                ...prevState,
                diagnosticData: result.data,
                diagnosticLoading: false
            }))
            
        } catch (error) {
            //console.error('Diagnostic error:', error); // DEBUG
            notification({
                type: 'warning',
                title: "Помилка діагностики",
                message: error?.response?.data?.message || error.message,
                placement: 'top',
            })
            setStateLog(prevState => ({
                ...prevState,
                diagnosticModalOpen: false,
                diagnosticLoading: false
            }))
        }
    }

    // Функція масового оновлення статусів оплат
    const handleUpdateAllPaymentStatuses = async () => {
        try {
            setStateLog(prevState => ({
                ...prevState,
                updateAllLoading: true,
            }))
            
            const result = await fetchFunction('api/log/admin-search/update-all-payments', {
                method: 'post',
                data: {
                    limit: 200,
                    force: false
                }
            })
            
            notification({
                placement: "top",
                duration: 4,
                title: 'Успіх',
                message: result.data.message || "Масове оновлення завершено.",
                type: 'success'
            })
            
            // Оновлюємо дані в таблиці і статистику
            retryFetch('api/log/admin-search', {
                method: 'post',
                data: stateLog.sendData,
            })
            retryStatsFetch()
            
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error.message,
                placement: 'top',
            })
        } finally {
            setStateLog(prevState => ({
                ...prevState,
                updateAllLoading: false,
            }))
        }
    }

    // Функція експорту звіту
    const handleExportReport = async () => {
        try {
            const fetchData = await fetchFunction('api/log/admin-search/export', {
                method: 'post',
                data: stateLog.sendData,
                responseType: 'blob'
            })
            
            notification({
                placement: "top",
                duration: 2,
                title: 'Успіх',
                message: "Звіт успішно експортовано.",
                type: 'success'
            })
            
            const blob = fetchData.data
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-effectiveness-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error.message,
                placement: 'top',
            })
        }
    }

    // Показати статистику
   // Додати консоль логи в handleShowStats:
const handleShowStats = async () => {
    try {
        ////console.log('Opening stats modal...'); // DEBUG
        
        setStateLog(prevState => ({
            ...prevState,
            statsModalOpen: true
        }))
        
        ////console.log('Making API request...'); // DEBUG
        
        // Робимо реальний API запит
        const result = await fetchFunction('api/log/admin-search/check-readiness-stats', {
            method: 'get'
        })
        
        ////console.log('API response:', result.data); // DEBUG
        
        // Зберігаємо результат в стейті
        setStateLog(prevState => ({
            ...prevState,
            statsData: result.data
        }))
        
    } catch (error) {
        //console.error('Stats error:', error); // DEBUG
        
        // ДОДАТИ ЗАКРИТТЯ МОДАЛА ПРИ ПОМИЛЦІ
        setStateLog(prevState => ({
            ...prevState,
            statsModalOpen: false
        }))
        
        notification({
            type: 'warning',
            title: "Помилка",
            message: error?.response?.data?.message || error.message,
            placement: 'top',
        })
    }
}

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status}/>
    }

    return (
        <React.Fragment>
            {status === STATUS.PENDING ? <SkeletonPage/> : null}
            {status === STATUS.SUCCESS ?
                <React.Fragment>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="title title--sm">
                                {data?.items && Array.isArray(data?.items) && data?.items.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1} записів пошуку
                                    </React.Fragment> : <React.Fragment>Записів пошуку не знайдено</React.Fragment>
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Button
                                    onClick={handleShowStats}
                                    icon={statsIcon}>
                                    Статистика
                                </Button>
                                <Button
                                    onClick={handleUpdateAllPaymentStatuses}
                                    loading={stateLog.updateAllLoading}
                                    icon={refreshIcon}>
                                    Оновити статуси оплат
                                </Button>
                                <Button
                                    onClick={handleExportReport}
                                    icon={exportIcon}>
                                    Експорт звіту
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateLog.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateLog.selectData).filter(key => stateLog.selectData[key]).length})`}
                                </Button>
                                
                                <FilterDropdown
                                    isOpen={stateLog.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateLog.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    title="Фільтри пошуку адміністраторів"
                                >
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Username адміністратора</label>
                                        <input
                                            type="text"
                                            className="filter-dropdown__input"
                                            placeholder="Введіть username"
                                            value={stateLog.selectData?.username || ''}
                                            onChange={(e) => onHandleChange('username', e.target.value)}
                                        />
                                    </div>
    
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Кого шукав (ім'я особи)</label>
                                        <input
                                            type="text"
                                            className="filter-dropdown__input"
                                            placeholder="Введіть ім'я особи"
                                            value={stateLog.selectData?.searched_person_name || ''}
                                            onChange={(e) => onHandleChange('searched_person_name', e.target.value)}
                                        />
                                    </div>
    
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Результат пошуку</label>
                                        <select
                                            className="filter-dropdown__select"
                                            value={stateLog.selectData?.search_result || ''}
                                            onChange={(e) => onHandleChange('search_result', e.target.value)}
                                        >
                                            <option value="">Всі результати</option>
                                            <option value="found">Знайдено</option>
                                            <option value="not_found">Не знайдено</option>
                                        </select>
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Статус оплати</label>
                                        <select
                                            className="filter-dropdown__select"
                                            value={stateLog.selectData?.payment_status || ''}
                                            onChange={(e) => onHandleChange('payment_status', e.target.value)}
                                        >
                                            <option value="">Всі статуси</option>
                                            <option value="paid_system">Оплачено через систему</option>
                                            <option value="paid_full_external">Повністю оплачено зовні</option>
                                            <option value="paid_partial_external">Частково оплачено зовні</option>
                                            <option value="not_paid">Не оплачено</option>
                                            <option value="debt_increased">Борг збільшився</option>
                                            <option value="no_debt_initially">Не було боргу</option>
                                            <option value="registry_missing">Немає реєстру</option>
                                            <option value="not_checked">Не перевірено</option>
                                            <option value="fake_search">Фіктивний пошук</option>
                                        </select>
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">
                                            <input
                                                type="checkbox"
                                                checked={stateLog.selectData?.effective_only || false}
                                                onChange={(e) => onHandleChange('effective_only', e.target.checked)}
                                                style={{marginRight: '8px'}}
                                            />
                                            Тільки ефективні пошуки
                                        </label>
                                    </div>
    
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Рік</label>
                                        <input
                                            type="text"
                                            className="filter-dropdown__input"
                                            placeholder="Введіть рік"
                                            value={stateLog.selectData?.year || ''}
                                            onChange={(e) => onHandleChange('year', e.target.value)}
                                            maxLength="4"
                                        />
                                    </div>
    
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Місяць</label>
                                        <select
                                            className="filter-dropdown__select"
                                            value={stateLog.selectData?.month || ''}
                                            onChange={(e) => onHandleChange('month', e.target.value)}
                                        >
                                            <option value="">Всі місяці</option>
                                            <option value="1">Січень</option>
                                            <option value="2">Лютий</option>
                                            <option value="3">Березень</option>
                                            <option value="4">Квітень</option>
                                            <option value="5">Травень</option>
                                            <option value="6">Червень</option>
                                            <option value="7">Липень</option>
                                            <option value="8">Серпень</option>
                                            <option value="9">Вересень</option>
                                            <option value="10">Жовтень</option>
                                            <option value="11">Листопад</option>
                                            <option value="12">Грудень</option>
                                        </select>
                                    </div>
    
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">IP адреса</label>
                                        <input
                                            type="text"
                                            className="filter-dropdown__input"
                                            placeholder="Введіть IP адресу"
                                            value={stateLog.selectData?.client_addr || ''}
                                            onChange={(e) => onHandleChange('client_addr', e.target.value)}
                                        />
                                    </div>
                                </FilterDropdown>
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 0 ? '1600px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateLog.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                    {/* {//console.log('Modal should be open:', stateLog.statsModalOpen)} */}
                    {/* {//console.log('Stats data:', stateLog.statsData)} */}
                    {/* Модальне вікно статистики */}
                    <Transition in={stateLog.statsModalOpen} timeout={200} unmountOnExit nodeRef={statsNodeRef}>
                    {state => (
                        <Modal
                            className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                            onClose={() => setStateLog(prevState => ({...prevState, statsModalOpen: false}))}
                            title="Статистика готовності до перевірки"
                            cancelText="Закрити"
                            okText="Закрити">
                        {stateLog.statsData && (
                            <div style={{padding: '20px'}}>
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                                    <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#666'}}>Всього записів</h4>
                                        <p style={{fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', margin: '0'}}>{stateLog.statsData.totalRecords}</p>
                                    </div>
                                    <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#666'}}>Не перевірено</h4>
                                        <p style={{fontSize: '24px', fontWeight: 'bold', color: '#e74c3c', margin: '0'}}>{stateLog.statsData.notChecked}</p>
                                    </div>
                                    <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#666'}}>Перевірено</h4>
                                        <p style={{fontSize: '24px', fontWeight: 'bold', color: '#27ae60', margin: '0'}}>{stateLog.statsData.checked}</p>
                                    </div>
                                    <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#666'}}>Проблемні</h4>
                                        <p style={{fontSize: '24px', fontWeight: 'bold', color: '#f39c12', margin: '0'}}>{stateLog.statsData.problematic}</p>
                                    </div>
                                    <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#666'}}>Готові до перевірки</h4>
                                        <p style={{fontSize: '24px', fontWeight: 'bold', color: '#3498db', margin: '0'}}>{stateLog.statsData.readyToCheck}</p>
                                    </div>
                                    <div style={{padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#666'}}>Прогрес</h4>
                                        <p style={{fontSize: '24px', fontWeight: 'bold', color: '#9b59b6', margin: '0'}}>{stateLog.statsData.completionPercent}%</p>
                                    </div>
                                </div>
                                <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
                                    <h5>Інформація:</h5>
                                    <ul style={{marginTop: '10px', paddingLeft: '20px'}}>
                                        <li><strong>Готові до перевірки</strong> - записи які можна перевірити зараз</li>
                                        <li><strong>Проблемні</strong> - записи з статусами "Немає реєстру" або "Не було боргу"</li>
                                        <li><strong>Прогрес</strong> - відсоток перевірених записів від загальної кількості</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </Modal>
                    )}
</Transition>

                    {/* Модальне вікно діагностики */}
                    <Transition in={stateLog.diagnosticModalOpen} timeout={200} unmountOnExit nodeRef={diagnosticNodeRef}>
                    {state => (
                        <Modal
                            className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                            onClose={() => setStateLog(prevState => ({...prevState, diagnosticModalOpen: false}))}
                            title="Діагностика перевірки оплати"
                            cancelText="Закрити"
                            okText="Закрити">
                        <div style={{padding: '20px'}}>
                            {stateLog.diagnosticLoading && (
                                <div style={{textAlign: 'center', padding: '40px'}}>
                                    Завантаження діагностики...
                                </div>
                            )}
                            
                            {stateLog.diagnosticData && (
                                <div>
                                    <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
                                        <h5>Інформація про запис:</h5>
                                        <p><strong>ID:</strong> {stateLog.diagnosticData.record.searchId}</p>
                                        <p><strong>Особа:</strong> {stateLog.diagnosticData.record.personName}</p>
                                        <p><strong>Дата пошуку:</strong> {new Date(stateLog.diagnosticData.record.searchDate).toLocaleString()}</p>
                                    </div>
                                    
                                    <h5>Кроки діагностики:</h5>
                                    <div style={{marginTop: '15px'}}>
                                        {stateLog.diagnosticData.diagnosis.map((step, index) => (
                                            <div key={index} style={{
                                                padding: '10px',
                                                margin: '5px 0',
                                                border: '1px solid #ddd',
                                                borderRadius: '5px',
                                                backgroundColor: step.step === 'РЕЗУЛЬТАТ' ? '#e8f5e8' : '#fff'
                                            }}>
                                                <strong>{step.step}:</strong> {step.result}
                                                {step.details && (
                                                    <div style={{marginTop: '5px', color: '#666', fontSize: '14px'}}>
                                                        {step.details}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                    )}
</Transition>

                </React.Fragment> : null
            }
        </React.Fragment>
    );
};

export default AdminLog;