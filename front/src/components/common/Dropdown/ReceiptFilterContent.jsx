// Кастомний контент фільтрів для квитанцій (для передачі через children)
import React, { useState } from 'react';
import Input from "../Input/Input";

export const ReceiptFiltersContent = ({ filterData, onFilterChange, searchIcon }) => {
    const [isGenderOpen, setIsGenderOpen] = useState(false);
    
    // Опції для статі
    const genderOptions = [
        { value: '', label: 'Всі' },
        { value: 'male', label: 'Чоловіча' },
        { value: 'female', label: 'Жіноча' }
    ];

    const selectedGender = genderOptions.find(option => option.value === (filterData?.gender || ''));

    const handleGenderSelect = (value) => {
        onFilterChange('gender', value);
        setIsGenderOpen(false);
    };

    return (
        <>
            {/* ID квитанції */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">ID квитанції</label>
                <Input
                    icon={searchIcon}
                    name="identifier"
                    type="text"
                    placeholder="123456"
                    maxLength="6"
                    value={filterData?.identifier || ''}
                    onChange={onFilterChange}
                />
            </div>

            {/* П.І.Б. */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">П.І.Б.</label>
                <Input
                    icon={searchIcon}
                    name="name"
                    type="text"
                    placeholder="Введіть прізвище або ПІБ"
                    value={filterData?.name || ''}
                    onChange={onFilterChange}
                />
            </div>

            {/* Стать */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Стать</label>
                <div className="filter-dropdown__custom-select">
                    <div 
                        className="filter-dropdown__select-input"
                        onClick={() => setIsGenderOpen(!isGenderOpen)}
                    >
                        <span>{selectedGender?.label || 'Всі'}</span>
                        <span className={`filter-dropdown__select-arrow ${isGenderOpen ? 'open' : ''}`}>▼</span>
                    </div>
                    {isGenderOpen && (
                        <div className="filter-dropdown__select-options">
                            {genderOptions.map(option => (
                                <div 
                                    key={option.value}
                                    className={`filter-dropdown__select-option ${
                                        (filterData?.gender || '') === option.value ? 'selected' : ''
                                    }`}
                                    onClick={() => handleGenderSelect(option.value)}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Громадянство */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Громадянство</label>
                <Input
                    icon={searchIcon}
                    name="citizenship"
                    type="text"
                    placeholder="Наприклад: Україна"
                    value={filterData?.citizenship || ''}
                    onChange={onFilterChange}
                />
            </div>

            {/* Дата прибуття */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата прибуття</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="arrival_date_from"
                        type="date"
                        placeholder="Від"
                        value={filterData?.arrival_date_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="arrival_date_to"
                        type="date"
                        placeholder="До"
                        value={filterData?.arrival_date_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Дата відʼїзду */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата відʼїзду</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="departure_date_from"
                        type="date"
                        placeholder="Від"
                        value={filterData?.departure_date_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="departure_date_to"
                        type="date"
                        placeholder="До"
                        value={filterData?.departure_date_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Сума */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Сума (₴)</label>
                <div className="filter-dropdown__range">
                    <Input
                        icon={searchIcon}
                        name="amount_from"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Від"
                        value={filterData?.amount_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        icon={searchIcon}
                        name="amount_to"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="До"
                        value={filterData?.amount_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Кількість сканувань */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Кількість сканувань</label>
                <div className="filter-dropdown__range">
                    <Input
                        icon={searchIcon}
                        name="counter_from"
                        type="number"
                        min="0"
                        placeholder="Від"
                        value={filterData?.counter_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        icon={searchIcon}
                        name="counter_to"
                        type="number"
                        min="0"
                        placeholder="До"
                        value={filterData?.counter_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>
        </>
    );
};

export default ReceiptFiltersContent;