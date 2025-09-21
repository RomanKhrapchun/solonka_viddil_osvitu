const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");
const { getSafeSortField, validateSortDirection } = require("../../../utils/constants");

// Розширені поля квитанцій з усіма новими полями
const displayReceiptFields = [
    'id', 'identifier', 'name', 'date', 'counter', 'created_at', 'updated_at',
    'gender', 'citizenship', 'arrival_date', 'departure_date', 'amount'
];

// Дозволені поля для сортування
const allowedReceiptSortFields = [
    'id', 'identifier', 'name', 'date', 'counter', 'created_at', 'updated_at',
    'gender', 'citizenship', 'arrival_date', 'departure_date', 'amount'
];

class ReceiptRepository {

    // 🔍 Пошук квитанції по identifier
    async getReceiptByIdentifier(identifier) {
        const sql = `
            SELECT ${displayReceiptFields.join(', ')} 
            FROM tourism.receipt 
            WHERE identifier = $1
        `;
        const result = await sqlRequest(sql, [identifier]);
        return result.length > 0 ? result[0] : null;
    }

    // 📈 Збільшення лічильника сканувань
    async incrementCounter(identifier) {
        const sql = `
            UPDATE tourism.receipt 
            SET counter = counter + 1, updated_at = CURRENT_TIMESTAMP
            WHERE identifier = $1
            RETURNING counter
        `;
        const result = await sqlRequest(sql, [identifier]);
        return result.length > 0 ? result[0].counter : 0;
    }

    // 📄 Отримання квитанції по ID (перейменований для сумісності з Service)
    async getReceiptByReceiptId(receiptId, fields = displayReceiptFields) {
        const sql = `
            SELECT ${fields.join(', ')} 
            FROM tourism.receipt 
            WHERE id = $1
        `;
        const result = await sqlRequest(sql, [receiptId]);
        return result;
    }

    // 📄 Залишаємо старий метод для зворотної сумісності
    async getReceiptById(receiptId) {
        const sql = `
            SELECT ${displayReceiptFields.join(', ')} 
            FROM tourism.receipt 
            WHERE id = $1
        `;
        const result = await sqlRequest(sql, [receiptId]);
        return result.length > 0 ? result[0] : null;
    }

