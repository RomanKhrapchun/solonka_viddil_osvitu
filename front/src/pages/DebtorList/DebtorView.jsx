import React, {useMemo, useState, useRef, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom'
import Button from "../../components/common/Button/Button";
import ViewCard from '../../components/Cards/ViewCard';
import Table from "../../components/common/Table/Table";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import useFetch from "../../hooks/useFetch";
import {generateIcon, iconMap, STATUS} from "../../utils/constants";
import Loader from "../../components/Loader/Loader";
import PageError from "../ErrorPage/PageError";

const onBackIcon = generateIcon(iconMap.back)
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 16, 16)
const phoneAddIcon = generateIcon(iconMap.add, null, 'currentColor', 14, 14)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 14, 14) // Іконка редагування

const DebtorView = () => {
    const {debtId} = useParams()
    const navigate = useNavigate()
    const nodeRef = useRef(null)
    const phoneNodeRef = useRef(null)
    const {error, status, data} = useFetch(`api/debtor/info/${debtId}`)
    
    // Стан для таблиці дзвінків
    const [callsData, setCallsData] = useState([])
    const [callsLoading, setCallsLoading] = useState(false)
    const [callsError, setCallsError] = useState(null)
    
    // Розширений стан для модального вікна дзвінків (додано isEdit та editingCallId)
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        isEdit: false, // Новий флаг для режиму редагування
        editingCallId: null, // ID дзвінка, який редагуємо
        formData: {
            callTime: '',
            topic: ''
        }
    })

    // Стан для модального вікна телефону
    const [phoneModalState, setPhoneModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            phone: ''
        }
    })

    // Функція для генерації випадкового номера телефону
    const generateRandomPhone = () => {
        return `Не знайдено номер телефону`;
    };

    // Функції для роботи з датами
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const formatDateTimeForAPI = (dateTimeLocal) => {
        return new Date(dateTimeLocal).toISOString();
    };

    // Функція для перетворення з формату таблиці у формат для input datetime-local
    const formatDateTimeForInput = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Завантаження дзвінків при успішному завантаженні інформації про боржника
    useEffect(() => {
        if (status === STATUS.SUCCESS && debtId) {
            loadCalls();
        }
    }, [status, debtId]);

    // Функція для завантаження дзвінків
    const loadCalls = async () => {
        setCallsLoading(true);
        setCallsError(null);
        
        try {
            const response = await fetch(`/api/debtor/calls/${debtId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const calls = await response.json();
            
            // Конвертуємо дані з сервера в формат для таблиці
            const formattedCalls = calls.map(call => ({
                id: call.id,
                callTime: formatDateTime(call.call_date),
                topic: call.call_topic,
                rawCallDate: call.call_date
            }));
            
            setCallsData(formattedCalls);
        } catch (error) {
            console.error('Error loading calls:', error);
            setCallsError(error.message);
        } finally {
            setCallsLoading(false);
        }
    };

    // Функція для відкриття модального вікна телефону
    const handleOpenPhoneModal = () => {
        setPhoneModalState({
            isOpen: true,
            loading: false,
            formData: {
                phone: ''
            }
        })
        document.body.style.overflow = 'hidden'
    }

    // Функція для закриття модального вікна телефону
    const handleClosePhoneModal = () => {
        setPhoneModalState({
            isOpen: false,
            loading: false,
            formData: {
                phone: ''
            }
        })
        document.body.style.overflow = 'auto'
    }

    // Функція для збереження номера телефону
    const handleSavePhone = async () => {
        const { formData } = phoneModalState
        
        if (!formData.phone.trim()) {
            alert('Введіть номер телефону')
            return
        }

        // Простая валидация номера телефона (украинский формат)
        const phoneRegex = /^(\+38)?[0-9]{10}$/
        const cleanPhone = formData.phone.replace(/\D/g, '')
        
        if (cleanPhone.length < 10) {
            alert('Номер телефону повинен містити мінімум 10 цифр')
            return
        }

        setPhoneModalState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`/api/debtor/enrich-phone/${debtId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: formData.phone,
                    debtId: debtId
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Помилка при збереженні номеру телефону');
            }

            // Перезагружаем данные после успешного добавления
            window.location.reload(); // Простое решение, можно улучшить
            
            handleClosePhoneModal();
        } catch (error) {
            console.error('Error saving phone:', error);
            alert('Помилка при збереженні номеру: ' + error.message);
        } finally {
            setPhoneModalState(prev => ({ ...prev, loading: false }));
        }
    }

    // Функція для зміни даних форми телефону
    const handlePhoneFormChange = (value) => {
        setPhoneModalState(prev => ({
            ...prev,
            formData: {
                phone: value
            }
        }))
    }

    const tableData = useMemo(() => {
        if (typeof data === "object" && Object.keys(data).length) {
            return {
                columns: [
                    {
                        title: 'ID', dataIndex: 'id',
                    },
                    {
                        title: 'П.І.Б', dataIndex: 'name',
                    },
                    {
                        title: 'Номер телефону', 
                        dataIndex: 'phone',
                        // Кастомный рендер с кнопкой добавления
                        render: (phoneData) => {
                            const hasPhone = phoneData && phoneData !== generateRandomPhone();
                            
                            return (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ color: hasPhone ? 'inherit' : '#999' }}>
                                        {phoneData || generateRandomPhone()}
                                    </span>
                                    <button
                                        onClick={handleOpenPhoneModal}
                                        style={{
                                            background: 'none',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '24px',
                                            height: '24px',
                                            flexShrink: 0
                                        }}
                                        title={hasPhone ? "Додати ще один номер" : "Додати номер телефону"}
                                    >
                                        {phoneAddIcon}
                                    </button>
                                </div>
                            )
                        }
                    },
                    {
                        title: 'Дата боргу', dataIndex: 'date',
                    },
                    {
                        title: 'Нежитлова', dataIndex: 'non_residential_debt',
                    },
                    {
                        title: 'Житлова', dataIndex: 'residential_debt',
                    },
                    {
                        title: 'Податок на землю', dataIndex: 'land_debt',
                    },
                    {
                        title: 'Оренда землі', dataIndex: 'orenda_debt',
                    },
                    {
                        title: 'МПЗ', dataIndex: 'mpz',
                    },
                ],
                data: data.map(el => ({
                    key: el.id,
                    id: el.id,
                    name: el.name,
                    phone: el.phone?.length 
                            ? el.phone.join(', ')  // ← розділення комою та пробілом
                            : null,
                    date: el.date,
                    non_residential_debt: el.non_residential_debt,
                    residential_debt: el.residential_debt,
                    land_debt: el.land_debt,
                    orenda_debt: el.orenda_debt,
                    mpz: el.mpz,
                }))
            }
        }
        return {columns: [], data: []};
    }, [data])

    // Колонки для таблиці дзвінків з додатковою колонкою "Дії"
    const callsColumns = useMemo(() => [
        {
            title: '№',
            dataIndex: 'id',
            width: '60px'
        },
        {
            title: 'Час дзвінка',
            dataIndex: 'callTime',
            width: '150px'
        },
        {
            title: 'Тема розмови',
            dataIndex: 'topic',
            render: (text) => (
                <div style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '400px',
                    minWidth: '200px'
                }}>
                    {text}
                </div>
            )
        },
        // Нова колонка "Дії"
        {
            title: 'Дії',
            dataIndex: 'actions',
            width: '80px',
            render: (_, record) => (
                <button
                    onClick={() => handleEditCall(record)}
                    style={{
                        background: 'none',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#1890ff',
                        transition: 'all 0.2s'
                    }}
                    title="Редагувати дзвінок"
                    onMouseEnter={(e) => {
                        e.target.style.borderColor = '#1890ff';
                        e.target.style.backgroundColor = '#f0f9ff';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.borderColor = '#d9d9d9';
                        e.target.style.backgroundColor = 'transparent';
                    }}
                >
                    {editIcon}
                    <span>Ред.</span>
                </button>
            )
        }
    ], [])

    // Функція для відкриття модального вікна (універсальна для створення і редагування)
    const handleOpenModal = () => {
        setModalState({
            isOpen: true,
            loading: false,
            isEdit: false,
            editingCallId: null,
            formData: {
                callTime: '',
                topic: ''
            }
        })
        document.body.style.overflow = 'hidden'
    }

    // Нова функція для редагування дзвінка
    const handleEditCall = (call) => {
        setModalState({
            isOpen: true,
            loading: false,
            isEdit: true,
            editingCallId: call.id,
            formData: {
                callTime: formatDateTimeForInput(call.rawCallDate),
                topic: call.topic
            }
        })
        document.body.style.overflow = 'hidden'
    }

    const handleCloseModal = () => {
        setModalState({
            isOpen: false,
            loading: false,
            isEdit: false,
            editingCallId: null,
            formData: {
                callTime: '',
                topic: ''
            }
        })
        document.body.style.overflow = 'auto'
    }

    // Модифікована функція для збереження (створення або оновлення)
    const handleSaveCall = async () => {
        const { formData, isEdit, editingCallId } = modalState
        
        if (!formData.callTime || !formData.topic) {
            alert('Заповніть всі поля')
            return
        }

        setModalState(prev => ({ ...prev, loading: true }));

        try {
            const requestData = {
                call_date: formatDateTimeForAPI(formData.callTime),
                call_topic: formData.topic
            };

            let response;
            
            if (isEdit && editingCallId) {
                // Редагування існуючого дзвінка
                response = await fetch(`/api/debtor/calls/${editingCallId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
            } else {
                // Створення нового дзвінка
                response = await fetch(`/api/debtor/calls/${debtId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        identifier: parseInt(debtId),
                        ...requestData
                    })
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Помилка при ${isEdit ? 'оновленні' : 'збереженні'} дзвінка`);
            }

            const savedCall = await response.json();
            
            const formattedCall = {
                id: savedCall.id,
                callTime: formatDateTime(savedCall.call_date),
                topic: savedCall.call_topic,
                rawCallDate: savedCall.call_date
            };

            if (isEdit) {
                // Оновлюємо існуючий запис в таблиці
                setCallsData(prev => prev.map(call => 
                    call.id === editingCallId ? formattedCall : call
                ));
            } else {
                // Додаємо новий запис на початок списку
                setCallsData(prev => [formattedCall, ...prev]);
            }
            
            handleCloseModal();
        } catch (error) {
            console.error(`Error ${isEdit ? 'updating' : 'saving'} call:`, error);
            alert(`Помилка при ${isEdit ? 'оновленні' : 'збереженні'} дзвінка: ` + error.message);
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    }

    const handleFormChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }))
    }

    if (status === STATUS.PENDING) {
        return <Loader/>
    }

    if (status === STATUS.ERROR) {
        return <PageError statusError={error.status} title={error.message}/>
    }

    return (
        <React.Fragment>
            {status === STATUS.SUCCESS ? (
                <React.Fragment>
                    <div className="btn-group" style={{marginBottom: '10px'}}>
                        <Button icon={onBackIcon} onClick={() => navigate('/debtor')}>
                            Повернутись до реєстру
                        </Button>
                    </div>
                    
                    {/* Основна таблиця з інформацією про боржника */}
                    <ViewCard dataSource={tableData.data} columns={tableData.columns}/>
                    
                    {/* Таблиця дзвінків */}
                    <div style={{marginTop: '30px'}}>
                        <div className="table-elements">
                            <div className="table-header">
                                <h2 className="title title--sm">
                                    Історія дзвінків ({callsData.length})
                                </h2>
                                <div className="table-header__buttons">
                                    <Button
                                        icon={addIcon}
                                        onClick={handleOpenModal}
                                        disabled={callsLoading}
                                    >
                                        Додати дзвінок
                                    </Button>
                                </div>
                            </div>
                            <div className="table-main">
                                <div className="table-wrapper">
                                    {callsLoading ? (
                                        <div style={{textAlign: 'center', padding: '40px'}}>
                                            <Loader />
                                        </div>
                                    ) : callsError ? (
                                        <div style={{
                                            textAlign: 'center', 
                                            padding: '40px', 
                                            color: 'red',
                                            backgroundColor: '#fff2f0',
                                            border: '1px solid #ffccc7',
                                            borderRadius: '6px'
                                        }}>
                                            <h3>Помилка завантаження дзвінків</h3>
                                            <p>{callsError}</p>
                                            <Button onClick={loadCalls} style={{marginTop: '10px'}}>
                                                Спробувати знову
                                            </Button>
                                        </div>
                                    ) : (
                                        <Table 
                                            columns={callsColumns} 
                                            dataSource={callsData.map(call => ({
                                                ...call,
                                                key: call.id
                                            }))}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </React.Fragment>
            ) : null}
            
            {/* Модальне вікно для додавання/редагування дзвінків */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={nodeRef}>
                {state => (
                    <Modal
                        className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={handleCloseModal}
                        onOk={handleSaveCall}
                        cancelText="Скасувати"
                        okText={modalState.loading 
                            ? (modalState.isEdit ? "Оновлення..." : "Збереження...") 
                            : (modalState.isEdit ? "Оновити" : "Зберегти")
                        }
                        okButtonDisabled={modalState.loading}
                        title={modalState.isEdit ? "Редагувати дзвінок" : "Додати дзвінок"}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Час дзвінка:
                                </label>
                                <input
                                    type="datetime-local"
                                    value={modalState.formData.callTime}
                                    onChange={(e) => handleFormChange('callTime', e.target.value)}
                                    disabled={modalState.loading}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        backgroundColor: modalState.loading ? '#f5f5f5' : 'white'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Тема розмови:
                                </label>
                                <textarea
                                    value={modalState.formData.topic}
                                    onChange={(e) => handleFormChange('topic', e.target.value)}
                                    disabled={modalState.loading}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        resize: 'vertical',
                                        backgroundColor: modalState.loading ? '#f5f5f5' : 'white'
                                    }}
                                    placeholder="Введіть тему розмови..."
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для додавання номера телефону */}
            <Transition in={phoneModalState.isOpen} timeout={200} unmountOnExit nodeRef={phoneNodeRef}>
                {state => (
                    <Modal
                        className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={handleClosePhoneModal}
                        onOk={handleSavePhone}
                        cancelText="Скасувати"
                        okText={phoneModalState.loading ? "Збереження..." : "Зберегти"}
                        okButtonDisabled={phoneModalState.loading}
                        title="Додати номер телефону">
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Номер телефону:
                                </label>
                                <input
                                    type="tel"
                                    value={phoneModalState.formData.phone}
                                    onChange={(e) => handlePhoneFormChange(e.target.value)}
                                    disabled={phoneModalState.loading}
                                    placeholder="+380XXXXXXXXX або 0XXXXXXXXX"
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        backgroundColor: phoneModalState.loading ? '#f5f5f5' : 'white'
                                    }}
                                />
                                <small style={{color: '#666', fontSize: '12px'}}>
                                    Введіть номер у форматі: +380xxxxxxxxx або 0xxxxxxxxx
                                </small>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
}

export default DebtorView;