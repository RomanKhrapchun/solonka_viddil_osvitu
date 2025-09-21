import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import Input from "../../components/common/Input/Input";
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
import ScanActivityFilterContent from "../../components/common/Dropdown/ScanActivityFilterContent";
import "../../components/common/Dropdown/FilterDropdown.css";
import * as XLSX from 'xlsx';

// Icons
const downloadIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)

const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}
const SCAN_ACTIVITY_STATE_KEY = 'scanActivityListState';

const saveScanActivityState = (state) => {
    try {
        sessionStorage.setItem(SCAN_ACTIVITY_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save scan activity state:', error);
    }
};

const loadScanActivityState = () => {
    try {
        const saved = sessionStorage.getItem(SCAN_ACTIVITY_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load scan activity state:', error);
    }
    return null;
};

const ScanActivityList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    
    const [stateScanActivity, setStateScanActivity] = useState(() => {
        const savedState = loadScanActivityState();
        
        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'scan_date',
                    sort_direction: 'desc',
                }
            };
        }
        
        return {
            isFilterOpen: false,
            selectData: {},
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'scan_date',
                sort_direction: 'desc',
            }
        };
    });

    const isFirstAPI = useRef(true);
    
    // API endpoint для scan_activity
    const {error, status, data, retryFetch} = useFetch('api/tourism/scan-activity/list', {
        method: 'post',
        data: stateScanActivity.sendData
    })
    
    const startRecord = ((stateScanActivity.sendData.page || 1) - 1) * stateScanActivity.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateScanActivity.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/tourism/scan-activity/list', {
            method: 'post',
            data: stateScanActivity.sendData,
        });
    }, [stateScanActivity.sendData, retryFetch]);

    useEffect(() => {
        saveScanActivityState(stateScanActivity);
    }, [stateScanActivity]);

    // Функція для обробки сортування
    const handleSort = useCallback((dataIndex) => {
        setStateScanActivity(prevState => {
            let newDirection = 'desc';
            
            if (prevState.sendData.sort_by === dataIndex) {
                newDirection = prevState.sendData.sort_direction === 'desc' ? 'asc' : 'desc';
            }
            
            return {
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    sort_by: dataIndex,
                    sort_direction: newDirection,
                    page: 1,
                }
            };
        });
    }, []);

    // Функція для отримання іконки сортування
    const getSortIcon = useCallback((dataIndex) => {
        if (stateScanActivity.sendData.sort_by !== dataIndex) {
            return null;
        }
        try {
            return stateScanActivity.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
        } catch (error) {
            console.error('Помилка при створенні іконки сортування:', error);
            return null;
        }
    }, [stateScanActivity.sendData.sort_by, stateScanActivity.sendData.sort_direction]);

    // Функція для форматування дати та часу
    const formatDateTime = (datetime) => {
        if (!datetime) return '-';
        const date = new Date(datetime);
        return new Intl.DateTimeFormat('uk-UA', { 
            year: "numeric", 
            month: "2-digit", 
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(date);
    };

    // Функція для отримання стилю для counter
    const getCounterStyle = (counter) => {
        if (counter < 3) {
            return {
                backgroundColor: '#d4edda',
                color: '#155724',
                border: '1px solid #c3e6cb'
            };
        } else if (counter < 8) {
            return {
                backgroundColor: '#fff3cd',
                color: '#856404', 
                border: '1px solid #ffeaa7'
            };
        } else {
            return {
                backgroundColor: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb'
            };
        }
    };

    const columnTable = useMemo(() => {
        const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
            title,
            dataIndex,
            sortable: true,
            onHeaderClick: () => handleSort(dataIndex),
            sortIcon: getSortIcon(dataIndex),
            headerClassName: stateScanActivity.sendData.sort_by === dataIndex ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        });

        return [
            createSortableColumn('Хто просканував', 'scan_location', (value) => (
                <span style={{
                    fontWeight: '600',
                    color: '#2c3e50'
                }}>
                    {value || 'Не вказано'}
                </span>
            ), '150px'),
            
            createSortableColumn('ID квитанції', 'identifier', (value) => (
                <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color: '#495057',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px'
                }}>
                    {value}
                </span>
            ), '200px'),
            
            createSortableColumn('П.І.Б.', 'name', null, '200px'),
            
            createSortableColumn('Загальна к-сть сканувань', 'counter', (value) => (
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ...getCounterStyle(value)
                }}>
                    {value}
                </span>
            ), '180px'),

            createSortableColumn('R-сть сканувань на момент перевірки', 'counter_at_scan_time', (value) => (
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ...getCounterStyle(value)
                }}>
                    {value}
                </span>
            ), '180px'),
            
            createSortableColumn('Дата сканування', 'scan_date', (value) => (
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#495057'
                }}>
                    {formatDateTime(value)}
                </span>
            ), '180px')
        ];
    }, [handleSort, getSortIcon, stateScanActivity.sendData.sort_by]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((item, index) => ({
                key: `${item.receipt_id}_${item.scan_date}_${index}`,
                scan_location: item.scan_location,
                identifier: item.identifier,
                name: item.name,
                counter: item.counter,
                counter_at_scan_time: item.counter_at_scan_time,
                scan_date: item.scan_date
            }));
        }
        return [];
    }, [data]);

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateScanActivity.sendData.limit !== 16) {
                    setStateScanActivity(prevState => ({
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
                if (stateScanActivity.sendData.limit !== 32) {
                    setStateScanActivity(prevState => ({
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
                if (stateScanActivity.sendData.limit !== 48) {
                    setStateScanActivity(prevState => ({
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
        setStateScanActivity(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    };

    const closeFilterDropdown = () => {
        setStateScanActivity(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    };

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateScanActivity.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateScanActivity.selectData]);

    const onHandleChange = (name, value) => {
        setStateScanActivity(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    };

    const resetFilters = () => {
        setStateScanActivity(prevState => ({
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
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateScanActivity.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        });
        
        if (isAnyInputFilled) {
            const filterParams = stateScanActivity.selectData;
            
            setStateScanActivity(prevState => ({
                ...prevState,
                sendData: {
                    ...filterParams,
                    limit: prevState.sendData.limit,
                    page: 1,
                    sort_by: prevState.sendData.sort_by,
                    sort_direction: prevState.sendData.sort_direction,
                },
                isFilterOpen: false
            }))
        } else {
            setStateScanActivity(prevState => ({
                ...prevState,
                sendData: {
                    limit: prevState.sendData.limit,
                    page: 1,
                    sort_by: prevState.sendData.sort_by,
                    sort_direction: prevState.sendData.sort_direction,
                },
                isFilterOpen: false
            }))
        }
    };

    const onPageChange = useCallback((page) => {
        if (stateScanActivity.sendData.page !== page) {
            setStateScanActivity(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateScanActivity.sendData.page]);

    const exportToExcel = async () => {
        try {
            const exportParams = {
                ...stateScanActivity.sendData,
                page: 1,
                limit: 10000,
                ...Object.fromEntries(
                    Object.entries(stateScanActivity.selectData).filter(([_, value]) => {
                        if (Array.isArray(value)) return value.length > 0;
                        return value !== null && value !== undefined && value !== '' && value !== false;
                    })
                )
            };

            const response = await fetch("/api/tourism/scan-activity/export", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(exportParams)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const apiData = await response.json();

            if (!apiData.items || !Array.isArray(apiData.items)) {
                throw new Error("Неправильна структура даних");
            }

            const excelData = [];
            const headers = ['Місце сканування', 'ID квитанції', 'П.І.Б.', 'К-сть сканувань', 'Дата сканування'];
            excelData.push(headers);

            apiData.items.forEach(activity => {
                excelData.push([
                    activity.scan_location || '',
                    activity.identifier || '',
                    activity.name || '',
                    activity.counter || 0,
                    activity.scan_date || ''
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            
            const colWidths = [
                { wch: 20 }, // Місце сканування
                { wch: 25 }, // ID квитанції
                { wch: 30 }, // П.І.Б
                { wch: 18 }, // К-сть сканувань
                { wch: 22 }  // Дата сканування
            ];

            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Логи сканування");

            const currentDate = new Date().toISOString().split('T')[0];
            const filterInfo = Object.keys(stateScanActivity.selectData).filter(key => stateScanActivity.selectData[key]).length > 0 
                ? '_filtered' 
                : '';
            
            const fileName = `логи_сканування_${currentDate}${filterInfo}.xlsx`;

            XLSX.writeFile(workbook, fileName);

            notification({
                type: "success",
                placement: "top",
                title: "Успіх",
                message: `Логи сканування успішно експортовано (${apiData.items.length} записів)`
            });

        } catch (error) {
            notification({
                type: "error",
                placement: "top",
                title: "Помилка",
                message: "Не вдалося експортувати логи сканування"
            });
            console.error("Export error:", error);
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
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateScanActivity.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateScanActivity.selectData).filter(key => stateScanActivity.selectData[key]).length})`}
                                </Button>
                                <Button
                                    onClick={exportToExcel}
                                    icon={downloadIcon}>
                                    Завантажити
                                </Button>
                                
                                <FilterDropdown
                                isOpen={stateScanActivity.isFilterOpen}
                                onClose={closeFilterDropdown}
                                filterData={stateScanActivity.selectData}
                                onFilterChange={onHandleChange}
                                onApplyFilter={applyFilter}
                                onResetFilters={resetFilters}
                                searchIcon={searchIcon}
                                title="Фільтри логів сканування"
                            >
                                <ScanActivityFilterContent
                                    filterData={stateScanActivity.selectData}
                                    onFilterChange={onHandleChange}
                                    searchIcon={searchIcon}
                                />
                            </FilterDropdown>
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 0 ? '950px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateScanActivity.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }
        </React.Fragment>
    )
};

export default ScanActivityList;