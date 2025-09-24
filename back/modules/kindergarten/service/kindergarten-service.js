const KindergartenRepository = require("../repository/kindergarten-repository");
const { paginate, paginationData } = require("../../../utils/function");
const logRepository = require('../../log/repository/log-repository');

class KindergartenService {

    async getDebtByDebtorId(request) {
        const userData = await KindergartenRepository.findDebtorById(request.params?.id)
        return userData[0];
    }

    async findDebtByFilter(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body;
        const { offset } = paginate(page, limit);
        const userData = await KindergartenRepository.findDebtByFilter(limit, offset, whereConditions);
        return paginationData(userData[0], page, limit);
    }

    async generateWordByDebtId(request, reply) {
        const userData = await KindergartenRepository.generateWordByDebtId(request, reply)
        return userData;
    }

    async printDebtId(request, reply) {
        const userData = await KindergartenRepository.printDebtId(request, reply)
        return userData;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ГРУП САДОЧКА
    // ===============================

    async findGroupsByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'id', 
            sort_direction = 'desc',
            kindergarten_name,
            group_name,
            group_type,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Логування пошуку якщо є параметри фільтрації
        if (kindergarten_name || group_name || group_type) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук груп садочку',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_groups',
                oid: '16505',
            });
        }

        const userData = await KindergartenRepository.findGroupsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            kindergarten_name,
            group_name,
            group_type,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async createGroup(request) {
        const {
            kindergarten_name,
            group_name,
            group_type
        } = request.body;

        // Перевіряємо чи не існує група з такою назвою в цьому садочку
        const existingGroup = await KindergartenRepository.getGroupByNameAndKindergarten(
            group_name, 
            kindergarten_name
        );

        if (existingGroup && existingGroup.length > 0) {
            throw new Error('Група з такою назвою вже існує в цьому садочку');
        }

        const groupData = {
            kindergarten_name,
            group_name,
            group_type,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createGroup(groupData);

        // Логування створення групи
        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення групи садочку',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    async updateGroup(request) {
        const { id } = request.params;
        const updateData = request.body;

        // Перевіряємо чи існує група
        const existingGroup = await KindergartenRepository.getGroupById(id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Групу не знайдено');
        }

        // Якщо змінюється назва групи, перевіряємо на дублікати
        if (updateData.group_name && updateData.kindergarten_name) {
            const duplicateGroup = await KindergartenRepository.getGroupByNameAndKindergarten(
                updateData.group_name, 
                updateData.kindergarten_name,
                id // виключаємо поточну групу
            );

            if (duplicateGroup && duplicateGroup.length > 0) {
                throw new Error('Група з такою назвою вже існує в цьому садочку');
            }
        }

        const result = await KindergartenRepository.updateGroup(id, updateData);

        // Логування оновлення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення групи садочку',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    async deleteGroup(request) {
        const { id } = request.params;

        // Перевіряємо чи існує група
        const existingGroup = await KindergartenRepository.getGroupById(id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Групу не знайдено');
        }

        const result = await KindergartenRepository.deleteGroup(id);

        // Логування видалення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення групи садочку',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ДІТЕЙ САДОЧКА
    // ===============================

    async findChildrenByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'id', 
            sort_direction = 'desc',
            child_name,
            parent_name,
            phone_number,
            group_id,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Логування пошуку якщо є параметри фільтрації
        if (child_name || parent_name || phone_number || group_id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук дітей садочку',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'children_roster',
                oid: '16506',
            });
        }

        const userData = await KindergartenRepository.findChildrenByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            child_name,
            parent_name,
            phone_number,
            group_id,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getChildById(request) {
        const { id } = request.params;
        
        const childData = await KindergartenRepository.getChildById(id);
        if (!childData || childData.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        return childData[0];
    }

    async createChild(request) {
        const {
            child_name,
            parent_name,
            phone_number,
            group_id
        } = request.body;

        // Перевіряємо чи існує група
        const existingGroup = await KindergartenRepository.getGroupById(group_id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Група не знайдена');
        }

        // Перевіряємо чи не існує дитина з таким же ПІБ в тій же групі
        const existingChild = await KindergartenRepository.getChildByNameAndGroup(
            child_name, 
            group_id
        );

        if (existingChild && existingChild.length > 0) {
            throw new Error('Дитина з таким ПІБ вже існує в цій групі');
        }

        const childData = {
            child_name,
            parent_name,
            phone_number,
            group_id,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createChild(childData);

        // Логування створення дитини
        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення запису дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    async updateChild(request) {
        const { id } = request.params;
        const updateData = request.body;

        // Перевіряємо чи існує дитина
        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        // Якщо змінюється група, перевіряємо чи вона існує
        if (updateData.group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(updateData.group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Група не знайдена');
            }
        }

        // Якщо змінюється ПІБ дитини та група, перевіряємо на дублікати
        if (updateData.child_name && updateData.group_id) {
            const duplicateChild = await KindergartenRepository.getChildByNameAndGroup(
                updateData.child_name, 
                updateData.group_id,
                id // виключаємо поточну дитину
            );

            if (duplicateChild && duplicateChild.length > 0) {
                throw new Error('Дитина з таким ПІБ вже існує в цій групі');
            }
        }

        const result = await KindergartenRepository.updateChild(id, updateData);

        // Логування оновлення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення даних дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    async deleteChild(request) {
        const { id } = request.params;

        // Перевіряємо чи існує дитина
        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const result = await KindergartenRepository.deleteChild(id);

        // Логування видалення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВІДВІДУВАНОСТІ
    // ===============================

    async findAttendanceByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'date', 
            sort_direction = 'desc',
            child_name,
            group_name,
            date_from,
            date_to,
            attendance_status,
            child_id,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Логування пошуку якщо є параметри фільтрації
        if (child_name || group_name || date_from || date_to || attendance_status || child_id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }

        const userData = await KindergartenRepository.findAttendanceByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            child_name,
            group_name,
            date_from,
            date_to,
            attendance_status,
            child_id,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getAttendanceById(request) {
        const { id } = request.params;
        
        const attendanceData = await KindergartenRepository.getAttendanceById(id);
        if (!attendanceData || attendanceData.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        return attendanceData[0];
    }

    async createAttendance(request) {
        const {
            date,
            child_id,
            attendance_status,
            notes
        } = request.body;

        // Перевіряємо чи існує дитина
        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        // Перевіряємо чи не існує запис на цю дату для цієї дитини
        const existingAttendance = await KindergartenRepository.getAttendanceByDateAndChild(date, child_id);

        if (existingAttendance && existingAttendance.length > 0) {
            throw new Error('Запис відвідуваності на цю дату для цієї дитини вже існує');
        }

        const attendanceData = {
            date,
            child_id,
            attendance_status,
            notes,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createAttendance(attendanceData);

        // Логування створення
        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        return result;
    }

    async updateAttendance(request) {
        const { id } = request.params;
        const updateData = request.body;

        // Перевіряємо чи існує запис
        const existingRecord = await KindergartenRepository.getAttendanceById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        // Якщо змінюється дитина, перевіряємо чи вона існує
        if (updateData.child_id) {
            const existingChild = await KindergartenRepository.getChildById(updateData.child_id);
            if (!existingChild || existingChild.length === 0) {
                throw new Error('Дитину не знайдено');
            }
        }

        // Якщо змінюється дата або дитина, перевіряємо на дублікати
        if (updateData.date && updateData.child_id) {
            const duplicateRecord = await KindergartenRepository.getAttendanceByDateAndChild(
                updateData.date, 
                updateData.child_id,
                id // виключаємо поточний запис
            );

            if (duplicateRecord && duplicateRecord.length > 0) {
                throw new Error('Запис відвідуваності на цю дату для цієї дитини вже існує');
            }
        }

        const result = await KindergartenRepository.updateAttendance(id, updateData);

        // Логування оновлення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        return result;
    }

    async deleteAttendance(request) {
        const { id } = request.params;

        // Перевіряємо чи існує запис
        const existingRecord = await KindergartenRepository.getAttendanceById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        const result = await KindergartenRepository.deleteAttendance(id);

        // Логування видалення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
    // ===============================

    async findDailyFoodCostByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'date', 
            sort_direction = 'desc',
            date_from,
            date_to,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Логування пошуку якщо є параметри фільтрації
        if (date_from || date_to) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук вартості харчування',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'daily_food_cost',
                oid: '16508',
            });
        }

        const userData = await KindergartenRepository.findDailyFoodCostByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            date_from,
            date_to,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async createDailyFoodCost(request) {
        const {
            date,
            young_group_cost,
            older_group_cost
        } = request.body;

        // Перевіряємо чи не існує запис з такою датою
        const existingRecord = await KindergartenRepository.getDailyFoodCostByDateAndExcludeId(date);

        if (existingRecord && existingRecord.length > 0) {
            throw new Error('Вартість харчування на цю дату вже існує');
        }

        const recordData = {
            date,
            young_group_cost,
            older_group_cost,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createDailyFoodCost(recordData);

        // Логування створення
        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        return result;
    }

    async updateDailyFoodCost(request) {
        const { id } = request.params;
        const updateData = request.body;

        // Перевіряємо чи існує запис
        const existingRecord = await KindergartenRepository.getDailyFoodCostById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис не знайдено');
        }

        // Якщо змінюється дата, перевіряємо на дублікати
        if (updateData.date) {
            const duplicateRecord = await KindergartenRepository.getDailyFoodCostByDateAndExcludeId(
                updateData.date, 
                id
            );

            if (duplicateRecord && duplicateRecord.length > 0) {
                throw new Error('Вартість харчування на цю дату вже існує');
            }
        }

        const result = await KindergartenRepository.updateDailyFoodCost(id, updateData);

        // Логування оновлення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        return result;
    }

    async deleteDailyFoodCost(request) {
        const { id } = request.params;

        // Перевіряємо чи існує запис
        const existingRecord = await KindergartenRepository.getDailyFoodCostById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис не знайдено');
        }

        const result = await KindergartenRepository.deleteDailyFoodCost(id);

        // Логування видалення
        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        return result;
    }
}

module.exports = new KindergartenService();