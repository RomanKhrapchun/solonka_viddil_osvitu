const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");
const {getSafeSortField, validateSortDirection} = require("../../../utils/constants");
const { remoteSqlRequest } = require('../../../helpers/remoteDatabase')
const Logger = require("../../../utils/logger")



class DebtorRepository {

    async getDebtByDebtorId(debtId, displayFieldsUsers) {
        let sql = `select ${displayFieldsUsers.map(field => ` ${field}`)} from ower.ower where id = ?`
        return await sqlRequest(sql, [debtId])
    }

    async getPhoneByClientId(clientId, displayFieldsPhone) {
        let sql = `select ${displayFieldsPhone.map(field => ` ${field}`)} from ower.phone where clientid = ?`
        return await sqlRequest(sql, [clientId])
    }
    async getPhoneByDebtor(debtor, displayFieldsPhone) {
        let sql = `select ${displayFieldsPhone.map(field => ` ${field}`)} from ower.phone where name = $1 and ipn = $2`
        return await sqlRequest(sql, [debtor.name, debtor.identification])
    }

    async getReceiptDate(debtorName) {
        let sql = `select action_stamp_tx as receipt_date FROM log.logger  where session_user_name = $1 order by action_stamp_tx desc;`;
        return await sqlRequest(sql, [debtorName]);
    }

    async insertPhoneByClientId(clientId, phoneNumber,debtor) {
        let sql, params;
        if (phoneNumber && phoneNumber.trim() !== '') {
            // Є телефон - зберігаємо з номером
            sql = `INSERT INTO ower.phone (clientid, phone, ischecked,name,ipn) VALUES ($1, $2, true,$3,$4)`;
            params = [clientId, phoneNumber.trim(),debtor.name,debtor.identification];
        } else {
            // Немає телефону - тільки позначаємо як перевірений
            sql = `INSERT INTO ower.phone (clientid, ischecked,name,ipn) VALUES ($1, true,$2,$3)`;
            params = [clientId,debtor.name,debtor.identification];
        }
        
        return await sqlRequest(sql, params);
    }

    async insertPhoneByDebtor(phoneNumber,debtor) {
        let sql, params;
        if (phoneNumber && phoneNumber.trim() !== '') {
            // Є телефон - зберігаємо з номером
            sql = `INSERT INTO ower.phone (phone, ischecked,name,ipn) VALUES ($1, true,$2,$3)`;
            params = [phoneNumber.trim(),debtor.name,debtor.identification];
        } else {
            // Немає телефону - тільки позначаємо як перевірений
            sql = `INSERT INTO ower.phone (ischecked,name,ipn) VALUES (true,$1,$2)`;
            params = [debtor.name,debtor.identification];
        }
        
        return await sqlRequest(sql, params);
    }

