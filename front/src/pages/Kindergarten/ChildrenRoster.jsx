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
const CHILDREN_ROSTER_STATE_KEY = 'childrenRosterState';

const saveChildrenRosterState = (state) => {
    try {
        sessionStorage.setItem(CHILDREN_ROSTER_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save children roster state:', error);
    }
};

const loadChildrenRosterState = () => {
    try {
        const saved = sessionStorage.getItem(CHILDREN_ROSTER_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load children roster state:', error);
    }
    return null;
};

const clearChildrenRosterState = () => {
    try {
        sessionStorage.removeItem(CHILDREN_ROSTER_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear children roster state:', error);
    }
};

const ChildrenRoster = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)
    
    const [stateChildren, setStateChildren] = useState(() => {
        const savedState = loadChildrenRosterState();
        
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

    // стан для модального вікна додавання дитини
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            child_name: '',
            parent_name: '',
            phone_number: '',
            group_id: ''
        }
    });

    // стан для модального вікна редагування дитини
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        childId: null,
        formData: {
            child_name: '',
            parent_name: '',
            phone_number: '',
            group_id: ''
        }
    });

    // стан для модального вікна видалення дитини
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        childId: null,
        childName: ''
    });

    // стан для груп (для селекту)
    const [groupsData, setGroupsData] = useState([]);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/childrenRoster/filter', {
        method: 'post',
        data: stateChildren.sendData
    })
    
    const startRecord = ((stateChildren.sendData.page || 1) - 1) * stateChildren.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateChildren.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/childrenRoster/filter', {
            method: 'post',
            data: stateChildren.sendData
        });
    }, [stateChildren.sendData, retryFetch]);

    // Завантажуємо список груп для селекту
    useEffect(() => {
        console.log('Starting to load groups...');
        const loadGroups = async () => {
            try {
                console.log('Making API call to groups...');
                const response = await fetchFunction('api/kindergarten/groups/filter', {
                    method: 'POST',
                    data: { limit: 1000, page: 1 }
                });
                
                console.log('Groups API response:', response);
                
                if (response?.data && Array.isArray(response.data.items)) {
                    const groupOptions = response.data.items.map(group => ({
                        value: group.id,
                        label: `${group.kindergarten_name} - ${group.group_name}`
                    }));
                    setGroupsData(groupOptions);
                    console.log('Groups loaded successfully:', groupOptions);
                } else {
                    console.warn('No groups in response or invalid format');
                    setGroupsData([]);
                }
            } catch (error) {
                console.error('Error loading groups:', error);
                setGroupsData([]);
            }
        };
        loadGroups();
    }, []);

    // Зберігання стану
    useEffect(() => {
        saveChildrenRosterState(stateChildren);
    }, [stateChildren]);

    // Очищення стану при розмонтуванні
    useEffect(() => {
        return () => {
            clearChildrenRosterState();
        };
    }, []);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = stateChildren.sendData.sort_by === dataIndex;
        const direction = stateChildren.sendData.sort_direction;
        
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
        const currentSortBy = stateChildren.sendData.sort_by;
        const currentDirection = stateChildren.sendData.sort_direction;
        
        let newDirection = 'asc';
        if (currentSortBy === column && currentDirection === 'asc') {
            newDirection = 'desc';
        }

        setStateChildren(prev => ({
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
            createSortableColumn('ПІБ дитини', 'child_name', null, '200px'),
            createSortableColumn('ПІБ батьків', 'parent_name', null, '200px'),
            createSortableColumn('Контактний номер', 'phone_number', null, '150px'),
            createSortableColumn('Група', 'group_name', (value, record) => {
                return `${record.kindergarten_name} - ${value}`;
            }, '250px'),
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
    }, [stateChildren.sendData.sort_by, stateChildren.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                child_name: el.child_name,
                parent_name: el.parent_name,
                phone_number: el.phone_number,
                group_id: el.group_id,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateChildren.sendData.limit !== 16) {
                    setStateChildren(prevState => ({
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
                if (stateChildren.sendData.limit !== 32) {
                    setStateChildren(prevState => ({
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
                if (stateChildren.sendData.limit !== 48) {
                    setStateChildren(prevState => ({
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
        setStateChildren(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateChildren(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateChildren.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateChildren.selectData])

    const onHandleChange = (name, value) => {
        setStateChildren(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateChildren.selectData).some(Boolean)) {
            setStateChildren((prev) => ({ ...prev, selectData: {} }));
        }
        if (!hasOnlyAllowedParams(stateChildren.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])) {
            setStateChildren((prev) => ({
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
        const isAnyInputFilled = Object.values(stateChildren.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateChildren.selectData);
        if (!validation.error) {
            setStateChildren((prev) => ({
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
        if (stateChildren.sendData.page !== page) {
            setStateChildren(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateChildren.sendData.page])

    // Функції для модального вікна додавання
    const openModal = () => {
        setModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                child_name: '',
                parent_name: '',
                phone_number: '',
                group_id: ''
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

    const handleSaveChild = async () => {
        const { child_name, parent_name, phone_number, group_id } = modalState.formData;
        
        // Валідація
        if (!child_name.trim() || !parent_name.trim() || !phone_number.trim() || !group_id) {
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
            await fetchFunction('api/kindergarten/childrenRoster', {
                method: 'POST',
                data: {
                    child_name: child_name.trim(),
                    parent_name: parent_name.trim(),
                    phone_number: phone_number.trim(),
                    group_id: parseInt(group_id)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Дитину успішно додано',
            });

            closeModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/childrenRoster/filter', {
                method: 'post',
                data: stateChildren.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати дитину',
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
            childId: record.id,
            formData: {
                child_name: record.child_name,
                parent_name: record.parent_name,
                phone_number: record.phone_number,
                group_id: record.group_id
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

    const handleUpdateChild = async () => {
        const { child_name, parent_name, phone_number, group_id } = editModalState.formData;
        
        // Валідація
        if (!child_name.trim() || !parent_name.trim() || !phone_number.trim() || !group_id) {
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
            await fetchFunction(`api/kindergarten/childrenRoster/${editModalState.childId}`, {
                method: 'PUT',
                data: {
                    child_name: child_name.trim(),
                    parent_name: parent_name.trim(),
                    phone_number: phone_number.trim(),
                    group_id: parseInt(group_id)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Дані дитини успішно оновлено',
            });

            closeEditModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/childrenRoster/filter', {
                method: 'post',
                data: stateChildren.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити дані дитини',
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
            childId: record.id,
            childName: record.child_name
        });
        document.body.style.overflow = 'hidden';
    };

    const closeDeleteModal = () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleDeleteChild = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/childrenRoster/${deleteModalState.childId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Дитину успішно видалено',
            });

            closeDeleteModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/childrenRoster/filter', {
                method: 'post',
                data: stateChildren.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити дитину',
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
                                    Додати дитину
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateChildren.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateChildren.selectData).filter(key => stateChildren.selectData[key]).length})`}
                                </Button>

                                {/* Dropdown фільтр */}
                                <FilterDropdown
                                    isOpen={stateChildren.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateChildren.selectData}
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
                                    pageSize={stateChildren.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }
            
            {/* Модальне вікно для додавання дитини */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeModal}
                        onOk={handleSaveChild}
                        confirmLoading={modalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Додати нову дитину"
                    >
                        <div className="modal-form">
                            <div className="form-group">
                                <Input
                                    label="ПІБ дитини"
                                    placeholder="Введіть ПІБ дитини"
                                    name="child_name"
                                    value={modalState.formData.child_name}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Input
                                    label="ПІБ батьків"
                                    placeholder="Введіть ПІБ батьків"
                                    name="parent_name"
                                    value={modalState.formData.parent_name}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Input
                                    label="Контактний номер телефону"
                                    placeholder="Введіть номер телефону"
                                    name="phone_number"
                                    value={modalState.formData.phone_number}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Select
                                    label="Група"
                                    placeholder={groupsData.length > 0 ? "Оберіть групу" : "Завантаження груп..."}
                                    name="group_id"
                                    options={groupsData}
                                    value={modalState.formData.group_id ? 
                                        groupsData.find(group => group.value == modalState.formData.group_id) || null
                                        : null
                                    }
                                    onChange={handleModalInputChange}
                                    style={dropDownStyle}
                                    required
                                    //disabled={groupsData.length === 0}
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для редагування дитини */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeEditModal}
                        onOk={handleUpdateChild}
                        confirmLoading={editModalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Редагувати дані дитини"
                    >
                        <div className="modal-form">
                            <div className="form-group">
                                <Input
                                    label="ПІБ дитини"
                                    placeholder="Введіть ПІБ дитини"
                                    name="child_name"
                                    value={editModalState.formData.child_name}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Input
                                    label="ПІБ батьків"
                                    placeholder="Введіть ПІБ батьків"
                                    name="parent_name"
                                    value={editModalState.formData.parent_name}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Input
                                    label="Контактний номер телефону"
                                    placeholder="Введіть номер телефону"
                                    name="phone_number"
                                    value={editModalState.formData.phone_number}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <Select
                                    label="Група"
                                    placeholder="Оберіть групу"
                                    name="group_id"
                                    options={groupsData}
                                    value={editModalState.formData.group_id ? 
                                        groupsData.find(group => group.value == editModalState.formData.group_id) || null
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
                        onOk={handleDeleteChild}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Так, видалити"
                        title="Підтвердження видалення"
                    >
                        <p className="paragraph">
                            Ви впевнені, що бажаєте видалити дитину <strong>"{deleteModalState.childName}"</strong>?
                        </p>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    )
}

export default ChildrenRoster;