const { itemsPerPage, allowedLogTableFilterFields, displayFieldsLogs, allowedSecureLogTableFilterFields, allowedBlackListTableFilterFields, displayBlackListFields, allowBlackListUpdate, allowedDetailedLogFields, allowedAdminSearchLogFields,allowedMessagesLogFields } = require("../../../utils/constants")
const { NotFoundErrorMessage, deleteError } = require("../../../utils/messages")
const { paginate, paginationData, filterData, filterRequestBody } = require("../../../utils/function")
const logRepository = require('../repository/log-repository')

class LogService {

    async getAllLogs(request) {
        const { cursor, sort = 'DESC', limit, ...whereConditions } = request.body
        const limitResult = limit && itemsPerPage.find(el => el === limit)
        const itemsLength = limitResult ?? itemsPerPage[0]
        const cursorId = cursor
        const sortOrder = sort ?? 'DESC'
        const allowedFields = allowedLogTableFilterFields.filter(el => whereConditions[el]).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const logData = await logRepository.allLogs(itemsLength, cursorId, sortOrder, allowedFields)
        let nextCursor = null;
        let prevCursor = null;

        if (logData.length > itemsLength) {
            if (sort === 'ASC') {
                nextCursor = logData[0].id
                prevCursor = logData[logData.length - 2].id
                logData.pop()
                logData.reverse()
            }
            else {
                nextCursor = logData[logData.length - 2].id
                prevCursor = cursorId ? logData[0].id : null
                logData.pop();
            }

            return {
                data: logData,
                next: nextCursor,
                prev: prevCursor,
            }
        }

        else {
            if (sort === 'ASC') {
                logData.reverse()
                nextCursor = logData[logData.length - 1]?.id
                prevCursor = null
            }
            else {
                nextCursor = null
                prevCursor = cursorId ? logData[0]?.id : null
            }

            return {
                data: logData,
                next: nextCursor,
                prev: prevCursor,
            }
        }
    }

    async findLogById(request) {
        const logData = await logRepository.findLogById(request.params?.id, displayFieldsLogs)
        if (logData.length === 0) {
            throw new Error(NotFoundErrorMessage)
        }
        return logData
    }

    async allSecureLog(request) {
        const { cursor, sort = 'DESC', limit, ...whereConditions } = request.body
        const limitResult = limit && itemsPerPage.find(el => el === limit)
        const itemsLength = limitResult ?? itemsPerPage[0]
        const cursorId = cursor
        const sortOrder = sort ?? 'DESC'
        const allowedFields = allowedSecureLogTableFilterFields.filter(el => whereConditions[el]).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const logData = await logRepository.allSecureLog(itemsLength, cursorId, sortOrder, allowedFields)
        let nextCursor = null;
        let prevCursor = null;

        if (logData.length > itemsLength) {
            if (sort === 'ASC') {
                nextCursor = logData[0].id
                prevCursor = logData[logData.length - 2].id
                logData.pop()
                logData.reverse()
            }
            else {
                nextCursor = logData[logData.length - 2].id
                prevCursor = cursorId ? logData[0].id : null
                logData.pop();
            }

            return {
                data: logData,
                next: nextCursor,
                prev: prevCursor,
            }
        }

        else {
            if (sort === 'ASC') {
                logData.reverse()
                nextCursor = logData[logData.length - 1]?.id
                prevCursor = null
            }
            else {
                nextCursor = null
                prevCursor = cursorId ? logData[0]?.id : null
            }

            return {
                data: logData,
                next: nextCursor,
                prev: prevCursor,
            }
        }
    }

    async allBlackListIp(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body
        const { offset } = paginate(page, limit)
        const allowedFields = allowedBlackListTableFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const userData = await logRepository.allBlackListIp(limit, offset, allowedFields, displayBlackListFields)
        return paginationData(userData[0], page, limit)
    }

    async addToBlacklistIP(request) {
        const filteredData = filterRequestBody(request.body)
        const data = filterData(filteredData, allowBlackListUpdate)
        await logRepository.addToBlacklistIP(Object.assign(data, { 'uid': request?.user?.id }))
    }

    async removeFromBlacklistIP(request) {
        const result = await logRepository.removeFromBlacklistIP(request.params.id)
        if (!result.length) {
            throw new Error(deleteError)
        }
        await logRepository.updateDeleteRecord(request?.user?.id, result[0].id)
    }

    async detailedLog(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body
        const { offset } = paginate(page, limit)
        const allowedFields = allowedDetailedLogFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const logData = await logRepository.detailedLog(limit, offset, allowedFields)
        return paginationData(logData[0], page, limit)
    }