    async getFullIPN(debtPerson) {
        try {
            const tableName = process.env.REMOTE_DB_TABLE;
            const sql = `SELECT  id,name,ipn as identification FROM ${tableName}  
                     WHERE name = $1 AND ipn ILIKE '%$2'
                     LIMIT 1`;
    
    const params = [debtPerson.name, debtPerson.identification];

        const result = await remoteSqlRequest(sql, params);

        if (!result) {
            Logger.warn('getPhoneByPIBandIPN: remoteSqlRequest повернув null/undefined');
            return [];
        }

        if (!Array.isArray(result)) {
            Logger.warn('getPhoneByPIBandIPN: результат не є масивом', { 
                resultType: typeof result, 
                result: result 
            });
            return [];
        }

        if (result.length === 0) {
            Logger.info('getPhoneByPIBandIPN: телефон не знайдено в віддаленій БД', {
                name: debtPerson.name,
                identification: debtPerson.identification
            });
            return [];
        }

        Logger.info('getPhoneByPIBandIPN: телефон знайдено', {
            name: debtPerson.name,
            recordsFound: result.length,
            //hasPhone: !!result[0]?.phone
        });

        return result;

    } catch (error) {
        Logger.error('getPhoneByPIBandIPN: критична помилка', {
            message: error.message,
            stack: error.stack,
            debtPersonName: debtPerson?.name,
            debtPersonId: debtPerson?.identification
        });
        
        // Повертаємо пустий масив замість throw error
        return [];
    }
}

async findDebtByFilter(limit, offset, title, whereConditions = {}, displayFieldsUsers = [], sortBy = 'name', sortDirection = 'asc') {
    const values = [];
    
    // Валідуємо параметри сортування
    const safeSortField = getSafeSortField(sortBy);
    const safeSortDirection = validateSortDirection(sortDirection);
    
    // Додаємо total_debt до JSON об'єкта
    const totalDebtExpression = '(COALESCE(non_residential_debt, 0) + COALESCE(residential_debt, 0) + COALESCE(land_debt, 0) + COALESCE(orenda_debt, 0) + COALESCE(mpz, 0))';
    
    // Створюємо JSON поля
    const jsonFields = displayFieldsUsers.map(field => `'${field}', ${field}`).join(', ');
    
    let sql = `select json_agg(
        json_build_object(
            ${jsonFields},
            'total_debt', ${totalDebtExpression},
            'phone_status', CASE 
                WHEN ischecked IS TRUE AND hasnumber IS TRUE THEN 'has_phone'
                WHEN ischecked IS TRUE AND (hasnumber IS FALSE OR hasnumber IS NULL) THEN 'no_phone'
                ELSE 'not_checked'
            END,
            'ischecked', COALESCE(ischecked, false),
            'hasnumber', COALESCE(hasnumber, false),
            'receipt_date', COALESCE(receipt_date, null)
        )
    ) as data,
    max(cnt) as count
    from (
        select o.*,
        (COALESCE(o.non_residential_debt, 0) + COALESCE(o.residential_debt, 0) + COALESCE(o.land_debt, 0) + COALESCE(o.orenda_debt, 0) + COALESCE(o.mpz, 0)) as total_debt_calc,
        count(*) over () as cnt,
        p.ischecked,
        p.hasnumber,
        l.receipt_date
        from ower.ower o
        LEFT JOIN (
            SELECT DISTINCT ON (name, ipn) 
                clientid, phone, hasnumber, ischecked, name, ipn
            FROM ower.phone 
            ORDER BY name, ipn, clientid DESC
        ) p ON (
            o.name = p.name AND 
            RIGHT(o.identification, 3) = p.ipn
        )
        LEFT JOIN (
        SELECT DISTINCT ON (session_user_name) 
            session_user_name, 
            action_stamp_tx as receipt_date
        FROM log.logger 
        WHERE action = 'GENERATE_DOC'
        ORDER BY session_user_name, action_stamp_tx DESC
        ) l ON o.name = l.session_user_name
        where 1=1`;

    // Додаємо WHERE умови з префіксом o.
    if (Object.keys(whereConditions).length) {
        const data = buildWhereCondition(whereConditions);
        // Замінюємо назви полів на o.field для таблиці ower.ower
        const modifiedText = data.text.replace(/(\s+)(\w+)(\s*[=<>!])/g, '$1o.$2$3');
        sql += modifiedText;
        values.push(...data.value);
    }

    // Додаємо фільтрацію по назві з префіксом
    if (title) {
        sql += ` and o.name ILIKE ?`;
        values.push(`%${title}%`);
    }

    // Додаємо сортування з префіксом o.
    if (sortBy === 'total_debt') {
        sql += ` order by total_debt_calc ${safeSortDirection.toUpperCase()}`;
    } else if (sortBy === 'name') {
        sql += ` order by LOWER(o.name) ${safeSortDirection.toUpperCase()}`;
    } else {
        sql += ` order by o.${safeSortField} ${safeSortDirection.toUpperCase()}`;
    }
    
    if (sortBy !== 'id') {
        sql += `, o.id ${safeSortDirection.toUpperCase()}`;
    }

    values.push(limit);
    values.push(offset);
    sql += ` limit ? offset ?`;
    
    sql += ` ) q`;

    return await sqlRequest(sql, [...values]);
}

    async getRequisite() {
        return await sqlRequest('select * from ower.settings')
    }