    // 🔍 Пошук квитанцій з фільтрами (новий метод за зразком DebtorRepository)
    async findReceiptByFilter(limit, offset, title, allowedFields, fields, sortBy, sortDirection) {
        // Підготовка умов фільтрування
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Пошук по title (загальний пошук по name або identifier)
        if (title) {
            whereConditions.push(`(name ILIKE $${paramIndex} OR identifier ILIKE $${paramIndex + 1})`);
            queryParams.push(`%${title}%`, `%${title}%`);
            paramIndex += 2;
        }

        // Обробка специфічних фільтрів
        Object.keys(allowedFields).forEach(key => {
            const value = allowedFields[key];
            if (value !== null && value !== undefined && value !== '') {
                switch (key) {
                    case 'identifier':
                        whereConditions.push(`identifier ILIKE $${paramIndex}`);
                        queryParams.push(`%${value}%`);
                        paramIndex++;
                        break;
                    
                    case 'name':
                        whereConditions.push(`name ILIKE $${paramIndex}`);
                        queryParams.push(`%${value}%`);
                        paramIndex++;
                        break;
                    
                    case 'gender':
                        whereConditions.push(`gender = $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'citizenship':
                        whereConditions.push(`citizenship ILIKE $${paramIndex}`);
                        queryParams.push(`%${value}%`);
                        paramIndex++;
                        break;
                    
                    case 'date_from':
                        whereConditions.push(`date >= $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'date_to':
                        whereConditions.push(`date <= $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'arrival_date_from':
                        whereConditions.push(`arrival_date >= $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'arrival_date_to':
                        whereConditions.push(`arrival_date <= $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'departure_date_from':
                        whereConditions.push(`departure_date >= $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'departure_date_to':
                        whereConditions.push(`departure_date <= $${paramIndex}`);
                        queryParams.push(value);
                        paramIndex++;
                        break;
                    
                    case 'counter_from':
                        if (value !== null && value !== undefined && value !== '') {
                            whereConditions.push(`counter >= ${paramIndex}`);
                            queryParams.push(parseInt(value));
                            paramIndex++;
                        }
                        break;
                    
                    case 'counter_to':
                        if (value !== null && value !== undefined && value !== '') {
                            whereConditions.push(`counter <= ${paramIndex}`);
                            queryParams.push(parseInt(value));
                            paramIndex++;
                        }
                        break;
                    
                    case 'amount_from':
                        if (value !== null && value !== undefined && value !== '') {
                            whereConditions.push(`amount >= ${paramIndex}`);
                            queryParams.push(parseFloat(value));
                            paramIndex++;
                        }
                        break;
                    
                    case 'amount_to':
                        if (value !== null && value !== undefined && value !== '') {
                            whereConditions.push(`amount <= ${paramIndex}`);
                            queryParams.push(parseFloat(value));
                            paramIndex++;
                        }
                        break;
                }
            }
        });

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Валідація сортування
        const safeSortBy = allowedReceiptSortFields.includes(sortBy) ? sortBy : 'counter';
        const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

        // Запит для підрахунку
        const countSql = `
            SELECT COUNT(*) as count
            FROM tourism.receipt 
            ${whereClause}
        `;
        
        // Основний запит
        const mainSql = `
            SELECT ${fields.join(', ')}
            FROM tourism.receipt 
            ${whereClause}
            ORDER BY ${safeSortBy} ${safeSortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(limit, offset);
        
        // Виконуємо обидва запити
        const [countResult, dataResult] = await Promise.all([
            sqlRequest(countSql, queryParams.slice(0, -2)), // без LIMIT та OFFSET
            sqlRequest(mainSql, queryParams)
        ]);
        
        return [{
            count: parseInt(countResult[0].count),
            data: dataResult
        }];
    }

    // 📋 Розширений список квитанцій з усіма фільтрами
    async getReceiptsList(page, limit, sortBy, sortDirection, filters) {
        // Підготовка умов фільтрування з усіма новими полями
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        console.log('filters', filters);
        // Основні фільтри
        if (filters.identifier) {
            whereConditions.push(`identifier ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.identifier}%`);
            paramIndex++;
        }

        if (filters.name) {
            whereConditions.push(`name ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.name}%`);
            paramIndex++;
        }

        if (filters.gender) {
            whereConditions.push(`gender = $${paramIndex}`);
            queryParams.push(filters.gender);
            paramIndex++;
        }

        if (filters.citizenship) {
            whereConditions.push(`citizenship ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.citizenship}%`);
            paramIndex++;
        }

        // Фільтри по датах
        if (filters.date_from) {
            whereConditions.push(`date >= $${paramIndex}`);
            queryParams.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            whereConditions.push(`date <= $${paramIndex}`);
            queryParams.push(filters.date_to);
            paramIndex++;
        }

        if (filters.arrival_date_from) {
            whereConditions.push(`arrival_date >= $${paramIndex}`);
            queryParams.push(filters.arrival_date_from);
            paramIndex++;
        }

        if (filters.arrival_date_to) {
            whereConditions.push(`arrival_date <= $${paramIndex}`);
            queryParams.push(filters.arrival_date_to);
            paramIndex++;
        }

        if (filters.departure_date_from) {
            whereConditions.push(`departure_date >= $${paramIndex}`);
            queryParams.push(filters.departure_date_from);
            paramIndex++;
        }

        if (filters.departure_date_to) {
            whereConditions.push(`departure_date <= $${paramIndex}`);
            queryParams.push(filters.departure_date_to);
            paramIndex++;
        }

        // Фільтри по counter
        if (filters.counter_from !== undefined) {
            whereConditions.push(`counter >= $${paramIndex}`);
            queryParams.push(filters.counter_from);
            paramIndex++;
        }

        if (filters.counter_to !== undefined) {
            whereConditions.push(`counter <= $${paramIndex}`);
            queryParams.push(filters.counter_to);
            paramIndex++;
        }

        // Фільтри по сумі
        if (filters.amount !== undefined) {
            whereConditions.push(`amount = ${paramIndex}`);
            queryParams.push(filters.amount);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        console.log('whereClause', whereClause);
        // Валідація сортування
        const safeSortBy = allowedReceiptSortFields.includes(sortBy) ? sortBy : 'counter';
        const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

        // Запит для підрахунку загальної кількості
        const countSql = `
            SELECT COUNT(*) as total
            FROM tourism.receipt 
            ${whereClause}
        `;
        const countResult = await sqlRequest(countSql, queryParams);
        const totalItems = parseInt(countResult[0].total);

        // Розрахунок offset
        const offset = (page - 1) * limit;

        // Основний запит з пагінацією
        const mainSql = `
            SELECT ${displayReceiptFields.join(', ')}
            FROM tourism.receipt 
            ${whereClause}
            ORDER BY ${safeSortBy} ${safeSortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(limit, offset);
        const items = await sqlRequest(mainSql, queryParams);

        return { items, totalItems };
    }

    // ➕ Розширене створення квитанції з усіма полями
    async createReceipt(receiptData) {
        const { 
            identifier, name, date, gender, citizenship, 
            arrival_date, departure_date, amount 
        } = receiptData;
        
        const sql = `
            INSERT INTO tourism.receipt (
                identifier, name, date, counter, gender, 
                citizenship, arrival_date, departure_date, amount
            )
            VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8)
            RETURNING ${displayReceiptFields.join(', ')}
        `;
        
        const result = await sqlRequest(sql, [
            identifier, name, date, gender, citizenship,
            arrival_date, departure_date, amount
        ]);
        return result[0];
    }

    // ✏️ Розширене оновлення квитанції з усіма полями
    async updateReceipt(receiptId, updateData) {
        // Підготовка полів для оновлення
        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;

        if (updateData.identifier !== undefined) {
            updateFields.push(`identifier = $${paramIndex}`);
            queryParams.push(updateData.identifier);
            paramIndex++;
        }

        if (updateData.name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            queryParams.push(updateData.name);
            paramIndex++;
        }

        if (updateData.date !== undefined) {
            updateFields.push(`date = $${paramIndex}`);
            queryParams.push(updateData.date);
            paramIndex++;
        }

        if (updateData.counter !== undefined) {
            updateFields.push(`counter = $${paramIndex}`);
            queryParams.push(updateData.counter);
            paramIndex++;
        }

        if (updateData.gender !== undefined) {
            updateFields.push(`gender = $${paramIndex}`);
            queryParams.push(updateData.gender);
            paramIndex++;
        }

        if (updateData.citizenship !== undefined) {
            updateFields.push(`citizenship = $${paramIndex}`);
            queryParams.push(updateData.citizenship);
            paramIndex++;
        }

        if (updateData.arrival_date !== undefined) {
            updateFields.push(`arrival_date = $${paramIndex}`);
            queryParams.push(updateData.arrival_date);
            paramIndex++;
        }

        if (updateData.departure_date !== undefined) {
            updateFields.push(`departure_date = $${paramIndex}`);
            queryParams.push(updateData.departure_date);
            paramIndex++;
        }

        if (updateData.amount !== undefined) {
            updateFields.push(`amount = $${paramIndex}`);
            queryParams.push(updateData.amount);
            paramIndex++;
        }

        // Завжди оновлюємо updated_at
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Додаємо ID для WHERE clause
        queryParams.push(receiptId);

        const sql = `
            UPDATE tourism.receipt 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING ${displayReceiptFields.join(', ')}
        `;

        const result = await sqlRequest(sql, queryParams);
        return result[0];
    }

    // 📥 Розширений експорт квитанцій з усіма фільтрами
    async exportReceipts(filters) {
        // Підготовка умов фільтрування (аналогічно до getReceiptsList)
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Усі фільтри як у getReceiptsList
        if (filters.identifier) {
            whereConditions.push(`identifier ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.identifier}%`);
            paramIndex++;
        }

        if (filters.name) {
            whereConditions.push(`name ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.name}%`);
            paramIndex++;
        }

        if (filters.gender) {
            whereConditions.push(`gender = $${paramIndex}`);
            queryParams.push(filters.gender);
            paramIndex++;
        }

        if (filters.citizenship) {
            whereConditions.push(`citizenship ILIKE $${paramIndex}`);
            queryParams.push(`%${filters.citizenship}%`);
            paramIndex++;
        }

        if (filters.date_from) {
            whereConditions.push(`date >= $${paramIndex}`);
            queryParams.push(filters.date_from);
            paramIndex++;
        }

        if (filters.date_to) {
            whereConditions.push(`date <= $${paramIndex}`);
            queryParams.push(filters.date_to);
            paramIndex++;
        }

        if (filters.arrival_date_from) {
            whereConditions.push(`arrival_date >= $${paramIndex}`);
            queryParams.push(filters.arrival_date_from);
            paramIndex++;
        }

        if (filters.arrival_date_to) {
            whereConditions.push(`arrival_date <= $${paramIndex}`);
            queryParams.push(filters.arrival_date_to);
            paramIndex++;
        }

        if (filters.departure_date_from) {
            whereConditions.push(`departure_date >= $${paramIndex}`);
            queryParams.push(filters.departure_date_from);
            paramIndex++;
        }

        if (filters.departure_date_to) {
            whereConditions.push(`departure_date <= $${paramIndex}`);
            queryParams.push(filters.departure_date_to);
            paramIndex++;
        }

        if (filters.counter_from !== undefined) {
            whereConditions.push(`counter >= $${paramIndex}`);
            queryParams.push(filters.counter_from);
            paramIndex++;
        }

        if (filters.counter_to !== undefined) {
            whereConditions.push(`counter <= $${paramIndex}`);
            queryParams.push(filters.counter_to);
            paramIndex++;
        }

        if (filters.amount_from !== undefined) {
            whereConditions.push(`amount >= $${paramIndex}`);
            queryParams.push(filters.amount_from);
            paramIndex++;
        }

        if (filters.amount_to !== undefined) {
            whereConditions.push(`amount <= $${paramIndex}`);
            queryParams.push(filters.amount_to);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Експорт всіх записів без пагінації
        const sql = `
            SELECT ${displayReceiptFields.join(', ')}
            FROM tourism.receipt 
            ${whereClause}
            ORDER BY counter DESC, created_at DESC
        `;

        return await sqlRequest(sql, queryParams);
    }

    async getScanActivitiesList(page, limit, sortBy, sortDirection, filters) {
        try {
            console.log('Repository getScanActivitiesList called with:', {
                page, limit, sortBy, sortDirection, filters
            });
    
            // Побудова WHERE умов
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
    
            // Фільтр по місцю сканування
            if (filters.scan_location) {
                whereConditions.push(`s.scan_location ILIKE $${paramIndex}`);
                queryParams.push(`%${filters.scan_location}%`);
                paramIndex++;
            }
    
            // Фільтр по identifier квитанції
            if (filters.identifier) {
                whereConditions.push(`r.identifier ILIKE $${paramIndex}`);
                queryParams.push(`%${filters.identifier}%`);
                paramIndex++;
            }
    
            // Фільтр по імені
            if (filters.name) {
                whereConditions.push(`r.name ILIKE $${paramIndex}`);
                queryParams.push(`%${filters.name}%`);
                paramIndex++;
            }
    
            // Обробка фільтрів по даті і часу сканування
            if (filters.scan_date_from) {
                const dateFrom = filters.scan_time_from 
                    ? `${filters.scan_date_from} ${filters.scan_time_from}` 
                    : `${filters.scan_date_from} 00:00:00`;
                whereConditions.push(`s.scan_date >= $${paramIndex}`);
                queryParams.push(dateFrom);
                paramIndex++;
            }
    
            if (filters.scan_date_to) {
                const dateTo = filters.scan_time_to 
                    ? `${filters.scan_date_to} ${filters.scan_time_to}` 
                    : `${filters.scan_date_to} 23:59:59`;
                whereConditions.push(`s.scan_date <= $${paramIndex}`);
                queryParams.push(dateTo);
                paramIndex++;
            }
    
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
            // Для фільтрів по counter використовуємо CTE, оскільки потрібно фільтрувати по обчисленому полю
            let counterFilterClause = '';
            let counterParams = [];
            let counterParamIndex = paramIndex;
    
            if (filters.counter_from !== undefined && filters.counter_from !== null) {
                counterFilterClause += ` AND counter_at_scan_time >= $${counterParamIndex}`;
                counterParams.push(filters.counter_from);
                counterParamIndex++;
            }
    
            if (filters.counter_to !== undefined && filters.counter_to !== null) {
                counterFilterClause += ` AND counter_at_scan_time <= $${counterParamIndex}`;
                counterParams.push(filters.counter_to);
                counterParamIndex++;
            }
    
            // Базовий CTE запит з обчисленим counter_at_scan_time
            const baseCTE = `
                WITH scan_data AS (
                    SELECT 
                        s.scan_location,
                        r.identifier,
                        r.name,
                r.counter, 
                        r.counter - (COUNT(*) OVER (PARTITION BY r.identifier) - ROW_NUMBER() OVER (PARTITION BY r.identifier ORDER BY s.scan_date ASC)) AS counter_at_scan_time,
                        s.scan_date,
                        s.receipt_id
                    FROM tourism.scan_activity s
                    JOIN tourism.receipt r ON s.receipt_id = r.id
                    ${whereClause}
                )
            `;
    
            // Запит для підрахунку загальної кількості
            const countQuery = `
                ${baseCTE}
                SELECT COUNT(*) as total
                FROM scan_data
                WHERE 1=1 ${counterFilterClause}
            `;
    
            const countQueryParams = [...queryParams, ...counterParams];
            console.log('Count query:', countQuery);
            console.log('Count params:', countQueryParams);
            
            const countResult = await sqlRequest(countQuery, countQueryParams);
            const totalItems = parseInt(countResult[0]?.total || 0);
    
            // Побудова ORDER BY
            let orderByClause;
            switch (sortBy) {
                case 'scan_location':
                    orderByClause = `scan_location ${sortDirection}`;
                    break;
                case 'identifier':
                    orderByClause = `identifier ${sortDirection}`;
                    break;
                case 'name':
                    orderByClause = `name ${sortDirection}`;
                    break;
                case 'counter':
                orderByClause = `counter ${sortDirection}`;
                break;
            case 'counter_at_scan_time':
                orderByClause = `counter_at_scan_time ${sortDirection}`;
                break;
                case 'scan_date':
                default:
                    orderByClause = `scan_date ${sortDirection}`;
                    break;
            }
    
            // Запит для отримання даних з пагінацією
            const offset = (page - 1) * limit;
            
            const dataQuery = `
                ${baseCTE}
                SELECT 
                    scan_location,
                    identifier,
                    name,
                    counter,
            counter_at_scan_time,
                    scan_date,
                    receipt_id
                FROM scan_data
                WHERE 1=1 ${counterFilterClause}
                ORDER BY ${orderByClause}
                LIMIT $${counterParamIndex} OFFSET $${counterParamIndex + 1}
            `;
    
            const dataParams = [...queryParams, ...counterParams, limit, offset];
    
            console.log('Data query:', dataQuery);
            console.log('Data params:', dataParams);
    
            const items = await sqlRequest(dataQuery, dataParams);
    
            console.log(`Found ${totalItems} total scan activities, returning ${items?.length || 0} items`);
    
            return {
                items: items || [],
                totalItems
            };
    
        } catch (error) {
            console.error('Error in getScanActivitiesList repository:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    
    }
}

const receiptRepository = new ReceiptRepository();
module.exports = receiptRepository;