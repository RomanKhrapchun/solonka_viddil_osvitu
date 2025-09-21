const receiptRepository = require("../repository/receipt-repository");
const { fieldsListMissingError, NotFoundErrorMessage } = require("../../../utils/messages");
const { paginate, paginationData } = require("../../../utils/function");
const logRepository = require("../../log/repository/log-repository");
const adminSearchRepository = require("../../admin_search_details/repository/admin-search-repository");
const Logger = require("../../../utils/logger");


const allowedScanActivitySortFields = ['scan_date', 'scan_location', 'identifier', 'name', 'counter'];

const allowedScanActivityTableFilterFields = [
    'scan_location', 'identifier', 'name', 'counter_from', 'counter_to',
    'scan_date_from', 'scan_date_to', 'scan_time_from', 'scan_time_to'
];

// Константи для роботи з квитанціями
const displayReceiptFields = [
    'id', 'identifier', 'name', 'date', 'counter', 'created_at', 'updated_at', 
    'gender', 'citizenship', 'arrival_date', 'departure_date', 'amount'
];

const allowedReceiptTableFilterFields = [
    'identifier', 'name', 'date_from', 'date_to', 'gender', 'citizenship', 
    'arrival_date_from', 'arrival_date_to', 'departure_date_from', 'departure_date_to',
    'amount_from', 'amount_to', 'counter_from', 'counter_to'
];

const allowedReceiptSortFields = [
    'identifier', 'name', 'date', 'counter', 'created_at', 'updated_at', 
    'gender', 'citizenship', 'arrival_date', 'departure_date', 'amount'
];

class ReceiptService {

    // 🔍 Перевірка квитанції по identifier (залишаємо оригінальний метод)
    async checkReceiptByIdentifier(request) {
        const { identifier } = request.body;

        // Валідація
        if (!identifier) {
            throw new Error('Не передано номер квитанції (identifier)');
        }

        if (!/^\d{6}$/.test(identifier)) {
            throw new Error('Номер квитанції має складатися з рівно 6 цифр');
        }

        // Пошук квитанції
        const receipt = await receiptRepository.getReceiptByIdentifier(identifier);

        if (!receipt) {
            return {
                success: false,
                message: "Квитанцію з таким номером не знайдено",
                error: "Інформація за цим номером відсутня в базі даних",
                name: null,
                date: null,
                counter: 0
            };
        }

        // Збільшуємо counter
        await receiptRepository.incrementCounter(identifier);

        return {
            success: true,
            message: "Квитанцію успішно знайдено",
            name: receipt.name,
            date: receipt.date,
            counter: receipt.counter + 1 // +1 бо щойно збільшили
        };
    }

    // 📄 Отримання конкретної квитанції за ID (аналог getDebtByDebtorId)
    async getReceiptByReceiptId(request) {
        // Валідація
        if (!Object.keys(displayReceiptFields).length) {
            throw new Error(fieldsListMissingError);
        }

        const receiptId = request?.params?.id;
        if (!receiptId) {
            throw new Error('ID квитанції не вказано');
        }

        // Отримання основних даних
        const fetchData = await receiptRepository.getReceiptByReceiptId(receiptId, displayReceiptFields);
        
        if (!fetchData?.length) {
            throw new Error('Дані квитанції не знайдено');
        }

        const receipt = fetchData[0];

        // Логування перегляду
        // try {
        //     await logRepository.createLog({
        //         session_user_name: receipt.name,
        //         row_pk_id: receipt.id,
        //         uid: request?.user?.id,
        //         action: 'VIEW',
        //         client_addr: request?.ip,
        //         application_name: 'Перегляд деталей квитанції',
        //         action_stamp_tx: new Date(),
        //         action_stamp_stm: new Date(),
        //         action_stamp_clk: new Date(),
        //         schema_name: 'receipts',
        //         table_name: 'receipts',
        //         oid: '16504',
        //     });
        // } catch (logError) {
        //     Logger.error('Помилка логування перегляду квитанції:', logError);
        // }

        return [receipt];
    }

