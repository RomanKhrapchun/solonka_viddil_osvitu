const { sqlRequest } = require("../../../helpers/database");

class DebtChargesRepository {

    async getDebtChargeById(chargeId, displayFieldsDebtCharges) {
        let sql = `select ${displayFieldsDebtCharges.map(field => ` ${field}`)} from ower.debt_charges where id = $1`
        return await sqlRequest(sql, [chargeId])
    }

    async findDebtChargesByFilter(limit, offset, title, whereConditions = {}, displayFieldsDebtCharges = [], sortBy = 'id', sortDirection = 'desc') {
        // Валідація параметрів з дефолтними значеннями
        const numericLimit = parseInt(limit) || 16;
        const numericOffset = parseInt(offset) || 0;
        
        const values = [];
        let paramIndex = 1;
        
        // Дозволені поля для сортування
        const allowedSortFields = [
            'id', 'tax_number', 'payer_name', 'amount', 'total_amount', 
            'tax_classifier', 'payment_info', 'cadastral_number', 'document_date',
            'delivery_date', 'status', 'created_at', 'updated_at'
        ];

        // Безпечне сортування
        const safeSortField = allowedSortFields.includes(sortBy) ? sortBy : 'id';
        const safeSortDirection = ['asc', 'desc'].includes(sortDirection?.toLowerCase()) ? sortDirection.toLowerCase() : 'desc';
        
        // Створюємо JSON поля
        const jsonFields = displayFieldsDebtCharges.map(field => `'${field}', ${field}`).join(', ');
        
        let sql = `select json_agg(
            json_build_object(
                ${jsonFields}
            )
        ) as data,
        max(cnt) as count
        from (
            select *,
            count(*) over () as cnt
            from ower.debt_charges
            where 1=1`;

        // Додаємо WHERE умови для debt_charges
        if (Object.keys(whereConditions).length) {
            const whereData = this.buildDebtChargesWhereCondition(whereConditions, paramIndex);
            sql += whereData.text;
            values.push(...whereData.value);
            paramIndex += whereData.value.length;
        }

        // Додаємо фільтрацію по назві платника
        if (title) {
            sql += ` and payer_name ILIKE $${paramIndex}`;
            values.push(`%${title}%`);
            paramIndex++;
        }

        // Додаємо сортування
        if (sortBy === 'payer_name') {
            // Сортування по імені без урахування регістру
            sql += ` order by LOWER(payer_name) ${safeSortDirection.toUpperCase()}`;
        } else {
            // Стандартне сортування
            sql += ` order by ${safeSortField} ${safeSortDirection.toUpperCase()}`;
        }
        
        // Додаємо вторинне сортування для стабільності
        if (sortBy !== 'id') {
            sql += `, id ${safeSortDirection.toUpperCase()}`;
        }

        // Додаємо пагінацію з правильними параметрами
        sql += ` limit $${paramIndex} offset $${paramIndex + 1}`;
        values.push(numericLimit);
        values.push(numericOffset);
                
        sql += ` ) q`;

        return await sqlRequest(sql, [...values]);
    }

    // Покращена функція для WHERE умов з правильною індексацією параметрів
    buildDebtChargesWhereCondition(whereConditions, startIndex = 1) {
        const values = []
        let paramIndex = startIndex;
        
        // Фільтруємо умови, щоб уникнути null значень
        const filteredConditions = Object.keys(whereConditions).filter(key => {
            const value = whereConditions[key];
            return value !== null && value !== undefined && value !== '';
        });

        // Якщо після фільтрації не залишилось умов, повертаємо порожню умову
        if (filteredConditions.length === 0) {
            return {
                text: '',
                value: [],
            };
        }

        const conditions = filteredConditions.map(key => {
            // Фільтр по сумі (діапазон)
            if (key === 'amount_from') {
                if (whereConditions[key] === null || whereConditions[key] === undefined) {
                    return null;
                }
                values.push(parseFloat(whereConditions[key]));
                return `amount >= $${paramIndex++}`;
            }
            
            if (key === 'amount_to') {
                if (whereConditions[key] === null || whereConditions[key] === undefined) {
                    return null;
                }
                values.push(parseFloat(whereConditions[key]));
                return `amount <= $${paramIndex++}`;
            }

            // Пошук по податковому номеру (LIKE)
            if (key === 'tax_number') {
                values.push(`%${whereConditions[key]}%`);
                return `tax_number ILIKE $${paramIndex++}`;
            }

            // Пошук по назві платника (LIKE)
            if (key === 'payer_name') {
                values.push(`%${whereConditions[key]}%`);
                return `payer_name ILIKE $${paramIndex++}`;
            }

            // Пошук по платежу (LIKE)
            if (key === 'payment_info') {
                values.push(`%${whereConditions[key]}%`);
                return `payment_info ILIKE $${paramIndex++}`;
            }

            // Пошук по кадастровому номеру (LIKE)
            if (key === 'cadastral_number') {
                values.push(`%${whereConditions[key]}%`);
                return `cadastral_number ILIKE $${paramIndex++}`;
            }

            // Точне співпадіння для класифікатора
            if (key === 'tax_classifier') {
                values.push(whereConditions[key]);
                return `${key} = $${paramIndex++}`;
            }

            // Універсальний фільтр по датам
            if (key.includes('date_from')) {
                const dateField = key.replace('_from', '');
                values.push(whereConditions[key]);
                return `${dateField} >= $${paramIndex++}`;
            }

            if (key.includes('date_to')) {
                const dateField = key.replace('_to', '');
                values.push(whereConditions[key]);
                return `${dateField} <= $${paramIndex++}`;
            }

            // Загальний випадок - точне співпадіння
            values.push(whereConditions[key]);
            return `${key} = $${paramIndex++}`;

        }).filter(condition => condition !== null); // Фільтруємо null умови
        
        // Перевіряємо, чи залишились умови після обробки
        if (conditions.length === 0) {
            return {
                text: '',
                value: [],
            };
        }
        
        return {
            text: ' and ' + conditions.join(' and '),
            value: values,
        }
    }