    async getMessagesLog(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body;
        const { offset } = paginate(page, limit);
        const allowedFields = allowedMessagesLogFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});
        const logData = await logRepository.getMessagesLog(limit, offset, allowedFields);
        return paginationData(logData[0], page, limit);
    }
    async owerSearchLog(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body
        const { offset } = paginate(page, limit)
        
        // Дозволені поля для фільтрації логів пошуку заборгованостей
        const allowedOwnerLogFields = [
            'name', 'dateFrom', 'dateTo', 'source', 'chat_id', 'ip'
        ];
        
        const allowedFields = allowedOwnerLogFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const logData = await logRepository.owerSearchLog(limit, offset, allowedFields)
        return paginationData(logData[0], page, limit)
    }
    
    // Експорт логів пошуку заборгованостей
    async getOwnerSearchLogForExport(filters = {}) {
        try {
            const data = await logRepository.getOwnerSearchLogForExport(filters);
            return data;
        } catch (error) {
            throw new Error(`Помилка генерації логів заборгованостей: ${error.message}`);
        }
    }
    async generateOwnerSearchExcelReport(data, filters = {}) {
        try {
            const XLSX = require('xlsx');
            
            // Підготовка даних для Excel
            const excelData = data.map(row => ({
                'ID': row.id || '',
                'Дата запиту': row.formatted_date || '',
                'Ім\'я для пошуку': row.name || '',
                'Джерело запиту': row.source_display || '',
                'Chat ID (Телеграм)': row.chat_id || '',
                'IP адреса (Сайт)': row.ip || '',
                'Рік': row.search_year || '',
                'Місяць': row.search_month_name || '',
                'День тижня': row.search_day_name || '',
                'Час запиту': row.search_time || ''
            }));
    
            // Створення робочого листа
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Лог пошуку заборгованостей');
    
            // Налаштування ширини колонок
            const colWidths = [
                { wch: 15 }, // ID
                { wch: 20 }, // Дата
                { wch: 30 }, // Ім'я
                { wch: 15 }, // Джерело
                { wch: 15 }, // Chat ID
                { wch: 15 }, // IP
                { wch: 8 },  // Рік
                { wch: 12 }, // Місяць
                { wch: 15 }, // День тижня
                { wch: 10 }  // Час
            ];
            worksheet['!cols'] = colWidths;
    
            // Генерація buffer'у
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            return buffer;
        } catch (error) {
            throw new Error(`Помилка генерації Excel файлу: ${error.message}`);
        }
    }
    

    async getAccessGroups() {
        try {
            const groups = await logRepository.getAccessGroups();
            return groups;
        } catch (error) {
            throw new Error(`Помилка отримання списку груп: ${error.message}`);
        }
    }

    async adminSearchLog(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body
        const { offset } = paginate(page, limit)
        
        // Розширені дозволені поля для фільтрації
        const extendedAllowedFields = [
            ...allowedAdminSearchLogFields,
            'payment_status',
            'effective_only', 
            'can_check_now'
        ]
        
        const allowedFields = extendedAllowedFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const logData = await logRepository.adminSearchLogWithPayments(limit, offset, allowedFields)
        return paginationData(logData[0], page, limit)
    }

    // Оновлення статусу оплати з можливістю примусового оновлення
    async updatePaymentStatus(searchId, force = false) {
        try {
            const result = await logRepository.updatePaymentStatus(searchId, force);
            if (result && result[0]) {
                return result[0].result || result[0].update_payment_status_with_history || 'Статус оновлено успішно';
            }
            return 'Статус оновлено успішно';
        } catch (error) {
            throw new Error(`Помилка оновлення статусу оплати: ${error.message}`);
        }
    }
    
    // Масове оновлення з розширеними налаштуваннями
    async updateAllPaymentStatuses(limit = 100, force = false, adminName = null, daysBack = null) {
        try {
            const result = await logRepository.updateAllPaymentStatusesAdvanced(limit, force, adminName, daysBack);
            
            if (result && result[0]) {
                const stats = result[0];
                return {
                    message: `Масове оновлення завершено. ${stats.details}`,
                    stats: {
                        processed: stats.processed_count,
                        successful: stats.successful_count,
                        errors: stats.error_count,
                        duration: stats.duration
                    }
                };
            }
            
            return {
                message: 'Масове оновлення завершено',
                stats: { processed: 0, successful: 0, errors: 0 }
            };
        } catch (error) {
            throw new Error(`Помилка масового оновлення статусів: ${error.message}`);
        }
    }

    // Статистика готовності до перевірки
    async getCheckReadinessStats() {
        try {
            const stats = await logRepository.getCheckReadinessStats();
            if (stats && stats[0]) {
                const data = stats[0];
                return {
                    totalRecords: parseInt(data.total_records || 0),
                    notChecked: parseInt(data.not_checked || 0),
                    checked: parseInt(data.checked || 0),
                    problematic: parseInt(data.problematic || 0),
                    readyToCheck: parseInt(data.ready_to_check || 0),
                    completionPercent: parseFloat(data.completion_percent || 0)
                };
            }
            return {
                totalRecords: 0,
                notChecked: 0,
                checked: 0,
                problematic: 0,
                readyToCheck: 0,
                completionPercent: 0
            };
        } catch (error) {
            throw new Error(`Помилка отримання статистики готовності: ${error.message}`);
        }
    }

    // Діагностика конкретної перевірки
    async diagnosePaymentCheck(searchId) {
        try {
            // Спочатку отримуємо дані запису
            const record = await logRepository.getSearchRecordById(searchId);
            if (!record || record.length === 0) {
                throw new Error('Запис не знайдено');
            }

            const recordData = record[0];
            
            // Запускаємо діагностику
            const diagnosis = await logRepository.diagnosePaymentCheck(
                recordData.searched_person_name,
                recordData.searched_person_id,
                recordData.created_at
            );

            return {
                record: {
                    searchId: parseInt(searchId),
                    personName: recordData.searched_person_name,
                    personId: recordData.searched_person_id,
                    searchDate: recordData.created_at
                },
                diagnosis: diagnosis || []
            };
        } catch (error) {
            throw new Error(`Помилка діагностики: ${error.message}`);
        }
    }

    // Звіт ефективності для експорту з новими полями
    async getEffectivenessReportForExport(filters = {}) {
        try {
            const data = await logRepository.getEffectivenessReportAdvanced(filters);
            return data;
        } catch (error) {
            throw new Error(`Помилка генерації звіту ефективності: ${error.message}`);
        }
    }

    // Генерація Excel звіту
    async generateExcelReport(data, filters = {}) {
        try {
            const XLSX = require('xlsx');
            
            // Підготовка даних для Excel
            const excelData = data.map(row => ({
                'П.І.Б адміністратора': this.sanitizeString(row.admin_full_name || ''),
                'Username': this.sanitizeString(row.username || ''),
                'Кого шукав': this.sanitizeString(row.searched_person_name || ''),
                'Результат пошуку': this.sanitizeString(row.search_result || ''),
                'Статус оплати': this.sanitizeString(row.result_display || row.payment_status || ''),
                'Ефективність': row.admin_was_effective === true ? 'Так' : row.admin_was_effective === false ? 'Ні' : 'Не визначено',
                'Сума оплати (грн)': this.sanitizeString(row.payment_amount ? (row.payment_amount / 100).toFixed(2) : '0.00'),
                'Зміна боргу (грн)': this.sanitizeString(row.debt_change ? row.debt_change.toFixed(2) : '0.00'),
                'Старий борг (грн)': this.sanitizeString(row.old_total_debt ? row.old_total_debt.toFixed(2) : '0.00'),
                'Новий борг (грн)': this.sanitizeString(row.new_total_debt ? row.new_total_debt.toFixed(2) : '0.00'),
                'Дата пошуку': this.sanitizeString(row.formatted_search_date || ''),
                'Дата перевірки оплати': this.sanitizeString(row.payment_check_date || ''),
                'Готовність до перевірки': this.sanitizeString(row.check_readiness || ''),
                'Примітки': this.sanitizeString(row.payment_notes || '')
            }));

            const cols = [
                {wch: 25}, // П.І.Б адміністратора
                {wch: 15}, // Username
                {wch: 20}, // Кого шукав
                {wch: 15}, // Результат пошуку
                {wch: 15}, // Статус оплати
                {wch: 12}, // Ефективність
                {wch: 15}, // Сума оплати
                {wch: 15}, // Зміна боргу
                {wch: 15}, // Старий борг
                {wch: 15}, // Новий борг
                {wch: 18}, // Дата пошуку
                {wch: 20}, // Дата перевірки оплати
                {wch: 20}, // Готовність до перевірки
                {wch: 30}  // Примітки
            ];
            worksheet['!cols'] = cols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Звіт ефективності');
    
            const buffer = XLSX.write(workbook, { 
                type: 'buffer', 
                bookType: 'xlsx',
                compression: true 
            });
            console.log('Generated Excel buffer size:', buffer.length);
            console.log('First few bytes:', buffer.slice(0, 10));
            
            return buffer;
            // Створення робочого листа
            //const worksheet = XLSX.utils.json_to_sheet(excelData);
            //const workbook = XLSX.utils.book_new();
            //XLSX.utils.book_append_sheet(workbook, worksheet, 'Звіт ефективності');

            // Генерація buffer'у
            //const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            //return buffer;
        } catch (error) {
            throw new Error(`Помилка генерації Excel файлу: ${error.message}`);
        }
    }
    
    // Існуючі методи
    async getEffectivenessReport(filters) {
        try {
            const data = await logRepository.getEffectivenessReport(filters);
            return data;
        } catch (error) {
            throw new Error(`Помилка генерації звіту ефективності: ${error.message}`);
        }
    }
    
    async importRegistryToHistory(registryDate) {
        try {
            const result = await logRepository.importRegistryToHistory(registryDate);
            return `Реєстр за ${registryDate} успішно імпортовано до історії. ${result}`;
        } catch (error) {
            throw new Error(`Помилка імпорту реєстру до історії: ${error.message}`);
        }
    }

    // Отримання списку доступних реєстрів
    async getAvailableRegistries() {
        try {
            const registries = await logRepository.getAvailableRegistries();
            return registries;
        } catch (error) {
            throw new Error(`Помилка отримання списку реєстрів: ${error.message}`);
        }
    }

    // Перевірка стану системи
    async getSystemHealthCheck() {
        try {
            const health = await logRepository.getSystemHealthCheck();
            return health;
        } catch (error) {
            throw new Error(`Помилка перевірки стану системи: ${error.message}`);
        }
    }
}

module.exports = new LogService()