    // 🔍 Пошук квитанцій з фільтрами (аналог findDebtByFilter)
    async findReceiptByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            title, 
            sort_by = null, 
            sort_direction = 'asc',
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        const isValidSortField = sort_by && allowedReceiptSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
    
        const validSortBy = isValidSortField ? sort_by : 'counter';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'desc';

        Logger.info('Sorting params received:', { sort_by, sort_direction });
        Logger.info('Validated sorting params:', { validSortBy, validSortDirection });

        // Фільтруємо тільки дозволені поля
        const allowedFields = allowedReceiptTableFilterFields
            .filter(el => whereConditions.hasOwnProperty(el))
            .reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        // Отримання даних
        const receiptData = await receiptRepository.findReceiptByFilter(
            limit, 
            offset, 
            title,  
            allowedFields, 
            displayReceiptFields,
            validSortBy,
            validSortDirection
        );

        // Логування пошуку
        // if (title || whereConditions?.identifier) {
        //     try {
        //         const logEntryId = await logRepository.createLog({
        //             row_pk_id: null,
        //             uid: request?.user?.id,
        //             action: 'SEARCH',
        //             client_addr: request?.ip,
        //             application_name: 'Пошук квитанції',
        //             action_stamp_tx: new Date(),
        //             action_stamp_stm: new Date(),
        //             action_stamp_clk: new Date(),
        //             schema_name: 'receipts',
        //             table_name: 'receipts',
        //             oid: '16504',
        //         });

        //         await adminSearchRepository.create({
        //             logger_id: logEntryId[0].id,
        //             searched_person_name: title || 'Unknown',
        //             searched_person_id: whereConditions?.identifier || receiptData[0].data?.identifier || null,
        //             search_type: 'receipt_search',
        //             search_result: receiptData[0]?.count > 0 ? 'found' : 'not_found',
        //             created_at: new Date()
        //         });
        //     } catch (logError) {
        //         Logger.error('Помилка логування пошуку квитанції:', logError);
        //     }
        // }

