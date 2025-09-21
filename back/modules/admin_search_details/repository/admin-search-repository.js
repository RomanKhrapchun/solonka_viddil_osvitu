const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");

class AdminSearchRepository {

    /**
     * Створення нового запису пошуку адміністратора
     */
    async create(data) {
        const sql = `INSERT INTO log.admin_search_details (${Object.keys(data).map(field => `${field}`).join(", ")}) VALUES (${Object.keys(data).map(el => '?').join(", ")}) RETURNING id`;
        return await sqlRequest(sql, [...Object.values(data)]);
    }

    /**
     * Отримання всіх пошуків з фільтрацією та пагінацією
     */
    async getAllSearches(limit, offset, whereConditions = {}, displayFields = []) {
        const values = [];
        const defaultFields = [
            'asd.id', 'asd.logger_id', 'asd.username', 'asd.searched_person_name', 
            'asd.searched_person_id', 'asd.search_type', 'asd.search_result', 'asd.created_at'
        ];
        const fields = displayFields.length ? displayFields : defaultFields;

        let sql = `select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(${fields.map(field => `'${field.split('.')[1] || field}', ${field}`).join(', ')},
                'username', au.username,
                'admin_full_name', COALESCE(au.first_name, '') || ' ' || COALESCE(au.last_name, ''),
                'log_details', json_build_object(
                    'client_addr', l.client_addr,
                    'action_stamp_tx', l.action_stamp_tx,
                    'application_name', l.application_name
                )
            ) as rw,
            count(*) over () as cnt
            from log.admin_search_details asd
            left join log.logger l on l.id = asd.logger_id
            left join admin.users au on au.id = l.uid
            where 1=1`;

        if (Object.keys(whereConditions).length) {
            const data = buildWhereCondition(whereConditions, 'asd');
            sql += data.text;
            values.push(...data.value);
        }

        values.push(limit);
        values.push(offset);
        sql += ` order by asd.id desc limit ? offset ? ) q`;
        
        return await sqlRequest(sql, [...values]);
    }

    /**
     * Отримання пошуків з курсорною пагінацією
     */
    async getSearchesWithCursor(itemsLength, cursor, sort = 'DESC', whereConditions = {}) {
        const sortOrder = sort;
        const limit = parseInt(itemsLength + 1);
        const values = [];
        
        let query = `SELECT 
            asd.id, asd.logger_id, au.username, asd.searched_person_name, 
            asd.searched_person_id, asd.search_type, asd.search_result, asd.created_at,
            COALESCE(au.first_name, '') || ' ' || COALESCE(au.last_name, '') as admin_full_name,
            l.client_addr, l.action_stamp_tx, l.application_name
            FROM log.admin_search_details asd
            LEFT JOIN log.logger l ON l.id = asd.logger_id
            LEFT JOIN admin.users au ON au.id = l.uid
            WHERE 1=1 `;

        if (Object.keys(whereConditions).length) {
            let result = ' and ';
            const conditions = Object.keys(whereConditions).map(key => {
                if (key === 'username' && whereConditions[key].includes(',')) {
                    const splitData = whereConditions[key].split(',');
                    values.push(splitData);
                    return `au.username = any (array[?::text[]])`;
                } else if (key === 'username') {
                    values.push(whereConditions[key]);
                    return `au.username = ?`;
                } else if (key === 'search_type' && whereConditions[key].includes(',')) {
                    const splitData = whereConditions[key].split(',');
                    values.push(splitData);
                    return `asd.search_type = any (array[?::text[]])`;
                } else if (key === 'created_at' && whereConditions[key].includes('_')) {
                    const [date1, date2] = whereConditions[key].split('_');
                    values.push(date1, date2);
                    return `asd.created_at BETWEEN ? AND ?`;
                } else if (key === 'searched_person_name') {
                    values.push(`%${whereConditions[key]}%`);
                    return `asd.searched_person_name ILIKE ?`;
                } else {
                    values.push(whereConditions[key]);
                    return `asd.${key} = ?`;
                }
            });
            result += conditions.join(' and ');
            query += result;
        }

        if (cursor) {
            query += ` and asd.id ${sortOrder === 'ASC' ? '>' : '<'} ?`;
            values.push(cursor);
        }

        query += ` ORDER BY asd.id ${sortOrder} LIMIT ${limit}`;
        return await sqlRequest(query, [...values]);
    }

    /**
     * Отримання деталей конкретного пошуку
     */
    async findSearchById(searchId) {
        const sql = `SELECT 
            asd.*,
            au.username,
            COALESCE(au.first_name, '') || ' ' || COALESCE(au.last_name, '') as admin_full_name,
            au.email as admin_email,
            l.client_addr, l.action_stamp_tx, l.application_name, l.data_log
            FROM log.admin_search_details asd
            LEFT JOIN log.logger l ON l.id = asd.logger_id
            LEFT JOIN admin.users au ON au.id = l.uid
            WHERE asd.id = ?`;
        
        return await sqlRequest(sql, [searchId]);
    }

