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
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import Input from "../../components/common/Input/Input";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "../../components/common/Dropdown/FilterDropdown.css";
import './KindergartenBilling.css';

// Іконки
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

// Константи для збереження стану
const KINDERGARTEN_BILLING_STATE_KEY = 'kindergartenBillingState';

const saveKindergartenBillingState = (state) => {
    try {
        sessionStorage.setItem(KINDERGARTEN_BILLING_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save kindergarten billing state:', error);
    }
};

const loadKindergartenBillingState = () => {
    try {
        const saved = sessionStorage.getItem(KINDERGARTEN_BILLING_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load kindergarten billing state:', error);
    }
    return null;
};

const clearKindergartenBillingState = () => {
    try {
        sessionStorage.removeItem(KINDERGARTEN_BILLING_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear kindergarten billing state:', error);
    }
};

const KindergartenBilling = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)

    // стан для списку батьківської плати
    const [stateBilling, setStateBilling] = useState(() => {
        const savedState = loadKindergartenBillingState();
        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                confirmLoading: false,
                itemId: null,
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'parent_name',
                    sort_direction: 'asc',
                }
            };
        }

        return {
            isFilterOpen: false,
            selectData: {},
            confirmLoading: false,
            itemId: null,
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'parent_name',
                sort_direction: 'asc',
            }
        };
    });

    // стан для модального вікна додавання
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            parent_name: '',
            payment_month: '',
            current_debt: '',
            current_accrual: '',
            current_payment: ''
        }
    });

    // стан для модального вікна редагування
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        itemId: null,
        formData: {
            parent_name: '',
            payment_month: '',
            current_debt: '',
            current_accrual: '',
            current_payment: ''
        }
    });

    // стан для модального вікна видалення
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        itemId: null,
        parentName: ''
    });

    const isFirstAPI = useRef(true);

    const {error, status, data, retryFetch} = useFetch('api/kindergarten/billing/filter', {
        method: 'post',
        data: stateBilling.sendData
    })
    
    const startRecord = ((stateBilling.sendData.page || 1) - 1) * stateBilling.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateBilling.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/billing/filter', {
            method: 'post',
            data: stateBilling.sendData
        });
    }, [stateBilling.sendData, retryFetch]);

    // Зберігання стану
    useEffect(() => {
        saveKindergartenBillingState(stateBilling);
    }, [stateBilling]);

    // Очищення стану при розмонтуванні
    useEffect(() => {
        return () => {
            clearKindergartenBillingState();
        };
    }, []);

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateBilling.selectData).some(value => 
            value !== null && 
            value !== undefined && 
            value !== '' && 
            (!Array.isArray(value) || value.length > 0)
        );
    }, [stateBilling.selectData]);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = stateBilling.sendData.sort_by === dataIndex;
        const direction = stateBilling.sendData.sort_direction;
        
        return {
            title: (
                <span 
                    onClick={() => handleSort(dataIndex)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    className={`sortable-header ${isActive ? 'active' : ''}`}
                >
                    {title} {isActive && (direction === 'asc' ? sortUpIcon : sortDownIcon)}
                </span>
            ),
            dataIndex,
            headerClassName: isActive ? 'sorted-column' : '',
            render: render,
            width: width
        };
    };

    const handleSort = useCallback((columnName) => {
        const currentSort = stateBilling.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateBilling(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateBilling.sendData]);

    // Функція для розрахунку сальдо
    const calculateBalance = (debt, accrual, payment) => {
        const totalDebt = parseFloat(debt || 0) + parseFloat(accrual || 0);
        const totalPayment = parseFloat(payment || 0);
        return totalDebt - totalPayment;
    };

    const columns = useMemo(() => {
        return [
            createSortableColumn('ПІБ батьків', 'parent_name', null, 200),
            createSortableColumn('Місяць оплати', 'payment_month', (month) => {
                return new Date(month + '-01').toLocaleDateString('uk-UA', { 
                    year: 'numeric', 
                    month: 'long' 
                });
            }, 150),
            createSortableColumn('Борг в поточному періоді', 'current_debt', (debt) => {
                const amount = parseFloat(debt || 0);
                return `${amount.toFixed(2)} грн`;
            }, 180),
            createSortableColumn('Нараховано в поточному періоді', 'current_accrual', (accrual) => {
                const amount = parseFloat(accrual || 0);
                return `${amount.toFixed(2)} грн`;
            }, 200),
            createSortableColumn('Оплачено в поточному періоді', 'current_payment', (payment) => {
                const amount = parseFloat(payment || 0);
                return `${amount.toFixed(2)} грн`;
            }, 180),
            createSortableColumn('Сальдо', 'balance', (_, record) => {
                const balance = calculateBalance(record.current_debt, record.current_accrual, record.current_payment);
                const balanceClass = balance > 0 ? 'balance-negative' : balance < 0 ? 'balance-positive' : 'balance-zero';
                return (
                    <span className={balanceClass}>
                        {balance.toFixed(2)} грн
                    </span>
                );
            }, 120),
            {
                title: 'Дії',
                key: 'actions',
                width: 120,
                render: (_, record) => (
                    <div className="actions-group">
                        <Button
                            className="small"
                            icon={editIcon}
                            onClick={() => handleEdit(record)}
                            title="Редагувати"
                        />
                        <Button
                            className="small danger"
                            icon={deleteIcon}
                            onClick={() => handleDelete(record)}
                            title="Видалити"
                        />
                    </div>
                )
            }
        ];
    }, [stateBilling.sendData]);

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateBilling.sendData.limit !== 16) {
                    setStateBilling(prevState => ({
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
                if (stateBilling.sendData.limit !== 32) {
                    setStateBilling(prevState => ({
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
                if (stateBilling.sendData.limit !== 48) {
                    setStateBilling(prevState => ({
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
    ];

    const closeFilterDropdown = () => {
        setStateBilling(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    };

    const onHandleChange = (name, value) => {
        setStateBilling(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateBilling.selectData).some(value =>
            Array.isArray(value) ?
                value.length > 0 : value
        );

        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateBilling.selectData);
        if (!validation.error) {
            setStateBilling(prevState => ({
                ...prevState,
                sendData: {
                    ...validation,
                    limit: prevState.sendData.limit,
                    page: 1
                }
            }));
        } else {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: validation.message ?? 'Щось пішло не так.',
            });
        }
    };

    const resetFilters = () => {
        if (Object.values(stateBilling.selectData).some(value => value)) {
            setStateBilling(prevState => ({
                ...prevState,
                selectData: {}
            }));
        }
        if (!hasOnlyAllowedParams(stateBilling.sendData, ['limit', 'page'])) {
            setStateBilling(prevState => ({
                ...prevState,
                sendData: {
                    limit: prevState.sendData.limit,
                    page: 1
                }
            }));
        }
    };

    const toggleFilter = () => {
        setStateBilling(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen
        }));
    };

    // Функції для модального вікна додавання
    const openModal = () => {
        setModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                parent_name: '',
                payment_month: '',
                current_debt: '',
                current_accrual: '',
                current_payment: ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleModalInputChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value && typeof value === 'object' && value.value 
                    ? value.value 
                    : value
            }
        }));
    };

    const handleEdit = (record) => {
        setEditModalState({
            isOpen: true,
            loading: false,
            itemId: record.id,
            formData: {
                parent_name: record.parent_name || '',
                payment_month: record.payment_month || '',
                current_debt: record.current_debt || '',
                current_accrual: record.current_accrual || '',
                current_payment: record.current_payment || ''
            }
        });
        document.body.style.overflow = 'hidden';
    };

    const handleDelete = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            itemId: record.id,
            parentName: record.parent_name || 'Невідомо'
        });
        document.body.style.overflow = 'hidden';
    };

    // Функції для збереження
    const handleSave = async () => {
        setModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction('api/kindergarten/billing', {
                method: 'POST',
                data: {
                    parent_name: modalState.formData.parent_name,
                    payment_month: modalState.formData.payment_month,
                    current_debt: parseFloat(modalState.formData.current_debt || 0),
                    current_accrual: parseFloat(modalState.formData.current_accrual || 0),
                    current_payment: parseFloat(modalState.formData.current_payment || 0)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис батьківської плати успішно додано',
            });

            closeModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати запис батьківської плати',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleUpdate = async () => {
        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/billing/${editModalState.itemId}`, {
                method: 'PUT',
                data: {
                    parent_name: editModalState.formData.parent_name,
                    payment_month: editModalState.formData.payment_month,
                    current_debt: parseFloat(editModalState.formData.current_debt || 0),
                    current_accrual: parseFloat(editModalState.formData.current_accrual || 0),
                    current_payment: parseFloat(editModalState.formData.current_payment || 0)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис батьківської плати успішно оновлено',
            });

            setEditModalState({ 
                isOpen: false, 
                loading: false, 
                itemId: null, 
                formData: { 
                    parent_name: '',
                    payment_month: '',
                    current_debt: '',
                    current_accrual: '',
                    current_payment: ''
                } 
            });
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити запис батьківської плати',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleConfirmDelete = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/billing/${deleteModalState.itemId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис батьківської плати успішно видалено',
            });

            setDeleteModalState({ 
                isOpen: false, 
                loading: false, 
                itemId: null, 
                parentName: '' 
            });
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити запис батьківської плати',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handlePageChange = useCallback((page) => {
        setStateBilling(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                page
            }
        }));
    }, []);

    if (status === STATUS.PENDING) {
        return <SkeletonPage />
    }

    if (status === STATUS.ERROR) {
        return <PageError statusError={error?.status} title={error?.message || 'Помилка завантаження'} />
    }

    const tableData = data?.items || data?.data || [];

    return (
        <React.Fragment>
            {status === STATUS.PENDING ? <SkeletonPage/> : null}
            {status === STATUS.SUCCESS ?
                <React.Fragment>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="title title--sm">
                                {tableData && Array.isArray(tableData) && tableData.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    </React.Fragment> : <React.Fragment>Записів не знайдено</React.Fragment>
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Button
                                    onClick={openModal}
                                    icon={addIcon}>
                                    Додати запис
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateBilling.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'active' : ''}`}
                                    onClick={toggleFilter}
                                    icon={filterIcon}>
                                    Фільтри
                                </Button>
                            </div>
                        </div>
                        <FilterDropdown
                            nodeRef={nodeRef}
                            isOpen={stateBilling.isFilterOpen}
                            onClose={closeFilterDropdown}>
                            <div className={`table-filter ${stateBilling.isFilterOpen ? "table-filter--active" : ""}`}>
                                <h3 className="title title--sm">Фільтри</h3>
                                <div className="btn-group">
                                    <Button onClick={applyFilter}>Застосувати</Button>
                                    <Button className="btn--secondary" onClick={resetFilters}>Скинути</Button>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">ПІБ батьків</h4>
                                    <Input
                                        icon={searchIcon}
                                        name="parent_name"
                                        type="text"
                                        placeholder="Введіть ПІБ батьків"
                                        value={stateBilling.selectData?.parent_name || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">Місяць від</h4>
                                    <Input
                                        name="month_from"
                                        type="month"
                                        value={stateBilling.selectData?.month_from || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">Місяць до</h4>
                                    <Input
                                        name="month_to"
                                        type="month"
                                        value={stateBilling.selectData?.month_to || ''}
                                        onChange={onHandleChange}
                                    />
                                </div>
                            </div>
                        </FilterDropdown>
                        <Table
                            columns={columns}
                            dataSource={tableData}
                            rowKey="id"
                            loading={status === STATUS.PENDING}/>
                        <Pagination 
                            total={data?.totalItems || 0}
                            current={stateBilling.sendData.page}
                            pageSize={stateBilling.sendData.limit}
                            onChange={handlePageChange}
                        />
                    </div>
                </React.Fragment>
                : null}

            {/* Модальне вікно додавання */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeModal}
                        onOk={handleSave}
                        confirmLoading={modalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Додати батьківську плату"
                    >
                        <div className="kindergarten-billing-modal">
                            <div className="form-section">
                                <label className="form-label">
                                    👤 ПІБ батьків <span className="required-mark">*</span>
                                </label>
                                <Input
                                    type="text"
                                    name="parent_name"
                                    value={modalState.formData.parent_name}
                                    onChange={handleModalInputChange}
                                    placeholder="Введіть ПІБ батьків"
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    📅 Місяць оплати <span className="required-mark">*</span>
                                </label>
                                <Input
                                    type="month"
                                    name="payment_month"
                                    value={modalState.formData.payment_month}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    📊 Борг в поточному періоді
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="current_debt"
                                    value={modalState.formData.current_debt}
                                    onChange={handleModalInputChange}
                                    placeholder="0.00"
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    💰 Нараховано в поточному періоді
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="current_accrual"
                                    value={modalState.formData.current_accrual}
                                    onChange={handleModalInputChange}
                                    placeholder="0.00"
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    💳 Оплачено в поточному періоді
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="current_payment"
                                    value={modalState.formData.current_payment}
                                    onChange={handleModalInputChange}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно редагування */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={() => setEditModalState({ ...editModalState, isOpen: false })}
                        onOk={handleUpdate}
                        confirmLoading={editModalState.loading}
                        cancelText="Відхилити"
                        okText="Оновити"
                        title="Редагувати батьківську плату"
                    >
                        <div className="kindergarten-billing-modal">
                            <div className="form-section">
                                <label className="form-label">
                                    👤 ПІБ батьків <span className="required-mark">*</span>
                                </label>
                                <Input
                                    type="text"
                                    name="parent_name"
                                    value={editModalState.formData.parent_name}
                                    onChange={(field, value) => setEditModalState(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, [field]: value }
                                    }))}
                                    placeholder="Введіть ПІБ батьків"
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    📅 Місяць оплати <span className="required-mark">*</span>
                                </label>
                                <Input
                                    type="month"
                                    name="payment_month"
                                    value={editModalState.formData.payment_month}
                                    onChange={(field, value) => setEditModalState(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, [field]: value }
                                    }))}
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    📊 Борг в поточному періоді
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="current_debt"
                                    value={editModalState.formData.current_debt}
                                    onChange={(field, value) => setEditModalState(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, [field]: value }
                                    }))}
                                    placeholder="0.00"
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    💰 Нараховано в поточному періоді
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="current_accrual"
                                    value={editModalState.formData.current_accrual}
                                    onChange={(field, value) => setEditModalState(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, [field]: value }
                                    }))}
                                    placeholder="0.00"
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    💳 Оплачено в поточному періоді
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="current_payment"
                                    value={editModalState.formData.current_payment}
                                    onChange={(field, value) => setEditModalState(prev => ({
                                        ...prev,
                                        formData: { ...prev.formData, [field]: value }
                                    }))}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно видалення */}
            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
                        onOk={handleConfirmDelete}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Видалити"
                        title="Підтвердження видалення"
                    >
                        <p>Ви впевнені, що хочете видалити запис батьківської плати для <strong>{deleteModalState.parentName}</strong>?</p>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default KindergartenBilling;