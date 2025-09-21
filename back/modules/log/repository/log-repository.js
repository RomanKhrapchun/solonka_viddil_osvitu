const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");

class LogRepository {

    async allLogs(itemsLength, cursor, sort, whereConditions = {}) {
        const sortOrder = sort;
        const limit = parseInt(itemsLength + 1);
        const values = [];
        let query = `SELECT logger.id, schema_name, table_name, action, row_pk_id, action_stamp_tx, users.username 
            FROM log.logger 
            left join admin.users on users_id = logger.uid
            left join admin.access_group on access_group.id = users.access_group
            WHERE 1=1 `;

        if (Object.keys(whereConditions).length) {
            let result = ' and ';
            const conditions = Object.keys(whereConditions).map(key => {
                if (key === 'uid' && whereConditions[key].includes(',')) {
                    const splitData = whereConditions[key].split(',')
                    values.push(splitData)
                    return `logger.uid = any (array[?::text[]])`
                } else if (key === 'access_group_id') {
                    values.push(whereConditions[key])
                    return `access_group.id = ?`
                }
                else if (key === 'uid') {
                    values.push(whereConditions[key])
                    return `logger.uid = ?`
                }
                else if (whereConditions[key].includes(',')) {
                    const splitData = whereConditions[key].split(',')
                    values.push(splitData)
                    return `${key} = any (array[?::text[]])`
                }
                else if (whereConditions[key].includes('_')) {
                    const [date1, date2] = whereConditions[key].split('_')
                    values.push(date1, date2)
                    return `${key} BETWEEN ? AND ?`
                }
                else {
                    values.push(whereConditions[key])
                    return `${key} = ?`
                }
            });
            result += conditions.join(' and ');
            query += result;
        }

        if (cursor) {
            query += ` and logger.id  ${sortOrder === 'ASC' ? '>' : '<'} ?`
            values.push(cursor)
        }

        query += ` ORDER BY logger.id ${sortOrder} LIMIT ${limit}`;
        return await sqlRequest(query, [...values])
    }

    async findLogById(idLog, displayFields) {
        return await sqlRequest(`select ${displayFields.map(field => ` ${field}`).join(', ')} from log.logger where id = ?`, [idLog])
    }

    async allSecureLog(itemsLength, cursor, sort, whereConditions = {}) {
        const limit = parseInt(itemsLength + 1);
        const values = [];
        let query = `SELECT secure.id, secure.ip, description, action, hostname, user_agent, details, date_add, users.username FROM log.secure` +
            ` left join admin.users on users.users_id = secure.uid WHERE 1=1`;

        if (Object.keys(whereConditions).length) {
            let result = ' and ';
            const conditions = Object.keys(whereConditions).map(key => {
                if (key === 'uid' && whereConditions[key].includes(',')) {
                    const splitData = whereConditions[key].split(',')
                    values.push(splitData)
                    return `secure.uid = any (array[?::text[]])`
                } else if (key === 'uid') {
                    values.push(whereConditions[key])
                    return `secure.uid = ?`
                }
                if (whereConditions[key].includes(',')) {
                    const splitData = whereConditions[key].split(',')
                    values.push(splitData)
                    return `${key} = any (array[?::text[]])`
                }
                else if (whereConditions[key].includes('_')) {
                    const [date1, date2] = whereConditions[key].split('_')
                    values.push(date1, date2)
                    return `${key} BETWEEN ? AND ?`
                }
                else {
                    values.push(whereConditions[key])
                    return `${key} = ?`
                }
            });
            result += conditions.join(' and ');
            query += result;
        }

        if (cursor) {
            query += ` and secure.id  ${sort === 'ASC' ? '>' : '<'} ?`
            values.push(cursor)
        }

        query += ` ORDER BY secure.id ${sort} LIMIT ${limit}`;
        return await sqlRequest(query, [...values])
    }

    async allBlackListIp(limit, offset, whereConditions = {}, displayFields = []) {
        const values = [];
        let sql = `select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(${displayFields.map(field => `'${field}', ${field}`).join(', ')})  as rw,
            count(*) over () as cnt
            from admin.black_list
            where 1=1`

        if (Object.keys(whereConditions).length) {
            const data = buildWhereCondition(whereConditions)
            sql += data.text;
            values.push(...data.value)
        }

        values.push(limit)
        values.push(offset)
        sql += ` order by id desc limit ? offset ? ) q`
        return await sqlRequest(sql, [...values])
    }

    async addToBlacklistIP(data) {
        const sql = `INSERT INTO admin.black_list (${Object.keys(data).map(field => `${field}`).join(", ")}) VALUES (${Object.keys(data).map(el => '?').join(", ")})`
        return await sqlRequest(sql, [...Object.values(data)])
    }

    async removeFromBlacklistIP(id) {
        return await sqlRequest('DELETE FROM admin.black_list WHERE id=? RETURNING id', [id])
    }

