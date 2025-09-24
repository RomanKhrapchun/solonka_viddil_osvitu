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
const DAILY_FOOD_COST_STATE_KEY = 'dailyFoodCostState';

const saveDailyFoodCostState = (state) => {
    try {
        sessionStorage.setItem(DAILY_FOOD_COST_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save daily food cost state:', error);
    }
};

const loadDailyFoodCostState = () => {
    try {
        const saved = sessionStorage.getItem(DAILY_FOOD_COST_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load daily food cost state:', error);
    }
    return null;
};

const clearDailyFoodCostState = () => {
    try {
        sessionStorage.removeItem(DAILY_FOOD_COST_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear daily food cost state:', error);
    }
};

const DailyFoodCost = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)

    // стан для списку вартості харчування
    const [stateDFC, setStateDFC] = useState(() => {
        const savedState = loadDailyFoodCostState();
        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                confirmLoading: false,
                itemId: null,
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'date',
                    sort_direction: 'desc',
                }
            };
        }

        // Дефолтний стан за замовчуванням
        return {
            isFilterOpen: false,
            selectData: {},
            confirmLoading: false,
            itemId: null,
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'date',
                sort_direction: 'desc',
            }
        };
    });

    // стан для модального вікна додавання
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            date: '',
            young_group_cost: '',
            older_group_cost: ''
        }
    });

    // стан для модального вікна редагування
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        itemId: null,
        formData: {
            date: '',
            young_group_cost: '',
            older_group_cost: ''
        }
    });

    // стан для модального вікна видалення
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        itemId: null,
        itemDate: ''
    });

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/daily_food_cost/filter', {
        method: 'post',
        data: stateDFC.sendData
    })
    
    const startRecord = ((stateDFC.sendData.page || 1) - 1) * stateDFC.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateDFC.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/daily_food_cost/filter', {
            method: 'post',
            data: stateDFC.sendData
        });
    }, [stateDFC.sendData, retryFetch]);

    // Зберігання стану
    useEffect(() => {
        saveDailyFoodCostState(stateDFC);
    }, [stateDFC]);

    // Очищення стану при розмонтуванні
    useEffect(() => {
        return () => {
            clearDailyFoodCostState();
        };
    }, []);

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateDFC.selectData).some(value => 
            value !== null && 
            value !== undefined && 
            value !== '' && 
            (!Array.isArray(value) || value.length > 0)
        );
    }, [stateDFC.selectData]);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = stateDFC.sendData.sort_by === dataIndex;
        const direction = stateDFC.sendData.sort_direction;
        
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
        const currentSort = stateDFC.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateDFC(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateDFC.sendData]);

    const columns = useMemo(() => {
        return [
            {
                title: 'Дата',
                dataIndex: 'date',
                width: 120,
                render: (date) => {
                    return new Date(date).toLocaleDateString('uk-UA');
                }
            },
            createSortableColumn('Молодша група (грн)', 'young_group_cost', (cost) => {
                return `${parseFloat(cost).toFixed(2)} грн`;
            }),
            createSortableColumn('Старша група (грн)', 'older_group_cost', (cost) => {
                return `${parseFloat(cost).toFixed(2)} грн`;
            }),
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
    }, [stateDFC.sendData]);

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateDFC.sendData.limit !== 16) {
                    setStateDFC(prevState => ({
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
                if (stateDFC.sendData.limit !== 32) {
                    setStateDFC(prevState => ({
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
                if (stateDFC.sendData.limit !== 48) {
                    setStateDFC(prevState => ({
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
        setStateDFC(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    };

    const onHandleChange = (name, value) => {
        setStateDFC(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateDFC.selectData).some(value =>
            Array.isArray(value) ? value.length > 0 : value
        );

        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateDFC.selectData);
        if (!validation.error) {
            setStateDFC(prevState => ({
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
        if (Object.values(stateDFC.selectData).some(value => value)) {
            setStateDFC(prevState => ({
                ...prevState,
                selectData: {}
            }));
        }
        if (!hasOnlyAllowedParams(stateDFC.sendData, ['limit', 'page'])) {
            setStateDFC(prevState => ({
                ...prevState,
                sendData: {
                    limit: prevState.sendData.limit,
                    page: 1
                }
            }));
        }
    };

    const toggleFilter = () => {
        setStateDFC(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen
        }));
    };

    // Обробники для модальних вікон
    const handleAdd = () => {
        setModalState({
            isOpen: true,
            loading: false,
            formData: {
                date: '',
                young_group_cost: '',
                older_group_cost: ''
            }
        });
    };

    const handleEdit = (record) => {
        setEditModalState({
            isOpen: true,
            loading: false,
            itemId: record.id,
            formData: {
                date: record.date || '',
                young_group_cost: record.young_group_cost || '',
                older_group_cost: record.older_group_cost || ''
            }
        });
    };

    const handleDelete = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            itemId: record.id,
            itemDate: new Date(record.date).toLocaleDateString('uk-UA')
        });
    };

    // Функції для збереження
    const handleSave = async () => {
        setModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction('api/kindergarten/daily_food_cost', {
                method: 'POST',
                data: {
                    date: modalState.formData.date,
                    young_group_cost: parseFloat(modalState.formData.young_group_cost),
                    older_group_cost: parseFloat(modalState.formData.older_group_cost)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Вартість харчування успішно додана',
            });

            setModalState({ 
                isOpen: false, 
                loading: false, 
                formData: { 
                    date: '', 
                    young_group_cost: '', 
                    older_group_cost: ''
                } 
            });
            
            retryFetch('api/kindergarten/daily_food_cost/filter', {
                method: 'post',
                data: stateDFC.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати вартість харчування',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleUpdate = async () => {
        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/daily_food_cost/${editModalState.itemId}`, {
                method: 'PUT',
                data: {
                    date: editModalState.formData.date,
                    young_group_cost: parseFloat(editModalState.formData.young_group_cost),
                    older_group_cost: parseFloat(editModalState.formData.older_group_cost)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Вартість харчування успішно оновлена',
            });

            setEditModalState({ 
                isOpen: false, 
                loading: false, 
                itemId: null, 
                formData: { 
                    date: '', 
                    young_group_cost: '', 
                    older_group_cost: ''
                } 
            });
            
            retryFetch('api/kindergarten/daily_food_cost/filter', {
                method: 'post',
                data: stateDFC.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити вартість харчування',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleConfirmDelete = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/daily_food_cost/${deleteModalState.itemId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Вартість харчування успішно видалена',
            });

            setDeleteModalState({ 
                isOpen: false, 
                loading: false, 
                itemId: null, 
                itemDate: '' 
            });
            
            retryFetch('api/kindergarten/daily_food_cost/filter', {
                method: 'post',
                data: stateDFC.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити вартість харчування',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handlePageChange = useCallback((page) => {
        setStateDFC(prevState => ({
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
        return <PageError statusError={error.status} title={error.message} />
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
                                {data?.items && Array.isArray(data?.items) && data?.items.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    </React.Fragment> : <React.Fragment>Записів не знайдено</React.Fragment>
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Button
                                    onClick={handleAdd}
                                    icon={addIcon}>
                                    Додати вартість
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateDFC.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={toggleFilter}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateDFC.selectData).filter(key => stateDFC.selectData[key]).length})`}
                                </Button>

                                {/* Dropdown фільтр */}
                                <FilterDropdown
                                    isOpen={stateDFC.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateDFC.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                />
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper">
                                    <Table columns={columns} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateDFC.sendData.limit}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }

            {/* Модальне вікно додавання */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--open' : ''}`}
                        onClose={() => setModalState({ ...modalState, isOpen: false })}
                        title="Додати вартість харчування"
                        footer={
                            <div className="modal-footer">
                                <Button
                                    className="outline"
                                    onClick={() => setModalState({ ...modalState, isOpen: false })}
                                    disabled={modalState.loading}
                                >
                                    Скасувати
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    loading={modalState.loading}
                                    disabled={!modalState.formData.date || !modalState.formData.young_group_cost || !modalState.formData.older_group_cost}
                                >
                                    Зберегти
                                </Button>
                            </div>
                        }
                    >
                        <div className="form-group">
                            <Input
                                label="Дата *"
                                type="date"
                                value={modalState.formData.date}
                                onChange={(_, value) => setModalState(prev => ({
                                    ...prev,
                                    formData: { ...prev.formData, date: value }
                                }))}
                                required
                            />
                            <Input
                                label="Вартість молодшої групи (грн) *"
                                type="number"
                                step="0.01"
                                min="0"
                                value={modalState.formData.young_group_cost}
                                onChange={(_, value) => setModalState(prev => ({
                                    ...prev,
                                    formData: { ...prev.formData, young_group_cost: value }
                                }))}
                                required
                            />
                            <Input
                                label="Вартість старшої групи (грн) *"
                                type="number"
                                step="0.01"
                                min="0"
                                value={modalState.formData.older_group_cost}
                                onChange={(_, value) => setModalState(prev => ({
                                    ...prev,
                                    formData: { ...prev.formData, older_group_cost: value }
                                }))}
                                required
                            />
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно редагування */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--open' : ''}`}
                        onClose={() => setEditModalState({ ...editModalState, isOpen: false })}
                        title="Редагувати вартість харчування"
                        footer={
                            <div className="modal-footer">
                                <Button
                                    className="outline"
                                    onClick={() => setEditModalState({ ...editModalState, isOpen: false })}
                                    disabled={editModalState.loading}
                                >
                                    Скасувати
                                </Button>
                                <Button
                                    onClick={handleUpdate}
                                    loading={editModalState.loading}
                                    disabled={!editModalState.formData.date || !editModalState.formData.young_group_cost || !editModalState.formData.older_group_cost}
                                >
                                    Оновити
                                </Button>
                            </div>
                        }
                    >
                        <div className="form-group">
                            <Input
                                label="Дата *"
                                type="date"
                                value={editModalState.formData.date}
                                onChange={(_, value) => setEditModalState(prev => ({
                                    ...prev,
                                    formData: { ...prev.formData, date: value }
                                }))}
                                required
                            />
                            <Input
                                label="Вартість молодшої групи (грн) *"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editModalState.formData.young_group_cost}
                                onChange={(_, value) => setEditModalState(prev => ({
                                    ...prev,
                                    formData: { ...prev.formData, young_group_cost: value }
                                }))}
                                required
                            />
                            <Input
                                label="Вартість старшої групи (грн) *"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editModalState.formData.older_group_cost}
                                onChange={(_, value) => setEditModalState(prev => ({
                                    ...prev,
                                    formData: { ...prev.formData, older_group_cost: value }
                                }))}
                                required
                            />
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно видалення */}
            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--open' : ''}`}
                        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
                        title="Підтвердження видалення"
                        footer={
                            <div className="modal-footer">
                                <Button
                                    className="outline"
                                    onClick={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
                                    disabled={deleteModalState.loading}
                                >
                                    Скасувати
                                </Button>
                                <Button
                                    className="danger"
                                    onClick={handleConfirmDelete}
                                    loading={deleteModalState.loading}
                                >
                                    Видалити
                                </Button>
                            </div>
                        }
                    >
                        <p>Ви впевнені, що хочете видалити вартість харчування за дату <strong>{deleteModalState.itemDate}</strong>?</p>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default DailyFoodCost;