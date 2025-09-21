import React, { useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from "../../hooks/useFetch.jsx";
import PageError from "../ErrorPage/PageError.jsx";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage.jsx";
import Button from "../../components/common/Button/Button.jsx";
import Modal from "../../components/common/Modal/Modal.jsx";
import { Transition } from "react-transition-group";
import { STATUS, generateIcon, iconMap } from "../../utils/constants.jsx";
import { fetchFunction } from "../../utils/function";
import { useNotification } from "../../hooks/useNotification";
import { Context } from "../../main";

const uploadIcon = generateIcon(iconMap.upload, null, 'currentColor', 20, 20);

const DistrictsPage = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const nodeRef = useRef(null);
    const fileInputRef = useRef(null);

    // Стани для завантаження файлу
    const [uploadState, setUploadState] = useState({
        isUploadModalOpen: false,
        selectedFile: null,
        uploadLoading: false,
    });

    // Запит до API для отримання списку округів
    const { error, status, data: districts, retryFetch } = useFetch('/api/districts');

    const handleDistrictClick = (districtId) => {
        navigate(`/districts/${districtId}`);
    };

    // Функції для роботи з файлами
    const handleFileUploadClick = () => {
        setUploadState(prevState => ({
            ...prevState,
            isUploadModalOpen: true,
        }));
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        
        if (file) {
            // Перевіряємо .xls та .xlsx формати
            const fileName = file.name.toLowerCase();
            const isValidFormat = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
            
            if (!isValidFormat) {
                notification({
                    type: 'warning',
                    placement: 'top',
                    title: 'Помилка',
                    message: 'Файл має бути у форматі Excel (.xls або .xlsx)!',
                });
                
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }
            
            setUploadState(prevState => ({
                ...prevState,
                selectedFile: file,
            }));
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    
    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    
    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        const files = event.dataTransfer.files;
        
        if (files.length > 0) {
            const file = files[0];
            
            const fileName = file.name.toLowerCase();
            const isValidFormat = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
            
            if (!isValidFormat) {
                notification({
                    type: 'warning',
                    placement: 'top',
                    title: 'Помилка',
                    message: 'Файл має бути у форматі Excel (.xls або .xlsx)!',
                });
                return;
            }
            
            setUploadState(prevState => ({
                ...prevState,
                selectedFile: file,
            }));
        }
    };
    
    const handleDivClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        } 
    };

    const handleUploadFile = async () => {
        if (!uploadState.selectedFile) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Оберіть файл для завантаження!',
            });
            return;
        }

        try {
            setUploadState(prevState => ({
                ...prevState,
                uploadLoading: true,
            }));

            const formData = new FormData();
            formData.append('file', uploadState.selectedFile);

            const response = await fetchFunction('api/districts/locations/upload', {
                method: 'post',
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            notification({
                placement: "top",
                duration: 4,
                title: 'Успіх',
                message: `Реєстр локацій успішно оновлено. Завантажено ${response.data.imported || 0} записів.`,
                type: 'success'
            });

            // Оновлюємо дані округів
            retryFetch('/api/districts');

            // Закриваємо модальне вікно
            handleCloseUploadModal();

        } catch (error) {
            console.error('Upload error:', error);
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            notification({
                type: 'error',
                title: "Помилка завантаження",
                message: error?.response?.data?.message || error.message || 'Сталась помилка при завантаженні файлу',
                placement: 'top',
            });
        } finally {
            setUploadState(prevState => ({
                ...prevState,
                uploadLoading: false,
            }));
        }
    };

    const handleCloseUploadModal = () => {
        setUploadState(prevState => ({
            ...prevState,
            isUploadModalOpen: false,
            selectedFile: null,
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    if (status === STATUS.PENDING) {
        return <SkeletonPage />;
    }

    return (
        <React.Fragment>
            <div className="districts-page">
                <div className="page-header" style={{ 
                    marginBottom: '30px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '15px'
                }}>
                    <h1 className="title">Оберіть округ</h1>
                    <Button
                        onClick={handleFileUploadClick}
                        icon={uploadIcon}
                        style={{ 
                            background: '#007bff',
                            color: 'white',
                            border: 'none'
                        }}
                    >
                        Завантажити реєстр
                    </Button>
                </div>

                <div className="districts-buttons" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px',
                    maxWidth: '800px'
                }}>
                    {districts && districts.map(district => (
                        <Button
                            key={district.id}
                            onClick={() => handleDistrictClick(district.id)}
                            style={{
                                padding: '20px',
                                fontSize: '18px',
                                height: 'auto',
                                textAlign: 'left',
                                justifyContent: 'flex-start',
                                background: '#fff',
                                border: '2px solid #e9ecef',
                                color: '#495057'
                            }}
                            className="district-button"
                        >
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                    {district.name}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                                    Боржників: {district.debtors_count || 0}
                                </div>
                            </div>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Модальне вікно для завантаження файлу */}
            <Transition in={uploadState.isUploadModalOpen} timeout={200} unmountOnExit nodeRef={nodeRef}>
                {state => (
                    <Modal
                        className={`${state === 'entered' ? "modal-window-wrapper--active" : ""}`}
                        onClose={handleCloseUploadModal}
                        onOk={handleUploadFile}
                        confirmLoading={uploadState.uploadLoading}
                        cancelText="Скасувати"
                        okText="Завантажити"
                        title="Завантаження реєстру локацій"
                        disabled={!uploadState.selectedFile}
                    >
                        <div className="upload-modal-content">
                            <p className="paragraph" style={{ marginBottom: '16px' }}>
                                Оберіть Excel файл (.xlsx) з реєстром людей та їх округами/селами для завантаження в систему.
                            </p>
                            
                            {/* Компонент для завантаження файлу */}
                            <div 
                                style={{
                                    position: 'relative',
                                    marginBottom: '16px'
                                }}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={handleDivClick}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                    onChange={handleFileSelect}
                                    style={{
                                        position: 'absolute',
                                        opacity: 0,
                                        width: '100%',
                                        height: '100%',
                                        cursor: 'pointer',
                                        zIndex: 1
                                    }}
                                />
                                <div style={{
                                    width: '100%',
                                    padding: '20px',
                                    border: '2px dashed #007bff',
                                    borderRadius: '8px',
                                    backgroundColor: uploadState.selectedFile ? '#e8f4f8' : '#f8f9fa',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minHeight: '80px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '24px',
                                        marginBottom: '8px',
                                        color: '#007bff'
                                    }}>
                                        📁
                                    </div>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        color: '#495057',
                                        fontWeight: '500'
                                    }}>
                                        {uploadState.selectedFile 
                                            ? `Обрано: ${uploadState.selectedFile.name}`
                                            : 'Клікніть або перетягніть файл сюди'
                                        }
                                    </p>
                                    <p style={{
                                        margin: '4px 0 0 0',
                                        fontSize: '12px',
                                        color: '#6c757d'
                                    }}>
                                        Файли .xls та .xlsx
                                    </p>
                                </div>
                            </div>
                            
                            {/* Додаткова кнопка для відкриття файлового діалогу */}
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.click();
                                        }
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Обрати файл
                                </button>
                            </div>
                            
                            {/* Відображення статусу файлу */}
                            {uploadState.selectedFile && (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: '#e8f5e8',
                                    borderRadius: '4px',
                                    marginBottom: '16px',
                                    border: '1px solid #28a745'
                                }}>
                                    <p style={{
                                        fontSize: '12px',
                                        color: '#155724',
                                        margin: 0,
                                        fontWeight: '500'
                                    }}>
                                        ✅ Розмір файлу: {(uploadState.selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            )}
                            
                            {/* Інформація про структуру файлу для локацій */}
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '12px',
                                borderRadius: '4px',
                                border: '1px solid #dee2e6'
                            }}>
                                <p style={{ fontSize: '12px', color: '#6c757d', margin: 0, fontWeight: '600' }}>
                                    📋 Обов'язкові колонки:
                                </p>
                                <p style={{ fontSize: '11px', color: '#6c757d', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                    • <strong>name</strong> - ПІБ особи<br/>
                                    • <strong>district</strong> - Назва округу<br/>
                                    • <strong>village</strong> - Назва села (не обов'язково)
                                </p>
                                <p style={{ fontSize: '11px', color: '#007bff', margin: '8px 0 0 0', fontWeight: '500' }}>
                                    Приклад: ІВАН ІВАНЕНКО ІВАНОВИЧ | Іванівський округ | Петрівка
                                </p>
                                <p style={{ fontSize: '11px', color: '#28a745', margin: '4px 0 0 0', fontWeight: '500' }}>
                                    Підтримуються формати: .xls, .xlsx
                                </p>
                                <p style={{ fontSize: '10px', color: '#dc3545', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                                    Примітка: Система автоматично створить нові округи та села, якщо їх не існує
                                </p>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default DistrictsPage;