import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import { useDebtorListState } from "../../hooks/useDebtorListState"; 
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "../../components/common/Dropdown/FilterDropdown.css";
import * as XLSX from 'xlsx';


const phoneIcon = generateIcon(iconMap.phone, null, 'currentColor', 20, 20)
const downloadIcon = generateIcon(iconMap.download, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}
const DEBTOR_LIST_STATE_KEY = 'debtorListState';

// Функція для форматування дати
const formatDateTime = (dateString) => {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Якщо дата невалідна, повертаємо оригінальний рядок
        
        // Форматуємо дату в форматі YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.warn('Error formatting date:', error);
        return dateString;
    }
};

const DebtorList = () => {
        const navigate = useNavigate()
        const notification = useNotification()
        const {store} = useContext(Context)
        const nodeRef = useRef(null)
            
        const {
            stateDebtor,
            setStateDebtor,
            navigateToDebtor,
            updateFilters,
            updateSendData,
            resetFilters: resetFiltersHook
        } = useDebtorListState();
    
        const isFirstAPI = useRef(true);
        const {error, status, data, retryFetch} = useFetch('api/debtor/filter', {
            method: 'post',
            data: stateDebtor.sendData
        })
        const startRecord = ((stateDebtor.sendData.page || 1) - 1) * stateDebtor.sendData.limit + 1;
        const endRecord = Math.min(startRecord + stateDebtor.sendData.limit - 1, data?.totalItems || 1);
        
        const handleNavigateToDebtor = useCallback((debtorId) => {
            navigateToDebtor(debtorId, navigate);
        }, [navigateToDebtor, navigate]);

        useEffect(() => {
            if (isFirstAPI.current) {
                isFirstAPI.current = false;
                return;
            }
            
            retryFetch('api/debtor/filter', {
                method: 'post',
                data: stateDebtor.sendData,
            });
        }, [stateDebtor.sendData, retryFetch]);

        const getPhoneButtonStyle = (phoneStatus) => {
            switch (phoneStatus) {
                case 'has_phone':
                    return {
                        backgroundColor: '#27ae60',
                        borderColor: '#27ae60',
                        color: 'white'
                    };
                case 'no_phone':
                    return {
                        backgroundColor: '#e74c3c',
                        borderColor: '#e74c3c', 
                        color: 'white'
                    };
             }
        };
        
        const getPhoneButtonTitle = (record) => {
            switch (record.phone_status) {
                case 'has_phone':
                    return 'Телефон підтверджено';
                case 'no_phone':
                    return 'Телефону немає';
                case 'not_checked':
                default:
                    return 'Телефон не перевірявся';
            }
        };

        const handleSort = useCallback((dataIndex) => {
            setStateDebtor(prevState => {
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

        const getSortIcon = useCallback((dataIndex) => {
            if (stateDebtor.sendData.sort_by !== dataIndex) {
                return null;
            }
            try {
                return stateDebtor.sendData.sort_direction === 'desc' ? sortDownIcon : sortUpIcon;
            } catch (error) {
                console.error('Помилка при створенні іконки сортування:', error);
                return null;
            }
        }, [stateDebtor.sendData.sort_by, stateDebtor.sendData.sort_direction]);

        const columnTable = useMemo(() => {
            const createSortableColumn = (title, dataIndex, render = null, width = null) => ({
                title,
                dataIndex,
                sortable: true,
                onHeaderClick: () => handleSort(dataIndex),
                sortIcon: getSortIcon(dataIndex),
                headerClassName: stateDebtor.sendData.sort_by === dataIndex ? 'active' : '',
                ...(width && { width }),
                ...(render && { render })
            });
        
            const hasDebt = (record) => {
                return ['mpz', 'orenda_debt', 'land_debt', 'residential_debt', 'non_residential_debt']
                    .some(field => Number(record[field]) > 0);
            };

            const selectedTaxType = stateDebtor.selectData?.tax_type;

            let columns = [
                createSortableColumn('ІПН', 'identification', null, '65px'),
                createSortableColumn('П.І.Б', 'name', null, '130px'),
                createSortableColumn('Дата', 'date', null, '80px'),
            ];
            
            if (!selectedTaxType || selectedTaxType === '') {
                columns.push(
                    createSortableColumn('Нежитл', 'non_residential_debt', null, '70px'),
                    createSortableColumn('Житл', 'residential_debt', null, '65px'),
                    createSortableColumn('Земля', 'land_debt', null, '65px'),
                    createSortableColumn('Оренда', 'orenda_debt', null, '70px'),
                    createSortableColumn('МПЗ', 'mpz', null, '60px')
                );
            } else {
                const taxTypeMapping = {
                    'non_residential_debt': { title: 'Нежитлова', width: '100px' },
                    'residential_debt': { title: 'Житлова', width: '100px' },
                    'land_debt': { title: 'Земельна', width: '100px' },
                    'orenda_debt': { title: 'Орендна', width: '100px' },
                    'mpz': { title: 'МПЗ', width: '100px' }
                };
                
                if (taxTypeMapping[selectedTaxType]) {
                    columns.push(
                        createSortableColumn(
                            taxTypeMapping[selectedTaxType].title, 
                            selectedTaxType, 
                            null, 
                            taxTypeMapping[selectedTaxType].width
                        )
                    );
                }
            }
            columns.push(
                createSortableColumn('Всього', 'total_debt', (value) => {
                    const numValue = Number(value) || 0;
                    return (
                        <span style={{
                            fontWeight: 'bold', 
                            color: numValue > 0 ? '#e74c3c' : '#27ae60',
                            fontSize: '13px'
                        }}>
                            {numValue.toFixed(2)}
                        </span>
                    );
                }, '80px'),
                
                createSortableColumn('Дата формування квитанції', 'receipt_date', (value) => {
                    return formatDateTime(value);
                }, '150px'),
                {
                    title: 'Дія',
                    dataIndex: 'action',
                    headerClassName: 'non-sortable',
                    width: '95px',
                    render: (_, record) => (
                        <div className="btn-sticky" style={{
                            justifyContent: 'center', 
                            gap: '1px', 
                            flexWrap: 'wrap'
                        }}>
                            <Button
                                title={getPhoneButtonTitle(record)}
                                icon={phoneIcon}
                                size="small"
                                style={getPhoneButtonStyle(record.phone_status)}
                                onClick={() => handleNavigateToDebtor(record.id)}
                            />
                            {hasDebt(record) && (
                                <>
                                    <Button
                                        title="Завантажити"
                                        icon={downloadIcon}
                                        size="small"
                                        onClick={() => handleOpenModal(record.id)}
                                    />
                                    <Button
                                        title="Реквізити"
                                        icon={editIcon}
                                        size="small"
                                        onClick={() => navigate(`/debtor/${record.id}/print`)}
                                    />
                                </>
                            )}
                        </div>
                    ),
                }
            );
        
            return columns;
        }, [navigate, handleSort, getSortIcon, stateDebtor.sendData.sort_by, stateDebtor.selectData?.tax_type,handleNavigateToDebtor]);

        const tableData = useMemo(() => {
            if (data?.items?.length) {
                const result = data?.items?.map(el => {
                    const totalDebt = (Number(el.non_residential_debt) || 0) + 
                                    (Number(el.residential_debt) || 0) + 
                                    (Number(el.land_debt) || 0) + 
                                    (Number(el.orenda_debt) || 0) + 
                                    (Number(el.mpz) || 0);
                    
                    return {
                        key: el.id,
                        id: el.id,
                        name: el.name,
                        date: el.date,
                        non_residential_debt: el.non_residential_debt,
                        residential_debt: el.residential_debt,
                        land_debt: el.land_debt,
                        orenda_debt: el.orenda_debt,
                        mpz: el.mpz,
                        identification: el.identification,
                        total_debt: totalDebt,
                        receipt_date: el.receipt_date || "",
                        // Додаємо нові поля з API
                        phone_status: el.phone_status || 'not_checked',
                        ischecked: el.ischecked || false,
                        hasnumber: el.hasnumber || false
                    }
                });
                return result;
            }
            return []
        }, [data])

        const itemMenu = [
            {
                label: '16',
                key: '16',
                onClick: () => {
                    if (stateDebtor.sendData.limit !== 16) {
                        setStateDebtor(prevState => ({
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
                    if (stateDebtor.sendData.limit !== 32) {
                        setStateDebtor(prevState => ({
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
                    if (stateDebtor.sendData.limit !== 48) {
                        setStateDebtor(prevState => ({
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
            setStateDebtor(prevState => ({
                ...prevState,
                isFilterOpen: !prevState.isFilterOpen,
            }))
        }

        const closeFilterDropdown = () => {
            setStateDebtor(prevState => ({
                ...prevState,
                isFilterOpen: false,
            }))
        }

        // Перевіряємо чи є активні фільтри
        const hasActiveFilters = useMemo(() => {
            return Object.values(stateDebtor.selectData).some(value => {
                if (Array.isArray(value) && !value.length) {
                    return false
                }
                return value !== null && value !== undefined && value !== ''
            })
        }, [stateDebtor.selectData])

        const onHandleChange = (name, value) => {
            setStateDebtor(prevState => ({
                ...prevState,
                selectData: {
                    ...prevState.selectData,
                    [name]: value
                }
            }))
        }

         // ВИКОРИСТОВУЄМО МЕТОД З ХУКА
        const resetFilters = resetFiltersHook;

        // const resetFilters = () => {
        //     // Очищуємо selectData
        //     setStateDebtor(prevState => ({
        //         ...prevState,
        //         selectData: {},
        //         isFilterOpen: false,
        //         sendData: {
        //             // Залишаємо тільки базові параметри для запиту
        //             limit: prevState.sendData.limit,
        //             page: 1,
        //             sort_by: prevState.sendData.sort_by,
        //             sort_direction: prevState.sendData.sort_direction,
        //         }
        //     }));
        // }

        const applyFilter = () => {
            const isAnyInputFilled = Object.values(stateDebtor.selectData).some(value => {
                if (Array.isArray(value) && !value.length) {
                    return false
                }
                return value
            })
            
            if (isAnyInputFilled) {
                const dataValidation = validateFilters(stateDebtor.selectData)
                if (!dataValidation.error) {
                    // Об'єднуємо дані валідації з selectData
                    const filterParams = {
                        ...stateDebtor.selectData,
                        ...dataValidation
                    }
                    
                    setStateDebtor(prevState => ({
                        ...prevState,
                        sendData: {
                            ...filterParams, // Включаємо всі параметри фільтру
                            limit: prevState.sendData.limit,
                            page: 1,
                            sort_by: prevState.sendData.sort_by,
                            sort_direction: prevState.sendData.sort_direction,
                        },
                        isFilterOpen: false
                    }))
                } else {
                    notification({
                        type: 'warning',
                        placement: 'top',
                        title: 'Помилка',
                        message: dataValidation.message ?? 'Щось пішло не так.',
                    })
                }
            } else {
                // Якщо фільтри порожні, очищуємо sendData від фільтрів
                setStateDebtor(prevState => ({
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
        }

        const onPageChange = useCallback((page) => {
            if (stateDebtor.sendData.page !== page) {
                setStateDebtor(prevState => ({
                    ...prevState,
                    sendData: {
                        ...prevState.sendData,
                        page,
                    }
                }))
            }
        }, [stateDebtor.sendData.page])

        const handleOpenModal = (recordId) => {
            setStateDebtor(prevState => ({
                ...prevState,
                itemId: recordId,
            }))
            document.body.style.overflow = 'hidden'
        }

        const handleCloseModal = () => {
            setStateDebtor(prevState => ({
                ...prevState,
                itemId: null,
            }))
            document.body.style.overflow = 'auto';
        }

        const exportToExcel = async () => {
            try {
                // Готуємо параметри для запиту всіх даних
                const exportParams = {
                    ...stateDebtor.sendData,
                    page: 1,
                    limit: 10000, // Отримуємо всі записи
                    // Додаємо активні фільтри
                    ...Object.fromEntries(
                        Object.entries(stateDebtor.selectData).filter(([_, value]) => {
                            // Фільтруємо тільки заповнені значення
                            if (Array.isArray(value)) return value.length > 0;
                            return value !== null && value !== undefined && value !== '' && value !== false;
                        })
                    )
                };
        
                // Отримуємо дані з API
                const response = await fetch("/api/debtor/list", {
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
        
                // Створюємо масив для Excel
                const excelData = [];
        
                // Формуємо заголовки в залежності від активних фільтрів
                const selectedTaxType = stateDebtor.selectData?.tax_type;
                const headers = ['ІПН', 'П.І.Б', 'Дата'];
        
                // Додаємо колонки податків в залежності від фільтру
                if (!selectedTaxType || selectedTaxType === '') {
                    // Якщо тип не вибраний - показуємо всі колонки
                    headers.push('Нежитлова нерухомість (₴)', 'Житлова нерухомість (₴)', 'Земельний податок (₴)', 'Орендна плата (₴)', 'МПЗ (₴)');
                } else {
                    // Якщо вибраний конкретний тип - показуємо тільки його
                    const taxTypeMapping = {
                        'non_residential_debt': 'Нежитлова нерухомість (₴)',
                        'residential_debt': 'Житлова нерухомість (₴)',
                        'land_debt': 'Земельний податок (₴)',
                        'orenda_debt': 'Орендна плата (₴)',
                        'mpz': 'МПЗ (₴)'
                    };
                    
                    if (taxTypeMapping[selectedTaxType]) {
                        headers.push(taxTypeMapping[selectedTaxType]);
                    }
                }
                
                headers.push('Загальна заборгованість (₴)');
        
                // Додаємо заголовки в Excel
                excelData.push(headers);
        
                // Додаємо дані боржників
                apiData.items.forEach(debtor => {
                    const row = [
                        debtor.identification || '',
                        debtor.name || '',
                        debtor.date || ''
                    ];
        
                    // Додаємо податкові дані в залежності від фільтру
                    if (!selectedTaxType || selectedTaxType === '') {
                        // Всі типи податків
                        row.push(
                            parseFloat(debtor.non_residential_debt || 0).toFixed(2),
                            parseFloat(debtor.residential_debt || 0).toFixed(2),
                            parseFloat(debtor.land_debt || 0).toFixed(2),
                            parseFloat(debtor.orenda_debt || 0).toFixed(2),
                            parseFloat(debtor.mpz || 0).toFixed(2)
                        );
                    } else {
                        // Конкретний тип податку
                        if (debtor[selectedTaxType] !== undefined) {
                            row.push(parseFloat(debtor[selectedTaxType] || 0).toFixed(2));
                        }
                    }
        
                    // Додаємо загальну заборгованість
                    row.push(parseFloat(debtor.total_debt || 0).toFixed(2));
        
                    excelData.push(row);
                });
        
                // Створюємо Excel файл
                const worksheet = XLSX.utils.aoa_to_sheet(excelData);
                
                // Налаштовуємо ширину колонок
                const colWidths = [
                    { wch: 15 }, // ІПН
                    { wch: 25 }, // П.І.Б
                    { wch: 12 }, // Дата
                ];
        
                // Додаємо ширину для податкових колонок
                if (!selectedTaxType || selectedTaxType === '') {
                    colWidths.push(
                        { wch: 18 }, // Нежитлова
                        { wch: 18 }, // Житлова
                        { wch: 18 }, // Земельний
                        { wch: 18 }, // Орендна
                        { wch: 12 }  // МПЗ
                    );
                } else {
                    colWidths.push({ wch: 20 }); // Вибраний тип податку
                }
                
                colWidths.push({ wch: 20 }); // Загальна заборгованість
        
                worksheet['!cols'] = colWidths;
        
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Реєстр боржників");
        
                // Формуємо ім'я файлу з датою
                const currentDate = new Date().toISOString().split('T')[0];
                const filterInfo = Object.keys(stateDebtor.selectData).filter(key => stateDebtor.selectData[key]).length > 0 
                    ? '_filtered' 
                    : '';
                
                const fileName = `реєстр_боржників_${currentDate}${filterInfo}.xlsx`;
        
                // Експортуємо файл
                XLSX.writeFile(workbook, fileName);
        
                // Показуємо повідомлення про успіх
                notification({
                    type: "success",
                    placement: "top",
                    title: "Успіх",
                    message: `Реєстр боржників успішно експортовано (${apiData.items.length} записів)`
                });
        
            } catch (error) {
                notification({
                    type: "error",
                    placement: "top",
                    title: "Помилка",
                    message: "Не вдалося експортувати реєстр боржників"
                });
                console.error("Export error:", error);
            }
        };
        
        const handleGenerate = async () => {
            if (stateDebtor.itemId) {
                try {
                    setStateDebtor(prevState => ({
                        ...prevState,
                        confirmLoading: true,
                    }))
                    const fetchData = await fetchFunction(`api/debtor/generate/${stateDebtor.itemId}`, {
                        method: 'get',
                        responseType: 'blob'
                    })
                    notification({
                        placement: "top",
                        duration: 2,
                        title: 'Успіх',
                        message: "Успішно сформовано.",
                        type: 'success'
                    })
                    const blob = fetchData.data
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'generated.docx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();

                } catch (error) {
                    if (error?.response?.status === 401) {
                        notification({
                            type: 'warning',
                            title: "Помилка",
                            message: error?.response?.status === 401 ? "Не авторизований" : error.message,
                            placement: 'top',
                        })
                        store.logOff()
                        return navigate('/')
                    }
                    notification({
                        type: 'warning',
                        title: "Помилка",
                        message: error?.response?.data?.message ? error.response.data.message : error.message,
                        placement: 'top',
                    })
                } finally {
                    setStateDebtor(prevState => ({
                        ...prevState,
                        confirmLoading: false,
                        itemId: null,
                    }))
                    document.body.style.overflow = 'auto';
                }
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
                                        caption={`Записів: ${stateDebtor.sendData.limit}`}
                                        menu={itemMenu}/>
                                    <Button
                                        className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                        onClick={filterHandleClick}
                                        icon={filterIcon}>
                                        Фільтри {hasActiveFilters && `(${Object.keys(stateDebtor.selectData).filter(key => stateDebtor.selectData[key]).length})`}
                                    </Button>
                                    <Button
                                        //className="button-export"
                                        onClick={exportToExcel}
                                        icon={downloadIcon}>
                                        Завантажити
                                    </Button>
                                    <FilterDropdown
                                        isOpen={stateDebtor.isFilterOpen}
                                        onClose={closeFilterDropdown}
                                        filterData={stateDebtor.selectData}
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
                                        pageSize={stateDebtor.sendData.limit}
                                        onPageChange={onPageChange}/>
                                </div>
                            </div>
                        </div>
                    </React.Fragment> : null
                }
                <Transition in={!!stateDebtor.itemId} timeout={200} unmountOnExit nodeRef={nodeRef}>
                    {state => (
                        <Modal
                            className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                            onClose={handleCloseModal}
                            onOk={handleGenerate}
                            confirmLoading={stateDebtor.confirmLoading}
                            cancelText="Скасувати"
                            okText="Так, сформувати"
                            title="Підтвердження формування реквізитів">
                            <p className="paragraph">
                                Ви впевнені, що бажаєте виконати операцію &quot;Сформувати реквізити&quot;?
                            </p>
                        </Modal>
                    )}
                </Transition>
            </React.Fragment>
        )
    }
;
export default DebtorList;