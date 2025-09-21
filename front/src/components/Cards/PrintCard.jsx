import React, {useRef, useState, useEffect, useMemo} from 'react';
import Button from "../common/Button/Button.jsx";
import {useNavigate, useParams} from "react-router-dom";
import './PrintCard.css'
import logo from '../../assets/qr-code.png'
import useFetch from "../../hooks/useFetch.jsx";
import {
    alt_qr_code,
    phone_number_GU_DPS,
    GU_DPS_region, telegram_name, telegram_url,
    territory_title,
    territory_title_instrumental, website_name, website_url
} from "../../utils/communityConstants.jsx";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Loader from "../Loader/Loader.jsx";
import PageError from "../../pages/ErrorPage/PageError.jsx";
import {formatDateUa} from "../../utils/function.js";
import Table from "../common/Table/Table.jsx";
import Modal from "../common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";

const backIcon = generateIcon(iconMap.back)
const printIcon = generateIcon(iconMap.print)
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 16, 16)

const PrintCard = () => {
    const ref = useRef(null)
    const nodeRef = useRef(null)
    const {debtId} = useParams()
    const navigate = useNavigate()
    const {error, status, data} = useFetch(`api/debtor/print/${debtId}`)
    
    // Стан для таблиці квитанцій
    const [receiptsData, setReceiptsData] = useState([])
    const [receiptsLoading, setReceiptsLoading] = useState(false)
    const [receiptsError, setReceiptsError] = useState(null)
    
    // Стан для модального вікна квитанцій
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            date: '',
            topic: ''
        }
    })

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

    // Завантаження квитанцій при успішному завантаженні інформації про боржника
    useEffect(() => {
        if (status === STATUS.SUCCESS && debtId) {
            loadReceipts();
        }
    }, [status, debtId]);

    // Функція для завантаження квитанцій
    const loadReceipts = async () => {
        setReceiptsLoading(true);
        setReceiptsError(null);
        
        try {
            const response = await fetch(`/api/debtor/receipts/${debtId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const receipts = await response.json();
            
            // Конвертуємо дані з сервера в формат для таблиці
            const formattedReceipts = receipts.map(receipt => ({
                id: receipt.id,
                date: formatDateTime(receipt.date),
                topic: receipt.topic,
                rawReceiptDate: receipt.date
            }));
            
            setReceiptsData(formattedReceipts);
        } catch (error) {
            console.error('Error loading receipts:', error);
            setReceiptsError(error.message);
        } finally {
            setReceiptsLoading(false);
        }
    };

    // Колонки для таблиці квитанцій
    const receiptsColumns = useMemo(() => [
        {
            title: '№',
            dataIndex: 'id',
            width: '60px'
        },
        {
            title: 'Час запису',
            dataIndex: 'date',
            width: '150px'
        },
        {
            title: 'Коментар',
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
        }
    ], [])

    const handleOpenModal = () => {
        setModalState({
            isOpen: true,
            loading: false,
            formData: {
                date: '',
                topic: ''
            }
        })
        document.body.style.overflow = 'hidden'
    }

    const handleCloseModal = () => {
        setModalState({
            isOpen: false,
            loading: false,
            formData: {
                date: '',
                topic: ''
            }
        })
        document.body.style.overflow = 'auto'
    }

    const handleSaveReceipt = async () => {
        const { formData } = modalState
        
        if (!formData.date || !formData.topic) {
            alert('Заповніть всі поля')
            return
        }

        setModalState(prev => ({ ...prev, loading: true }));

        try {
            const requestData = {
                date: formatDateTimeForAPI(formData.date),
                topic: formData.topic
            };
            
            const response = await fetch(`/api/debtor/receipts/${debtId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: parseInt(debtId),
                    ...requestData
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Помилка при збереженні запису');
            }

            const savedReceipt = await response.json();
            
            const formattedReceipt = {
                id: savedReceipt.id,
                date: formatDateTime(savedReceipt.date),
                topic: savedReceipt.topic,
                rawReceiptDate: savedReceipt.date
            };

            setReceiptsData(prev => [formattedReceipt, ...prev]);
            
            handleCloseModal();
        } catch (error) {
            console.error('Error saving receipt:', error);
            alert('Помилка при збереженні запису: ' + error.message);
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
    
    const handlePrint = () => {
        if(ref.current) {
            ref.current.style.display = 'none';
        }
        // Також приховуємо таблицю квитанцій при друці
        const receiptsSection = document.querySelector('.receipts-section');
        if(receiptsSection) {
            receiptsSection.style.display = 'none';
        }
        
        window.print();
        
        if(ref.current) {
            ref.current.style.display = 'flex';
        }
        if(receiptsSection) {
            receiptsSection.style.display = 'block';
        }
    };

    if (status === STATUS.PENDING) {
        return <Loader/>
    }

    if (status === STATUS.ERROR) {
        return <div style={{display: 'flex', justifyContent: 'center', minHeight: '100vh'}}>
            <PageError statusError={error.status} title={error.message}/>
        </div>
    }

    return (
        <React.Fragment>
            {status === STATUS.SUCCESS ? (
                <React.Fragment>
                    <div className="print-card">
                        <div className="print-card__header">
                            <p className="print-card__name">{data.name}</p>
                            <p className="print-card__id">і.к. ХХХХХХХ{data?.identification}</p>
                        </div>
                        <div className="print-card__title">Інформаційне повідомлення</div>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{territory_title} повідомляє, що відповідно до даних ГУ ДПС у {GU_DPS_region},
                            станом {formatDateUa(data.date)} у Вас наявна заборгованість до бюджету {territory_title_instrumental},&nbsp; а саме:
                        </p>
                        {data.debt && Array.isArray(data.debt) && data.debt.length ? (
                            data.debt.map((innerArray, index) => (
                                innerArray.map((el, innerIndex) => (
                                    <div className="print-card__content" key={`${index}-${innerIndex}`}>
                                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{el.debtText}</p>
                                        <p className="print-card__payment-title">{el.requisiteText}</p>
                                        <table className="print-card__table">
                                            <tbody>
                                            {el.table.map((cell, cellIndex) => (
                                                <tr className="print-card__table-row" key={cellIndex}>
                                                    <td className="print-card__table-cell">
                                                        <p><strong>{cell.label}</strong></p>
                                                    </td>
                                                    <td className="print-card__table-cell">
                                                        <p>{cell.value}</p>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))
                            ))
                        ) : null}
                        <p>&nbsp;</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;В разі виникнення питань по даній заборгованості, звертатись у ГУ ДПС у {GU_DPS_region} за номером телефона {phone_number_GU_DPS}.</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Просимо терміново погасити утворену Вами податкову заборгованість до бюджету {territory_title_instrumental}. Несвоєчасна сплата суми заборгованості призведе до нарахувань
                            штрафних санкцій та пені.</p>
                        <p>&nbsp;</p>
                        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Перевірити заборгованість можна у застосунках &laquo;{website_name}&raquo;
                            <a href={website_url} target={"_blank"}>{website_url}</a> та чат - бот в Telegram &laquo;{telegram_name}&raquo; <a href={telegram_url} target={"_blank"}>{telegram_url}</a>, які надають
                            можливість миттєвого отримання актуальної інформації про стан заборгованості по податках і зборах перед бюджетом
                            {territory_title_instrumental}, реквізити для сплати та можливість оплатити онлайн, або за QR &ndash; кодом, який розміщений нижче.
                        </p>
                        <div>
                            <img src={logo} width={100} height={100} alt={alt_qr_code}/>
                        </div>
                        <div className="print-card__buttons" ref={ref}>
                            <Button
                                icon={backIcon}
                                onClick={() => navigate('/debtor')}>
                                Повернутись
                            </Button>
                            <Button
                                icon={printIcon}
                                onClick={handlePrint}>
                                Друк
                            </Button>
                        </div>
                    </div>

                    {/* Таблиця квитанцій */}
                    <div className="receipts-section" style={{marginTop: '30px'}}>
                        <div className="table-elements">
                            <div className="table-header">
                                <h2 className="title title--sm">
                                    Історія роботи з квитанціями ({receiptsData.length})
                                </h2>
                                <div className="table-header__buttons">
                                    <Button
                                        icon={addIcon}
                                        onClick={handleOpenModal}
                                        disabled={receiptsLoading}
                                    >
                                        Додати запис
                                    </Button>
                                </div>
                            </div>
                            <div className="table-main">
                                <div className="table-wrapper">
                                    {receiptsLoading ? (
                                        <div style={{textAlign: 'center', padding: '40px'}}>
                                            <Loader />
                                        </div>
                                    ) : receiptsError ? (
                                        <div style={{
                                            textAlign: 'center', 
                                            padding: '40px', 
                                            color: 'red',
                                            backgroundColor: '#fff2f0',
                                            border: '1px solid #ffccc7',
                                            borderRadius: '6px'
                                        }}>
                                            <h3>Помилка завантаження записів</h3>
                                            <p>{receiptsError}</p>
                                            <Button onClick={loadReceipts} style={{marginTop: '10px'}}>
                                                Спробувати знову
                                            </Button>
                                        </div>
                                    ) : (
                                        <Table 
                                            columns={receiptsColumns} 
                                            dataSource={receiptsData.map(receipt => ({
                                                ...receipt,
                                                key: receipt.id
                                            }))}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </React.Fragment>
            ) : null
            }

            {/* Модальне вікно для додавання записів про квитанції */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={nodeRef}>
                {state => (
                    <Modal
                        className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={handleCloseModal}
                        onOk={handleSaveReceipt}
                        cancelText="Скасувати"
                        okText={modalState.loading ? "Збереження..." : "Зберегти"}
                        okButtonDisabled={modalState.loading}
                        title="Додати запис про квитанцію">
                        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Час запису:
                                </label>
                                <input
                                    type="datetime-local"
                                    value={modalState.formData.date}
                                    onChange={(e) => handleFormChange('date', e.target.value)}
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
                                    Коментар:
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
                                    placeholder="Наприклад: Надрукував і віддав боржнику..."
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>)
};

export default PrintCard;