const debtChargesRepository = require("../repository/debtCharges-repository");
const { fieldsListMissingError } = require("../../../utils/messages");
const { paginate, paginationData } = require("../../../utils/function");
const { displayDebtChargesFields, allowedDebtChargesTableFilterFields, allowedDebtChargesSortFields } = require("../../../utils/constants");
const logRepository = require("../../log/repository/log-repository");
const xlsx = require('xlsx');
const debtorRepository = require("../../debtor/repository/debtor-repository");

class DebtChargesService {

    async getDebtChargeById(request) {
        if (!Object.keys([displayDebtChargesFields]).length) {
            throw new Error(fieldsListMissingError)
        }
        return await debtChargesRepository.getDebtChargeById(request?.params?.id, displayDebtChargesFields)
    }

    async findDebtChargesByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            title,  // Пошук по назві платника
            sort_by = null, 
            sort_direction = 'desc',
            ...whereConditions 
        } = request.body;
        
        // Конвертуємо у числові значення для надійності
        const numericPage = parseInt(page) || 1;
        const numericLimit = parseInt(limit) || 16;
        
        const { offset } = paginate(numericPage, numericLimit);
        const isValidSortField = sort_by && allowedDebtChargesSortFields.includes(sort_by);
        const isValidSortDirection = ['asc', 'desc'].includes(sort_direction?.toLowerCase());

        const validSortBy = isValidSortField ? sort_by : 'document_date';
        const validSortDirection = isValidSortDirection ? sort_direction.toLowerCase() : 'desc';

        // Універсальний фільтр: Фільтруємо тільки дозволені поля та видаляємо пусті значення
        const allowedFields = {};
        Object.keys(whereConditions).forEach(key => {
            if (allowedDebtChargesTableFilterFields.includes(key)) {
                const value = whereConditions[key];
                // Фільтруємо пусті значення
                if (value !== null && value !== undefined && value !== '') {
                    allowedFields[key] = value;
                }
            }
        });
        
        const userData = await debtChargesRepository.findDebtChargesByFilter(
            numericLimit, 
            offset, 
            title,  // Передаємо title окремо для ILIKE пошуку по payer_name
            allowedFields, 
            displayDebtChargesFields,
            validSortBy,
            validSortDirection
        );
        
        // Логування пошуку при наявності критеріїв
        if (title || Object.keys(allowedFields).length > 0) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук нарахувань',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'debt_charges',
                oid: '16504',
            })
        }
        
        const paginatedData = paginationData(userData[0], numericPage, numericLimit);

        return {
            ...paginatedData,
            sort_by: validSortBy,
            sort_direction: validSortDirection
        };
    }

    async processExcelUpload(request) {
        let fileName = 'unknown';
        
        try {
            if (!request.file) {
                throw new Error("Файл не завантажено!");
            }

            // Універсальна обробка назви файлу
            fileName = this.extractFileName(request.file);
            
            // Універсальна перевірка формату файлу
            const { isValid, fileExtension, mimetype } = this.validateFileFormat(fileName, request.file.mimetype);
            
            if (!isValid) {
                throw new Error(`Файл має бути у форматі Excel (.xls або .xlsx)! 
                    Отриманий файл: "${fileName}" (розширення: .${fileExtension})
                    MIME тип: ${mimetype}`);
            }

            if (!request.file.buffer) {
                throw new Error("Не вдалося отримати дані файлу!");
            }

            console.log(`📁 Processing file: ${fileName} (${request.file.buffer.length} bytes)`);

            // Універсальне читання Excel файлу
            const jsonData = this.readExcelFile(request.file.buffer, fileExtension);
            
            if (!jsonData.length) {
                throw new Error("Файл не містить валідних даних!");
            }

            // Універсальна валідація структури файлу
            const fileFormat = this.detectFileFormat(jsonData[0]);
            console.log(`📊 Detected file format: ${fileFormat.name}`);
            console.log(`📋 Available columns: ${Object.keys(jsonData[0]).join(', ')}`);

            // Перевірка на наявність обов'язкових колонок
            if (!fileFormat.requiredColumns.every(col => col)) {
                console.log('⚠️ Some required columns not found, trying universal mapping...');
            }

            // Валідація та перетворення даних з автоматичним визначенням формату
            const validatedData = this.validateAndTransformExcelData(jsonData, fileFormat);
            
            if (!validatedData.length) {
                throw new Error("Не вдалося отримати валідні дані з файлу!");
            }

            console.log(`✅ Validated ${validatedData.length} records, starting database operations...`);

            // Очищення та масове створення нарахувань з кращою обробкою помилок
            try {
                await debtChargesRepository.truncateDebtCharges();
                console.log('📊 Starting bulk insert...');
                
                const uploadResult = await debtChargesRepository.bulkCreateDebtCharges(validatedData);
                
                console.log(`🎉 Upload completed: ${uploadResult.imported}/${uploadResult.total}`);

                // Безпечне логування
                const safeFileName = fileName.replace(/[^\w\s.-]/g, '_');
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'INSERT',
                    client_addr: request?.ip,
                    application_name: `Завантаження файлу нарахувань (${safeFileName})`,
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'ower',
                    table_name: 'debt_charges',
                    oid: '16504',
                });

                return {
                    imported: uploadResult.imported,
                    total: uploadResult.total,
                    skipped: uploadResult.total - uploadResult.imported,
                    fileName: fileName,
                    detectedFormat: fileFormat.name,
                    success: true
                };
                
            } catch (dbError) {
                console.error('❌ Database operation failed:', dbError);
                throw new Error(`Помилка роботи з базою даних: ${dbError.message}`);
            }

        } catch (error) {
            console.error('❌ Excel upload error:', error);
            
            // Детальне логування помилки
            console.error('📋 Error details:', {
                fileName,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 3).join('\n')
            });
            
            throw new Error(`Помилка обробки файлу: ${error.message}`);
        }
    }

    // Універсальний метод для визначення формату файлу
    detectFileFormat(firstRow) {
        const availableColumns = Object.keys(firstRow);
        console.log(`🔍 Analyzing columns:`, availableColumns);
        
        // Формат 1: Український варіант
        const format1Columns = ['Податковий номер ПП', 'Назва платника', 'Сума'];
        const format1Match = format1Columns.every(col => availableColumns.includes(col));
        
        if (format1Match) {
            console.log('✅ Detected Ukrainian format');
            return {
                name: 'Ukrainian Format',
                type: 'format1',
                requiredColumns: ['Податковий номер ПП', 'Назва платника', 'Сума'],
                mapping: {
                    tax_number: 'Податковий номер ПП',
                    payer_name: 'Назва платника',
                    amount: 'Сума',
                    payment_info: 'Платіж',
                    tax_classifier: 'Номер',
                    account_number: 'Дата',
                    full_document_id: 'Дата вручення платнику податків',
                    status: 'Статус'
                }
            };
        }
        
        // Формат 2: Англійський варіант
        const format2Columns = ['TIN_S', 'PAYER_NAME', 'ZN'];
        const format2Match = format2Columns.every(col => availableColumns.includes(col));
        
        if (format2Match) {
            console.log('✅ Detected English format');
            return {
                name: 'English Format',
                type: 'format2',
                requiredColumns: ['TIN_S', 'PAYER_NAME', 'ZN'],
                mapping: {
                    tax_number: 'TIN_S',
                    payer_name: 'PAYER_NAME',
                    amount: 'ZN',
                    payment_info: 'TO_TYPE_NAME',
                    tax_classifier: 'Найменування коду класифікації доходів бюджету',
                    account_number: 'ST',
                    full_document_id: 'NOMPP',
                    document_date: 'D_MESSP',
                    delivery_date: 'DATEVP',
                    cadastral_number: 'Кадастровий номер',
                    status: 'Статус ППР'
                }
            };
        }

        // Універсальний формат - спробуємо автоматично знайти подібні колонки
        console.log('🔄 Using universal format detection...');
        return this.createUniversalMapping(availableColumns);
    }

    // Покращене створення універсального мапінгу
    createUniversalMapping(availableColumns) {
        const mapping = {};
        
        console.log('🧠 Analyzing column patterns...');
        
        // Розширені шаблони для пошуку полів
        const patterns = {
            tax_number: [
                /податков.*номер/i, /tin/i, /код.*платник/i, /tax.*id/i, 
                /ідентиф.*код/i, /єдрпоу/i, /inn/i
            ],
            payer_name: [
                /назва.*платник/i, /payer.*name/i, /им[''я]/i, /name/i,
                /платник/i, /особа/i, /організація/i, /назва/i
            ],
            amount: [
                /сума/i, /amount/i, /zn$/i, /total/i, /вартість/i,
                /нараховано/i, /до.*сплат/i
            ],
            payment_info: [
                /платіж/i, /payment/i, /тип.*об/i, /to_type/i,
                /призначення/i, /мета/i, /об[''є]кт/i
            ],
            status: [
                /статус/i, /status/i, /стан/i, /становище/i
            ],
            cadastral_number: [
                /кадастр/i, /cadastr/i, /номер.*об/i, /реєстр/i
            ],
            document_date: [
                /дата.*док/i, /date.*doc/i, /d_messp/i, /документ/i
            ],
            delivery_date: [
                /дата.*вруч/i, /дата.*дост/i, /datevp/i, /вруч/i
            ]
        };

        // Знаходимо відповідності для кожного поля
        Object.keys(patterns).forEach(fieldName => {
            const foundColumn = this.findColumnByPatterns(availableColumns, patterns[fieldName]);
            if (foundColumn) {
                mapping[fieldName] = foundColumn;
                console.log(`✅ Mapped ${fieldName} -> ${foundColumn}`);
            } else {
                console.log(`⚠️ Could not find mapping for ${fieldName}`);
            }
        });
        
        // Перевіряємо мінімально необхідні поля
        const requiredFields = [mapping.tax_number, mapping.payer_name, mapping.amount].filter(Boolean);
        
        if (requiredFields.length < 3) {
            console.log('❌ Could not find all required fields');
            // Спробуємо більш ліберальний підхід
            const fallbackMapping = this.createFallbackMapping(availableColumns);
            return {
                name: 'Fallback Universal Format',
                type: 'fallback',
                requiredColumns: Object.values(fallbackMapping).filter(Boolean),
                mapping: fallbackMapping
            };
        }

        return {
            name: 'Universal Format',
            type: 'universal',
            requiredColumns: requiredFields,
            mapping
        };
    }

    // Резервний мапінг для складних випадків
    createFallbackMapping(availableColumns) {
        console.log('🆘 Creating fallback mapping...');
        
        // Спробуємо знайти хоча б щось схоже
        const fallbackMapping = {};
        
        // Шукаємо будь-які числові поля для суми
        const numberFields = availableColumns.filter(col => 
            /\d+/.test(col) || /сум|amount|грош|money|total|zn/i.test(col)
        );
        
        // Шукаємо текстові поля для імені
        const textFields = availableColumns.filter(col => 
            /name|назв|им|особа|компан|організ/i.test(col)
        );
        
        // Шукаємо поля з кодами
        const codeFields = availableColumns.filter(col => 
            /код|tin|id|номер|number/i.test(col)
        );
        
        fallbackMapping.amount = numberFields[0] || availableColumns.find(col => /\d/.test(String(col)));
        fallbackMapping.payer_name = textFields[0] || availableColumns[1]; // Зазвичай друга колонка
        fallbackMapping.tax_number = codeFields[0] || availableColumns[0]; // Зазвичай перша колонка
        
        console.log('🔄 Fallback mapping created:', fallbackMapping);
        
        return fallbackMapping;
    }

    findColumnByPatterns(columns, patterns) {
        for (const pattern of patterns) {
            const found = columns.find(col => pattern.test(col));
            if (found) {
                console.log(`🎯 Pattern ${pattern} matched: ${found}`);
                return found;
            }
        }
        return null;
    }

    extractFileName(file) {
        let fileName = file.originalname || file.filename || 'unknown';
        
        try {
            if (fileName && typeof fileName === 'string') {
                fileName = decodeURIComponent(fileName);
            }
        } catch (decodeError) {
            console.log('⚠️ Could not decode filename:', fileName);
        }
        
        return fileName;
    }

    validateFileFormat(fileName, mimetype) {
        const fileExtension = fileName.toLowerCase().split('.').pop();
        const isValidExtension = ['xls', 'xlsx'].includes(fileExtension);
        
        const validMimeTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/excel',
            'application/x-excel',
            'application/x-msexcel'
        ];
        
        const isValidMimeType = mimetype && (
            validMimeTypes.some(type => mimetype.includes(type)) ||
            mimetype.includes('spreadsheet') ||
            mimetype.includes('excel')
        );

        return {
            isValid: isValidExtension || isValidMimeType,
            fileExtension,
            mimetype
        };
    }

    readExcelFile(buffer, fileExtension) {
        console.log(`📖 Reading ${fileExtension} file...`);
        
        const readOptions = { 
            type: "buffer", 
            cellDates: true,
            cellNF: false,
            cellStyles: false,
            bookType: fileExtension === 'xls' ? 'xls' : 'xlsx',
            raw: false // Важливо для правильного читання тексту
        };

        // Додаткові опції для старих XLS файлів
        if (fileExtension === 'xls') {
            readOptions.codepage = 1251; // Кирилиця
            readOptions.cellText = false;
            readOptions.cellDates = true;
        }
        
        try {
            const workbook = xlsx.read(buffer, readOptions);
            
            if (!workbook.SheetNames.length) {
                throw new Error("Excel файл не містить аркушів!");
            }

            console.log(`📊 Found sheets: ${workbook.SheetNames.join(', ')}`);
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Отримуємо дані з заголовками
            const result = xlsx.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: null,
                blankrows: false,
                raw: false
            });

            if (!result.length || !result[0].length) {
                throw new Error("Файл не містить даних!");
            }

            console.log(`📋 Found ${result.length} rows, ${result[0].length} columns`);

            // Перетворюємо в об'єкти з заголовками
            const headers = result[0].map(header => 
                header ? String(header).trim() : null
            ).filter(header => header);
            
            if (!headers.length) {
                throw new Error("Файл не містить валідних заголовків!");
            }

            const dataRows = result.slice(1);
            console.log(`📊 Processing ${dataRows.length} data rows with headers:`, headers);
            
            const jsonData = dataRows.map((row, index) => {
                const obj = {};
                headers.forEach((header, headerIndex) => {
                    if (header && row[headerIndex] !== undefined) {
                        const value = row[headerIndex];
                        obj[header] = value === null || value === '' ? null : String(value).trim();
                    }
                });
                
                // Пропускаємо повністю пусті рядки
                const hasData = Object.values(obj).some(value => value !== null && value !== '');
                return hasData ? obj : null;
            }).filter(row => row !== null);

            console.log(`✅ Converted to ${jsonData.length} valid JSON objects`);
            return jsonData;

        } catch (error) {
            console.error('❌ Excel reading error:', error);
            throw new Error(`Помилка читання Excel файлу: ${error.message}`);
        }
    }

    validateAndTransformExcelData(excelData, fileFormat) {
        const errors = [];
        const transformedData = [];
        const warnings = [];

        console.log(`🔍 Processing ${excelData.length} rows using ${fileFormat.name}`);

        // Перевіряємо наявність обов'язкових колонок
        const firstRow = excelData[0];
        const availableColumns = Object.keys(firstRow);
        
        if (fileFormat.requiredColumns && fileFormat.requiredColumns.length > 0) {
            const missingColumns = fileFormat.requiredColumns.filter(col => 
                col && !availableColumns.includes(col)
            );
            
            if (missingColumns.length > 0) {
                console.log(`⚠️ Missing columns: ${missingColumns.join(', ')}`);
                warnings.push(`Відсутні колонки: ${missingColumns.join(', ')}`);
            }
        }

        excelData.forEach((row, index) => {
            const rowNumber = index + 1;
            const transformedRow = {};

            try {
                // Універсальне мапування полів
                const mapping = fileFormat.mapping;

                // Обов'язкові поля з кращою валідацією
                const taxNumber = this.extractValue(row, mapping.tax_number);
                if (!taxNumber) {
                    errors.push(`Рядок ${rowNumber}: Відсутній податковий номер`);
                    return;
                }
                transformedRow.tax_number = this.normalizeTaxNumber(taxNumber);

                const payerName = this.extractValue(row, mapping.payer_name);
                if (!payerName) {
                    errors.push(`Рядок ${rowNumber}: Відсутня назва платника`);
                    return;
                }
                transformedRow.payer_name = String(payerName).trim().substring(0, 255); // Обмежуємо довжину

                let amount = this.extractValue(row, mapping.amount);
                if (!amount && amount !== 0) {
                    errors.push(`Рядок ${rowNumber}: Відсутня сума`);
                    return;
                }
                
                const numAmount = this.parseAmount(amount);
                if (isNaN(numAmount) || numAmount < 0) {
                    errors.push(`Рядок ${rowNumber}: Некоректна сума: ${amount}`);
                    return;
                }
                transformedRow.amount = numAmount;

                // Додаткові поля (опціональні) з безпечним отриманням
                transformedRow.payment_info = this.extractAndTrim(row, mapping.payment_info, 500);
                transformedRow.tax_classifier = this.extractAndTrim(row, mapping.tax_classifier, 100);
                transformedRow.account_number = this.extractAndTrim(row, mapping.account_number, 50);
                transformedRow.cadastral_number = this.extractAndTrim(row, mapping.cadastral_number, 100);
                
                // Генерація ID документу
                transformedRow.full_document_id = this.extractAndTrim(row, mapping.full_document_id, 100) || 
                    `GEN-${Date.now()}-${transformedRow.tax_number}`;

                // Обробка дат
                transformedRow.document_date = this.parseDate(this.extractValue(row, mapping.document_date));
                transformedRow.delivery_date = this.parseDate(this.extractValue(row, mapping.delivery_date));

                // Статус
                transformedRow.status = this.extractAndTrim(row, mapping.status, 50) || 'Не вручено';

                // Фінальна валідація податкового номера
                if (!/^\d{8,12}$/.test(transformedRow.tax_number)) {
                    errors.push(`Рядок ${rowNumber}: Некоректний формат податкового номера "${transformedRow.tax_number}"`);
                    return;
                }

                transformedData.push(transformedRow);
                
                // Логування перших кількох рядків
                if (rowNumber <= 3) {
                    console.log(`✅ Row ${rowNumber} mapped:`, {
                        tax_number: transformedRow.tax_number,
                        payer_name: transformedRow.payer_name?.substring(0, 30) + '...',
                        amount: transformedRow.amount,
                        status: transformedRow.status
                    });
                }

            } catch (error) {
                console.error(`❌ Error processing row ${rowNumber}:`, error);
                errors.push(`Рядок ${rowNumber}: Помилка обробки - ${error.message}`);
            }
        });

        console.log(`📊 Mapping summary: ${transformedData.length} valid rows out of ${excelData.length} total`);
        
        if (warnings.length > 0) {
            console.log('⚠️ Warnings:', warnings);
        }
        
        if (errors.length > 0) {
            console.log(`❌ Errors found: ${errors.length}`);
            if (transformedData.length === 0) {
                throw new Error(`Критичні помилки у файлі:\n${errors.slice(0, 10).join('\n')}`);
            } else if (errors.length > excelData.length * 0.5) {
                throw new Error(`Забагато помилок у файлі (${errors.length}/${excelData.length}):\n${errors.slice(0, 5).join('\n')}`);
            }
        }

        return transformedData;
    }

    // Допоміжні методи для безпечної обробки даних
    extractValue(row, fieldName) {
        if (!fieldName || !row.hasOwnProperty(fieldName)) return null;
        const value = row[fieldName];
        return value === null || value === undefined || value === '' ? null : value;
    }

    extractAndTrim(row, fieldName, maxLength = 255) {
        const value = this.extractValue(row, fieldName);
        if (!value) return null;
        return String(value).trim().substring(0, maxLength);
    }

    normalizeTaxNumber(taxNumber) {
        return String(taxNumber).replace(/\D/g, '').trim();
    }

    parseAmount(amount) {
        if (!amount && amount !== 0) return NaN;
        
        if (typeof amount === 'number') return amount;
        
        if (typeof amount === 'string') {
            // Замінюємо кому на крапку та прибираємо пробіли
            const cleanAmount = amount.replace(/,/g, '.').replace(/\s/g, '').replace(/[^\d.-]/g, '');
            return parseFloat(cleanAmount);
        }
        
        return parseFloat(amount);
    }

    parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            if (dateValue instanceof Date) {
                return dateValue.toISOString().split('T')[0];
            }
            
            if (typeof dateValue === 'string') {
                let date;
                
                // Формат dd.mm.yyyy
                if (dateValue.includes('.')) {
                    const parts = dateValue.split('.');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        date = new Date(`${year}-${month}-${day}`);
                    }
                }
                // Формат dd/mm/yyyy
                else if (dateValue.includes('/')) {
                    const parts = dateValue.split('/');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        date = new Date(`${year}-${month}-${day}`);
                    }
                }
                // ISO формат або інше
                else {
                    date = new Date(dateValue);
                }
                
                if (date && !isNaN(date.getTime()) && date.getFullYear() > 1900) {
                    return date.toISOString().split('T')[0];
                }
            }
            
            // Excel serial number
            if (typeof dateValue === 'number' && dateValue > 25000 && dateValue < 100000) {
                const excelEpoch = new Date('1900-01-01');
                const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
                
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
            
            return null;
            
        } catch (error) {
            console.log('⚠️ Date parsing error:', error.message, 'for value:', dateValue);
            return null;
        }
    }

    async validateFileStructure(request) {
        try {
            if (!request.file) {
                throw new Error("Файл не завантажено!");
            }

            const fileName = this.extractFileName(request.file);
            const { isValid, fileExtension } = this.validateFileFormat(fileName, request.file.mimetype);
            
            if (!isValid) {
                throw new Error("Файл має бути у форматі Excel (.xls або .xlsx)!");
            }

            const workbook = xlsx.read(request.file.buffer, { 
                type: "buffer", 
                cellDates: true,
                bookType: fileExtension === 'xls' ? 'xls' : 'xlsx'
            });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const result = xlsx.utils.sheet_to_json(worksheet, { 
                range: 0,
                defval: null,
                raw: false 
            });

            if (!result.length) {
                throw new Error("Файл не містить заголовків!");
            }

            const availableColumns = Object.keys(result[0]);
            const fileFormat = this.detectFileFormat(result[0]);
            const missingColumns = fileFormat.requiredColumns?.filter(col => 
                col && !availableColumns.includes(col)
            ) || [];
            
            return {
                isValid: missingColumns.length === 0 || fileFormat.type === 'universal',
                availableColumns,
                requiredColumns: fileFormat.requiredColumns || [],
                missingColumns,
                detectedFormat: fileFormat.name,
                fileName,
                mappedFields: Object.keys(fileFormat.mapping).filter(key => 
                    fileFormat.mapping[key]
                )
            };

        } catch (error) {
            throw new Error(`Помилка перевірки файлу: ${error.message}`);
        }
    }

    // Решта методів залишається без змін...
    async generateTaxNotificationById(request, reply) {
        try {
            if (!Object.keys([displayDebtChargesFields]).length) {
                throw new Error(fieldsListMissingError);
            }
            
            const chargeData = await debtChargesRepository.getDebtChargeById(request?.params?.id, displayDebtChargesFields);
            
            if (!chargeData.length) {
                throw new Error("Нарахування не знайдено");
            }
            
            const fetchRequisite = await debtorRepository.getRequisite();
            if (!fetchRequisite.length) {
                throw new Error("Реквізити не знайдені");
            }
            
            const charge = chargeData[0];
            const settings = fetchRequisite[0];
            
            // Універсальний пошук інформації про боржника
            let debtorInfo = null;
            if (charge.payer_name) {
                try {
                    const debtorData = await debtorRepository.findDebtByFilter(
                        5, 0, charge.payer_name, {},
                        ['id', 'name', 'date', 'non_residential_debt', 'residential_debt', 'land_debt', 'orenda_debt', 'identification', 'mpz']
                    );
                    
                    if (debtorData[0]?.data && debtorData[0].data.length > 0) {
                        debtorInfo = debtorData[0].data[0];
                        
                        if (debtorData[0].data.length > 1) {
                            console.log(`⚠️ Found ${debtorData[0].data.length} records for name "${charge.payer_name}", using the first one`);
                        }
                    }
                } catch (error) {
                    console.log('⚠️ Error getting debtor info by name:', error.message);
                }
            }
            
            const result = await this.createTaxNotificationDocument(charge, settings, debtorInfo);
            
            if (!result) {
                throw new Error("Не вдалося згенерувати документ податкового повідомлення");
            }
            
            await logRepository.createLog({
                session_user_name: debtorInfo?.name,
                row_pk_id: charge.id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Генерування податкового повідомлення',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'debt_charges',
                oid: '16504',
            });
            
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            reply.header('Content-Disposition', `attachment; filename=tax-notification-${charge.tax_number}-${charge.id}.docx`);
            
            return reply.send(result);
            
        } catch (error) {
            console.error('❌ Tax notification service error:', error);
            throw new Error(`Помилка генерації податкового повідомлення: ${error.message}`);
        }
    }

    async createTaxNotificationDocument(charge, settings, debtorInfo) {
        try {
            const { createTaxNotificationWord } = require("../../../utils/generateDocx");
            return await createTaxNotificationWord(charge, settings, debtorInfo);
        } catch (error) {
            console.error('❌ Document creation error:', error);
            throw error;
        }
    }

    async getStatistics(request) {
        try {
            const stats = await debtChargesRepository.getDebtChargesStatistics();
            return stats[0] || {};
        } catch (error) {
            throw new Error(`Помилка отримання статистики: ${error.message}`);
        }
    }

    async getReferenceData(request) {
        try {
            const referenceData = {};
            
            try {
                referenceData.classifiers = await debtChargesRepository.getUniqueClassifiers();
            } catch (error) {
                console.log('Warning: Could not get classifiers');
                referenceData.classifiers = [];
            }

            try {
                referenceData.statuses = await debtChargesRepository.getUniqueStatuses();
            } catch (error) {
                console.log('Warning: Could not get statuses');
                referenceData.statuses = [];
            }

            try {
                referenceData.paymentInfos = await debtChargesRepository.getUniquePaymentInfo();
            } catch (error) {
                console.log('Warning: Could not get payment info');
                referenceData.paymentInfos = [];
            }

            return referenceData;
        } catch (error) {
            throw new Error(`Помилка отримання довідникових даних: ${error.message}`);
        }
    }
}

module.exports = new DebtChargesService();