        const paginatedData = paginationData(receiptData[0], page, limit);
    
        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    // 📋 Отримання списку квитанцій з фільтрами (покращений існуючий)
    async getReceiptsList(request) {
        const {
            page = 1,
            limit = 16,
            sort_by = 'counter',
            sort_direction = 'desc',
            identifier,
            name,
            date_from,
            date_to,
            counter_from,
            counter_to,
            gender,
            citizenship,
            arrival_date_from,
            arrival_date_to,
            arrival_date,
            departure_date_from,
            departure_date_to,
            departure_date,
            amount_from,
            amount_to,
            amount
        } = request.body;

        // Валідація пагінації
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

        // Валідація сортування
        const isValidSortField = allowedReceiptSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
        
        const validSortBy = isValidSortField ? sort_by : 'counter';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'desc';
        
        // Фільтри
        const filters = {
            identifier,
            name,
            date_from,
            date_to,
            counter_from: counter_from !== undefined ? parseInt(counter_from) : undefined,
            counter_to: counter_to !== undefined ? parseInt(counter_to) : undefined,
            gender,
            citizenship,
            arrival_date_to,
            arrival_date_from,
            departure_date_to,
            departure_date_from,
            amount_to,
            amount_from
        };
        console.log('filters', filters);
        // Отримання даних
        const { items, totalItems } = await receiptRepository.getReceiptsList(
            pageNum, 
            limitNum, 
            validSortBy, 
            validSortDirection, 
            filters
        );

        const totalPages = Math.ceil(totalItems / limitNum);

        return {
            success: true,
            items,
            totalItems,
            totalPages,
            currentPage: pageNum,
            pageSize: limitNum,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    // 📥 Експорт квитанцій (покращений існуючий)
    async exportReceipts(request) {
        const {
            identifier,
            name,
            date_from,
            date_to,
            counter_from,
            counter_to,
            gender,
            citizenship,
            arrival_date_from,
            arrival_date_to,
            departure_date_from,
            departure_date_to,
            arrival_date,
            departure_date,
            amount_from,
            amount_to,
            amount
        } = request.body;

        // Фільтри для експорту
        const filters = {
            identifier,
            name,
            date_from,
            date_to,
            counter_from: counter_from !== undefined ? parseInt(counter_from) : undefined,
            counter_to: counter_to !== undefined ? parseInt(counter_to) : undefined,
            gender,
            citizenship,
            arrival_date_from,
            arrival_date_to,
            departure_date_from,
            departure_date_to,
            amount_from: amount_from !== undefined ? parseFloat(amount_from) : undefined,
            amount_to: amount_to !== undefined ? parseFloat(amount_to) : undefined,
            amount
        };

        // Отримання всіх даних для експорту
        const receipts = await receiptRepository.exportReceipts(filters);

        // Логування експорту
        // try {
        //     await logRepository.createLog({
        //         row_pk_id: null,
        //         uid: request?.user?.id,
        //         action: 'EXPORT',
        //         client_addr: request?.ip,
        //         application_name: 'Експорт квитанцій',
        //         action_stamp_tx: new Date(),
        //         action_stamp_stm: new Date(),
        //         action_stamp_clk: new Date(),
        //         schema_name: 'receipts',
        //         table_name: 'receipts',
        //         oid: '16504',
        //     });
        // } catch (logError) {
        //     Logger.error('Помилка логування експорту квитанцій:', logError);
        // }

        return {
            success: true,
            items: receipts
        };
    }

    // ➕ Створення нової квитанції (залишаємо оригінальний)
    async createReceipt(request) {
        const { identifier, name, date, gender, citizenship, arrival_date, departure_date, amount } = request.body;

        // Валідація обов'язкових полів
        if (!identifier || !name || !date) {
            throw new Error('Поля identifier, name та date є обов\'язковими');
        }

        if (!/^\d{6}$/.test(identifier)) {
            throw new Error('Identifier має складатися з рівно 6 цифр');
        }

        // Перевірка унікальності
        const existingReceipt = await receiptRepository.getReceiptByIdentifier(identifier);
        if (existingReceipt) {
            throw new Error('Квитанція з таким номером вже існує');
        }

        // Створення
        const newReceipt = await receiptRepository.createReceipt({
            identifier,
            name: name.trim(),
            date,
            gender,
            citizenship,
            arrival_date,
            departure_date,
            amount: amount ? parseFloat(amount) : null
        });

        // Логування створення
        // try {
        //     await logRepository.createLog({
        //         session_user_name: name,
        //         row_pk_id: newReceipt.id,
        //         uid: request?.user?.id,
        //         action: 'INSERT',
        //         client_addr: request?.ip,
        //         application_name: 'Створення квитанції',
        //         action_stamp_tx: new Date(),
        //         action_stamp_stm: new Date(),
        //         action_stamp_clk: new Date(),
        //         schema_name: 'receipts',
        //         table_name: 'receipts',
        //         oid: '16504',
        //     });
        // } catch (logError) {
        //     Logger.error('Помилка логування створення квитанції:', logError);
        //}

        return {
            success: true,
            message: "Квитанцію успішно створено",
            data: newReceipt
        };
    }

    // ✏️ Оновлення квитанції (залишаємо оригінальний)
    async updateReceipt(request) {
        const receiptId = request.params?.id;
        const { identifier, name, date, counter, gender, citizenship, arrival_date, departure_date, amount } = request.body;

        if (!receiptId) {
            throw new Error('ID квитанції не вказано');
        }

        // Перевірка існування
        const existingReceipt = await receiptRepository.getReceiptByReceiptId(receiptId, displayReceiptFields);
        if (!existingReceipt || !existingReceipt.length) {
            throw new Error('Квитанцію не знайдено');
        }

        // Валідація identifier якщо змінюється
        if (identifier && !/^\d{6}$/.test(identifier)) {
            throw new Error('Identifier має складатися з рівно 6 цифр');
        }

        // Перевірка унікальності identifier
        if (identifier && identifier !== existingReceipt[0].identifier) {
            const duplicateReceipt = await receiptRepository.getReceiptByIdentifier(identifier);
            if (duplicateReceipt) {
                throw new Error('Квитанція з таким номером вже існує');
            }
        }

        // Підготовка даних для оновлення
        const updateData = {};
        if (identifier !== undefined) updateData.identifier = identifier;
        if (name !== undefined) updateData.name = name.trim();
        if (date !== undefined) updateData.date = date;
        if (counter !== undefined) updateData.counter = Math.max(0, parseInt(counter));
        if (gender !== undefined) updateData.gender = gender;
        if (citizenship !== undefined) updateData.citizenship = citizenship;
        if (arrival_date !== undefined) updateData.arrival_date = arrival_date;
        if (departure_date !== undefined) updateData.departure_date = departure_date;
        if (amount !== undefined) updateData.amount = amount ? parseFloat(amount) : null;

        // Оновлення
        const updatedReceipt = await receiptRepository.updateReceipt(receiptId, updateData);

        // Логування оновлення
        // try {
        //     await logRepository.createLog({
        //         session_user_name: updateData.name || existingReceipt[0].name,
        //         row_pk_id: receiptId,
        //         uid: request?.user?.id,
        //         action: 'UPDATE',
        //         client_addr: request?.ip,
        //         application_name: 'Оновлення квитанції',
        //         action_stamp_tx: new Date(),
        //         action_stamp_stm: new Date(),
        //         action_stamp_clk: new Date(),
        //         schema_name: 'receipts',
        //         table_name: 'receipts',
        //         oid: '16504',
        //     });
        // } catch (logError) {
        //     Logger.error('Помилка логування оновлення квитанції:', logError);
        // }

        return {
            success: true,
            message: "Квитанцію успішно оновлено",
            data: updatedReceipt
        };
    }

    async getScanActivitiesList(request) { 
        const {
            page = 1,
            limit = 16,
            sort_by = 'scan_date',
            sort_direction = 'desc',
            scan_location,
            identifier,
            name,
            counter_from,
            counter_to,
            scan_date_from,
            scan_date_to,
            scan_time_from,
            scan_time_to
        } = request.body;
    
        // Валідація пагінації
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    
        // Валідація сортування
        const isValidSortField = allowedScanActivitySortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
        
        const validSortBy = isValidSortField ? sort_by : 'scan_date';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'desc';
        
        // Фільтри
        const filters = {
            scan_location: scan_location?.trim(),
            identifier: identifier?.trim(),
            name: name?.trim(),
            counter_from: counter_from !== undefined && counter_from !== '' ? parseInt(counter_from) : undefined,
            counter_to: counter_to !== undefined && counter_to !== '' ? parseInt(counter_to) : undefined,
            scan_date_from: scan_date_from?.trim(),
            scan_date_to: scan_date_to?.trim(),
            scan_time_from: scan_time_from?.trim(),
            scan_time_to: scan_time_to?.trim()
        };
        
        console.log('Scan Activity filters:', filters);
        
        // Отримання даних через репозиторій
        const { items, totalItems } = await receiptRepository.getScanActivitiesList(
            pageNum, 
            limitNum, 
            validSortBy, 
            validSortDirection, 
            filters
        );
    
        const totalPages = Math.ceil(totalItems / limitNum);
    
        return {
            success: true,
            items,
            totalItems,
            totalPages,
            currentPage: pageNum,
            pageSize: limitNum,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }
}

const receiptService = new ReceiptService();
module.exports = receiptService;