    /**
     * Оновлення результату пошуку
     */
    async updateSearchResult(searchId, searchResult, searchedPersonId = null) {
        const sql = `UPDATE log.admin_search_details 
                     SET search_result = ?, searched_person_id = ?, updated_at = NOW() 
                     WHERE id = ? RETURNING id`;
        return await sqlRequest(sql, [searchResult, searchedPersonId, searchId]);
    }

    /**
     * Статистика пошуків по адміністраторах
     */
    async getSearchStatistics(limit, offset, whereConditions = {}) {
        const values = [];
        let sql = `
        select json_agg(rw) as data,
            max(cnt) as count
            from (
            select json_build_object(
                'username', au.username,
                'admin_full_name', COALESCE(au.first_name, '') || ' ' || COALESCE(au.last_name, ''),
                'month_name', 
                CASE 
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 1 THEN 'Січень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 2 THEN 'Лютий'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 3 THEN 'Березень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 4 THEN 'Квітень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 5 THEN 'Травень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 6 THEN 'Червень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 7 THEN 'Липень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 8 THEN 'Серпень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 9 THEN 'Вересень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 10 THEN 'Жовтень'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 11 THEN 'Листопад'
                    WHEN EXTRACT(MONTH FROM asd.created_at) = 12 THEN 'Грудень'
                END,
                'year', EXTRACT(YEAR FROM asd.created_at),
                'total_searches', COUNT(*),
                'successful_searches', COUNT(*) FILTER (WHERE asd.search_result = 'found'),
                'failed_searches', COUNT(*) FILTER (WHERE asd.search_result = 'not_found'),
                'unique_persons_searched', COUNT(DISTINCT asd.searched_person_name),
                'search_types', json_agg(DISTINCT asd.search_type)
            ) AS rw,
            count(*) over () as cnt
        FROM 
            log.admin_search_details asd
        LEFT JOIN log.logger l ON l.id = asd.logger_id
        LEFT JOIN admin.users au ON au.id = l.uid
        WHERE 1=1 `;

        if (whereConditions?.year) {
            sql += ` AND EXTRACT(YEAR FROM asd.created_at) = ? `;
            values.push(whereConditions.year);
        }

        if (whereConditions?.month) {
            sql += ` AND EXTRACT(MONTH FROM asd.created_at) = ? `;
            values.push(whereConditions.month);
        }

        if (whereConditions?.username) {
            sql += ` AND au.username = ? `;
            values.push(whereConditions.username);
        }

        values.push(limit);
        values.push(offset);
        sql += `GROUP BY au.username, au.first_name, au.last_name, EXTRACT(MONTH FROM asd.created_at), EXTRACT(YEAR FROM asd.created_at) 
                ORDER BY EXTRACT(YEAR FROM asd.created_at) DESC, EXTRACT(MONTH FROM asd.created_at) DESC
                limit ? offset ? ) q`;

        return await sqlRequest(sql, [...values]);
    }

    /**
     * Пошук по імені боржника
     */
    async searchByPersonName(personName, limit = 10) {
        const sql = `SELECT DISTINCT 
            searched_person_name, 
            searched_person_id,
            COUNT(*) as search_count,
            MAX(created_at) as last_search,
            string_agg(DISTINCT username, ', ') as searched_by_admins
            FROM log.admin_search_details 
            WHERE searched_person_name ILIKE ? 
            GROUP BY searched_person_name, searched_person_id
            ORDER BY search_count DESC, last_search DESC
            LIMIT ?`;
        
        return await sqlRequest(sql, [`%${personName}%`, limit]);
    }

    /**
     * Отримання останніх пошуків адміністратора
     */
    async getRecentSearchesByAdmin(username, limit = 10) {
        const sql = `SELECT 
            asd.*,
            au.username,
            l.client_addr, l.action_stamp_tx
            FROM log.admin_search_details asd
            LEFT JOIN log.logger l ON l.id = asd.logger_id
            LEFT JOIN admin.users au ON au.id = l.uid
            WHERE au.username = ?
            ORDER BY asd.created_at DESC
            LIMIT ?`;
        
        return await sqlRequest(sql, [username, limit]);
    }

    /**
     * Видалення старих записів (cleanup)
     */
    async deleteOldSearches(olderThanDays = 365) {
        const sql = `DELETE FROM log.admin_search_details 
                     WHERE created_at < NOW() - INTERVAL '? days' 
                     RETURNING id`;
        return await sqlRequest(sql, [olderThanDays]);
    }

    /**
     * Підрахунок загальної кількості пошуків
     */
    async getTotalSearchCount(whereConditions = {}) {
        const values = [];
        let sql = `SELECT COUNT(*) as total FROM log.admin_search_details WHERE 1=1`;

        if (Object.keys(whereConditions).length) {
            const data = buildWhereCondition(whereConditions);
            sql += data.text;
            values.push(...data.value);
        }

        return await sqlRequest(sql, [...values]);
    }
}

module.exports = new AdminSearchRepository();