     // Отримати ПІБ з таблиці ower.ower по ID
     async getDebtorNameById(owerId) {
        const sql = `
            SELECT 
                id,
                name as person_name
            FROM ower.ower 
            WHERE id = ?
        `;
        const result = await sqlRequest(sql, [owerId]);
        return result.length > 0 ? result[0] : null;
    }

    // Знайти ower_history_id по ПІБ в ower.ower_history
    async getHistoryIdByName(personName) {
        const sql = `
            SELECT 
                id as history_id,
                person_name,
                identification,
                registry_date
            FROM ower.ower_history 
            WHERE person_name LIKE ?
            ORDER BY registry_date DESC
            LIMIT 1
        `;
        const result = await sqlRequest(sql, [`%${personName}%`]);
        return result.length > 0 ? result[0] : null;
    }

    // Отримати всі дзвінки для боржника по ower_history_id
    async getDebtorCalls(historyId) {
        const sql = `
            SELECT 
                dc.id,
                dc.history_record_id,
                dc.call_date,
                dc.call_topic,
                dc.created_at,
                dc.updated_at
            FROM ower.debtor_calls dc
            WHERE dc.history_record_id = ?
            ORDER BY dc.call_date DESC
        `;
        return await sqlRequest(sql, [historyId]);
    }

    async getDebtorReceiptMessages(historyId) {
        const sql = `
            SELECT 
                rc.id,
                rc.history_record_id,
                rc.date,
                rc.topic,
                rc.created_at,
                rc.updated_at
            FROM ower.debtor_receipts_comments rc
            WHERE rc.history_record_id = ?
            ORDER BY rc.date DESC
        `;
        return await sqlRequest(sql, [historyId]);
    }

    // Створити новий дзвінок
    async createDebtorCall(callData) {
        const { history_record_id, call_date, call_topic } = callData;
    
        // Validation
        if (!history_record_id || !call_date || !call_topic) {
            throw new Error('Missing required fields');
        }
    
        const sql = `
            INSERT INTO ower.debtor_calls 
            (history_record_id, call_date, call_topic, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *
        `;
    
        try {
            const result = await sqlRequest(sql, [history_record_id, call_date, call_topic]);
            
            // PostgreSQL з RETURNING поверне масив рядків
            if (Array.isArray(result) && result.length > 0) {
                const createdCall = result[0];
                return createdCall;
            }
            
            // Якщо результат в іншому форматі (деякі драйвери)
            if (result && result.rows && result.rows.length > 0) {
                const createdCall = result.rows[0];
                return createdCall;
            }
            
            throw new Error(`No data returned from INSERT: ${JSON.stringify(result)}`);
            
        } catch (error) {
            console.error('=== SQL ERROR ===');
            console.error('Error:', error);
            throw error;
        }
    }

    async createDebtorReceiptsMessages(callData) {
        const { history_record_id, date, topic } = callData;
    
        // Validation
        if (!history_record_id || !date || !topic) {
            throw new Error('Missing required fields');
        }
    
        const sql = `
            INSERT INTO ower.debtor_receipts_comments 
            (history_record_id, date, topic, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *
        `;
    
        try {
            const result = await sqlRequest(sql, [history_record_id, date, topic]);
            
            // PostgreSQL з RETURNING поверне масив рядків
            if (Array.isArray(result) && result.length > 0) {
                const createdCall = result[0];
                return createdCall;
            }
            
            // Якщо результат в іншому форматі (деякі драйвери)
            if (result && result.rows && result.rows.length > 0) {
                const createdCall = result.rows[0];
                return createdCall;
            }
            
            throw new Error(`No data returned from INSERT: ${JSON.stringify(result)}`);
            
        } catch (error) {
            console.error('=== SQL ERROR ===');
            console.error('Error:', error);
            throw error;
        }
    }

    // Перевірити існування запису в історії по ower_history_id
    async getHistoryRecordById(historyRecordId) {
        const sql = `
            SELECT 
                id, 
                person_name, 
                identification
            FROM ower.ower_history 
            WHERE id = ?
        `;
        return await sqlRequest(sql, [historyRecordId]);
    }

