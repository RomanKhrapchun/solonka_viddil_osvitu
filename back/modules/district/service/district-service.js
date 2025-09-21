
const districtRepository = require("../repository/district-repository");
const { fieldsListMissingError, NotFoundErrorMessage } = require("../../../utils/messages")
const { paginate, paginationData, addRequisiteToLandDebt } = require("../../../utils/function");
const { displayDistrictFields, allowedDebtorTableFilterFields, allowedSortFields } = require("../../../utils/constants");
const { createRequisiteWord } = require("../../../utils/generateDocx");
const logRepository = require("../../log/repository/log-repository");
const XLSX = require('xlsx');

class DistrictService {

    async getDebtByDebtorId(request) {
        if (!Object.keys([displayDistrictFields]).length) {
            throw new Error(fieldsListMissingError)
        }
        return await districtRepository.getDebtByDebtorId(request?.params?.id, displayDistrictFields)
    }

    async findDebtByFilter(request) {
        const { id,page = 1, limit = 16, title,
                sort_by = null,
                sort_direction = 'asc',
                ...whereConditions } = request.body
        const isValidSortField = sort_by && allowedSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());
        const validSortBy = isValidSortField ? sort_by : 'name';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'asc';

        const { offset } = paginate(page, limit)
        const allowedFields = allowedDebtorTableFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {})
        const filters = {
            districtId: id,
            districtName: null,
            villageId: request.body.villageId || null,
            villageName: null
        };
        const userData = await districtRepository.findDebtByFilter(
            filters, 
            limit, 
            offset, 
            title, 
            allowedFields, 
            displayDistrictFields,
            validSortBy,
            validSortDirection
        )
        if (title || whereConditions?.identification) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук боржника',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504',
            })
        }
        return paginationData(userData[0], page, limit)
    }

    async generateWordByDebtId(request, reply) {
        if (!Object.keys([displayDistrictFields]).length) {
            throw new Error(fieldsListMissingError)
        }
        const fetchData = await districtRepository.getDebtByDebtorId(request?.params?.id, displayDistrictFields)
        if (!fetchData.length) {
            throw new Error(NotFoundErrorMessage)
        }
        const fetchRequisite = await districtRepository.getRequisite()
        if (!fetchRequisite.length) {
            throw new Error(NotFoundErrorMessage)
        }

        if (fetchData[0].non_residential_debt || fetchData[0].residential_debt || fetchData[0].land_debt > 0 || fetchData[0].orenda_debt || fetchData[0].mpz) {
            const result = await createRequisiteWord(fetchData[0], fetchRequisite[0])
            await logRepository.createLog({
                session_user_name: fetchData[0].name,
                row_pk_id: fetchData[0].id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Генерування документа для боржника',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504',
            })
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            reply.header('Content-Disposition', 'attachment; filename=generated.docx');
            return reply.send(result);
        }

        throw new Error("Немає даних для формування документу.")

    }

    async printDebtId(request, reply) {
        if (!Object.keys([displayDistrictFields]).length) {
            throw new Error(fieldsListMissingError)
        }
        const fetchData = await districtRepository.getDebtByDebtorId(request?.params?.id, displayDistrictFields)
        if (!fetchData.length) {
            throw new Error(NotFoundErrorMessage)
        }
        const fetchRequisite = await districtRepository.getRequisite()
        if (!fetchRequisite.length) {
            throw new Error(NotFoundErrorMessage)
        }

        if (fetchData[0].non_residential_debt || fetchData[0].residential_debt || fetchData[0].land_debt > 0 || fetchData[0].orenda_debt || fetchData[0].mpz) {
            const result = addRequisiteToLandDebt(fetchData[0], fetchRequisite[0]);
            await logRepository.createLog({
                session_user_name: fetchData[0].name,
                row_pk_id: fetchData[0].id,
                uid: request?.user?.id,
                action: 'PRINT',
                client_addr: request?.ip,
                application_name: 'Друк документа',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504',
            })
            return reply.send({
                name: fetchData[0].name,
                date: fetchData[0].date,
                identification: fetchData[0].identification,
                debt: result
            });
        }

        throw new Error("Немає даних для формування документу.")
    }

    async getDistrictsList() {
        return await districtRepository.getAllDistricts()
    }
    
    async getVillagesByDistrict(districtId) {
        if (!districtId) {
            throw new Error('ID округу є обов\'язковим')
        }
        return await districtRepository.getVillagesByDistrict(parseInt(districtId))
    }
    // Виправлений метод uploadLocationFile в district-service.js

