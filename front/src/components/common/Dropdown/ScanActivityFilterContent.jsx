// Кастомний контент фільтрів для логів сканування (для передачі через children)
import React from 'react';
import Input from "../Input/Input";

const ScanActivityFilterContent = ({ filterData, onFilterChange, searchIcon }) => {
    return (
        <>
            {/* Місце сканування */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Місце сканування</label>
                <Input
                    icon={searchIcon}
                    name="scan_location"
                    type="text"
                    placeholder="Пошук по місцю сканування"
                    value={filterData?.scan_location || ''}
                    onChange={onFilterChange}
                />
            </div>

            {/* ID квитанції */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">ID квитанції</label>
                <Input
                    icon={searchIcon}
                    name="identifier"
                    type="text"
                    placeholder="Пошук по ID квитанції"
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
                    placeholder="Пошук по ПІБ"
                    value={filterData?.name || ''}
                    onChange={onFilterChange}
                />
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

            {/* Дата сканування */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Дата сканування</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="scan_date_from"
                        type="date"
                        placeholder="Від"
                        value={filterData?.scan_date_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="scan_date_to"
                        type="date"
                        placeholder="До"
                        value={filterData?.scan_date_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>

            {/* Час сканування */}
            <div className="filter-dropdown__item">
                <label className="filter-dropdown__label">Час сканування</label>
                <div className="filter-dropdown__range">
                    <Input
                        name="scan_time_from"
                        type="time"
                        step="1"
                        placeholder="Від"
                        value={filterData?.scan_time_from || ''}
                        onChange={onFilterChange}
                    />
                    <span className="filter-dropdown__range-separator">-</span>
                    <Input
                        name="scan_time_to"
                        type="time"
                        step="1"
                        placeholder="До"
                        value={filterData?.scan_time_to || ''}
                        onChange={onFilterChange}
                    />
                </div>
            </div>
        </>
    );
};

export default ScanActivityFilterContent;