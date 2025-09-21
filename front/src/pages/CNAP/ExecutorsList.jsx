import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from "../../components/common/Table/Table";
import Button from "../../components/common/Button/Button";
import Input from "../../components/common/Input/Input";
import Modal from "../../components/common/Modal/Modal";
import Pagination from "../../components/common/Pagination/Pagination";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import PageError from "../ErrorPage/PageError";
import { fetchFunction } from "../../utils/function";
import { useNotification } from "../../hooks/useNotification";
import { Context } from "../../main";
import { generateIcon, iconMap, STATUS } from "../../utils/constants";
import { Transition } from "react-transition-group";
import classNames from "classnames";

// Іконки
const editIcon = generateIcon(iconMap.edit);
const deleteIcon = generateIcon(iconMap.delete);
const addIcon = generateIcon(iconMap.plus);
const filterIcon = generateIcon(iconMap.filter);
const searchIcon = generateIcon(iconMap.search, 'input-icon');

const ExecutorsList = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const deleteModalRef = useRef(null);
    const formModalRef = useRef(null);
    
    // Основний стан компонента
    const [state, setState] = useState({
        loading: false,
        error: null,
        data: null,
        // Фільтри та пагінація
        filters: {
            search: '',
            limit: 16,
            page: 1
        },
        // Модальні вікна
        showFilters: false,
        // Видалення
        deleteModal: {
            show: false,
            loading: false,
            executorId: null,
            executorName: '',
            servicesCount: 0
        },
        // Форма створення/редагування
        formModal: {
            show: false,
            loading: false,
            mode: 'create', // 'create' | 'edit'
            executor: null,
            formData: {
                name: ''
            },
            errors: {}
        }
    });

    // Завантаження даних
    const loadExecutors = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            
            const response = await fetchFunction('api/cnap/executors', {
                method: 'GET'
            });

            if (response?.data?.success) {
                setState(prev => ({
                    ...prev,
                    data: response.data.data,
                    loading: false
                }));
            } else {
                throw new Error('Помилка завантаження даних');
            }
        } catch (error) {
            console.error('Error loading executors:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }));
            notification({
                type: 'error',
                message: 'Помилка завантаження списку надавачів',
                placement: 'top'
            });
        }
    }, [notification]);

    // Ініціалізація
    useEffect(() => {
        loadExecutors();
    }, [loadExecutors]);

    // Фільтрація та пошук
    const filteredData = useMemo(() => {
        if (!state.data) return [];
        
        let filtered = [...state.data];
        
        // Пошук за назвою
        if (state.filters.search.trim()) {
            const searchTerm = state.filters.search.toLowerCase().trim();
            filtered = filtered.filter(executor => 
                executor.name.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }, [state.data, state.filters.search]);

    // Пагінація
    const paginatedData = useMemo(() => {
        const startIndex = (state.filters.page - 1) * state.filters.limit;
        const endIndex = startIndex + state.filters.limit;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, state.filters.page, state.filters.limit]);

    // Обчислення статистики
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / state.filters.limit);
    const startRecord = ((state.filters.page - 1) * state.filters.limit) + 1;
    const endRecord = Math.min(startRecord + state.filters.limit - 1, totalItems);

    // Обробники подій
    const handleSearch = useCallback((_, value) => {
        setState(prev => ({
            ...prev,
            filters: {
                ...prev.filters,
                search: value,
                page: 1 // Скидаємо на першу сторінку при пошуку
            }
        }));
    }, []);

    const toggleFilters = useCallback(() => {
        setState(prev => ({
            ...prev,
            showFilters: !prev.showFilters
        }));
    }, []);

    const handlePageChange = useCallback((page) => {
        setState(prev => ({
            ...prev,
            filters: {
                ...prev.filters,
                page
            }
        }));
    }, []);

    // Створення нового надавача
    const handleCreate = useCallback(() => {
        setState(prev => ({
            ...prev,
            formModal: {
                show: true,
                loading: false,
                mode: 'create',
                executor: null,
                formData: { name: '' },
                errors: {}
            }
        }));
    }, []);

    // Редагування надавача
    const handleEdit = useCallback((executor) => {
        setState(prev => ({
            ...prev,
            formModal: {
                show: true,
                loading: false,
                mode: 'edit',
                executor,
                formData: { name: executor.name },
                errors: {}
            }
        }));
    }, []);

    // Обробка форми
    const handleFormChange = useCallback((field, value) => {
        setState(prev => ({
            ...prev,
            formModal: {
                ...prev.formModal,
                formData: {
                    ...prev.formModal.formData,
                    [field]: value
                },
                errors: {
                    ...prev.formModal.errors,
                    [field]: '' // Очищаємо помилку при зміні
                }
            }
        }));
    }, []);

    const validateForm = useCallback((formData) => {
        const errors = {};
        
        if (!formData.name || formData.name.trim().length === 0) {
            errors.name = "Назва надавача є обов'язковою";
        }
        
        return errors;
    }, []);

    const handleFormSubmit = useCallback(async () => {
        const { mode, formData, executor } = state.formModal;
        
        // Валідація
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            setState(prev => ({
                ...prev,
                formModal: {
                    ...prev.formModal,
                    errors
                }
            }));
            return;
        }

        try {
            setState(prev => ({
                ...prev,
                formModal: {
                    ...prev.formModal,
                    loading: true
                }
            }));

            const url = mode === 'create' 
                ? 'api/cnap/executors' 
                : `api/cnap/executors/${executor.id}`;
            
            const method = mode === 'create' ? 'POST' : 'PUT';
            
            const response = await fetchFunction(url, {
                method,
                data: {
                    name: formData.name.trim()
                }
            });

            if (response?.data?.success) {
                notification({
                    type: 'success',
                    message: mode === 'create' 
                        ? 'Надавача успішно створено' 
                        : 'Надавача успішно оновлено',
                    placement: 'top'
                });

                // Закриваємо модальне вікно та оновлюємо дані
                setState(prev => ({
                    ...prev,
                    formModal: {
                        show: false,
                        loading: false,
                        mode: 'create',
                        executor: null,
                        formData: { name: '' },
                        errors: {}
                    }
                }));

                loadExecutors();
            } else {
                throw new Error(response?.data?.message || 'Помилка збереження');
            }
        } catch (error) {
            console.error('Error saving executor:', error);
            
            setState(prev => ({
                ...prev,
                formModal: {
                    ...prev.formModal,
                    loading: false
                }
            }));

            notification({
                type: 'error',
                message: error.message || 'Помилка збереження надавача',
                placement: 'top'
            });
        }
    }, [state.formModal, validateForm, notification, loadExecutors]);

    // Видалення
    const handleDeleteClick = useCallback((executor) => {
        setState(prev => ({
            ...prev,
            deleteModal: {
                show: true,
                loading: false,
                executorId: executor.id,
                executorName: executor.name,
                servicesCount: executor.services_count || 0
            }
        }));
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        try {
            setState(prev => ({
                ...prev,
                deleteModal: {
                    ...prev.deleteModal,
                    loading: true
                }
            }));

            const response = await fetchFunction(`api/cnap/executors/${state.deleteModal.executorId}`, {
                method: 'DELETE'
            });

            if (response?.data?.success) {
                notification({
                    type: 'success',
                    message: 'Надавач успішно видалено',
                    placement: 'top'
                });

                // Закриваємо модальне вікно та оновлюємо дані
                setState(prev => ({
                    ...prev,
                    deleteModal: {
                        show: false,
                        loading: false,
                        executorId: null,
                        executorName: '',
                        servicesCount: 0
                    }
                }));

                loadExecutors();
            } else {
                throw new Error(response?.data?.message || 'Помилка видалення');
            }
        } catch (error) {
            console.error('Error deleting executor:', error);
            
            setState(prev => ({
                ...prev,
                deleteModal: {
                    ...prev.deleteModal,
                    loading: false
                }
            }));

            notification({
                type: 'error',
                message: error.message || 'Помилка видалення надавача',
                placement: 'top'
            });
        }
    }, [state.deleteModal.executorId, notification, loadExecutors]);

    // Закриття модальних вікон
    const closeDeleteModal = useCallback(() => {
        setState(prev => ({
            ...prev,
            deleteModal: {
                show: false,
                loading: false,
                executorId: null,
                executorName: '',
                servicesCount: 0
            }
        }));
    }, []);

    const closeFormModal = useCallback(() => {
        setState(prev => ({
            ...prev,
            formModal: {
                show: false,
                loading: false,
                mode: 'create',
                executor: null,
                formData: { name: '' },
                errors: {}
            }
        }));
    }, []);

    // Конфігурація колонок таблиці
    const columns = useMemo(() => [
        {
            title: 'Назва надавача',
            dataIndex: 'name',
            key: 'name',
            render: (value) => (
                <span className="table-cell__title">{value}</span>
            )
        },
        {
            title: 'Кількість послуг',
            dataIndex: 'services_count',
            key: 'services_count',
            width: '150px',
            render: (value) => (
                <span className="table-cell__number">{value || 0}</span>
            )
        },
        {
            title: 'Дії',
            key: 'actions',
            width: '120px',
            render: (_, record) => (
                <div className="table-actions">
                    <Button
                        className="btn--icon btn--sm"
                        onClick={() => handleEdit(record)}
                        title="Редагувати надавача"
                    >
                        {editIcon}
                    </Button>
                    <Button
                        className="btn--icon btn--sm btn--danger"
                        onClick={() => handleDeleteClick(record)}
                        title="Видалити надавача"
                    >
                        {deleteIcon}
                    </Button>
                </div>
            )
        }
    ], [handleEdit, handleDeleteClick]);

    // Рендер помилки
    if (state.error && !state.loading) {
        return (
            <PageError 
                message={state.error}
                onRetry={loadExecutors}
            />
        );
    }

    // Рендер завантаження
    if (state.loading && !state.data) {
        return <SkeletonPage />;
    }

    return (
        <React.Fragment>
            {/* Заголовок та дії */}
            <div className="page-header">
                <div className="page-header__main">
                    <h1 className="title title--lg">Надавачі послуг</h1>
                    <p className="page-description">
                        Управління надавачами адміністративних послуг
                    </p>
                </div>
                <div className="page-header__actions">
                    <Button
                        className="btn--primary"
                        onClick={handleCreate}
                    >
                        {addIcon}
                        Додати надавача
                    </Button>
                </div>
            </div>

            {/* Фільтри */}
            {state.showFilters && (
                <div className="table-filter">
                    <div className="table-filter__content">
                        <div className="table-filter__inner">
                            <h3 className="title title--sm">Фільтри</h3>
                            <div className="table-filter__item">
                                <Input
                                    icon={searchIcon}
                                    name="search"
                                    type="text"
                                    placeholder="Введіть назву надавача"
                                    value={state.filters.search}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Статистика */}
            {totalItems > 0 && (
                <div className="table-info">
                    <span className="table-info__text">
                        Показано {startRecord}-{endRecord} з {totalItems} записів
                    </span>
                </div>
            )}

            {/* Таблиця */}
            <div className="table-container">
                <Table
                    columns={columns}
                    dataSource={paginatedData}
                    loading={state.loading}
                    emptyText="Надавачі не знайдені"
                    rowKey="id"
                />
            </div>

            {/* Пагінація */}
            {totalPages > 1 && (
                <Pagination
                    current={state.filters.page}
                    total={totalItems}
                    pageSize={state.filters.limit}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                />
            )}

            {/* Модальне вікно форми */}
            <Transition in={state.formModal.show} timeout={200} unmountOnExit nodeRef={formModalRef}>
                {transitionState => (
                    <Modal
                        className={`${transitionState === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={closeFormModal}
                        onOk={handleFormSubmit}
                        confirmLoading={state.formModal.loading}
                        cancelText="Скасувати"
                        okText={state.formModal.mode === 'create' ? 'Створити' : 'Зберегти'}
                        title={state.formModal.mode === 'create' ? 'Створення надавача' : 'Редагування надавача'}
                    >
                        <div className="form-group">
                            <label className="form-label" htmlFor="executor-name">
                                Назва надавача *
                            </label>
                            <Input
                                id="executor-name"
                                name="name"
                                type="text"
                                placeholder="Введіть назву надавача"
                                value={state.formModal.formData.name}
                                onChange={(name, value) => handleFormChange(name, value)}
                                error={state.formModal.errors.name}
                                maxLength={255}
                            />
                            {state.formModal.errors.name && (
                                <span className="form-error">{state.formModal.errors.name}</span>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно підтвердження видалення */}
            <Transition in={state.deleteModal.show} timeout={200} unmountOnExit nodeRef={deleteModalRef}>
                {transitionState => (
                    <Modal
                        className={`${transitionState === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={closeDeleteModal}
                        onOk={handleDeleteConfirm}
                        confirmLoading={state.deleteModal.loading}
                        cancelText="Скасувати"
                        okText="Так, видалити"
                        title="Підтвердження видалення"
                        danger
                    >
                        <div className="modal-content">
                            <p className="paragraph">
                                Ви впевнені, що бажаєте видалити надавача <strong>"{state.deleteModal.executorName}"</strong>?
                            </p>
                            {state.deleteModal.servicesCount > 0 && (
                                <div className="warning-block">
                                    <p className="paragraph paragraph--warning">
                                        <strong>Увага!</strong> До цього надавача прив'язано {state.deleteModal.servicesCount} послуг. 
                                        Видалення буде неможливе доки ці послуги не будуть переназначені іншому надавачу або видалені.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default ExecutorsList;