// Універсальний метод uploadLocationFile в district-service.js

async uploadLocationFile(request) {
    try {
        console.log('📁 Starting location file upload processing...');

        // 1. Отримання файлу
        const file = await this.extractFileFromRequest(request);
        const fileName = this.extractFileName(file);
        
        console.log('📄 Processing file:', fileName);

        // 2. Валідація формату
        const { isValid } = this.validateFileFormat(fileName, file.mimetype);
        if (!isValid) {
            throw new Error(`Файл має бути у форматі Excel (.xls або .xlsx)! Отриманий: "${fileName}"`);
        }

        // 3. Отримання буфера
        const buffer = await this.getFileBuffer(file);
        if (!buffer || buffer.length === 0) {
            throw new Error("Файл порожній або пошкоджений");
        }

        // 4. Читання Excel
        const excelData = this.parseExcelBuffer(buffer);
        if (!excelData || excelData.length < 2) {
            throw new Error('Файл повинен містити заголовки та хоча б один рядок даних');
        }

        // 5. Валідація структури
        const headers = excelData[0];
        const validation = this.validateExcelStructure(headers);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        console.log('✅ File structure validated, processing data...');

        // 6. Обробка даних
        const processResult = await this.processLocationData(excelData, validation.headerMap);

        // 7. Логування
        await this.logFileUpload(request, fileName, processResult);

        console.log('✅ Upload completed successfully');

        return {
            success: true,
            fileName: fileName,
            ...processResult,
            summary: this.generateUploadSummary(fileName, processResult)
        };

    } catch (error) {
        console.error('❌ Location file upload error:', error);
        throw new Error(`Помилка обробки файлу: ${error.message}`);
    }
}

// =================== ДОПОМІЖНІ МЕТОДИ (залишаються ті ж самі) ===================

async extractFileFromRequest(request) {
    // Спроба 1: request.body.file
    if (request.body?.file) {
        return request.body.file;
    }

    // Спроба 2: request.files()
    if (typeof request.files === 'function') {
        const files = await request.files();
        if (files?.length > 0) {
            return files[0];
        }
    }

    // Спроба 3: request.file (multer)
    if (request.file) {
        return request.file;
    }

    throw new Error('Файл не знайдено в запиті');
}

async getFileBuffer(file) {
    // Варіант 1: _buf (Fastify multipart)
    if (file._buf) {
        return file._buf;
    }

    // Варіант 2: buffer
    if (file.buffer) {
        return file.buffer;
    }

    // Варіант 3: toBuffer()
    if (typeof file.toBuffer === 'function') {
        return await file.toBuffer();
    }

    // Варіант 4: stream
    if (file.file || file.stream) {
        const stream = file.file || file.stream;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    throw new Error('Не вдалося отримати дані файлу');
}

parseExcelBuffer(buffer) {
    try {
        const workbook = XLSX.read(buffer, {
            type: 'buffer',
            cellDates: true,
            cellFormulas: false,
            cellHTML: false,
            raw: false,
            defval: ''
        });

        if (!workbook.SheetNames?.length) {
            throw new Error('Excel файл не містить аркушів');
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Конвертуємо в масив масивів
        return XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
            raw: false
        });

    } catch (error) {
        throw new Error(`Помилка читання Excel: ${error.message}`);
    }
}

