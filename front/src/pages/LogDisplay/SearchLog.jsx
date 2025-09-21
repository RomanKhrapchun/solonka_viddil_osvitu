import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import {booleanArray, generateIcon, iconMap, monthList, STATUS} from "../../utils/constants";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import classNames from "classnames";
import Pagination from "../../components/common/Pagination/Pagination";
import Input from "../../components/common/Input/Input";
import { hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import Select from "../../components/common/Select/Select";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import * as XLSX from 'xlsx';

const filterIcon = generateIcon(iconMap.filter)
const searchIcon = generateIcon(iconMap.search, 'input-icon')
const dropDownIcon = generateIcon(iconMap.arrowDown)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

const SearchDebtLog = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    
    // Опції для фільтрації по джерелу запиту
    const SOURCE_OPTIONS = [
        {label: "Всі джерела", value: ""},
        {label: "Сайт", value: "website"}, 
        {label: "Телеграм бот", value: "telegram"},
        {label: "Невідоме джерело", value: "unknown"}
    ];
    
    const [stateLog, setStateLog] = useState({
        isOpen: false,
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
        }
    })

    const isFirstRun = useRef(true)
    
    // Основні дані
    const {error, status, data, retryFetch} = useFetch('api/log/ower', {
        method: 'post',
        data: stateLog.sendData
    })

    const startRecord = ((stateLog.sendData.page || 1) - 1) * (stateLog.sendData.limit || 16) + 1;
    const endRecord = Math.min(
        startRecord + (stateLog.sendData.limit || 16) - 1, 
        (data?.totalItems || 0) || 1
    );

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        retryFetch('api/log/ower', {
            method: 'post',
            data: stateLog.sendData,
        })
    }, [stateLog.sendData, retryFetch])

    // Обробка даних для відображення
    const tableData = useMemo(() => {
        if (!data?.items || !Array.isArray(data.items)) {
            return [];
        }
        
        return data.items.map(item => ({
            ...item,
            source_display: item.source_display || (
                !item.chat_id && item.ip ? "Сайт" :
                item.chat_id && !item.ip ? "Телеграм бот" :
                "Невідоме джерело"
            )
        }));
    }, [data]);

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
    ]

    const filterHandleClick = () => {
        setStateLog(prevState => ({
            ...prevState,
            isOpen: !prevState.isOpen,
        }))
    }

    // Функція експорту в Excel
    const exportToExcel = async () => {
        try {
            // Отримуємо дані з API
            const response = await fetch("/api/log/ower", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ...stateLog.sendData,
                    page: 1,
                    limit: 10000
                })
            });

            const apiData = await response.json();

            if (!apiData.items || !Array.isArray(apiData.items)) {
                throw new Error("Неправильна структура даних");
            }

            // Створюємо масив для Excel
            const excelData = [];

            // Додаємо заголовки
            excelData.push([
                "ID",
                "Дата запиту",
                "Ім'я для пошуку",
                "Джерело запиту",
                "Chat ID (Телеграм)",
                "IP адреса (Сайт)"
            ]);

            // Додаємо дані без групування
            apiData.items.forEach(log => {
                const sourceDisplay = log.source_display || (
                    !log.chat_id && log.ip ? "Сайт" :
                    log.chat_id && !log.ip ? "Телеграм бот" :
                    "Невідоме джерело"
                );

                excelData.push([
                    log.id || "",
                    log.formatted_date || "",
                    log.name || "",
                    sourceDisplay || "",
                    log.chat_id || "",
                    log.ip || ""
                ]);
            });

            // Створюємо Excel файл
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Лог пошуку заборгованостей");

            // Налаштовуємо ширину колонок
            const colWidths = [
                { wch: 15 }, // ID
                { wch: 20 }, // Дата
                { wch: 30 }, // Ім'я
                { wch: 15 }, // Джерело
                { wch: 15 }, // Chat ID
                { wch: 15 }  // IP
            ];
            worksheet['!cols'] = colWidths;

            // Експортуємо файл
            XLSX.writeFile(workbook, "лог_пошуку_заборгованостей.xlsx");

            notification({
                type: "success",
                placement: "top",
                title: "Успіх",
                message: "Дані успішно експортовано"
            });

        } catch (error) {
            notification({
                type: "error",
                placement: "top",
                title: "Помилка",
                message: "Не вдалося експортувати дані"
            });
            console.error("Export error:", error);
        }
    };

    const onHandleChange = (name, value) => {
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
                        dateFrom: prevState.selectData.dateFrom || "",
                        dateTo: prevState.selectData.dateTo || "",
                        name: prevState.selectData.name || "",
                        source: typeof prevState.selectData.source === 'object' 
                            ? prevState.selectData.source?.value || ""
                            : prevState.selectData.source || "",
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
    },[stateLog.sendData.page])

    // Компонент звичайної таблиці без групування
    const SimpleTable = () => {
        if (!tableData || tableData.length === 0) {
            return (
                <div className="table table--grouped">
                    <p style={{textAlign: 'center', padding: '20px'}}>
                        Записів не знайдено
                    </p>
                </div>
            );
        }
    
        return (
            <table className="table table--grouped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Дата запиту</th>
                        <th>Ім'я для пошуку</th>
                        <th>Джерело</th>
                        <th>Chat ID</th>
                        <th>IP адреса</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.map((log, index) => (
                        <tr key={log.id || index}>
                            <td>{log.id}</td>
                            <td>{log.formatted_date}</td>
                            <td style={{textTransform: 'capitalize'}}>{log.name}</td>
                            <td>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: 
                                        log.source_display === 'Сайт' ? '#e3f2fd' :
                                        log.source_display === 'Телеграм бот' ? '#f3e5f5' :
                                        '#f5f5f5',
                                    color:
                                        log.source_display === 'Сайт' ? '#1976d2' :
                                        log.source_display === 'Телеграм бот' ? '#7b1fa2' :
                                        '#666'
                                }}>
                                    {log.source_display}
                                </span>
                            </td>
                            <td>{log.chat_id || '-'}</td>
                            <td>{log.ip || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
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
                                    caption={`Записів: ${stateLog.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    onClick={exportToExcel}
                                    className="btn--secondary">
                                    Завантажити Excel
                                </Button>
                                <Button
                                    className="table-filter-trigger"
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри
                                </Button>
                            </div>
                        </div>
                        <div className="table-main">
                            <div style={{width: "100%"}}
                                 className={classNames("table-and-pagination-wrapper", {"table-and-pagination-wrapper--active": stateLog.isOpen})}>
                                <SimpleTable />
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateLog.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                            <div className={`table-filter ${stateLog.isOpen ? "table-filter--active" : ""}`}>
                                <h3 className="title title--sm">
                                    Фільтри
                                </h3>
                                <div className="btn-group">
                                    <Button onClick={applyFilter}>
                                        Застосувати
                                    </Button>
                                    <Button className="btn--secondary" onClick={resetFilters}>
                                        Скинути
                                    </Button>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">
                                        З дати
                                    </h4>
                                    <Input
                                        name="dateFrom"
                                        type="date"
                                        placeholder="Виберіть дату"
                                        value={stateLog.selectData?.dateFrom || ''}
                                        onChange={onHandleChange}/>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">
                                        По дату
                                    </h4>
                                    <Input
                                        name="dateTo"
                                        type="date"
                                        placeholder="Виберіть дату"
                                        value={stateLog.selectData?.dateTo || ''}
                                        onChange={onHandleChange}/>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">
                                        Джерело запиту
                                    </h4>
                                    <Select
                                        name="source"
                                        placeholder="Виберіть джерело..."
                                        options={SOURCE_OPTIONS}
                                        value={stateLog.selectData?.source}
                                        onChange={onHandleChange}/>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">
                                        Пошук по імені
                                    </h4>
                                    <Input
                                        icon={searchIcon}
                                        name="name"
                                        type="text"
                                        placeholder="Введіть ім'я для пошуку"
                                        value={stateLog.selectData?.name || ''}
                                        onChange={onHandleChange}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }
        </React.Fragment>
    )
};

export default SearchDebtLog;