    async updateDeleteRecord(uid, id_record) {
        return await sqlRequest('UPDATE log.logger SET uid=? WHERE row_pk_id=? and action=\'DELETE\' RETURNING id', [uid, id_record])
    }

    async createLog(data) {
        const sql = `INSERT INTO log.logger (${Object.keys(data).map(field => `${field}`).join(", ")}) VALUES (${Object.keys(data).map(el => '?').join(", ")}) RETURNING id`
        return await sqlRequest(sql, [...Object.values(data)])
    }

    async detailedLog(limit, offset, whereConditions = {}) {
        //console.log('DetailedLog whereConditions:', whereConditions);
        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'group', COALESCE(ag.access_group_name, 'Без групування'),
                    'groupname', COALESCE(ag.access_group_name, 'Без групування'),
                    'username', COALESCE(u.username, 'Невідомо'),
                    'fullName', COALESCE(u.last_name, '') || ' ' || COALESCE(u.first_name, '') || ' ' || COALESCE(u.middle_name, ''),
                    'year', EXTRACT(YEAR FROM l.action_stamp_tx),
                    'month_name', CASE 
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 1 THEN 'Січень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 2 THEN 'Лютий'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 3 THEN 'Березень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 4 THEN 'Квітень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 5 THEN 'Травень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 6 THEN 'Червень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 7 THEN 'Липень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 8 THEN 'Серпень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 9 THEN 'Вересень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 10 THEN 'Жовтень'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 11 THEN 'Листопад'
                        WHEN EXTRACT(MONTH FROM l.action_stamp_tx) = 12 THEN 'Грудень'
                    END,
                    'month', EXTRACT(MONTH FROM l.action_stamp_tx),
                    'print_count', COUNT(*) FILTER (WHERE l.action = 'PRINT'),
                    'generate_count', COUNT(*) FILTER (WHERE l.action = 'GENERATE_DOC'),
                    'search_count', COUNT(*) FILTER (WHERE l.action = 'SEARCH')
                ) AS rw,
                count(*) over () as cnt
            FROM log.logger l
            LEFT JOIN admin.users u ON u.users_id = l.uid
            LEFT JOIN admin.access_group ag ON ag.id = u.access_group
            WHERE l.action IN ('PRINT', 'GENERATE_DOC', 'SEARCH') `;
    
        // Фільтри по датах
        if (whereConditions?.dateFrom && whereConditions?.dateTo) {
            sql += ` AND l.action_stamp_tx BETWEEN ? AND ? `;
            values.push(whereConditions.dateFrom, whereConditions.dateTo);
        } else if (whereConditions?.dateFrom) {
            sql += ` AND l.action_stamp_tx >= ? `;
            values.push(whereConditions.dateFrom);
        } else if (whereConditions?.dateTo) {
            sql += ` AND l.action_stamp_tx <= ? `;
            values.push(whereConditions.dateTo);
        }
    
        // Фільтри по року та місяцю (для зворотної сумісності)
        if (whereConditions?.year) {
            sql += ` AND EXTRACT(YEAR FROM l.action_stamp_tx) = ? `;
            values.push(whereConditions.year);
        }
    
        if (whereConditions?.month) {
            sql += ` AND EXTRACT(MONTH FROM l.action_stamp_tx) = ? `;
            values.push(whereConditions.month);
        }
    
        // Фільтр по групі
        if (whereConditions?.groupNumber) {
            sql += ` AND ag.access_group_name = ? `;
            values.push(whereConditions.groupNumber);
        }
    
        // Фільтр по періоду (з фронтенду)
        if (whereConditions?.periodType) {
            if (whereConditions.periodType === 'single') {
                // Для single можна додати додаткову логіку
            } else if (whereConditions.periodType === 'multiple') {
                // Для multiple можна додати додаткову логіку
            }
        }
    
        // Групуємо по користувачу, групі, року та місяцю
        sql += ` GROUP BY l.uid, u.username, u.last_name, u.first_name, u.middle_name, ag.access_group_name, EXTRACT(YEAR FROM l.action_stamp_tx), EXTRACT(MONTH FROM l.action_stamp_tx) `;
        
        // Сортування по групах, потім по користувачах, потім по року та місяцю
        sql += ` ORDER BY ag.access_group_name ASC, u.last_name ASC, u.first_name ASC, EXTRACT(YEAR FROM l.action_stamp_tx) DESC, EXTRACT(MONTH FROM l.action_stamp_tx) DESC `;
    
        values.push(limit);
        values.push(offset);
        sql += ` LIMIT ? OFFSET ? ) q`;
    
        return await sqlRequest(sql, [...values]);
    }

    async getMessagesLog(limit, offset, whereConditions = {}) {
    const values = [];
    
    let sql = `
        SELECT json_agg(rw) as data,
               max(cnt) as count
        FROM (
            SELECT json_build_object(
                'id', l.id,
                'action', l.action,
                'date', l.action_stamp_tx,
                'username', l.session_user_name,
                'fullName', COALESCE(a.last_name, '') || ' ' || COALESCE(a.first_name, '') || ' ' || COALESCE(a.middle_name, ''),
                'first_name', a.first_name,
                'last_name', a.last_name,
                'middle_name', a.middle_name,
                'group_name', COALESCE(ag.access_group_name, 'Без групування'),
                'group_id', ag.id
            ) AS rw,
            count(*) over () as cnt
            FROM log.logger l
            JOIN admin.users a ON l.uid = a.users_id
            LEFT JOIN admin.access_group ag ON ag.id = a.access_group
            WHERE l.action IN ('PRINT', 'GENERATE_DOC')
    `;

    // Фільтри по датах
    if (whereConditions?.dateFrom && whereConditions?.dateTo) {
        sql += ` AND l.action_stamp_tx BETWEEN ? AND ? `;
        values.push(whereConditions.dateFrom, whereConditions.dateTo);
    } else if (whereConditions?.dateFrom) {
        sql += ` AND l.action_stamp_tx >= ? `;
        values.push(whereConditions.dateFrom);
    } else if (whereConditions?.dateTo) {
        sql += ` AND l.action_stamp_tx <= ? `;
        values.push(whereConditions.dateTo);
    }

    // Фільтр по року
    if (whereConditions?.year) {
        sql += ` AND EXTRACT(YEAR FROM l.action_stamp_tx) = ? `;
        values.push(whereConditions.year);
    }

    // Фільтр по місяцю
    if (whereConditions?.month) {
        sql += ` AND EXTRACT(MONTH FROM l.action_stamp_tx) = ? `;
        values.push(whereConditions.month);
    }

    // Фільтр по групі
    if (whereConditions?.groupNumber) {
        sql += ` AND ag.access_group_name = ? `;
        values.push(whereConditions.groupNumber);
    }

    // Фільтр по користувачу
    if (whereConditions?.username) {
        sql += ` AND l.session_user_name ILIKE ? `;
        values.push(`%${whereConditions.username}%`);
    }

    // Фільтр по ID користувача
    if (whereConditions?.uid) {
        sql += ` AND l.uid = ? `;
        values.push(whereConditions.uid);
    }

    // Фільтр по типу дії
    if (whereConditions?.action) {
        sql += ` AND l.action = ? `;
        values.push(whereConditions.action);
    }

    // Сортування
    sql += ` ORDER BY l.action_stamp_tx DESC `;

    // Пагінація
    values.push(limit);
    values.push(offset);
    sql += ` LIMIT ? OFFSET ? ) q`;

    return await sqlRequest(sql, [...values]);
}
    
    async owerSearchLog(limit, offset, whereConditions = {}) {
        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'id', ol.id,
                    'name', ol.name,
                    'date', ol.date,
                    'formatted_date', TO_CHAR(ol.date, 'DD.MM.YYYY HH24:MI:SS'),
                    'formatted_date_short', TO_CHAR(ol.date, 'DD.MM.YYYY'),
                    'chat_id', ol.chat_id,
                    'ip', ol.ip,
                    
                    -- Визначення джерела запиту
                    'source', CASE 
                        WHEN ol.chat_id IS NOT NULL AND ol.ip IS NULL THEN 'telegram'
                        WHEN ol.ip IS NOT NULL AND ol.chat_id IS NULL THEN 'website' 
                        ELSE 'unknown'
                    END,
                    'source_display', CASE 
                        WHEN ol.chat_id IS NOT NULL AND ol.ip IS NULL THEN 'Телеграм бот'
                        WHEN ol.ip IS NOT NULL AND ol.chat_id IS NULL THEN 'Сайт'
                        ELSE 'Невідоме джерело'
                    END,
                    
                    -- Додаткова інформація для аналізу
                    'search_year', EXTRACT(YEAR FROM ol.date),
                    'search_month', EXTRACT(MONTH FROM ol.date),
                    'search_month_name', CASE 
                        WHEN EXTRACT(MONTH FROM ol.date) = 1 THEN 'Січень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 2 THEN 'Лютий'
                        WHEN EXTRACT(MONTH FROM ol.date) = 3 THEN 'Березень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 4 THEN 'Квітень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 5 THEN 'Травень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 6 THEN 'Червень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 7 THEN 'Липень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 8 THEN 'Серпень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 9 THEN 'Вересень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 10 THEN 'Жовтень'
                        WHEN EXTRACT(MONTH FROM ol.date) = 11 THEN 'Листопад'
                        WHEN EXTRACT(MONTH FROM ol.date) = 12 THEN 'Грудень'
                    END,
                    'search_day', EXTRACT(DAY FROM ol.date),
                    'search_day_name', TO_CHAR(ol.date, 'Day'),
                    'search_time', TO_CHAR(ol.date, 'HH24:MI:SS'),
                    'search_hour', EXTRACT(HOUR FROM ol.date),
                    
                    -- Інформація про тип запиту
                    'is_telegram', CASE WHEN ol.chat_id IS NOT NULL THEN true ELSE false END,
                    'is_website', CASE WHEN ol.ip IS NOT NULL THEN true ELSE false END,
                    
                    -- Нормалізоване ім'я для пошуку
                    'normalized_name', TRIM(LOWER(ol.name))
                ) as rw,
                count(*) over () as cnt
                FROM ower.log ol
                WHERE 1=1`;
    
        // Фільтри
        if (whereConditions?.name) {
            sql += ` AND ol.name ILIKE ?`;
            values.push(`%${whereConditions.name}%`);
        }
    
        if (whereConditions?.source) {
            if (whereConditions.source === 'telegram') {
                sql += ` AND ol.chat_id IS NOT NULL AND ol.ip IS NULL`;
            } else if (whereConditions.source === 'website') {
                sql += ` AND ol.ip IS NOT NULL AND ol.chat_id IS NULL`;
            } else if (whereConditions.source === 'unknown') {
                sql += ` AND NOT ((ol.chat_id IS NOT NULL AND ol.ip IS NULL) OR (ol.ip IS NOT NULL AND ol.chat_id IS NULL))`;
            }
        }
    
        // Фільтр по даті (діапазон)
        if (whereConditions?.dateFrom && whereConditions?.dateTo) {
            sql += ` AND ol.date BETWEEN ? AND ?`;
            values.push(whereConditions.dateFrom, whereConditions.dateTo);
        } else if (whereConditions?.dateFrom) {
            sql += ` AND ol.date >= ?`;
            values.push(whereConditions.dateFrom);
        } else if (whereConditions?.dateTo) {
            sql += ` AND ol.date <= ?`;
            values.push(whereConditions.dateTo);
        }
    
        // Фільтр по конкретному chat_id
        if (whereConditions?.chat_id) {
            sql += ` AND ol.chat_id = ?`;
            values.push(whereConditions.chat_id);
        }
    
        // Фільтр по IP
        if (whereConditions?.ip) {
            sql += ` AND ol.ip = ?`;
            values.push(whereConditions.ip);
        }
    
        // Сортування та пагінація
        sql += ` ORDER BY ol.date DESC`;
        
        values.push(limit);
        values.push(offset);
        sql += ` LIMIT ? OFFSET ? ) q`;
    
        return await sqlRequest(sql, [...values]);
    }
    
    // Експорт всіх даних для Excel
    async getOwnerSearchLogForExport(filters = {}) {
        const values = [];
        let sql = `
            SELECT 
                ol.id,
                ol.name,
                ol.date,
                TO_CHAR(ol.date, 'DD.MM.YYYY HH24:MI:SS') as formatted_date,
                ol.chat_id,
                ol.ip,
                
                -- Джерело запиту
                CASE 
                    WHEN ol.chat_id IS NOT NULL AND ol.ip IS NULL THEN 'Телеграм бот'
                    WHEN ol.ip IS NOT NULL AND ol.chat_id IS NULL THEN 'Сайт'
                    ELSE 'Невідоме джерело'
                END as source_display,
                
                -- Аналітичні поля
                EXTRACT(YEAR FROM ol.date) as search_year,
                EXTRACT(MONTH FROM ol.date) as search_month,
                CASE 
                    WHEN EXTRACT(MONTH FROM ol.date) = 1 THEN 'Січень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 2 THEN 'Лютий'
                    WHEN EXTRACT(MONTH FROM ol.date) = 3 THEN 'Березень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 4 THEN 'Квітень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 5 THEN 'Травень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 6 THEN 'Червень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 7 THEN 'Липень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 8 THEN 'Серпень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 9 THEN 'Вересень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 10 THEN 'Жовтень'
                    WHEN EXTRACT(MONTH FROM ol.date) = 11 THEN 'Листопад'
                    WHEN EXTRACT(MONTH FROM ol.date) = 12 THEN 'Грудень'
                END as search_month_name,
                TO_CHAR(ol.date, 'Day') as search_day_name,
                TO_CHAR(ol.date, 'HH24:MI:SS') as search_time
                
            FROM ower.log ol
            WHERE 1=1
        `;
    
        // Застосовуємо ті ж фільтри що і в основному методі
        if (filters?.name) {
            sql += ` AND ol.name ILIKE ?`;
            values.push(`%${filters.name}%`);
        }
    
        if (filters?.source) {
            if (filters.source === 'telegram') {
                sql += ` AND ol.chat_id IS NOT NULL AND ol.ip IS NULL`;
            } else if (filters.source === 'website') {
                sql += ` AND ol.ip IS NOT NULL AND ol.chat_id IS NULL`;
            } else if (filters.source === 'unknown') {
                sql += ` AND NOT ((ol.chat_id IS NOT NULL AND ol.ip IS NULL) OR (ol.ip IS NOT NULL AND ol.chat_id IS NULL))`;
            }
        }
    
        if (filters?.dateFrom && filters?.dateTo) {
            sql += ` AND ol.date BETWEEN ? AND ?`;
            values.push(filters.dateFrom, filters.dateTo);
        } else if (filters?.dateFrom) {
            sql += ` AND ol.date >= ?`;
            values.push(filters.dateFrom);
        } else if (filters?.dateTo) {
            sql += ` AND ol.date <= ?`;
            values.push(filters.dateTo);
        }
    
        if (filters?.chat_id) {
            sql += ` AND ol.chat_id = ?`;
            values.push(filters.chat_id);
        }
    
        if (filters?.ip) {
            sql += ` AND ol.ip = ?`;
            values.push(filters.ip);
        }
    
        sql += ` ORDER BY ol.date DESC`;
    
        return await sqlRequest(sql, values);
    }
    

    async getAccessGroups() {
        const sql = `
            SELECT 
                access_group_name as label,
                access_group_name as value
            FROM admin.access_group 
            WHERE enabled = true 
            ORDER BY access_group_name ASC
        `;
        return await sqlRequest(sql);
    }

    // ВИПРАВЛЕНИЙ метод adminSearchLog відповідно до структури таблиці
    async adminSearchLogWithPayments(limit, offset, whereConditions = {}) {
        const values = [];
        let sql = `
            select json_agg(rw) as data,
                max(cnt) as count
                from (
                select json_build_object(
                    'search_id', asd.id,
                    'admin_full_name', COALESCE(
                        (SELECT COALESCE(u.last_name, '') || ' ' || COALESCE(u.first_name, '') || ' ' || COALESCE(u.middle_name, '') 
                         FROM admin.users u WHERE u.users_id = l.uid), 'Невідомо'),
                    'username', COALESCE(
                        (SELECT u.username FROM admin.users u WHERE u.users_id = l.uid), 'Невідомо'),
                    'access_group_name', COALESCE(
                        (SELECT ag.access_group_name FROM admin.users u 
                         JOIN admin.access_group ag ON ag.id = u.access_group 
                         WHERE u.users_id = l.uid), 'Невідомо'),
                    'searched_person_name', asd.searched_person_name,
                    'searched_person_id', asd.searched_person_id,
                    'search_result', asd.search_result,
                    'formatted_search_date', TO_CHAR(asd.created_at, 'DD.MM.YYYY HH24:MI'),
                    'client_addr', COALESCE(l.client_addr::text, 'Невідомо'),
                    'is_successful', CASE WHEN asd.search_result LIKE 'found%' THEN true ELSE false END,
                    'found_count', CASE WHEN asd.search_result LIKE 'found_%' THEN 
                        CAST(SUBSTRING(asd.search_result FROM 'found_(.*)') AS INTEGER) ELSE 0 END,
                    'search_year', EXTRACT(YEAR FROM asd.created_at),
                    'search_month', EXTRACT(MONTH FROM asd.created_at),
                    'search_month_name', TO_CHAR(asd.created_at, 'Month'),
                    'search_day_name', TO_CHAR(asd.created_at, 'Day'),
                    'email', COALESCE((SELECT u.email FROM admin.users u WHERE u.users_id = l.uid), ''),
                    'phone', COALESCE((SELECT u.phone FROM admin.users u WHERE u.users_id = l.uid), ''),
                    'access_group_permission', '',
                    'search_date', asd.created_at,
                    
                    -- Поля системи оплат (відповідають структурі таблиці)
                    'payment_status', asd.payment_status,
                    'payment_amount', asd.payment_amount,
                    'payment_transaction_id', asd.payment_transaction_id,
                    'old_total_debt', asd.old_total_debt,
                    'new_total_debt', asd.new_total_debt,
                    'debt_change', asd.debt_change,
                    'payment_check_date', TO_CHAR(asd.payment_check_date, 'DD.MM.YYYY HH24:MI'),
                    'payment_notes', asd.payment_notes,
                    
                    -- Розраховуємо статуси на основі наявних полів
                    'result_display', CASE 
                        WHEN asd.payment_status = 'paid_system' THEN 'Оплачено через систему'
                        WHEN asd.payment_status = 'paid_full_external' THEN 'Повністю оплачено зовні'  
                        WHEN asd.payment_status = 'paid_partial_external' THEN 'Частково оплачено зовні'
                        WHEN asd.payment_status = 'not_paid' THEN 'Не оплачено'
                        WHEN asd.payment_status = 'debt_increased' THEN 'Борг збільшився'
                        WHEN asd.payment_status = 'no_debt_initially' THEN 'Не було боргу'
                        WHEN asd.payment_status = 'registry_missing' THEN 'Немає реєстру'
                        ELSE 'Не перевірено'
                    END,
                    'admin_was_effective', CASE 
                        WHEN asd.payment_status IN ('paid_system', 'paid_full_external', 'paid_partial_external') THEN true
                        WHEN asd.payment_status IN ('not_paid', 'debt_increased') THEN false
                        ELSE NULL
                    END,
                    'payment_percentage', CASE 
                        WHEN asd.old_total_debt > 0 AND asd.debt_change < 0 THEN 
                            ROUND(ABS(asd.debt_change) * 100.0 / asd.old_total_debt, 1)
                        ELSE 0
                    END,
                    
                    -- Готовність до перевірки
                    'check_readiness', CASE 
                        WHEN asd.payment_status IS NULL THEN '✅ Готово (не перевірялось)'
                        WHEN asd.payment_status IN ('no_debt_initially', 'registry_missing') THEN
                            CASE 
                                WHEN asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 1 
                                THEN '✅ Готово (проблемний статус)'
                                ELSE '⏳ Зачекати ' || (1 - (CURRENT_DATE - asd.payment_check_date::DATE)) || ' дн.'
                            END
                        ELSE
                            CASE 
                                WHEN asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 7 
                                THEN '✅ Готово (7+ днів)'
                                ELSE '⏳ Зачекати ' || (7 - (CURRENT_DATE - asd.payment_check_date::DATE)) || ' дн.'
                            END
                    END,
                    'days_since_check', CASE 
                        WHEN asd.payment_check_date IS NULL THEN NULL
                        ELSE CURRENT_DATE - asd.payment_check_date::DATE
                    END,
                    'priority', CASE 
                        WHEN asd.payment_status IS NULL THEN 1
                        WHEN asd.payment_status IN ('no_debt_initially', 'registry_missing') 
                             AND (asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 1) THEN 2
                        WHEN asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 7 THEN 3
                        ELSE 9
                    END,
                    'can_check_now', CASE 
                        WHEN asd.payment_status IS NULL THEN true
                        WHEN asd.payment_status IN ('no_debt_initially', 'registry_missing') 
                             AND (asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 1) THEN true
                        WHEN asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 7 THEN true
                        ELSE false
                    END
                ) as rw,
                count(*) over () as cnt
                FROM log.admin_search_details asd
                LEFT JOIN log.logger l ON l.id = asd.logger_id
                WHERE 1=1`;

        // Фільтри (прибрали client_addr та інші неіснуючі поля)
        if (whereConditions?.username) {
            sql += ` AND EXISTS (SELECT 1 FROM admin.users u WHERE u.users_id = l.uid AND u.username ILIKE ?)`;
            values.push(`%${whereConditions.username}%`);
        }

        if (whereConditions?.searched_person_name) {
            sql += ` AND asd.searched_person_name ILIKE ?`;
            values.push(`%${whereConditions.searched_person_name}%`);
        }

        if (whereConditions?.search_result) {
            if (whereConditions.search_result === 'found') {
                sql += ` AND (asd.search_result = 'found' OR asd.search_result LIKE 'found_%')`;
            } else if (whereConditions.search_result === 'not_found') {
                sql += ` AND asd.search_result = 'not_found'`;
            }
        }

        // Фільтри для оплат
        if (whereConditions?.payment_status !== undefined) {
            if (whereConditions.payment_status === '' || whereConditions.payment_status === 'not_checked') {
                sql += ` AND asd.payment_status IS NULL`;
            } else {
                sql += ` AND asd.payment_status = ?`;
                values.push(whereConditions.payment_status);
            }
        }

        if (whereConditions?.effective_only) {
            sql += ` AND asd.payment_status IN ('paid_system', 'paid_full_external', 'paid_partial_external')`;
        }

        if (whereConditions?.can_check_now) {
            sql += ` AND (
                asd.payment_status IS NULL 
                OR (asd.payment_status IN ('no_debt_initially', 'registry_missing') 
                    AND (asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 1))
                OR (asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 7)
            )`;
        }

        if (whereConditions?.year) {
            sql += ` AND EXTRACT(YEAR FROM asd.created_at) = ?`;
            values.push(parseInt(whereConditions.year));
        }

        if (whereConditions?.month) {
            sql += ` AND EXTRACT(MONTH FROM asd.created_at) = ?`;
            values.push(parseInt(whereConditions.month));
        }

        if (whereConditions?.is_successful !== undefined) {
            if (whereConditions.is_successful) {
                sql += ` AND asd.search_result LIKE 'found%'`;
            } else {
                sql += ` AND asd.search_result = 'not_found'`;
            }
        }

        if (whereConditions?.date_from && whereConditions?.date_to) {
            sql += ` AND asd.created_at BETWEEN ? AND ?`;
            values.push(whereConditions.date_from, whereConditions.date_to);
        }

        // Пагінація
        values.push(limit);
        values.push(offset);
        sql += ` ORDER BY 
            CASE WHEN asd.payment_status IS NULL THEN 1 ELSE 2 END,
            asd.created_at DESC 
            LIMIT ? OFFSET ? ) q`;

        return await sqlRequest(sql, [...values]);
    }

    // Стара версія для сумісності
    async adminSearchLog(limit, offset, whereConditions = {}) {
        return this.adminSearchLogWithPayments(limit, offset, whereConditions);
    }

    // Оновлення статусу оплати з підтримкою примусового режиму
    async updatePaymentStatus(searchId, force = false) {
        const sql = `SELECT update_payment_status_with_history(?, ?) as result`;
        const result = await sqlRequest(sql, [searchId, force]);
        return result;
    }
    
    // Розширене масове оновлення
    async updateAllPaymentStatusesAdvanced(limit = 100, force = false, adminName = null, daysBack = null) {
        const sql = `SELECT * FROM process_all_payment_checks(?, NULL, ?, ?, ?)`;
        const result = await sqlRequest(sql, [limit, force, adminName, daysBack]);
        return result;
    }

    // Статистика готовності до перевірки
    async getCheckReadinessStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE payment_status IS NULL) as not_checked,
                COUNT(*) FILTER (WHERE payment_status IS NOT NULL) as checked,
                COUNT(*) FILTER (WHERE payment_status IN ('no_debt_initially', 'registry_missing')) as problematic,
                COUNT(*) FILTER (WHERE (
                    payment_status IS NULL 
                    OR (payment_status IN ('no_debt_initially', 'registry_missing') 
                        AND (payment_check_date IS NULL OR CURRENT_DATE - payment_check_date::DATE >= 1))
                    OR (payment_check_date IS NULL OR CURRENT_DATE - payment_check_date::DATE >= 7)
                )) as ready_to_check,
                ROUND(COUNT(*) FILTER (WHERE payment_status IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0), 1) as completion_percent
            FROM log.admin_search_details
        `;
        return await sqlRequest(sql);
    }

    // Отримання запису для діагностики
    async getSearchRecordById(searchId) {
        const sql = `
            SELECT id, searched_person_name, searched_person_id, created_at, payment_status
            FROM log.admin_search_details 
            WHERE id = ?
        `;
        return await sqlRequest(sql, [searchId]);
    }

    // Діагностика перевірки оплати
    async diagnosePaymentCheck(personName, personId, searchDate) {
        const sql = `SELECT * FROM diagnose_payment_check(?, ?, ?)`;
        const result = await sqlRequest(sql, [personName, personId, searchDate]);
        return result;
    }

    // Розширений звіт ефективності для експорту (виправлений)
    async getEffectivenessReportAdvanced(filters = {}) {
        const values = [];
        let sql = `
            SELECT 
                COALESCE((SELECT COALESCE(u.last_name, '') || ' ' || COALESCE(u.first_name, '') || ' ' || COALESCE(u.middle_name, '') 
                         FROM admin.users u WHERE u.users_id = l.uid), 'Невідомо') as admin_full_name,
                COALESCE((SELECT u.username FROM admin.users u WHERE u.users_id = l.uid), 'Невідомо') as username,
                asd.searched_person_name,
                asd.search_result,
                asd.payment_status,
                TO_CHAR(asd.created_at, 'DD.MM.YYYY HH24:MI') as formatted_search_date,
                TO_CHAR(asd.payment_check_date, 'DD.MM.YYYY HH24:MI') as payment_check_date,
                
                -- Статус оплати з описом
                CASE 
                    WHEN asd.payment_status = 'paid_system' THEN 'Оплачено через систему'
                    WHEN asd.payment_status = 'paid_full_external' THEN 'Повністю оплачено зовні'  
                    WHEN asd.payment_status = 'paid_partial_external' THEN 'Частково оплачено зовні'
                    WHEN asd.payment_status = 'not_paid' THEN 'Не оплачено'
                    WHEN asd.payment_status = 'debt_increased' THEN 'Борг збільшився'
                    WHEN asd.payment_status = 'no_debt_initially' THEN 'Не було боргу'
                    WHEN asd.payment_status = 'registry_missing' THEN 'Немає реєстру'
                    ELSE 'Не перевірено'
                END as result_display,
                
                -- Ефективність
                CASE 
                    WHEN asd.payment_status IN ('paid_system', 'paid_full_external', 'paid_partial_external') THEN true
                    WHEN asd.payment_status IN ('not_paid', 'debt_increased') THEN false
                    ELSE NULL
                END as admin_was_effective,
                
                asd.payment_amount,
                asd.debt_change,
                asd.old_total_debt,
                asd.new_total_debt,
                asd.payment_notes,
                
                -- Готовність до перевірки
                CASE 
                    WHEN asd.payment_status IS NULL THEN '✅ Готово (не перевірялось)'
                    WHEN asd.payment_status IN ('no_debt_initially', 'registry_missing') THEN
                        CASE 
                            WHEN asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 1 
                            THEN '✅ Готово (проблемний статус)'
                            ELSE '⏳ Зачекати ' || (1 - (CURRENT_DATE - asd.payment_check_date::DATE)) || ' дн.'
                        END
                    ELSE
                        CASE 
                            WHEN asd.payment_check_date IS NULL OR CURRENT_DATE - asd.payment_check_date::DATE >= 7 
                            THEN '✅ Готово (7+ днів)'
                            ELSE '⏳ Зачекати ' || (7 - (CURRENT_DATE - asd.payment_check_date::DATE)) || ' дн.'
                        END
                END as check_readiness,
                
                -- Відсоток оплаченого
                CASE 
                    WHEN asd.old_total_debt > 0 AND asd.debt_change < 0 THEN 
                        ROUND(ABS(asd.debt_change) * 100.0 / asd.old_total_debt, 1)
                    ELSE 0
                END as payment_percentage
                
            FROM log.admin_search_details asd
            LEFT JOIN log.logger l ON l.id = asd.logger_id
            WHERE 1=1
        `;

        // Фільтри (виправлені)
        if (filters.username) {
            sql += ` AND EXISTS (SELECT 1 FROM admin.users u WHERE u.users_id = l.uid AND u.username ILIKE ?)`;
            values.push(`%${filters.username}%`);
        }

        if (filters.searched_person_name) {
            sql += ` AND asd.searched_person_name ILIKE ?`;
            values.push(`%${filters.searched_person_name}%`);
        }

        if (filters.search_result) {
            sql += ` AND asd.search_result = ?`;
            values.push(filters.search_result);
        }

        if (filters.payment_status !== undefined) {
            if (filters.payment_status === '') {
                sql += ` AND asd.payment_status IS NULL`;
            } else {
                sql += ` AND asd.payment_status = ?`;
                values.push(filters.payment_status);
            }
        }

        if (filters.effective_only) {
            sql += ` AND asd.payment_status IN ('paid_system', 'paid_full_external', 'paid_partial_external')`;
        }

        if (filters.year) {
            sql += ` AND EXTRACT(YEAR FROM asd.created_at) = ?`;
            values.push(parseInt(filters.year));
        }

        if (filters.month) {
            sql += ` AND EXTRACT(MONTH FROM asd.created_at) = ?`;
            values.push(parseInt(filters.month));
        }

        sql += ` ORDER BY asd.created_at DESC`;

        return await sqlRequest(sql, values);
    }

    // Існуючі методи
    async getEffectivenessReport(filters) {
        const sql = `
            SELECT * FROM get_admin_quality_stats(?, ?)
        `;
        return await sqlRequest(sql, [filters.date_from, filters.date_to]);
    }
    
    async importRegistryToHistory(registryDate) {
        const sql = `SELECT import_registry_to_history(?) as result`;
        const result = await sqlRequest(sql, [registryDate]);
        return result[0]?.result || 'Імпорт завершено успішно';
    }

    // Список доступних реєстрів
    async getAvailableRegistries() {
        const sql = `
            SELECT 
                registry_date, 
                COUNT(*) as records_count, 
                MIN(imported_at) as first_import, 
                MAX(imported_at) as last_import
            FROM ower.ower_history 
            GROUP BY registry_date 
            ORDER BY registry_date DESC
        `;
        return await sqlRequest(sql);
    }

    // Перевірка стану системи
    async getSystemHealthCheck() {
        const sql = `
            SELECT 
                'Всього записів пошуку' as metric, COUNT(*)::TEXT as value
            FROM log.admin_search_details
            UNION ALL
            SELECT 
                'Перевірено оплат', COUNT(*)::TEXT
            FROM log.admin_search_details WHERE payment_status IS NOT NULL
            UNION ALL
            SELECT 
                'Готово до перевірки', COUNT(*)::TEXT  
            FROM log.admin_search_details 
            WHERE payment_status IS NULL 
               OR (payment_status IN ('no_debt_initially', 'registry_missing') 
                   AND (payment_check_date IS NULL OR CURRENT_DATE - payment_check_date::DATE >= 1))
               OR (payment_check_date IS NULL OR CURRENT_DATE - payment_check_date::DATE >= 7)
            UNION ALL
            SELECT 
                'Реєстрів в історії', COUNT(DISTINCT registry_date)::TEXT
            FROM ower.ower_history
        `;
        return await sqlRequest(sql);
    }
}

module.exports = new LogRepository();