    async createDebtCharge(debtChargeData) {
        const {
            tax_number,
            payer_name,
            payment_info,
            tax_classifier,
            account_number,
            full_document_id,
            amount,
            cadastral_number,
            document_date,
            delivery_date,
            status
        } = debtChargeData;

        const sql = `
            INSERT INTO ower.debt_charges (
                tax_number, payer_name, payment_info, tax_classifier,
                account_number, full_document_id, amount, cadastral_number,
                document_date, delivery_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            tax_number, payer_name, payment_info, tax_classifier,
            account_number, full_document_id, amount, cadastral_number,
            document_date, delivery_date, status || 'Не вручено'
        ];

        return await sqlRequest(sql, values);
    }
        
    async truncateDebtCharges() {
        try {
            console.log('🧹 Clearing debt_charges table...');
            const result = await sqlRequest('TRUNCATE TABLE ower.debt_charges RESTART IDENTITY');
            console.log('✅ Table cleared successfully');
            return result;
        } catch (error) {
            console.error('❌ Error truncating debt_charges table:', error);
            throw new Error(`Помилка очищення таблиці: ${error.message}`);
        }
    }

    async bulkCreateDebtCharges(debtChargesArray) {
        if (!debtChargesArray.length) {
            return { imported: 0, total: 0 };
        }

        try {
            console.log(`📦 Starting bulk insert of ${debtChargesArray.length} records...`);
            
            // Перевіримо структуру даних перед початком
            const sampleRecord = debtChargesArray[0];
            console.log('📋 Sample record structure:', Object.keys(sampleRecord));
            
            // Валідуємо перший запис
            this.validateRecordStructure(sampleRecord);
            
            // Використовуємо менші батчі для надійності
            const BATCH_SIZE = 50; // Ще менший батч для максимальної надійності
            let totalImported = 0;
            let totalErrors = 0;

            for (let i = 0; i < debtChargesArray.length; i += BATCH_SIZE) {
                const batch = debtChargesArray.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(debtChargesArray.length / BATCH_SIZE);
                
                console.log(`📊 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
                
                try {
                    const batchResult = await this.insertBatch(batch);
                    totalImported += batchResult;
                    
                    const failed = batch.length - batchResult;
                    if (failed > 0) {
                        totalErrors += failed;
                        console.log(`⚠️ Batch ${batchNumber}: ${batchResult} succeeded, ${failed} failed`);
                    } else {
                        console.log(`✅ Batch ${batchNumber} completed: ${batchResult} records inserted`);
                    }
                } catch (batchError) {
                    console.error(`❌ Batch ${batchNumber} failed completely:`, batchError.message);
                    totalErrors += batch.length;
                    continue;
                }
                
                // Невелика пауза між батчами для зменшення навантаження на БД
                if (batchNumber % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            console.log(`🎉 Bulk insert completed: ${totalImported}/${debtChargesArray.length} records imported`);
            if (totalErrors > 0) {
                console.log(`⚠️ Total errors: ${totalErrors}`);
            }
            
            return {
                imported: totalImported,
                total: debtChargesArray.length,
                errors: totalErrors
            };

        } catch (error) {
            console.error('❌ Bulk insert error:', error);
            throw new Error(`Помилка масового вставлення: ${error.message}`);
        }
    }

