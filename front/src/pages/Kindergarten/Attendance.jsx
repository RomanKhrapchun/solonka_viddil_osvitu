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
const checkIcon = generateIcon(iconMap.check, null, 'currentColor', 16, 16)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Константи для збереження стану
const ATTENDANCE_STATE_KEY = 'attendanceState';

const saveAttendanceState = (state) => {
    try {
        sessionStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save attendance state:', error);
    }
};

const loadAttendanceState = () => {
    try {
        const saved = sessionStorage.getItem(ATTENDANCE_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load attendance state:', error);
    }
    return null;
};

const clearAttendanceState = () => {
    try {
        sessionStorage.removeItem(ATTENDANCE_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear attendance state:', error);
    }
};

const Attendance = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    
    const [stateAttendance, setStateAttendance] = useState(() => {
        const savedState = loadAttendanceState();
        
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
        
        // Початковий стан за замовчуванням
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

    // стан для модального вікна завантаження групи
    const [loadGroupModalState, setLoadGroupModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            date: new Date().toISOString().split('T')[0],
            group_id: ''
        }
    });

    // стан для груп (для селекту)
    const [groupsData, setGroupsData] = useState([]);

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/attendance/filter', {
        method: 'post',
        data: stateAttendance.sendData
    })
    
    const startRecord = ((stateAttendance.sendData.page || 1) - 1) * stateAttendance.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateAttendance.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/attendance/filter', {
            method: 'post',
            data: stateAttendance.sendData
        });
    }, [stateAttendance.sendData, retryFetch]);

    // Завантажуємо список груп для селекту
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const response = await fetchFunction('api/kindergarten/groups/filter', {
                    method: 'POST',
                    data: { limit: 1000 } // Завантажуємо всі групи
                });
                
                if (response?.items) {
                    const formattedGroups = response.items.map(group => ({
                        value: group.id,
                        label: `${group.group_name} (${group.kindergarten_name})`
                    }));
                    setGroupsData(formattedGroups);
                }
            } catch (error) {
                console.error('Error fetching groups:', error);
            }
        };

        fetchGroups();
    }, []);

    // Збереження стану при зміні
    useEffect(() => {
        saveAttendanceState(stateAttendance);
    }, [stateAttendance]);

    // Очищення стану при виході зі сторінки
    useEffect(() => {
        return () => {
            clearAttendanceState();
        };
    }, []);

    const getSortIcon = useCallback((columnName) => {
        if (stateAttendance.sendData.sort_by === columnName) {
            return stateAttendance.sendData.sort_direction === 'asc' ? sortUpIcon : sortDownIcon;
        }
        return null;
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction]);

    const handleSort = useCallback((columnName) => {
        const currentSort = stateAttendance.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateAttendance(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateAttendance.sendData]);

    // Функція для переключення присутності
    const toggleAttendance = async (record) => {
        const newStatus = record.attendance_status === 'present' ? 'absent' : 'present';
        
        try {
            if (record.id) {
                // Оновлюємо існуючий запис
                await fetchFunction(`api/kindergarten/attendance/${record.id}`, {
                    method: 'PUT',
                    data: {
                        attendance_status: newStatus
                    }
                });
            } else {
                // Створюємо новий запис
                await fetchFunction('api/kindergarten/attendance', {
                    method: 'POST',
                    data: {
                        date: record.date,
                        child_id: record.child_id,
                        attendance_status: newStatus
                    }
                });
            }

            // Оновлюємо список
            retryFetch('api/kindergarten/attendance/filter', {
                method: 'post',
                data: stateAttendance.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити відвідуваність',
            });
        }
    };

    const columns = useMemo(() => {
        const columns = [
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'date' ? 'active' : ''}`}
                        onClick={() => handleSort('date')}
                    >
                        <span>Дата</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('date')}
                        </div>
                    </div>
                ),
                dataIndex: 'date',
                key: 'date',
                sorter: false,
                render: (date) => new Date(date).toLocaleDateString('uk-UA')
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'child_name' ? 'active' : ''}`}
                        onClick={() => handleSort('child_name')}
                    >
                        <span>ПІБ дитини</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('child_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'child_name',
                key: 'child_name',
                sorter: false,
            },
            {
                title: 'Присутність',
                dataIndex: 'attendance_status',
                key: 'attendance_status',
                render: (status) => (
                    <div style={{ textAlign: 'center' }}>
                        {status === 'present' ? (
                            <span style={{ 
                                color: '#52c41a', 
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}>
                                ✓
                            </span>
                        ) : (
                            <span style={{ 
                                color: '#f5222d', 
                                fontSize: '20px',
                                fontWeight: 'bold'
                            }}>
                                ✗
                            </span>
                        )}
                    </div>
                )
            },
            {
                title: 'Дії',
                key: 'actions',
                render: (_, record) => (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Button
                            title={record.attendance_status === 'present' ? 'Відмітити відсутним' : 'Відвідав(ла)'}
                            icon={checkIcon}
                            size="small"
                            className={record.attendance_status === 'present' ? 'btn--secondary' : 'btn--primary'}
                            onClick={() => toggleAttendance(record)}
                        />
                    </div>
                ),
            }
        ];
        return columns;
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: `${el.date}-${el.child_id}`,
                id: el.id, // може бути null для нових записів
                date: el.date,
                child_id: el.child_id,
                child_name: el.child_name,
                group_name: el.group_name,
                attendance_status: el.attendance_status || 'absent', // за замовчуванням відсутній
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateAttendance.sendData.limit !== 16) {
                    setStateAttendance(prevState => ({
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
                if (stateAttendance.sendData.limit !== 32) {
                    setStateAttendance(prevState => ({
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
                if (stateAttendance.sendData.limit !== 48) {
                    setStateAttendance(prevState => ({
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

    const filterHandleClick = () => {
        setStateAttendance(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateAttendance.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateAttendance.selectData])

    const onHandleChange = (name, value) => {
        setStateAttendance(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateAttendance.selectData).some(Boolean)) {
            setStateAttendance((prev) => ({ ...prev, selectData: {} }));
        }
        if (!hasOnlyAllowedParams(stateAttendance.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])) {
            setStateAttendance((prev) => ({
                ...prev,
                sendData: { 
                    limit: prev.sendData.limit, 
                    page: 1,
                    sort_by: 'date',
                    sort_direction: 'desc'
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateAttendance.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateAttendance.selectData);
        if (!validation.error) {
            setStateAttendance((prev) => ({
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
        if (stateAttendance.sendData.page !== page) {
            setStateAttendance(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateAttendance.sendData.page])

    // Функції для модального вікна завантаження групи
    const openLoadGroupModal = () => {
        setLoadGroupModalState(prev => ({ 
            ...prev, 
            isOpen: true,
            formData: {
                date: new Date().toISOString().split('T')[0],
                group_id: ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeLoadGroupModal = () => {
        setLoadGroupModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleLoadGroupInputChange = (field, value) => {
        setLoadGroupModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value && typeof value === 'object' && value.value 
                    ? value.value 
                    : value
            }
        }));
    };

    const handleLoadGroup = async () => {
        const { date, group_id } = loadGroupModalState.formData;
        
        // Валідація
        if (!date || !group_id) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, оберіть дату та групу',
            });
            return;
        }

        setLoadGroupModalState(prev => ({ ...prev, loading: true }));

        try {
            // Перевіряємо чи не існують уже записи для цієї групи на цю дату
            const existingRecords = await fetchFunction('api/kindergarten/attendance/check-group-date', {
                method: 'POST',
                data: {
                    date: date,
                    group_id: parseInt(group_id)
                }
            });

            if (existingRecords.exists) {
                notification({
                    type: 'warning',
                    placement: 'top',
                    title: 'Дані вже існують',
                    message: 'Для цієї групи на вказану дату записи вже існують',
                });
                setLoadGroupModalState(prev => ({ ...prev, loading: false }));
                return;
            }

            // Завантажуємо дітей групи та створюємо записи відвідуваності
            await fetchFunction('api/kindergarten/attendance/load-group', {
                method: 'POST',
                data: {
                    date: date,
                    group_id: parseInt(group_id)
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Група успішно завантажена',
            });

            closeLoadGroupModal();
            
            // Оновлюємо список
            retryFetch('api/kindergarten/attendance/filter', {
                method: 'post',
                data: stateAttendance.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося завантажити групу',
            });
        } finally {
            setLoadGroupModalState(prev => ({ ...prev, loading: false }));
        }
    };

    if (status === STATUS.ERROR) {
        return <PageError />
    }

    if (status === STATUS.LOADING) {
        return <SkeletonPage />
    }

    return (
        <>
            <div className="page-title">
                <h1>Відвідуваність дитячого садочка</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                        title="Завантажити групу" 
                        icon={addIcon} 
                        onClick={openLoadGroupModal}
                    />
                    <Button 
                        title="Фільтр" 
                        icon={filterIcon} 
                        className={hasActiveFilters ? "btn--primary" : "btn--secondary"}
                        onClick={filterHandleClick}
                    />
                </div>
            </div>

            {/* Фільтри */}
            <Transition in={stateAttendance.isFilterOpen} timeout={300} nodeRef={nodeRef}>
                {state => (
                    <div
                        ref={nodeRef}
                        className={`filter-dropdown ${state === 'entered' ? 'open' : ''}`}
                        style={{
                            maxHeight: state === 'entered' ? '500px' : '0px',
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease-in-out',
                        }}
                    >
                        <FilterDropdown
                            selectData={stateAttendance.selectData}
                            onHandleChange={onHandleChange}
                            resetFilters={resetFilters}
                            applyFilter={applyFilter}
                        >
                            <Input
                                title="ПІБ дитини"
                                icon={searchIcon}
                                name="child_name"
                                value={stateAttendance.selectData.child_name || ''}
                                onChange={(e) => onHandleChange('child_name', e.target.value)}
                            />
                            <Input
                                title="Група"
                                icon={searchIcon}
                                name="group_name"
                                value={stateAttendance.selectData.group_name || ''}
                                onChange={(e) => onHandleChange('group_name', e.target.value)}
                            />
                            <Input
                                title="Дата від"
                                type="date"
                                name="date_from"
                                value={stateAttendance.selectData.date_from || ''}
                                onChange={(e) => onHandleChange('date_from', e.target.value)}
                            />
                            <Input
                                title="Дата до"
                                type="date"
                                name="date_to"
                                value={stateAttendance.selectData.date_to || ''}
                                onChange={(e) => onHandleChange('date_to', e.target.value)}
                            />
                        </FilterDropdown>
                    </div>
                )}
            </Transition>

            <div className="table-controls">
                <div className="table-info">
                    <span>
                        Показано {startRecord} - {endRecord} з {data?.totalItems || 0} записів
                    </span>
                </div>
                <div className="table-controls-right">
                    <Dropdown menu={itemMenu} trigger="click">
                        <Button 
                            icon={dropDownIcon} 
                            style={dropDownStyle}
                            className="btn--secondary"
                        >
                            {stateAttendance.sendData.limit}
                        </Button>
                    </Dropdown>
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={tableData}
                pagination={false}
                scroll={{ x: 600 }}
            />

            <Pagination
                current={stateAttendance.sendData.page}
                total={data?.totalItems || 0}
                pageSize={stateAttendance.sendData.limit}
                onChange={onPageChange}
                showSizeChanger={false}
            />

            {/* Модальне вікно завантаження групи */}
            <Transition in={loadGroupModalState.isOpen} timeout={300} nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        isOpen={state === 'entered'}
                        onClose={closeLoadGroupModal}
                        title="Завантажити групу"
                        footer={
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <Button 
                                    title="Скасувати" 
                                    className="btn--secondary" 
                                    onClick={closeLoadGroupModal}
                                    disabled={loadGroupModalState.loading}
                                />
                                <Button 
                                    title="Зберегти" 
                                    onClick={handleLoadGroup}
                                    loading={loadGroupModalState.loading}
                                />
                            </div>
                        }
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Input
                                title="Дата *"
                                type="date"
                                value={loadGroupModalState.formData.date}
                                onChange={(e) => handleLoadGroupInputChange('date', e.target.value)}
                                required
                            />
                            <Select
                                title="Група *"
                                options={[
                                    { value: '', label: 'Оберіть групу' },
                                    ...groupsData
                                ]}
                                value={loadGroupModalState.formData.group_id}
                                onChange={(value) => handleLoadGroupInputChange('group_id', value)}
                                required
                            />
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Attendance;