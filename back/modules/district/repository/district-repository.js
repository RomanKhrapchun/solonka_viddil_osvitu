const { sqlRequest } = require("../../../helpers/database");
const { buildWhereCondition } = require("../../../utils/function");
const {getSafeSortField, validateSortDirection} = require("../../../utils/constants");


class DistrictRepository {

    async getDebtByDebtorId(debtId, displayFieldsUsers) {
        let sql = `select ${displayFieldsUsers.map(field => ` ${field}`)} from ower.ower where id = ?`
        return await sqlRequest(sql, [debtId])
    }

    async findDebtByFilter(filters, limit, offset, title, whereConditions = {}, displayFieldsUsers = [], sortBy = 'name', sortDirection = 'asc') {
        const { districtId, districtName, villageId, villageName } = filters;
        console.log('filters:',filters)
        console.log('whereConditions:',whereConditions)
        const values = [];
        console.log("displayFieldsUsers",displayFieldsUsers)

        const safeSortField = getSafeSortField(sortBy);
        const safeSortDirection = validateSortDirection(sortDirection);

        const totalDebtExpression = '(COALESCE(non_residential_debt, 0) + COALESCE(residential_debt, 0) + COALESCE(land_debt, 0) + COALESCE(orenda_debt, 0) + COALESCE(mpz, 0))';
    
        // Створюємо JSON поля включаючи total_debt
        const jsonFields = displayFieldsUsers.map(field => `'${field}', ${field}`).join(', ');



        let sql = `select json_agg(
            json_build_object(
                ${jsonFields},
                'total_debt', ${totalDebtExpression}
            )
        ) as data,
        max(cnt) as count
        from (
            select *,
            ${totalDebtExpression} as total_debt_calc,
            count(*) over () as cnt
            from ower.v_ower_full o
            where 1=1
             `;
            
        console.log("sql",sql)
        if (districtId) {
            sql += ` and exists (
                select 1 from ower.districts d 
                where d.id = ? and d.name = o.district and d.active = true
            )`;
            values.push(districtId);
        } else if (districtName) {
            sql += ` and o.district = ?`;
            values.push(districtName);
        }

        if (villageId) {
            sql += ` and exists (
                select 1 from ower.villages v 
                where v.id = ? and v.name = o.village and v.active = true
            )`;
            values.push(villageId);
        } else if (villageName) {
            sql += ` and o.village = ?`;
            values.push(villageName);
        }

        // Додаткові умови
        if (Object.keys(whereConditions).length) {
            const data = buildWhereCondition(whereConditions, 'o');
            sql += data.text;
            values.push(...data.value);
        }

        if (title) {
            sql += ` and o.name ILIKE ?`;
            values.push(`%${title}%`);
        }

        // ДОДАЄМО СОРТУВАННЯ (як в робочому варіанті)
        if (sortBy === 'total_debt') {
            // Сортування по обчисленому полю
            sql += ` order by total_debt_calc ${safeSortDirection.toUpperCase()}`;
        } else if (sortBy === 'name') {
            // Сортування по імені без урахування регістру
            sql += ` order by LOWER(o.name) ${safeSortDirection.toUpperCase()}`;
        } else {
            // Стандартне сортування
            sql += ` order by o.${safeSortField} ${safeSortDirection.toUpperCase()}`;
        }
        
        // Додаємо вторинне сортування для стабільності
        if (sortBy !== 'id') {
            sql += `, o.id ${safeSortDirection.toUpperCase()}`;
        }

        values.push(limit);
        values.push(offset);
        sql += ` limit ? offset ? ) q`;
        
        return await sqlRequest(sql, [...values]);
    }

    async getAllDistricts() {
        const sql = `
            select 
                d.id,
                d.name,
                d.code,
                d.description,
                count(o.id) as debtors_count
            from ower.districts d
            left join ower.v_ower_full o on d.name = o.district
            where d.active = true
            group by d.id, d.name, d.code, d.description
            order by d.name
        `;
        return await sqlRequest(sql);
    }
    async getVillagesByDistrict(districtId) {
        // Спершу отримуємо села з довідника
        const sql = `
            select 
                id, 
                name, 
                code
            from ower.villages
            where district_id = ? and active = true
            order by name
        `;
        return await sqlRequest(sql, [districtId]);
    }

    async getRequisite() {
        return await sqlRequest('select * from ower.settings')
    }
    async getAllDistrictsForMapping() {
        const sql = `
            SELECT id, name 
            FROM ower.districts 
            WHERE active = true
            ORDER BY name
        `;
        return await sqlRequest(sql);
    }

    async getAllVillagesForMapping() {
        const sql = `
            SELECT id, name, district_id 
            FROM ower.villages 
            WHERE active = true
            ORDER BY name
        `;
        return await sqlRequest(sql);
    }