    validateRecordStructure(record) {
        const requiredFields = ['tax_number', 'payer_name', 'amount'];
        const missingFields = requiredFields.filter(field => 
            !record.hasOwnProperty(field) || 
            record[field] === null || 
            record[field] === undefined
        );
        
        if (missingFields.length > 0) {
            throw new Error(`Відсутні обов'язкові поля в записі: ${missingFields.join(', ')}`);
        }
        
        // Перевіряємо тип даних
        if (isNaN(Number(record.amount))) {
            throw new Error(`Некоректний формат суми: ${record.amount}`);
        }
        
        console.log('✅ Record structure validated');
    }

    async insertBatch(batch) {
        if (!batch.length) return 0;

        console.log(`🔧 Processing batch of ${batch.length} records`);

        try {
            // Спробуємо спочатку вставити по одному запису для діагностики
            if (batch.length <= 3) {
                return await this.insertRecordsOneByOne(batch);
            }

            // Для більших батчів використовуємо простіший підхід
            const insertPromises = [];
            
            for (const record of batch) {
                const promise = this.insertSingleRecord(record);
                insertPromises.push(promise);
            }

            const results = await Promise.allSettled(insertPromises);
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected');

            if (failed.length > 0) {
                console.log(`⚠️ ${failed.length} records failed, ${successful} succeeded`);
                // Логуємо тільки першу помилку для діагностики
                if (failed[0].reason) {
                    console.error('❌ Sample error:', failed[0].reason.message);
                }
            }

            return successful;
            
        } catch (error) {
            console.error(`❌ Batch insert error:`, error.message);
            
            // Fallback - спробуємо вставити по одному
            console.log('🔄 Falling back to single record insertion...');
            return await this.insertRecordsOneByOne(batch);
        }
    }

    async insertRecordsOneByOne(batch) {
        let successful = 0;
        
        for (let i = 0; i < batch.length; i++) {
            try {
                await this.insertSingleRecord(batch[i]);
                successful++;
                if (i % 10 === 0) {
                    console.log(`📊 Processed ${i + 1}/${batch.length} records`);
                }
            } catch (error) {
                console.error(`❌ Failed to insert record ${i + 1}:`, error.message);
                // Продовжуємо обробку інших записів
            }
        }
        
        return successful;
    }

    async insertSingleRecord(charge) {
        const sql = `
            INSERT INTO ower.debt_charges (
                tax_number, payer_name, payment_info, tax_classifier,
                account_number, full_document_id, amount, cadastral_number,
                document_date, delivery_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        const values = [
            charge.tax_number || null,
            charge.payer_name || null,
            charge.payment_info || null,
            charge.tax_classifier || null,
            charge.account_number || null,
            charge.full_document_id || null,
            charge.amount || 0,
            charge.cadastral_number || null,
            charge.document_date || null,
            charge.delivery_date || null,
            charge.status || 'Не вручено'
        ];

        return await sqlRequest(sql, values);
    }

    // Універсальний метод для створення одного запису з повною валідацією
    async createSingleDebtCharge(chargeData) {
        try {
            const validatedData = this.validateChargeData(chargeData);
            return await this.createDebtCharge(validatedData);
        } catch (error) {
            console.error('❌ Single charge creation error:', error);
            throw error;
        }
    }

    // Універсальна валідація даних нарахування
    validateChargeData(chargeData) {
        const errors = [];

        // Обов'язкові поля
        if (!chargeData.tax_number || String(chargeData.tax_number).trim() === '') {
            errors.push('Відсутній податковий номер');
        }

        if (!chargeData.payer_name || String(chargeData.payer_name).trim() === '') {
            errors.push('Відсутня назва платника');
        }

        if (!chargeData.amount || isNaN(Number(chargeData.amount)) || Number(chargeData.amount) <= 0) {
            errors.push('Некоректна сума');
        }

        if (errors.length > 0) {
            throw new Error(`Помилки валідації: ${errors.join(', ')}`);
        }

        // Нормалізація даних
        return {
            ...chargeData,
            tax_number: String(chargeData.tax_number).trim(),
            payer_name: String(chargeData.payer_name).trim(),
            amount: Number(chargeData.amount),
            status: chargeData.status || 'Не вручено'
        };
    }

    async getDebtChargesStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_charges,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount,
                COUNT(DISTINCT tax_number) as unique_taxpayers,
                COUNT(CASE WHEN status = 'Вручено' THEN 1 END) as delivered_count,
                COUNT(CASE WHEN status = 'Не вручено' THEN 1 END) as not_delivered_count
            FROM ower.debt_charges
        `;
        
        return await sqlRequest(sql);
    }