async processLocationData(excelData, headerMap) {
    // Завантажуємо довідники
    const [districts, villages] = await Promise.all([
        districtRepository.getAllDistrictsForMapping(),
        districtRepository.getAllVillagesForMapping()
    ]);

    // Створюємо мапи для швидкого пошуку
    const districtsMap = this.createDistrictsMap(districts);
    const villagesMap = this.createVillagesMap(villages);

    const processedData = [];
    const errors = [];
    let validRowsCount = 0;

    // Обробляємо кожен рядок (пропускаємо заголовки)
    for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        if (!row || row.length === 0 || row.every(cell => !cell)) continue;

        validRowsCount++;

        const rowResult = this.processDataRow(row, i + 1, headerMap, districtsMap, villagesMap);
        
        if (rowResult.error) {
            errors.push(rowResult.error);
        } else if (rowResult.data) {
            processedData.push(rowResult.data);
        }
    }

    if (processedData.length === 0) {
        throw new Error(`Немає валідних даних для обробки. Оброблено: ${validRowsCount}, Помилок: ${errors.length}`);
    }

    // Масова вставка даних
    const insertResult = await districtRepository.insertLocationData(processedData);

    return {
        totalProcessedRows: validRowsCount,
        validDataRows: processedData.length,
        successfulInserts: insertResult.successCount,
        updatedRecords: insertResult.updatedCount || 0,
        duplicates: insertResult.duplicateCount,
        errors: [...errors, ...insertResult.errors]
    };
}

processDataRow(row, rowNumber, headerMap, districtsMap, villagesMap) {
    const name = this.normalizeText(row[headerMap.name]);
    const identification = this.normalizeText(row[headerMap.identification]);
    const district = this.normalizeText(row[headerMap.district]);
    const village = headerMap.village !== -1 ? this.normalizeText(row[headerMap.village]) : '';

    // Валідація обов'язкових полів
    if (!name || !identification || !district) {
        return {
            error: `Рядок ${rowNumber}: Відсутні обов'язкові дані`
        };
    }

    // Валідація ІПН
    if (!this.validateIdentification(identification)) {
        return {
            error: `Рядок ${rowNumber}: Некоректний ІПН "${identification}"`
        };
    }

    // Пошук округу
    const districtId = districtsMap.get(district.toLowerCase());
    if (!districtId) {
        return {
            error: `Рядок ${rowNumber}: Округ "${district}" не знайдено`
        };
    }

    // Пошук села
    let villageId = null;
    if (village) {
        const villageKey = `${village.toLowerCase()}|${districtId}`;
        villageId = villagesMap.get(villageKey);
        if (!villageId) {
            return {
                error: `Рядок ${rowNumber}: Село "${village}" не знайдено в окрузі`
            };
        }
    }

    return {
        data: {
            name: name.toUpperCase(),
            identification,
            district_id: districtId,
            village_id: villageId,
            rowNumber
        }
    };
}

createDistrictsMap(districts) {
    const map = new Map();
    districts.forEach(d => {
        const normalizedName = this.normalizeText(d.name).toLowerCase();
        map.set(normalizedName, d.id);
        
        // Додаємо варіанти з різними закінченнями
        if (normalizedName.endsWith('ський')) {
            map.set(normalizedName.replace('ський', 'ський округ'), d.id);
        }
    });
    return map;
}

createVillagesMap(villages) {
    const map = new Map();
    villages.forEach(v => {
        const normalizedName = this.normalizeText(v.name).toLowerCase();
        const key = `${normalizedName}|${v.district_id}`;
        map.set(key, v.id);
    });
    return map;
}

async logFileUpload(request, fileName, result) {
    const safeFileName = fileName.replace(/[^\w\s.-]/g, '_');
    await logRepository.createLog({
        row_pk_id: null,
        uid: request?.user?.id,
        action: 'INSERT',
        client_addr: request?.ip,
        application_name: `Завантаження локацій: ${safeFileName} (Успішно: ${result.successfulInserts}, Помилок: ${result.errors.length})`,
        action_stamp_tx: new Date(),
        action_stamp_stm: new Date(),
        action_stamp_clk: new Date(),
        schema_name: 'ower',
        table_name: 'ower_location',
        oid: '16504',
    });
}