    async insertLocationData(dataArray) {
        let successCount = 0;
        let duplicateCount = 0;
        let updatedCount = 0;
        const errors = [];

        for (const item of dataArray) {
            try {
                // Використовуємо UPSERT для атомарної операції
                const upsertSql = `
                    INSERT INTO ower.ower_location (name, identification, district_id, village_id, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (name, identification) 
                    DO UPDATE SET
                        district_id = EXCLUDED.district_id,
                        village_id = EXCLUDED.village_id,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING 
                        id,
                        CASE 
                            WHEN xmax = 0 THEN 'inserted'
                            ELSE 'updated'
                        END as operation
                `;

                const result = await sqlRequest(upsertSql, [
                    item.name,
                    item.identification,
                    item.district_id,
                    item.village_id
                ]);

                if (result.length > 0) {
                    if (result[0].operation === 'inserted') {
                        successCount++;
                    } else {
                        updatedCount++;
                    }
                }

            } catch (error) {
                errors.push(`Рядок ${item.rowNumber}: ${error.message}`);
                console.error(`Error inserting location data for row ${item.rowNumber}:`, error);
            }
        }

        return {
            successCount,
            updatedCount,
            duplicateCount, // для сумісності
            errors
        };
    }

    async getLocationsList(page, limit) {
        const { paginate } = require("../../../utils/function");
        const { offset } = paginate(page, limit);
        
        const sql = `
            SELECT 
                ol.id,
                ol.name,
                ol.identification,
                d.name as district,
                v.name as village,
                ol.created_at,
                ol.updated_at
            FROM ower.ower_location ol
            LEFT JOIN ower.districts d ON ol.district_id = d.id
            LEFT JOIN ower.villages v ON ol.village_id = v.id
            ORDER BY ol.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        
        const countSql = `SELECT COUNT(*) as total FROM ower.ower_location`;
        
        try {
            const [data, countResult] = await Promise.all([
                sqlRequest(sql, [limit, offset]),
                sqlRequest(countSql)
            ]);
            
            return {
                data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult[0].total),
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting locations list:', error);
            throw error;
        }
    }

    async deleteLocation(locationId) {
        try {
            const sql = `DELETE FROM ower.ower_location WHERE id = ? RETURNING id`;
            const result = await sqlRequest(sql, [locationId]);
            return result.length > 0;
        } catch (error) {
            console.error('Error deleting location:', error);
            throw error;
        }
    }

    async getLocationStats() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_locations,
                    COUNT(DISTINCT district_id) as districts_count,
                    COUNT(village_id) as with_villages_count,
                    COUNT(*) - COUNT(village_id) as without_villages_count,
                    COUNT(DISTINCT identification) as unique_identifications
                FROM ower.ower_location
            `;
            return await sqlRequest(sql);
        } catch (error) {
            console.error('Error getting location stats:', error);
            throw error;
        }
    }

    async searchLocations(searchParams) {
        const { name, identification, districtId, villageId, page = 1, limit = 50 } = searchParams;
        const { paginate } = require("../../../utils/function");
        const { offset } = paginate(page, limit);
        
        let sql = `
            SELECT 
                ol.id,
                ol.name,
                ol.identification,
                d.name as district,
                v.name as village,
                ol.created_at
            FROM ower.ower_location ol
            LEFT JOIN ower.districts d ON ol.district_id = d.id
            LEFT JOIN ower.villages v ON ol.village_id = v.id
            WHERE 1=1
        `;
        
        const values = [];
        
        if (name) {
            sql += ` AND ol.name ILIKE ?`;
            values.push(`%${name}%`);
        }
        
        if (identification) {
            sql += ` AND ol.identification ILIKE ?`;
            values.push(`%${identification}%`);
        }
        
        if (districtId) {
            sql += ` AND ol.district_id = ?`;
            values.push(districtId);
        }
        
        if (villageId) {
            sql += ` AND ol.village_id = ?`;
            values.push(villageId);
        }
        
        sql += ` ORDER BY ol.created_at DESC LIMIT ? OFFSET ?`;
        values.push(limit, offset);
        
        try {
            return await sqlRequest(sql, values);
        } catch (error) {
            console.error('Error searching locations:', error);
            throw error;
        }
    }

    async updateLocation(locationId, updateData) {
        try {
            const { name, identification, district_id, village_id } = updateData;
            
            const sql = `
                UPDATE ower.ower_location 
                SET name = ?, identification = ?, district_id = ?, village_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                RETURNING id
            `;
            
            const result = await sqlRequest(sql, [name, identification, district_id, village_id, locationId]);
            return result.length > 0;
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    }


    async checkLocationExists(name, identification, excludeId = null) {
        try {
            let sql = `
                SELECT id FROM ower.ower_location 
                WHERE name = ? AND identification = ?
            `;
            const values = [name, identification];
            
            if (excludeId) {
                sql += ` AND id != ?`;
                values.push(excludeId);
            }
            
            const result = await sqlRequest(sql, values);
            return result.length > 0;
        } catch (error) {
            console.error('Error checking location exists:', error);
            throw error;
        }
    }

    async bulkDeleteLocations(locationIds) {
        if (!locationIds || locationIds.length === 0) {
            return 0;
        }
        
        try {
            const placeholders = locationIds.map(() => '?').join(',');
            const sql = `DELETE FROM ower.ower_location WHERE id IN (${placeholders}) RETURNING id`;
            const result = await sqlRequest(sql, locationIds);
            return result.length;
        } catch (error) {
            console.error('Error bulk deleting locations:', error);
            throw error;
        }
    }
}

module.exports = new DistrictRepository();