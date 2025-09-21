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

const DetailedLog = () => {
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
    
    // Основні дані
    const {error, status, data, retryFetch} = useFetch('api/log/detailed', {
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
    const endRecord = Math.min(
        startRecord + (stateLog.sendData.limit || 16) - 1, 
        (data?.totalItems || 0) || 1
    );

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        retryFetch('api/log/detailed', {
            method: 'post',
            data: stateLog.sendData,
        })
    }, [stateLog.sendData, retryFetch])

    useEffect(() => {
        if (groupsStatus === STATUS.SUCCESS && groupsData?.success && groupsData?.data) {
            setAvailableGroups(groupsData.data);
        } else if (groupsStatus === STATUS.ERROR) {
            console.error('Помилка завантаження груп:', groupsError);
            setAvailableGroups(FALLBACK_GROUPS);
        }
    }, [groupsStatus, groupsData, groupsError]);

    // Групування даних як у збілдженому коді
    const groupedData = useMemo(() => {
        if (!data?.items || !Array.isArray(data.items)) {
            return {};
        }
        
        return data.items.reduce((groups, item) => {
            const groupName = item.group || "Без групування";
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(item);
            return groups;
        }, {});
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

    // Функція експорту в Excel (з збілдженого коду)
    const exportToExcel = async () => {
        try {
            // Отримуємо дані з API
            const response = await fetch("/api/log/detailed", {
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
                "Рік",           // ДОДАНО
                "Місяць",        // ДОДАНО
                "Кількість друків",
                "Кількість згенерованих документів",
                "Кількість пошуків"
            ]);

            // Групуємо дані по групах (як на веб-сторінці)
            const groupedExportData = apiData.items.reduce((groups, item) => {
                const groupName = item.groupname || item.group || "Без групування";
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(item);
                return groups;
            }, {});

            // Додаємо дані в Excel (як відображається на сторінці)
            Object.entries(groupedExportData).forEach(([groupName, users]) => {
                // Додаємо заголовок групи
                excelData.push([groupName, "", "", "", "", ""]);

                // Додаємо користувачів групи
                users.forEach(user => {
                    excelData.push([
                        "",
                        user.username || "",
                        user.fullName || "",
                        user.year || "",         // ДОДАНО
                        user.month_name || "",   // ДОДАНО
                        parseInt(user.print_count) || 0,
                        parseInt(user.generate_count) || 0,
                        parseInt(user.search_count) || 0
                    ]);
                });
            });

            // Створюємо Excel файл
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Деталізований журнал");

            // Експортуємо файл
            XLSX.writeFile(workbook, "деталізований_журнал.xlsx");

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

    // Компонент групованої таблиці (з збілдженого коду)
    const GroupedTable = () => {
        if (!groupedData || Object.keys(groupedData).length === 0) {
            return null;
        }
    
        return (
            <table className="table table--grouped">
                <thead>
                    <tr>
                        <th>Група</th>
                        <th>Користувач</th>
                        <th>П.І.Б.</th>
                        <th>Рік</th>
                        <th>Місяць</th>
                        <th>Кількість друків</th>
                        <th>Кількість згенерованих документів</th>
                        <th>Кількість пошуків</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(groupedData).map(([groupName, users]) => (
                        <React.Fragment key={groupName}>
                            <tr>
                                <td 
                                    colSpan={8}  // Змінено з 6 на 8!
                                    style={{fontWeight: "bold"}}
                                >
                                    {groupName}
                                </td>
                            </tr>
                            {users.map((user, index) => (
                                <tr key={`${groupName}-${index}`}>
                                    <td></td>
                                    <td>{user.username}</td>
                                    <td>{user.fullName}</td>
                                    <td>{user.year}</td>
                                    <td>{user.month_name}</td>
                                    <td>{user.print_count}</td>
                                    <td>{user.generate_count}</td>
                                    <td>{user.search_count}</td>
                                </tr>
                            ))}
                        </React.Fragment>
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
                                <GroupedTable />
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

export default DetailedLog;