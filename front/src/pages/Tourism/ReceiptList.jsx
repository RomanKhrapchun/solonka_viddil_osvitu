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
import ReceiptFilterContent from "../../components/common/Dropdown/ReceiptFilterContent";
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
const RECEIPT_LIST_STATE_KEY = 'receiptListState';

const saveReceiptListState = (state) => {
    try {
        sessionStorage.setItem(RECEIPT_LIST_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save receipt list state:', error);
    }
};

const loadReceiptListState = () => {
    try {
        const saved = sessionStorage.getItem(RECEIPT_LIST_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load receipt list state:', error);
    }
    return null;
};

const ReceiptList = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    
    const [stateReceipt, setStateReceipt] = useState(() => {
        const savedState = loadReceiptListState();
        
        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'counter',
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
                sort_by: 'counter',
                sort_direction: 'desc',
            }
        };
    });

    const isFirstAPI = useRef(true);
    
    // Використовуємо новий API endpoint для квитанцій
    const {error, status, data, retryFetch} = useFetch('api/tourism/receipts/list', {
        method: 'post',
        data: stateReceipt.sendData
    })
    
    const startRecord = ((stateReceipt.sendData.page || 1) - 1) * stateReceipt.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateReceipt.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/tourism/receipts/list', {
            method: 'post',
            data: stateReceipt.sendData,
        });
    }, [stateReceipt.sendData, retryFetch]);

    useEffect(() => {
        saveReceiptListState(stateReceipt);
    }, [stateReceipt]);

    // Функція для отримання стилю статусу на основі counter
    const getStatusStyle = (counter) => {
        if (counter < 5) {
            return {
                backgroundColor: '#d4edda',
                color: '#155724',
                border: '1px solid #c3e6cb'
            };
        } else {
            return {
                backgroundColor: '#fff3cd',
                color: '#856404', 
                border: '1px solid #ffeaa7'
            };
        }
    };

    const getStatusText = (counter) => {
        if (counter === 0) return 'Не сканувалось';
        if (counter < 5) return `${counter} сканувань`;
        return `${counter} сканувань (багато)`;
    };

    // Функція для обробки сортування
    const handleSort = useCallback((dataIndex) => {
        setStateReceipt(prevState => {
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
        if (stateReceipt.sendData.sort_by !== dataIndex) {
            return null;
        }
        try {
            return stateReceipt.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
        } catch (error) {
            console.error('Помилка при створенні іконки сортування:', error);
            return null;
        }
    }, [stateReceipt.sendData.sort_by, stateReceipt.sendData.sort_direction]);

    // Функція для форматування суми
    const formatCurrency = (amount) => {
        if (!amount) return '0.00 ₴';
        return `${parseFloat(amount).toFixed(2)} ₴`;
    };

    const columnTable = useMemo(() => {
        const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
            title,
            dataIndex,
            sortable: true,
            onHeaderClick: () => handleSort(dataIndex),
            sortIcon: getSortIcon(dataIndex),
            headerClassName: stateReceipt.sendData.sort_by === dataIndex ? 'active' : '',
            ...(width && { width }),
            ...(render && { render })
        });

        return [
            createSortableColumn('ID', 'identifier', (value) => (
                <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: '#2c3e50'
                }}>
                    {value}
                </span>
            ), '80px'),
            
            createSortableColumn('П.І.Б.', 'name', null, '200px'),
            
            createSortableColumn('Стать', 'gender', (value) => {
                const genderMap = {
                    'male': '👨 Ч',
                    'female': '👩 Ж'
                };
                return genderMap[value] || '-';
            }, '80px'),
            
            createSortableColumn('Громадянство', 'citizenship', null, '120px'),
            
            createSortableColumn('Прибуття', 'arrival_date', (value) => {
                if (!value) return '-';
                const date = new Date(value);
                return new Intl.DateTimeFormat('uk-UA', { 
                    month: "2-digit", 
                    day: "2-digit" 
                }).format(date);
            }, '90px'),
            
            createSortableColumn('Відʼїзд', 'departure_date', (value) => {
                if (!value) return '-';
                const date = new Date(value);
                return new Intl.DateTimeFormat('uk-UA', { 
                    month: "2-digit", 
                    day: "2-digit" 
                }).format(date);
            }, '90px'),
            
            createSortableColumn('Сума', 'amount', (value) => (
                <span style={{
                    fontWeight: 'bold',
                    color: value > 0 ? '#2c3e50' : '#6c757d'
                }}>
                    {formatCurrency(value)}
                </span>
            ), '100px'),
            
            createSortableColumn('Дата', 'date', (value) => {
                const date = new Date(value);
                return new Intl.DateTimeFormat('uk-UA', { 
                    year: "numeric", 
                    month: "2-digit", 
                    day: "2-digit" 
                }).format(date);
            }, '100px'),
            
            createSortableColumn('Сканувань', 'counter', (value, record) => (
                <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ...getStatusStyle(value)
                }}>
                    {getStatusText(value)}
                </span>
            ), '120px')
        ];
    }, [handleSort, getSortIcon, stateReceipt.sendData.sort_by]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map(item => ({
                key: item.id,
                id: item.id,
                identifier: item.identifier,
                name: item.name,
                gender: item.gender,
                citizenship: item.citizenship,
                arrival_date: item.arrival_date,
                departure_date: item.departure_date,
                amount: item.amount,
                date: item.date,
                counter: item.counter,
                created_at: item.created_at,
                updated_at: item.updated_at
            }));
        }
        return [];
    }, [data]);

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateReceipt.sendData.limit !== 16) {
                    setStateReceipt(prevState => ({
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
                if (stateReceipt.sendData.limit !== 32) {
                    setStateReceipt(prevState => ({
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
                if (stateReceipt.sendData.limit !== 48) {
                    setStateReceipt(prevState => ({
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
        setStateReceipt(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    };

    const closeFilterDropdown = () => {
        setStateReceipt(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    };

    // Перевіряємо чи є активні фільтри
    const hasActiveFilters = useMemo(() => {
        return Object.values(stateReceipt.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateReceipt.selectData]);

    const onHandleChange = (name, value) => {
        setStateReceipt(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    };

    const resetFilters = () => {
        setStateReceipt(prevState => ({
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
        const isAnyInputFilled = Object.values(stateReceipt.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        });
        
        if (isAnyInputFilled) {
            const filterParams = stateReceipt.selectData;
            
            setStateReceipt(prevState => ({
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
            setStateReceipt(prevState => ({
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
        if (stateReceipt.sendData.page !== page) {
            setStateReceipt(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateReceipt.sendData.page]);

    const exportToExcel = async () => {
        try {
            const exportParams = {
                ...stateReceipt.sendData,
                page: 1,
                limit: 10000,
                ...Object.fromEntries(
                    Object.entries(stateReceipt.selectData).filter(([_, value]) => {
                        if (Array.isArray(value)) return value.length > 0;
                        return value !== null && value !== undefined && value !== '' && value !== false;
                    })
                )
            };

            const response = await fetch("/api/tourism/receipts/export", {
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
            const headers = ['ID квитанції', 'П.І.Б.', 'Стать', 'Громадянство', 'Прибуття', 'Відʼїзд', 'Сума (₴)', 'Дата квитанції', 'Кількість сканувань', 'Дата створення', 'Дата оновлення'];
            excelData.push(headers);

            apiData.items.forEach(receipt => {
                const genderMap = { 'male': 'Чоловіча', 'female': 'Жіноча' };
                excelData.push([
                    receipt.identifier || '',
                    receipt.name || '',
                    genderMap[receipt.gender] || '',
                    receipt.citizenship || '',
                    receipt.arrival_date || '',
                    receipt.departure_date || '',
                    receipt.amount || 0,
                    receipt.date || '',
                    receipt.counter || 0,
                    receipt.created_at || '',
                    receipt.updated_at || ''
                ]);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            
            const colWidths = [
                { wch: 15 }, // ID
                { wch: 30 }, // П.І.Б
                { wch: 12 }, // Стать
                { wch: 15 }, // Громадянство
                { wch: 12 }, // Прибуття
                { wch: 12 }, // Відʼїзд
                { wch: 12 }, // Сума
                { wch: 15 }, // Дата квитанції
                { wch: 18 }, // Кількість сканувань
                { wch: 20 }, // Дата створення
                { wch: 20 }  // Дата оновлення
            ];

            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Квитанції");

            const currentDate = new Date().toISOString().split('T')[0];
            const filterInfo = Object.keys(stateReceipt.selectData).filter(key => stateReceipt.selectData[key]).length > 0 
                ? '_filtered' 
                : '';
            
            const fileName = `квитанції_${currentDate}${filterInfo}.xlsx`;

            XLSX.writeFile(workbook, fileName);

            notification({
                type: "success",
                placement: "top",
                title: "Успіх",
                message: `Список квитанцій успішно експортовано (${apiData.items.length} записів)`
            });

        } catch (error) {
            notification({
                type: "error",
                placement: "top",
                title: "Помилка",
                message: "Не вдалося експортувати список квитанцій"
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
                                    caption={`Записів: ${stateReceipt.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateReceipt.selectData).filter(key => stateReceipt.selectData[key]).length})`}
                                </Button>
                                <Button
                                    onClick={exportToExcel}
                                    icon={downloadIcon}>
                                    Завантажити
                                </Button>
                                
                                <FilterDropdown
                                    isOpen={stateReceipt.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateReceipt.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title="Фільтри квитанцій"
                                >
                                    <ReceiptFilterContent
                                        filterData={stateReceipt.selectData}
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
                                    minWidth: data?.items?.length > 0 ? '1100px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateReceipt.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }
        </React.Fragment>
    )
};

export default ReceiptList;