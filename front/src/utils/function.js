import API from "../http";
import * as yup from 'yup';
import {accessGroupItem, fetchTimeout} from "./constants";

export const debounce = (fn, ms) => {
    let timer
    return _ => {
        clearTimeout(timer)
        timer = setTimeout(_ => {
            timer = null
            fn()
        }, ms)
    };
}

export const DOTS = '...';

export const range = (start, end) => {
    let length = end - start + 1;
    return Array.from({length}, (_, idx) => idx + start);
}

export const handleKeyDown = (e) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
        e.preventDefault();
    }
}

export const uuid_v4 = () => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => {
            return ((c ^ crypto.getRandomValues(new Uint8Array(1))[0]) & (15 >> c / 4)).toString(16)
        }
    );
}

export const handlePhoneChange = (event) => {
    let formattedPhoneNumber = event.replace(/\D/g, '');
    if (formattedPhoneNumber.length > 10) {
        formattedPhoneNumber = formattedPhoneNumber.slice(0, 10);
    }
    if (formattedPhoneNumber.length > 3) {
        formattedPhoneNumber = `(${formattedPhoneNumber.slice(0, 3)}) ${formattedPhoneNumber.slice(3)}`;
    }
    if (formattedPhoneNumber.length >= 10) {
        formattedPhoneNumber = `${formattedPhoneNumber.slice(0, 9)}-${formattedPhoneNumber.slice(9)}`;
    }
    return formattedPhoneNumber;
};

export const validateFilters = (selectData) => {
    const { dateFrom, dateTo, year, month, groupNumber, periodType } = selectData;
    
    // Валідація дат (залишається без змін)
    if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return {
                error: true,
                message: 'Невірний формат дати'
            };
        }
        
        if (fromDate > toDate) {
            return {
                error: true,
                message: 'Дата "З" не може бути більшою за дату "По"'
            };
        }
        
        const diffInDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
        if (diffInDays > 730) {
            return {
                error: true,
                message: 'Діапазон дат не може перевищувати 2 роки'
            };
        }
    }
    
    // Валідація року (залишається без змін)
    if (year) {
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
            return {
                error: true,
                message: 'Рік має бути між 2020 та 2030'
            };
        }
    }

    // ВИПРАВЛЕННЯ: правильна валідація місяця
    if (month) {
        let monthNum;
        
        // Якщо month це об'єкт з Select
        if (typeof month === 'object' && month.value) {
            monthNum = parseInt(month.value);
        } else {
            monthNum = parseInt(month);
        }
        
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return {
                error: true,
                message: 'Невірний номер місяця'
            };
        }
    }
    
    // Повертаємо валідні дані
    const validatedData = {};
    
    if (dateFrom) validatedData.dateFrom = dateFrom;
    if (dateTo) validatedData.dateTo = dateTo;
    if (year) validatedData.year = parseInt(year);
    
    // ВИПРАВЛЕННЯ: правильно обробляємо month
    if (month) {
        if (typeof month === 'object' && month.value) {
            validatedData.month = parseInt(month.value);
        } else {
            validatedData.month = parseInt(month);
        }
    }
    
    // Обробка groupNumber (залишається без змін)
    if (groupNumber) {
        if (typeof groupNumber === 'object' && groupNumber.value) {
            validatedData.groupNumber = groupNumber.value;
        } else if (typeof groupNumber === 'string') {
            validatedData.groupNumber = groupNumber;
        }
    }
    
    if (periodType) validatedData.periodType = periodType;
    
    return {
        error: false,
        ...validatedData
    };
};

export const isValidDate = (dateString) => {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!pattern.test(dateString)) {
        return false;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }
    return true;
}

export const fetchFunction = (url, options = {}) => {
    return API({
        url,
        timeout: fetchTimeout,
        ...options,
    })
}

export const createValidationSchema = (fieldValidations) => {
    const schemaFields = {};

    fieldValidations.forEach(({fieldName, validationRule}) => {
        schemaFields[fieldName] = validationRule;
    });
    return yup.object().shape(schemaFields);
};

export const hasOnlyAllowedParams = (searchParams = {}, allowedKeys = []) => {
    if (!searchParams || Object.keys(searchParams).length === 0) {
        return false;
    }

    if (!Array.isArray(allowedKeys)) {
        return false;
    }
    for (const key in searchParams) {
        if (!allowedKeys.includes(key)) {
            return false;
        }
    }
    return true;
}

