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

const MessagesDetailedLog = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    
    const FALLBACK_GROUPS = [
        {label: "user", value: "user"},
        {label: "Finance", value: "Finance"}, 
        {label: "admin", value: "admin"},
        {label: "CNAP", value: "CNAP"},
        {label: "Округи", value: "Округи"}
    ];
    
    const [availableGroups, setAvailableGroups] = useState(FALLBACK_GROUPS);
    const [stateLog, setStateLog] = useState({
        isOpen: false,
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
        }
    })

    const isFirstRun = useRef(true)
    
    // Основні дані для повідомлень
    const {error, status, data, retryFetch} = useFetch('api/log/messages', {
        method: 'post',
        data: stateLog.sendData
    })
    
    // Групи через той же хук
    const {
        status: groupsStatus, 
        data: groupsData, 
        error: groupsError
    } = useFetch('api/log/groups', {
        method: 'get'
    })

    const startRecord = ((stateLog.sendData.page || 1) - 1) * (stateLog.sendData.limit || 16) + 1;
    const totalItems = parseInt(data?.totalItems || data?.count || 0);
    const endRecord = Math.min(
        startRecord + (stateLog.sendData.limit || 16) - 1, 
        totalItems
    );

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        console.log('Fetching data with sendData:', stateLog.sendData);
        retryFetch('api/log/messages', {
            method: 'post',
            data: stateLog.sendData,
        })
    }, [stateLog.sendData, retryFetch])

    useEffect(() => {
        console.log('Data received:', data);
        console.log('Data type:', typeof data);
        console.log('Data.items:', data?.items);
        console.log('Status:', status);
    }, [data, status]);

    useEffect(() => {
        if (groupsStatus === STATUS.SUCCESS && groupsData?.success && groupsData?.data) {
            setAvailableGroups(groupsData.data);
        } else if (groupsStatus === STATUS.ERROR) {
            console.error('Помилка завантаження груп:', groupsError);
            setAvailableGroups(FALLBACK_GROUPS);
        }
    }, [groupsStatus, groupsData, groupsError]);

    // Групування даних по групах
    const groupedData = useMemo(() => {
        console.log('Grouping data:', data?.items);
        if (!data?.items || !Array.isArray(data.items)) {
            console.log('No items to group');
            return {};
        }
        
        const grouped = data.items.reduce((groups, item) => {
            const groupName = item.group_name || "Без групування";
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(item);
            return groups;
        }, {});
        
        console.log('Grouped data:', grouped);
        return grouped;
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

    // Функція експорту в Excel для повідомлень
    const exportToExcel = async () => {
        try {
            // Отримуємо дані з API
            const response = await fetch("/api/log/messages", {
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
                "Група",
                "Користувач",
                "П.І.Б.",
                "Дія",
                "Дата"
            ]);

            // Групуємо дані по групах
            const groupedExportData = apiData.items.reduce((groups, item) => {
                const groupName = item.group_name || "Без групування";
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(item);
                return groups;
            }, {});

            // Додаємо дані в Excel
            Object.entries(groupedExportData).forEach(([groupName, actions]) => {
                // Додаємо заголовок групи
                excelData.push([groupName, "", "", "", ""]);

                // Додаємо дії групи
                actions.forEach(action => {
                    const actionType = action.action === 'PRINT' ? 'Друк' : 
                                     action.action === 'GENERATE_DOC' ? 'Генерація документу' : 
                                     action.action || '';
                    
                    excelData.push([
                        "",
                        action.username || "",
                        action.fullName || "",
                        actionType,
                        action.date ? new Date(action.date).toLocaleString('uk-UA') : ""
                    ]);
                });
            });

            // Створюємо Excel файл
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Журнал дій");

            // Експортуємо файл
            XLSX.writeFile(workbook, "журнал_дій_користувачів.xlsx");

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
        // Перевірка для поля року (дозволяємо тільки цифри)
        if((name === "year") && (!/^\d*$/.test(value))) {
            return;
        }
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
                const { dateFrom, dateTo } = stateLog.selectData;
                let periodType = "single";
                
                if (dateFrom && dateTo) {
                    const fromDate = new Date(dateFrom);
                    const toDate = new Date(dateTo);
                    const monthsDifference = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + 
                                            (toDate.getMonth() - fromDate.getMonth());
                    
                    if (monthsDifference > 1) {
                        periodType = "multiple";
                    }
                }
    
                setStateLog(prevState => ({
                    ...prevState,
                    sendData: {
                        ...dataValidation,
                        dateFrom: prevState.selectData.dateFrom || "",
                        dateTo: prevState.selectData.dateTo || "",
                        year: prevState.selectData.year ? parseInt(prevState.selectData.year) : undefined,
                        month: prevState.selectData.month ? 
                            (typeof prevState.selectData.month === 'object' ? 
                                parseInt(prevState.selectData.month.value) : 
                                parseInt(prevState.selectData.month)) : undefined,
                        groupNumber: typeof prevState.selectData.groupNumber === 'object' 
                            ? prevState.selectData.groupNumber?.value || ""
                            : prevState.selectData.groupNumber || "",
                        username: prevState.selectData.username || "",
                        periodType: periodType,
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

    // Компонент групованої таблиці для повідомлень
    const GroupedMessagesTable = () => {
        console.log('Rendering table with groupedData:', groupedData);
        console.log('GroupedData keys:', Object.keys(groupedData));
        
        // Показуємо таблицю завжди
        return (
            <table className="table table--grouped">
                <thead>
                    <tr>
                        <th>Група</th>
                        <th>Користувач</th>
                        <th>П.І.Б.</th>
                        <th>Дія</th>
                        <th>Дата</th>
                    </tr>
                </thead>
                <tbody>
                    {!groupedData || Object.keys(groupedData).length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{textAlign: 'center', padding: '20px'}}>
                                {status === STATUS.SUCCESS ? 'Даних не знайдено' : 'Завантаження...'}
                            </td>
                        </tr>
                    ) : (
                        Object.entries(groupedData).map(([groupName, messages]) => (
                            <React.Fragment key={groupName}>
                                <tr>
                                    <td 
                                        colSpan={5}
                                        style={{fontWeight: "bold", backgroundColor: "#f5f5f5"}}
                                    >
                                        {groupName}
                                    </td>
                                </tr>
                                {messages.map((message, index) => (
                                    <tr key={`${groupName}-${index}`}>
                                        <td></td>
                                        <td>{message.username || '-'}</td>
                                        <td>{message.fullName || `${message.first_name || ''} ${message.last_name || ''}`.trim() || '-'}</td>
                                        <td>
                                            <span className={`action-badge action-badge--${message.action?.toLowerCase()}`}>
                                                {message.action === 'PRINT' ? 'Друк' : 
                                                 message.action === 'GENERATE_DOC' ? 'Генерація документу' : 
                                                 message.action || ''}
                                            </span>
                                        </td>
                                        <td>
                                            {message.date ? 
                                                new Date(message.date).toLocaleString('uk-UA', {
                                                    year: 'numeric',
                                                    month: '2-digit', 
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : ''
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))
                    )}
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
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {totalItems}
                                        <span className="subtitle">дій користувачів</span>
                                    </React.Fragment> : 
                                    <React.Fragment>
                                        {status === STATUS.SUCCESS ? 'Даних не знайдено' : 'Записів не знайдено'}
                                        {/* Debug: items: {data?.items ? data.items.length : 'undefined'}, isArray: {String(Array.isArray(data?.items))} */}
                                    </React.Fragment>
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
                                    Завантажити
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
                                <GroupedMessagesTable />
                                {data?.items && Array.isArray(data?.items) && data?.items.length > 0 && (
                                    <Pagination
                                        className="m-b"
                                        currentPage={parseInt(data?.currentPage) || 1}
                                        totalCount={totalItems}
                                        pageSize={stateLog.sendData.limit}
                                        onPageChange={onPageChange}/>
                                )}
                            </div>
                            <div className={`table-filter ${stateLog.isOpen ? "table-filter--active" : ""}`}>
                                <h3 className="title title--sm">
                                    Фільтри дій
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
                                        Група
                                    </h4>
                                    <Select
                                        name="groupNumber"
                                        placeholder="Виберіть..."
                                        options={availableGroups}
                                        value={stateLog.selectData?.groupNumber}
                                        onChange={onHandleChange}/>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">
                                        Користувач
                                    </h4>
                                    <Input
                                        icon={searchIcon}
                                        name="username"
                                        type="text"
                                        placeholder="Введіть ім'я користувача"
                                        value={stateLog.selectData?.username || ''}
                                        onChange={onHandleChange}/>
                                </div>
                                <div className="table-filter__item">
                                    <Input
                                        icon={searchIcon}
                                        name="year"
                                        type="text"
                                        placeholder="Введіть рік"
                                        value={stateLog.selectData?.year || ''}
                                        onChange={onHandleChange}/>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">
                                        Місяць
                                    </h4>
                                    <Select
                                        name="month"
                                        placeholder="Виберіть..."
                                        options={monthList}
                                        value={stateLog.selectData?.month}
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

export default MessagesDetailedLog;