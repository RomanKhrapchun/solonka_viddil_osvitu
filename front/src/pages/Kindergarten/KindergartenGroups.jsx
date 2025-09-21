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
import Select from "../../components/common/Select/Select";
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
const KINDERGARTEN_GROUPS_STATE_KEY = 'kindergartenGroupsState';

const saveKindergartenGroupsState = (state) => {
    try {
        sessionStorage.setItem(KINDERGARTEN_GROUPS_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save kindergarten groups state:', error);
    }
};

const loadKindergartenGroupsState = () => {
    try {
        const saved = sessionStorage.getItem(KINDERGARTEN_GROUPS_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load kindergarten groups state:', error);
    }
    return null;
};

const clearKindergartenGroupsState = () => {
    try {
        sessionStorage.removeItem(KINDERGARTEN_GROUPS_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear kindergarten groups state:', error);
    }
};

const KindergartenGroups = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)
    
    const [stateKindergarten, setStateKindergarten] = useState(() => {
        const savedState = loadKindergartenGroupsState();
        
        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                confirmLoading: false,
                itemId: null,
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'id',
                    sort_direction: 'desc',
                }
            };
        }
        
        // Початковий стан за замовчуванням
        return {
            isFilterOpen: false,
            selectData: {},
            confirmLoading: false,
            itemId: null,
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'id',
                sort_direction: 'desc',
            }
        };
    });

    // стан для модального вікна додавання групи
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            kindergarten_name: '',
            group_name: '',
            group_type: ''
        }
    });

    // стан для модального вікна редагування групи
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        groupId: null,
        formData: {
            kindergarten_name: '',
            group_name: '',
            group_type: ''
        }
    });

    // стан для модального вікна видалення групи
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        groupId: null,
        groupName: ''
    });

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/groups/filter', {
        method: 'post',
        data: stateKindergarten.sendData
    })
    
    const startRecord = ((stateKindergarten.sendData.page || 1) - 1) * stateKindergarten.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateKindergarten.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/groups/filter', {
            method: 'post',
            data: stateKindergarten.sendData
        });
    }, [stateKindergarten.sendData, retryFetch]);

    // Зберігання стану
    useEffect(() => {
        saveKindergartenGroupsState(stateKindergarten);
    }, [stateKindergarten]);

    // Очищення стану при розмонтуванні
    useEffect(() => {
        return () => {
            clearKindergartenGroupsState();
        };
    }, []);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = stateKindergarten.sendData.sort_by === dataIndex;
        const direction = stateKindergarten.sendData.sort_direction;
        
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
            headerClassName: isActive ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        };
    };

    const handleSort = (column) => {
        const currentSortBy = stateKindergarten.sendData.sort_by;
        const currentDirection = stateKindergarten.sendData.sort_direction;
        
        let newDirection = 'asc';
        if (currentSortBy === column && currentDirection === 'asc') {
            newDirection = 'desc';
        }

        setStateKindergarten(prev => ({
            ...prev,
            sendData: {
                ...prev.sendData,
                sort_by: column,
                sort_direction: newDirection,
                page: 1
            }
        }));
    };

    const columnTable = useMemo(() => {
        let columns = [
            createSortableColumn('Назва садочка', 'kindergarten_name', null, '200px'),
            createSortableColumn('Назва групи', 'group_name', null, '150px'),
            createSortableColumn('Тип групи', 'group_type', (value) => {
                const typeLabels = {
                    'young': 'Молодша',
                    'older': 'Старша'
                };
                return typeLabels[value] || value; // Просто текст без стилізації
            }, '120px'),
            {
                title: 'Дія',
                dataIndex: 'action',
                headerClassName: 'non-sortable',
                width: '100px',
                render: (_, record) => (
                    <div className="btn-sticky" style={{
                        justifyContent: 'center', 
                        gap: '4px', 
                        flexWrap: 'wrap'
                    }}>
                        <Button
                            title="Редагувати"
                            icon={editIcon}
                            size="small"
                            onClick={() => openEditModal(record)}
                        />
                        <Button
                            title="Видалити"
                            icon={deleteIcon}
                            size="small"
                            className="btn--secondary"
                            onClick={() => openDeleteModal(record)}
                        />
                    </div>
                ),
            }
        ];
        return columns;
    }, [stateKindergarten.sendData.sort_by, stateKindergarten.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                kindergarten_name: el.kindergarten_name,
                group_name: el.group_name,
                group_type: el.group_type,
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateKindergarten.sendData.limit !== 16) {
                    setStateKindergarten(prevState => ({
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
                if (stateKindergarten.sendData.limit !== 32) {
                    setStateKindergarten(prevState => ({
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
                if (stateKindergarten.sendData.limit !== 48) {
                    setStateKindergarten(prevState => ({
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
    ]

    const filterHandleClick = () => {
        setStateKindergarten(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateKindergarten(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateKindergarten.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateKindergarten.selectData])

    const onHandleChange = (name, value) => {
        setStateKindergarten(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateKindergarten.selectData).some(Boolean)) {
            setStateKindergarten((prev) => ({ ...prev, selectData: {} }));
        }
        if (!hasOnlyAllowedParams(stateKindergarten.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])) {
            setStateKindergarten((prev) => ({
                ...prev,
                sendData: { 
                    limit: prev.sendData.limit, 
                    page: 1,
                    sort_by: 'id',
                    sort_direction: 'desc'
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateKindergarten.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateKindergarten.selectData);
        if (!validation.error) {
            setStateKindergarten((prev) => ({
                ...prev,
                sendData: { 
                    ...prev.sendData,
                    ...validation, 
                    page: 1,
                },
                isFilterOpen: false
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

    const onPageChange = useCallback((page) => {
        if (stateKindergarten.sendData.page !== page) {
            setStateKindergarten(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateKindergarten.sendData.page])

    // Функції для модального вікна додавання
    const openModal = () => {
        setModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                kindergarten_name: '',
                group_name: '',
                group_type: ''
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

    const handleSaveGroup = async () => {
        const { kindergarten_name, group_name, group_type } = modalState.formData;
        
        // Валідація
        if (!kindergarten_name.trim() || !group_name.trim() || !group_type) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, заповніть всі поля',
            });
            return;
        }

        setModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction('api/kindergarten/groups', {
                method: 'POST',
                data: {
                    kindergarten_name: kindergarten_name.trim(),
                    group_name: group_name.trim(),
                    group_type: String(group_type)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Групу успішно додано',
            });

            closeModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/groups/filter', {
                method: 'post',
                data: stateKindergarten.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати групу',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Функції для модального вікна редагування
    const openEditModal = (record) => {
        setEditModalState({
            isOpen: true,
            loading: false,
            groupId: record.id,
            formData: {
                kindergarten_name: record.kindergarten_name,
                group_name: record.group_name,
                group_type: record.group_type
            }
        });
        document.body.style.overflow = 'hidden';
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleEditInputChange = (field, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value && typeof value === 'object' && value.value 
                    ? value.value 
                    : value
            }
        }));
    };

    const handleUpdateGroup = async () => {
        const { kindergarten_name, group_name, group_type } = editModalState.formData;
        
        // Валідація
        if (!kindergarten_name.trim() || !group_name.trim() || !group_type) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, заповніть всі поля',
            });
            return;
        }

        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/groups/${editModalState.groupId}`, {
                method: 'PUT',
                data: {
                    kindergarten_name: kindergarten_name.trim(),
                    group_name: group_name.trim(),
                    group_type: String(group_type)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Групу успішно оновлено',
            });

            closeEditModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/groups/filter', {
                method: 'post',
                data: stateKindergarten.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити групу',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Функції для модального вікна видалення
    const openDeleteModal = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            groupId: record.id,
            groupName: record.group_name
        });
        document.body.style.overflow = 'hidden';
    };

    const closeDeleteModal = () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleDeleteGroup = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/groups/${deleteModalState.groupId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Групу успішно видалено',
            });

            closeDeleteModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/groups/filter', {
                method: 'post',
                data: stateKindergarten.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити групу',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
        }
    };

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
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    </React.Fragment> : <React.Fragment>Записів не знайдено</React.Fragment>
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Button
                                    onClick={openModal}
                                    icon={addIcon}>
                                    Додати групу
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateKindergarten.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateKindergarten.selectData).filter(key => stateKindergarten.selectData[key]).length})`}
                                </Button>

                                {/* Dropdown фільтр */}
                                <FilterDropdown
                                    isOpen={stateKindergarten.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateKindergarten.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                />
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 0 ? '1200px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateKindergarten.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }
            
            {/* Модальне вікно для додавання групи */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeModal}
                        onOk={handleSaveGroup}
                        confirmLoading={modalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Додати нову групу садочка"
                    >
                        <div className="modal-form">
                            <div className="form-group">
                                <Input
                                    label="Назва садочка"
                                    placeholder="Введіть назву садочка"
                                    name="kindergarten_name"
                                    value={modalState.formData.kindergarten_name}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Input
                                    label="Назва групи"
                                    placeholder="Введіть назву групи"
                                    name="group_name"
                                    value={modalState.formData.group_name}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Select
                                    label="Тип групи"
                                    placeholder="Оберіть тип групи"
                                    name="group_type"
                                    options={[
                                        { value: 'young', label: 'Молодша' },
                                        { value: 'older', label: 'Старша' }
                                    ]}
                                    value={modalState.formData.group_type ? 
                                        modalState.formData.group_type === 'young' 
                                            ? { value: 'young', label: 'Молодша' }
                                            : { value: 'older', label: 'Старша' }
                                        : null
                                    }
                                    onChange={handleModalInputChange}
                                    style={dropDownStyle}
                                    required
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для редагування групи */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeEditModal}
                        onOk={handleUpdateGroup}
                        confirmLoading={editModalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Редагувати групу садочка"
                    >
                        <div className="modal-form">
                            <div className="form-group">
                                <Input
                                    label="Назва садочка"
                                    placeholder="Введіть назву садочка"
                                    name="kindergarten_name"
                                    value={editModalState.formData.kindergarten_name}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Input
                                    label="Назва групи"
                                    placeholder="Введіть назву групи"
                                    name="group_name"
                                    value={editModalState.formData.group_name}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Select
                                    label="Тип групи"
                                    placeholder="Оберіть тип групи"
                                    name="group_type"
                                    options={[
                                        { value: 'young', label: 'Молодша' },
                                        { value: 'older', label: 'Старша' }
                                    ]}
                                    value={editModalState.formData.group_type ? 
                                        editModalState.formData.group_type === 'young' 
                                            ? { value: 'young', label: 'Молодша' }
                                            : { value: 'older', label: 'Старша' }
                                        : null
                                    }
                                    onChange={handleEditInputChange}
                                    style={dropDownStyle}
                                    required
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для підтвердження видалення */}
            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeDeleteModal}
                        onOk={handleDeleteGroup}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Так, видалити"
                        title="Підтвердження видалення"
                    >
                        <p className="paragraph">
                            Ви впевнені, що бажаєте видалити групу <strong>"{deleteModalState.groupName}"</strong>?
                        </p>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    )
}

export default KindergartenGroups;