export const getKey = (key, items) => {
    return items?.reduce((acc, el) => {
        const children = el?.children && el.children.find(obj => obj.key === key)
        if (children) {
            return children?.['module_name']
        }
        return el.key === key ? el?.['module_name'] : acc
    }, '')
}

export const generateRole = (data) => {
    return data.reduce((acc, item) => {
        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
            item.children.forEach(child => {
                acc[child.module_id] = [];
            });
        }
        return acc;
    }, {});
}

export const generateBreadcrumb = (pathname, items) => {
    const paramsLocation = pathname.split("/").filter(v => v.length > 0);
    const crumbList = paramsLocation.map((name, index) => {
        const routeTo = paramsLocation[index]
        const nameCrumb = getKey(paramsLocation[index], items)
        if (routeTo === 'profile' && !nameCrumb) {
            return {
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
                breadcrumbName: 'Профіль'
            }
        } else if (routeTo === 'add' && !nameCrumb) {
            return {
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
                breadcrumbName: 'Додати'
            }
        } else if (routeTo === 'edit' && !nameCrumb) {
            return {
                breadcrumbName: 'Редагувати',
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
            }

        } else if (routeTo === 'access' && !nameCrumb) {
            return {
                breadcrumbName: 'Доступ',
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
            }

        } else {
            return {
                path: `/${paramsLocation.slice(0, index + 1).join("/")}`,
                breadcrumbName: nameCrumb ? nameCrumb : routeTo
            }
        }
    })
    return [{path: "/", breadcrumbName: "Dashboard"}, ...crumbList]
}

export const cleanValue = (value, isMulti) => {
    const isValidOption = option => option && typeof option === 'object' && (option.value || typeof option.value === 'boolean') && option.label;
    if (value && !isMulti) {
        if (Array.isArray(value)) {
            return value.length > 0 && isValidOption(value[0]) ? value[0] : null;
        }
        return isValidOption(value) ? value : null;
    } else if (value && isMulti && !Array.isArray(value)) {
        return isValidOption(value) ? [value] : [];
    } else if (isMulti && value && Array.isArray(value) && value.length > 0) {
        return value.filter(isValidOption)
    } else {
        return isMulti ? [] : null
    }
}

export const transformPermissionsToSelectFormat = (permissions) => {
    if (!permissions || Object.keys(permissions).length === 0) {
        return {}
    }

    const selectFormat = {};
    Object.keys(permissions).forEach(key => {
        selectFormat[key] = permissions[key].map(value => {
            const option = accessGroupItem?.find(item => item?.value === value);
            return option || {label: value, value};
        });
    });
    return selectFormat;
};

export const transformSelectFormatToPermissions = (listMenu) => {
    if (!listMenu || Object.keys(listMenu).length === 0) {
        return {}
    }
    const permissions = {};
    Object.keys(listMenu).forEach(key => {
        permissions[key] = listMenu[key].map(item => item.value);
    });
    return permissions;
};

export const transformData = (data = {}) => {
    return Object.entries(data).reduce((acc, [key, value]) => {
        if (Array.isArray(value)) {
            if (key === 'photo') {
                if (value.length > 0) {
                    acc[key] = value[0];
                } else {
                    acc[key] = {};
                }
            } else if (value.length === 0) {
                acc[key] = value;
            } else {
                const isValueLabelArray = value.every(
                    (item) =>
                        typeof item === 'object' &&
                        item !== null &&
                        'value' in item &&
                        'label' in item
                );

                if (isValueLabelArray && value.length === 2) {
                    acc[key] = value.reduce((accumulator, current, index, array) => {
                        return index === array.length - 1
                            ? accumulator + current.value
                            : accumulator + current.value + ',';
                    }, '');
                } else {
                    acc[key] = value;
                }
            }
        } else if (value && !Array.isArray(value) && typeof value === 'object') {
            const valueKeys = Object.keys(value);
            if (value?.label && value?.value && valueKeys.length === 2) {
                acc[key] = value?.value
            } else {
                acc[key] = value
            }
        } else {
            acc[key] = value
        }
        return acc;
    }, {});
}

export const formatDateUa = (date) => new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
}).format(new Date(date))