    // Отримати дзвінок по ID
    async getCallById(callId) {
        const sql = `
            SELECT 
                id,
                history_record_id,
                call_date,
                call_topic,
                created_at,
                updated_at
            FROM ower.debtor_calls 
            WHERE id = ?
        `;
        const result = await sqlRequest(sql, [callId]);
        return result.length > 0 ? result[0] : null;
    }


    // КОМПЛЕКСНИЙ МЕТОД: Отримати ower_history_id по ower.id або ПІБ
    async resolveHistoryId(identifier) {
        // Перевіряємо чи це число (ower.id)
        if (!isNaN(identifier) && Number.isInteger(Number(identifier))) {
            // Це ower.id - шукаємо ПІБ в ower.ower
            const debtor = await this.getDebtorNameById(identifier);
            if (!debtor) {
                throw new Error('Debtor not found in ower.ower');
            }
            
            // Тепер шукаємо history_id по ПІБ
            const historyRecord = await this.getHistoryIdByName(debtor.person_name);
            if (!historyRecord) {
                throw new Error('History record not found for this debtor');
            }
            
            return historyRecord.history_id;
        } else {
            // Це ПІБ - одразу шукаємо в ower.ower_history
            const historyRecord = await this.getHistoryIdByName(identifier);
            if (!historyRecord) {
                throw new Error('History record not found for this name');
            }
            
            return historyRecord.history_id;
        }
    }

    async getCallsByIdentifier(identifier) {
        const historyId = await this.resolveHistoryId(identifier);
        return await this.getDebtorCalls(historyId);
    }
    async updateCall(callId, updateData) {
        const { call_date, call_topic } = updateData;
    
        // Validation
        if (!callId) {
            throw new Error('Call ID is required');
        }
        
        if (!call_date && !call_topic) {
            throw new Error('At least one field (call_date or call_topic) must be provided');
        }

        // Побудова динамічного SQL залежно від переданих полів
        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        if (call_date) {
            updateFields.push(`call_date = $${paramIndex++}`);
            params.push(call_date);
        }

        if (call_topic) {
            updateFields.push(`call_topic = $${paramIndex++}`);
            params.push(call_topic);
        }

        // Завжди оновлюємо updated_at
        updateFields.push(`updated_at = NOW()`);
        params.push(callId); // ID для WHERE умови

        const sql = `
            UPDATE ower.debtor_calls 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await sqlRequest(sql, params);
            
            // PostgreSQL з RETURNING поверне масив рядків
            if (Array.isArray(result) && result.length > 0) {
                const updatedCall = result[0];
                return updatedCall;
            }
            
            // Якщо результат в іншому форматі (деякі драйвери)
            if (result && result.rows && result.rows.length > 0) {
                const updatedCall = result.rows[0];
                return updatedCall;
            }
            
            // Якщо жоден запис не був оновлений
            if ((Array.isArray(result) && result.length === 0) || 
                (result && result.rows && result.rows.length === 0)) {
                throw new Error(`Call with ID ${callId} not found`);
            }
            
            throw new Error(`No data returned from UPDATE: ${JSON.stringify(result)}`);
            
        } catch (error) {
            console.error('=== SQL UPDATE ERROR ===');
            console.error('Error:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    // ЗРУЧНИЙ МЕТОД: Створити дзвінок по ower.id або ПІБ
    async createCallByIdentifier(identifier, callData) {
        const historyId = await this.resolveHistoryId(identifier);
        
        return await this.createDebtorCall({
            history_record_id: historyId,
            call_date: callData.call_date,
            call_topic: callData.call_topic
        });
    }

    async getReceiptMessagesByIdentifier(identifier) {
        const historyId = await this.resolveHistoryId(identifier);
        return await this.getDebtorReceiptMessages(historyId);
    }

    
    async createReceiptMessagesByIdentifier(identifier, callData) {
        const historyId = await this.resolveHistoryId(identifier);
        
        return await this.createDebtorReceiptsMessages({
            history_record_id: historyId,
            date: callData.date,
            topic: callData.topic,
            created_at: new Date(),
            updated_at: new Date()
        });
    }

}

module.exports = new DebtorRepository();