generateUploadSummary(fileName, result) {
    return `Файл "${fileName}" оброблено. ` +
           `Рядків: ${result.totalProcessedRows}. ` +
           `Валідних: ${result.validDataRows}. ` +
           `Додано: ${result.successfulInserts}. ` +
           `Оновлено: ${result.updatedRecords}. ` +
           `Пропущено: ${result.duplicates}. ` +
           `Помилок: ${result.errors.length}.`;
}

extractFileName(file) {
    return file.filename || 
           file.originalname || 
           file.name || 
           `uploaded_file_${Date.now()}.xlsx`;
}

validateFileFormat(fileName, mimetype) {
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const validExtensions = ['xls', 'xlsx'];
    const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream'
    ];

    const isValidExtension = validExtensions.includes(fileExtension);
    const isValidMimeType = validMimeTypes.some(type => mimetype?.includes(type));

    return {
        isValid: isValidExtension || isValidMimeType,
        fileExtension,
        mimetype
    };
}

readExcelFile(buffer, fileExtension) {
    try {
        const workbook = XLSX.read(buffer, { 
            type: 'buffer', 
            cellDates: true,
            cellFormulas: false,
            cellHTML: false 
        });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel файл не містить аркушів');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false 
        });

        if (jsonData.length < 2) return [];
        
        const headers = jsonData[0];
        return jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
        
    } catch (error) {
        throw new Error(`Помилка читання Excel файлу: ${error.message}`);
    }
}
    extractFileName(file) {
        // Пробуємо різні варіанти отримання назви файлу
        return file.filename || 
               file.originalname || 
               file.name || 
               `uploaded_file_${Date.now()}`;
    }
    
    validateExcelStructure(headers) {
        const requiredHeaders = ['name', 'identification', 'district'];
        const normalizedHeaders = headers.map(h => h?.toString().toLowerCase().trim());
        
        const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h));
        
        if (missingHeaders.length > 0) {
            return {
                isValid: false,
                error: `Відсутні обов'язкові колонки: ${missingHeaders.join(', ')}. Наявні колонки: ${headers.join(', ')}`,
                missingHeaders
            };
        }
        
        return {
            isValid: true,
            headerMap: {
                name: normalizedHeaders.indexOf('name'),
                identification: normalizedHeaders.indexOf('identification'),  
                district: normalizedHeaders.indexOf('district'),
                village: normalizedHeaders.indexOf('village')
            }
        };
    }

    normalizeText(text) {
        if (!text) return '';
        return text.toString().trim().replace(/\s+/g, ' ');
    }
    
    validateIdentification(identification) {
        if (!identification) return false;
        
        const normalized = identification.toString().trim();
        
        if (!/^\d{3,10}$/.test(normalized)) {
            return false;
        }
        
        return true;
    }
    
    readExcelFile(buffer, fileExtension) {
        try {
            // Читаємо Excel файл
            const workbook = XLSX.read(buffer, { 
                type: 'buffer', 
                cellDates: true,
                cellFormulas: false,
                cellHTML: false 
            });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel файл не містить аркушів');
            }
    
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Конвертуємо в JSON з заголовками
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                blankrows: false 
            });
    
            // Перетворюємо в формат об'єктів з ключами-заголовками
            if (jsonData.length < 2) return [];
            
            const headers = jsonData[0];
            return jsonData.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            
        } catch (error) {
            throw new Error(`Помилка читання Excel файлу: ${error.message}`);
        }
    }

    async getLocationsList(request) {
        const { page = 1, limit = 50 } = request.query;
        return await districtRepository.getLocationsList(page, limit);
    }

    async deleteLocation(locationId) {
        if (!locationId) {
            throw new Error('ID локації є обов\'язковим');
        }
        return await districtRepository.deleteLocation(parseInt(locationId));
    }

    async getLocationStats() {
        const stats = await districtRepository.getLocationStats();
        return stats[0] || {};
    }
}



module.exports = new DistrictService();