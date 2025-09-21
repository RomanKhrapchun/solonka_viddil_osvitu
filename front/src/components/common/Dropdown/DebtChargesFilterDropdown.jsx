import React, { useRef, useEffect } from 'react';
import Input from "../Input/Input";
import Button from "../Button/Button";
import "./FilterDropdown.css"; // Використовуємо існуючі стилі

const DebtChargesFilterDropdown = ({ 
    isOpen, 
    onClose, 
    filterData, 
    onFilterChange, 
    onApplyFilter, 
    onResetFilters, 
    searchIcon 
}) => {
    const dropdownRef = useRef(null);

    // Закриття по кліку поза межами
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Закриття по Escape
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="filter-dropdown" ref={dropdownRef}>
            {/* Стрілочка що вказує на кнопку */}
            <div className="filter-dropdown__arrow"></div>
            
            {/* Контент фільтра */}
            <div className="filter-dropdown__content">
                <div className="filter-dropdown__header">
                    <h3 className="filter-dropdown__title">Фільтри нарахувань</h3>
                    <button 
                        className="filter-dropdown__close"
                        onClick={onClose}
                        title="Закрити"
                    >
                        ✕
                    </button>
                </div>

                <div className="filter-dropdown__body">
                    {/* Поле для пошуку по назві платника */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Назва платника</label>
                        <Input
                            icon={searchIcon}
                            name="payer_name"
                            type="text"
                            placeholder="Введіть назву платника"
                            value={filterData?.payer_name || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для податкового номера */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Податковий номер</label>
                        <Input
                            icon={searchIcon}
                            name="tax_number"
                            type="text"
                            placeholder="Введіть податковий номер"
                            value={filterData?.tax_number || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для платежу */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Платіж</label>
                        <Input
                            icon={searchIcon}
                            name="payment_info"
                            type="text"
                            placeholder="Введіть інформацію про платіж"
                            value={filterData?.payment_info || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для класифікатора */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Класифікатор</label>
                        <Input
                            icon={searchIcon}
                            name="tax_classifier"
                            type="text"
                            placeholder="Введіть класифікатор"
                            value={filterData?.tax_classifier || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для номера рахунку */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Номер рахунку</label>
                        <Input
                            icon={searchIcon}
                            name="account_number"
                            type="text"
                            placeholder="Введіть номер рахунку"
                            value={filterData?.account_number || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для кадастрового номера */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Кадастровий номер</label>
                        <Input
                            icon={searchIcon}
                            name="cadastral_number"
                            type="text"
                            placeholder="Введіть кадастровий номер"
                            value={filterData?.cadastral_number || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для точної суми */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Точна сума нарахування (₴)</label>
                        <Input
                            name="amount"
                            type="number"
                            step="0.01"
                            placeholder="Введіть точну суму"
                            value={filterData?.amount || ''}
                            onChange={onFilterChange}
                        />
                        <div className="filter-dropdown__sublabel">
                            Введіть точну суму для пошуку конкретного нарахування
                        </div>
                    </div>
                </div>

                {/* Кнопки дій */}
                <div className="filter-dropdown__footer">
                    <Button 
                        className="filter-dropdown__apply"
                        onClick={onApplyFilter}
                    >
                        Застосувати
                    </Button>
                    <Button 
                        className="filter-dropdown__reset"
                        onClick={onResetFilters}
                    >
                        Скинути
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DebtChargesFilterDropdown;