    async getUniqueClassifiers() {
        const sql = `
            SELECT DISTINCT tax_classifier, COUNT(*) as usage_count
            FROM ower.debt_charges 
            WHERE tax_classifier IS NOT NULL AND tax_classifier != ''
            GROUP BY tax_classifier
            ORDER BY usage_count DESC, tax_classifier
        `;
        const result = await sqlRequest(sql);
        return result.map(row => ({
            classifier: row.tax_classifier,
            count: row.usage_count
        }));
    }

    async getUniqueStatuses() {
        const sql = `
            SELECT DISTINCT status, COUNT(*) as usage_count
            FROM ower.debt_charges 
            WHERE status IS NOT NULL AND status != ''
            GROUP BY status
            ORDER BY usage_count DESC
        `;
        const result = await sqlRequest(sql);
        return result.map(row => ({
            status: row.status,
            count: row.usage_count
        }));
    }

    async getUniquePaymentInfo() {
        const sql = `
            SELECT DISTINCT payment_info, COUNT(*) as usage_count
            FROM ower.debt_charges 
            WHERE payment_info IS NOT NULL AND payment_info != ''
            GROUP BY payment_info
            ORDER BY usage_count DESC 
            LIMIT 50
        `;
        const result = await sqlRequest(sql);
        return result.map(row => ({
            payment_info: row.payment_info,
            count: row.usage_count
        }));
    }

    // Універсальний метод для отримання статистики за періодом
    async getStatisticsByPeriod(dateFrom, dateTo, groupBy = 'day') {
        const allowedGroupBy = ['day', 'week', 'month', 'year'];
        const safeGroupBy = allowedGroupBy.includes(groupBy) ? groupBy : 'day';
        
        let dateFormat;
        switch (safeGroupBy) {
            case 'day': dateFormat = 'YYYY-MM-DD'; break;
            case 'week': dateFormat = 'YYYY-"W"WW'; break;
            case 'month': dateFormat = 'YYYY-MM'; break;
            case 'year': dateFormat = 'YYYY'; break;
            default: dateFormat = 'YYYY-MM-DD';
        }

        const sql = `
            SELECT 
                TO_CHAR(document_date, '${dateFormat}') as period,
                COUNT(*) as charges_count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM ower.debt_charges
            WHERE document_date BETWEEN $1 AND $2
            GROUP BY TO_CHAR(document_date, '${dateFormat}')
            ORDER BY period
        `;
        
        return await sqlRequest(sql, [dateFrom, dateTo]);
    }

    // Метод для тестування підключення та структури таблиці
    async testDatabaseConnection() {
        try {
            console.log('🔍 Testing database connection...');
            
            // Перевіряємо підключення
            const testQuery = 'SELECT 1 as test';
            await sqlRequest(testQuery);
            console.log('✅ Database connection OK');
            
            // Перевіряємо структуру таблиці
            const tableStructure = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'ower' AND table_name = 'debt_charges'
                ORDER BY ordinal_position
            `;
            
            const columns = await sqlRequest(tableStructure);
            console.log('📋 Table structure:', columns.map(col => 
                `${col.column_name}:${col.data_type}${col.is_nullable === 'YES' ? '?' : ''}`
            ));
            
            // Перевіряємо кількість записів
            const countQuery = 'SELECT COUNT(*) as count FROM ower.debt_charges';
            const countResult = await sqlRequest(countQuery);
            console.log(`📊 Current records in table: ${countResult[0].count}`);
            
            return {
                connectionOk: true,
                columns: columns,
                currentCount: countResult[0].count
            };
            
        } catch (error) {
            console.error('❌ Database test failed:', error);
            throw new Error(`Помилка тестування бази даних: ${error.message}`);
        }
    }

    async getRequisite() {
        const sql = `
            SELECT 
                id, date, file,
                non_residential_debt_purpose, non_residential_debt_account, 
                non_residential_debt_edrpou, non_residential_debt_recipientname,
                residential_debt_purpose, residential_debt_account, 
                residential_debt_edrpou, residential_debt_recipientname,
                land_debt_purpose, land_debt_account, 
                land_debt_edrpou, land_debt_recipientname,
                orenda_debt_purpose, orenda_debt_account, 
                orenda_debt_edrpou, orenda_debt_recipientname,
                mpz_purpose, mpz_account, 
                mpz_edrpou, mpz_recipientname
            FROM ower.settings 
            ORDER BY date DESC 
            LIMIT 1
        `;
        
        return await sqlRequest(sql);
    }
}

module.exports = new DebtChargesRepository();