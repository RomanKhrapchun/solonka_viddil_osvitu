const { sqlRequest } = require('../../../helpers/database');

// Мокаємо базу даних
jest.mock('../../../helpers/database', () => ({
    sqlRequest: jest.fn()
}));

const DebtChargesRepository = require('../../../modules/debt_charges/repository/debtCharges-repository');

describe('DebtChargesRepository Unit Tests', () => {
    let debtChargesRepository;

    beforeEach(() => {
        // Очищуємо моки перед кожним тестом
        jest.clearAllMocks();
        
        // Отримуємо інстанс репозиторія
        debtChargesRepository = DebtChargesRepository;
    });

    afterEach(() => {
        // Очищуємо спаї після кожного тесту
        jest.restoreAllMocks();
    });

    describe('💰 getDebtChargeById', () => {
        it('should return debt charge by specific ID', async () => {
            // Arrange
            const chargeId = 123;
            const displayFields = ['id', 'tax_number', 'payer_name', 'amount'];
            const mockChargeData = [
                { 
                    id: 123, 
                    tax_number: '1234567890', 
                    payer_name: 'ТОВ "Тест"', 
                    amount: 15000 
                }
            ];
            sqlRequest.mockResolvedValue(mockChargeData);

            // Act
            const result = await debtChargesRepository.getDebtChargeById(chargeId, displayFields);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                'select  id, tax_number, payer_name, amount from ower.debt_charges where id = $1',
                [chargeId]
            );
            expect(result).toEqual(mockChargeData);
        });

        it('should return empty array when charge not found', async () => {
            // Arrange
            const chargeId = 99999;
            const displayFields = ['id', 'tax_number'];
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtChargesRepository.getDebtChargeById(chargeId, displayFields);

            // Assert
            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            // Arrange
            const chargeId = 123;
            const displayFields = ['id'];
            const mockError = new Error('Database connection failed');
            sqlRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(debtChargesRepository.getDebtChargeById(chargeId, displayFields))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('🔍 findDebtChargesByFilter', () => {
        it('should find debt charges with basic filtering and pagination', async () => {
            // Arrange
            const limit = 10;
            const offset = 0;
            const title = 'ТОВ Тест';
            const whereConditions = { status: 'Вручено' };
            const displayFields = ['id', 'payer_name', 'amount'];
            const sortBy = 'document_date';
            const sortDirection = 'desc';

            const mockChargesData = [{
                data: [
                    { id: 1, payer_name: 'ТОВ Тест 1', amount: 5000 },
                    { id: 2, payer_name: 'ТОВ Тест 2', amount: 7500 }
                ],
                count: 15
            }];
            sqlRequest.mockResolvedValue(mockChargesData);

            // Act
            const result = await debtChargesRepository.findDebtChargesByFilter(
                limit, offset, title, whereConditions, displayFields, sortBy, sortDirection
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringMatching(/from\s+ower\.debt_charges/i),
                expect.arrayContaining(['Вручено', '%ТОВ Тест%', 10, 0])
            );
            expect(result).toEqual(mockChargesData);
        });

        it('should handle amount range filtering', async () => {
            // Arrange
            const whereConditions = { 
                amount_from: 1000, 
                amount_to: 50000,
                tax_classifier: 'ПДВ'
            };
            const displayFields = ['id', 'amount'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                10, 0, null, whereConditions, displayFields
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('amount >= $'),
                expect.arrayContaining([1000, 50000, 'ПДВ'])
            );
        });

        it('should handle date range filtering', async () => {
            // Arrange
            const whereConditions = { 
                document_date_from: '2024-01-01',
                document_date_to: '2024-12-31'
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                15, 30, null, whereConditions, ['id']
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('document_date >= $'),
                expect.arrayContaining(['2024-01-01', '2024-12-31'])
            );
        });

        it('should handle LIKE searches for text fields', async () => {
            // Arrange
            const whereConditions = { 
                tax_number: '123456',
                payer_name: 'Іванов',
                payment_info: 'комунальні',
                cadastral_number: '123:45:67'
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                10, 0, null, whereConditions, ['id']
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('tax_number ILIKE $'),
                expect.arrayContaining(['%123456%', '%Іванов%', '%комунальні%', '%123:45:67%'])
            );
        });

        it('should handle invalid sort parameters with defaults', async () => {
            // Arrange
            const invalidSortBy = 'malicious_field';
            const invalidSortDirection = 'INVALID';
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                10, 0, null, {}, ['id'], invalidSortBy, invalidSortDirection
            );

            // Assert
            const calledSQL = sqlRequest.mock.calls[0][0];
            expect(calledSQL).toMatch(/order by id desc/i); // defaults
        });

        it('should return empty results when no matches found', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            const result = await debtChargesRepository.findDebtChargesByFilter(
                10, 0, 'NonExistent', {}, ['id']
            );

            // Assert
            expect(result).toEqual([{ data: [], count: 0 }]);
        });
    });

    describe('➕ createDebtCharge', () => {
        it('should create new debt charge successfully', async () => {
            // Arrange
            const debtChargeData = {
                tax_number: '1234567890',
                payer_name: 'ТОВ "Приклад"',
                payment_info: 'Земельний податок',
                tax_classifier: 'ЗП',
                account_number: '12345',
                full_document_id: 'DOC-2024-001',
                amount: 25000,
                cadastral_number: '123:45:67:890',
                document_date: '2024-08-11',
                delivery_date: '2024-08-15',
                status: 'Не вручено'
            };

            const mockCreatedCharge = [{ 
                id: 456, 
                ...debtChargeData 
            }];
            sqlRequest.mockResolvedValue(mockCreatedCharge);

            // Act
            const result = await debtChargesRepository.createDebtCharge(debtChargeData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debt_charges'),
                expect.arrayContaining([
                    '1234567890', 'ТОВ "Приклад"', 'Земельний податок', 'ЗП',
                    '12345', 'DOC-2024-001', 25000, '123:45:67:890',
                    '2024-08-11', '2024-08-15', 'Не вручено'
                ])
            );
            expect(result).toEqual(mockCreatedCharge);
        });

        it('should use default status when not provided', async () => {
            // Arrange
            const debtChargeData = {
                tax_number: '1234567890',
                payer_name: 'Тест',
                amount: 1000
            };
            sqlRequest.mockResolvedValue([{ id: 1, ...debtChargeData, status: 'Не вручено' }]);

            // Act
            await debtChargesRepository.createDebtCharge(debtChargeData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debt_charges'),
                expect.arrayContaining(['Не вручено'])
            );
        });

        it('should handle creation errors', async () => {
            // Arrange
            const debtChargeData = { tax_number: '123', payer_name: 'Test', amount: 1000 };
            const mockError = new Error('Unique constraint violation');
            sqlRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(debtChargesRepository.createDebtCharge(debtChargeData))
                .rejects.toThrow('Unique constraint violation');
        });
    });

    describe('📊 validateChargeData', () => {
        it('should validate and normalize valid data', () => {
            // Arrange
            const chargeData = {
                tax_number: '  1234567890  ',
                payer_name: '  ТОВ Тест  ',
                amount: '15000.50',
                status: 'Вручено'
            };

            // Act
            const result = debtChargesRepository.validateChargeData(chargeData);

            // Assert
            expect(result.tax_number).toBe('1234567890');
            expect(result.payer_name).toBe('ТОВ Тест');
            expect(result.amount).toBe(15000.50);
            expect(result.status).toBe('Вручено');
        });

        it('should use default status when not provided', () => {
            // Arrange
            const chargeData = {
                tax_number: '1234567890',
                payer_name: 'Тест без статуса',
                amount: 5000
            };

            // Act
            const result = debtChargesRepository.validateChargeData(chargeData);

            // Assert
            expect(result.status).toBe('Не вручено');
        });

        it('should throw error for missing tax_number', () => {
            // Arrange
            const chargeData = { payer_name: 'Test', amount: 1000 };

            // Act & Assert
            expect(() => debtChargesRepository.validateChargeData(chargeData))
                .toThrow('Помилки валідації: Відсутній податковий номер');
        });

        it('should throw error for missing payer_name', () => {
            // Arrange
            const chargeData = { tax_number: '123', amount: 1000 };

            // Act & Assert
            expect(() => debtChargesRepository.validateChargeData(chargeData))
                .toThrow('Помилки валідації: Відсутня назва платника');
        });

        it('should throw error for invalid amount', () => {
            // Arrange
            const chargeData = { 
                tax_number: '123', 
                payer_name: 'Test', 
                amount: 'invalid' 
            };

            // Act & Assert
            expect(() => debtChargesRepository.validateChargeData(chargeData))
                .toThrow('Помилки валідації: Некоректна сума');
        });

        it('should throw error for zero or negative amount', () => {
            // Arrange
            const chargeData = { 
                tax_number: '123', 
                payer_name: 'Test', 
                amount: -100 
            };

            // Act & Assert
            expect(() => debtChargesRepository.validateChargeData(chargeData))
                .toThrow('Помилки валідації: Некоректна сума');
        });

        it('should throw multiple validation errors', () => {
            // Arrange
            const chargeData = { amount: 'invalid' };

            // Act & Assert
            expect(() => debtChargesRepository.validateChargeData(chargeData))
                .toThrow('Відсутній податковий номер, Відсутня назва платника, Некоректна сума');
        });
    });

    describe('📦 bulkCreateDebtCharges', () => {
        it('should return zero for empty array', async () => {
            // Act
            const result = await debtChargesRepository.bulkCreateDebtCharges([]);

            // Assert
            expect(result).toEqual({ imported: 0, total: 0 });
            expect(sqlRequest).not.toHaveBeenCalled();
        });

        it('should create multiple debt charges successfully', async () => {
            // Arrange
            const debtChargesArray = [
                { tax_number: '123', payer_name: 'Test 1', amount: 1000 },
                { tax_number: '456', payer_name: 'Test 2', amount: 2000 }
            ];
            
            // Мокаємо successful validation та batch processing
            jest.spyOn(debtChargesRepository, 'validateRecordStructure').mockImplementation(() => true);
            jest.spyOn(debtChargesRepository, 'insertBatch').mockResolvedValue(2);

            // Тимчасово приховуємо console.log
            const originalConsoleLog = console.log;
            console.log = jest.fn();

            // Act
            const result = await debtChargesRepository.bulkCreateDebtCharges(debtChargesArray);

            // Assert
            expect(result).toEqual({ imported: 2, total: 2, errors: 0 });
            
            // Відновлюємо console.log
            console.log = originalConsoleLog;
        });

        it('should handle partial failures gracefully', async () => {
            // Arrange
            const debtChargesArray = [
                { tax_number: '123', payer_name: 'Test 1', amount: 1000 },
                { tax_number: 'invalid', payer_name: '', amount: -100 }, // невалідний
                { tax_number: '789', payer_name: 'Test 3', amount: 3000 }
            ];
            
            // Мокаємо validation та partial success
            jest.spyOn(debtChargesRepository, 'validateRecordStructure').mockImplementation(() => true);
            jest.spyOn(debtChargesRepository, 'insertBatch').mockResolvedValue(1); // тільки 1 з 3 успішний

            // Тимчасово приховуємо console
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            console.log = jest.fn();
            console.error = jest.fn();

            // Act
            const result = await debtChargesRepository.bulkCreateDebtCharges(debtChargesArray);

            // Assert
            expect(result).toEqual({ imported: 1, total: 3, errors: 2 });
            
            // Відновлюємо console
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
        });
    });

    describe('📈 getDebtChargesStatistics', () => {
        it('should return comprehensive statistics', async () => {
            // Arrange
            const mockStatistics = [{
                total_charges: 150,
                total_amount: 1500000,
                avg_amount: 10000,
                min_amount: 500,
                max_amount: 100000,
                unique_taxpayers: 120,
                delivered_count: 90,
                not_delivered_count: 60
            }];
            sqlRequest.mockResolvedValue(mockStatistics);

            // Act
            const result = await debtChargesRepository.getDebtChargesStatistics();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('COUNT(*) as total_charges')
            );
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('SUM(amount) as total_amount')
            );
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('AVG(amount) as avg_amount')
            );
            expect(result).toEqual(mockStatistics);
        });

        it('should handle empty statistics', async () => {
            // Arrange
            const mockEmptyStats = [{
                total_charges: 0,
                total_amount: null,
                avg_amount: null,
                min_amount: null,
                max_amount: null,
                unique_taxpayers: 0,
                delivered_count: 0,
                not_delivered_count: 0
            }];
            sqlRequest.mockResolvedValue(mockEmptyStats);

            // Act
            const result = await debtChargesRepository.getDebtChargesStatistics();

            // Assert
            expect(result).toEqual(mockEmptyStats);
        });
    });

    describe('🏷️ getUniqueClassifiers', () => {
        it('should return unique classifiers with usage count', async () => {
            // Arrange
            const mockClassifiers = [
                { tax_classifier: 'ЗП', usage_count: 50 },
                { tax_classifier: 'ПДВ', usage_count: 30 },
                { tax_classifier: 'НП', usage_count: 20 }
            ];
            sqlRequest.mockResolvedValue(mockClassifiers);

            // Act
            const result = await debtChargesRepository.getUniqueClassifiers();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('DISTINCT tax_classifier')
            );
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY usage_count DESC')
            );
            expect(result).toEqual([
                { classifier: 'ЗП', count: 50 },
                { classifier: 'ПДВ', count: 30 },
                { classifier: 'НП', count: 20 }
            ]);
        });

        it('should return empty array when no classifiers found', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtChargesRepository.getUniqueClassifiers();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('📊 getUniqueStatuses', () => {
        it('should return unique statuses with usage count', async () => {
            // Arrange
            const mockStatuses = [
                { status: 'Не вручено', usage_count: 80 },
                { status: 'Вручено', usage_count: 70 }
            ];
            sqlRequest.mockResolvedValue(mockStatuses);

            // Act
            const result = await debtChargesRepository.getUniqueStatuses();

            // Assert
            expect(result).toEqual([
                { status: 'Не вручено', count: 80 },
                { status: 'Вручено', count: 70 }
            ]);
        });
    });

    describe('💳 getUniquePaymentInfo', () => {
        it('should return unique payment info with limit', async () => {
            // Arrange
            const mockPaymentInfo = [
                { payment_info: 'Земельний податок', usage_count: 100 },
                { payment_info: 'Комунальні послуги', usage_count: 50 }
            ];
            sqlRequest.mockResolvedValue(mockPaymentInfo);

            // Act
            const result = await debtChargesRepository.getUniquePaymentInfo();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT 50')
            );
            expect(result).toEqual([
                { payment_info: 'Земельний податок', count: 100 },
                { payment_info: 'Комунальні послуги', count: 50 }
            ]);
        });
    });

    describe('📅 getStatisticsByPeriod', () => {
        it('should return daily statistics for valid period', async () => {
            // Arrange
            const dateFrom = '2024-01-01';
            const dateTo = '2024-01-31';
            const groupBy = 'day';

            const mockPeriodStats = [
                { period: '2024-01-01', charges_count: 5, total_amount: 50000, avg_amount: 10000 },
                { period: '2024-01-02', charges_count: 3, total_amount: 30000, avg_amount: 10000 }
            ];
            sqlRequest.mockResolvedValue(mockPeriodStats);

            // Act
            const result = await debtChargesRepository.getStatisticsByPeriod(dateFrom, dateTo, groupBy);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('TO_CHAR(document_date, \'YYYY-MM-DD\')'),
                [dateFrom, dateTo]
            );
            expect(result).toEqual(mockPeriodStats);
        });

        it('should use default groupBy when invalid value provided', async () => {
            // Arrange
            const dateFrom = '2024-01-01';
            const dateTo = '2024-01-31';
            const invalidGroupBy = 'invalid_period';
            sqlRequest.mockResolvedValue([]);

            // Act
            await debtChargesRepository.getStatisticsByPeriod(dateFrom, dateTo, invalidGroupBy);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('YYYY-MM-DD'), // default day format
                [dateFrom, dateTo]
            );
        });

        it('should handle weekly grouping', async () => {
            // Arrange
            const dateFrom = '2024-01-01';
            const dateTo = '2024-01-31';
            const groupBy = 'week';
            sqlRequest.mockResolvedValue([]);

            // Act
            await debtChargesRepository.getStatisticsByPeriod(dateFrom, dateTo, groupBy);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('YYYY-"W"WW'),
                [dateFrom, dateTo]
            );
        });

        it('should handle monthly grouping', async () => {
            // Arrange
            const dateFrom = '2024-01-01';
            const dateTo = '2024-12-31';
            const groupBy = 'month';
            sqlRequest.mockResolvedValue([]);

            // Act
            await debtChargesRepository.getStatisticsByPeriod(dateFrom, dateTo, groupBy);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('YYYY-MM'),
                [dateFrom, dateTo]
            );
        });

        it('should handle yearly grouping', async () => {
            // Arrange
            const dateFrom = '2020-01-01';
            const dateTo = '2024-12-31';
            const groupBy = 'year';
            sqlRequest.mockResolvedValue([]);

            // Act
            await debtChargesRepository.getStatisticsByPeriod(dateFrom, dateTo, groupBy);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('YYYY'),
                [dateFrom, dateTo]
            );
        });
    });

    describe('🗑️ truncateDebtCharges', () => {
        it('should truncate table successfully', async () => {
            // Arrange
            const mockTruncateResult = { success: true };
            sqlRequest.mockResolvedValue(mockTruncateResult);

            // Тимчасово приховуємо console.log
            const originalConsoleLog = console.log;
            console.log = jest.fn();

            // Act
            const result = await debtChargesRepository.truncateDebtCharges();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith('TRUNCATE TABLE ower.debt_charges RESTART IDENTITY');
            expect(result).toEqual(mockTruncateResult);
            
            // Відновлюємо console.log
            console.log = originalConsoleLog;
        });

        it('should handle truncate errors', async () => {
            // Arrange
            const mockError = new Error('Permission denied');
            sqlRequest.mockRejectedValue(mockError);

            // Тимчасово приховуємо console.error та console.log
            const originalConsoleError = console.error;
            const originalConsoleLog = console.log;
            console.error = jest.fn();
            console.log = jest.fn();

            // Act & Assert
            await expect(debtChargesRepository.truncateDebtCharges())
                .rejects.toThrow('Помилка очищення таблиці: Permission denied');
            
            // Відновлюємо console методи
            console.error = originalConsoleError;
            console.log = originalConsoleLog;
        });
    });

    describe('🔧 testDatabaseConnection', () => {
        it('should test connection and table structure successfully', async () => {
            // Arrange
            const mockTestResult = { test: 1 };
            const mockTableStructure = [
                { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
                { column_name: 'tax_number', data_type: 'character varying', is_nullable: 'YES' },
                { column_name: 'amount', data_type: 'numeric', is_nullable: 'YES' }
            ];
            const mockCountResult = [{ count: 1500 }];

            sqlRequest
                .mockResolvedValueOnce(mockTestResult)
                .mockResolvedValueOnce(mockTableStructure)
                .mockResolvedValueOnce(mockCountResult);

            // Тимчасово приховуємо console.log
            const originalConsoleLog = console.log;
            console.log = jest.fn();

            // Act
            const result = await debtChargesRepository.testDatabaseConnection();

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(3);
            expect(sqlRequest).toHaveBeenNthCalledWith(1, 'SELECT 1 as test');
            expect(sqlRequest).toHaveBeenNthCalledWith(2, expect.stringContaining('information_schema.columns'));
            expect(sqlRequest).toHaveBeenNthCalledWith(3, 'SELECT COUNT(*) as count FROM ower.debt_charges');
            
            expect(result).toEqual({
                connectionOk: true,
                columns: mockTableStructure,
                currentCount: 1500
            });
            
            // Відновлюємо console.log
            console.log = originalConsoleLog;
        });

        it('should handle database connection errors', async () => {
            // Arrange
            const mockError = new Error('Connection timeout');
            sqlRequest.mockRejectedValue(mockError);

            // Тимчасово приховуємо console.error та console.log
            const originalConsoleError = console.error;
            const originalConsoleLog = console.log;
            console.error = jest.fn();
            console.log = jest.fn();

            // Act & Assert
            await expect(debtChargesRepository.testDatabaseConnection())
                .rejects.toThrow('Помилка тестування бази даних: Connection timeout');
            
            // Відновлюємо console методи
            console.error = originalConsoleError;
            console.log = originalConsoleLog;
        });
    });

    describe('📄 getRequisite', () => {
        it('should return latest requisite settings', async () => {
            // Arrange
            const mockRequisites = [{
                id: 1,
                date: '2024-08-11',
                file: 'settings.json',
                non_residential_debt_purpose: 'Нежитлові приміщення',
                non_residential_debt_account: '12345',
                residential_debt_purpose: 'Житлові приміщення',
                residential_debt_account: '67890'
            }];
            sqlRequest.mockResolvedValue(mockRequisites);

            // Act
            const result = await debtChargesRepository.getRequisite();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('FROM ower.settings')
            );
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY date DESC')
            );
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT 1')
            );
            expect(result).toEqual(mockRequisites);
        });

        it('should return empty array when no settings found', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtChargesRepository.getRequisite();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('🔐 Security & Edge Cases', () => {
        it('should handle SQL injection attempts in text search', async () => {
            // Arrange
            const maliciousTitle = "'; DROP TABLE ower.debt_charges; --";
            const maliciousConditions = {
                payer_name: "'; DELETE FROM ower.debt_charges; --",
                tax_number: "1' OR '1'='1"
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                10, 0, maliciousTitle, maliciousConditions, ['id']
            );

            // Assert
            // Перевіряємо що використовуються параметризовані запити
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    `%${maliciousConditions.tax_number}%`,
                    `%${maliciousConditions.payer_name}%`,
                    `%${maliciousTitle}%`
                ])
            );
        });

        it('should handle special characters in search terms', async () => {
            // Arrange
            const specialTitle = "ТОВ 'Спецсимволи' & \"Лапки\" + % _ test";
            const whereConditions = { 
                payer_name: "Компанія з % підкресленням",
                cadastral_number: "123:45:67"
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                10, 0, specialTitle, whereConditions, ['id']
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([
                    `%${whereConditions.payer_name}%`,
                    `%${whereConditions.cadastral_number}%`,
                    `%${specialTitle}%`
                ])
            );
        });

        it('should handle very large amounts', async () => {
            // Arrange
            const largeAmountData = {
                tax_number: '1234567890',
                payer_name: 'Велика сума',
                amount: 999999999.99
            };
            sqlRequest.mockResolvedValue([{ id: 1, ...largeAmountData }]);

            // Act
            const result = await debtChargesRepository.createDebtCharge(largeAmountData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debt_charges'),
                expect.arrayContaining([999999999.99])
            );
        });

        it('should handle Unicode characters in names', async () => {
            // Arrange
            const unicodeData = {
                tax_number: '1234567890',
                payer_name: 'ТОВ "Українська абетка" ąčęėįšųūž',
                amount: 1000
            };
            sqlRequest.mockResolvedValue([{ id: 1, ...unicodeData }]);

            // Act
            await debtChargesRepository.createDebtCharge(unicodeData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debt_charges'),
                expect.arrayContaining(['ТОВ "Українська абетка" ąčęėįšųūž'])
            );
        });

        it('should handle null and undefined values in whereConditions', async () => {
            // Arrange
            const whereConditions = {
                tax_number: null,
                payer_name: undefined,
                amount_from: 0,
                status: ''
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                10, 0, null, whereConditions, ['id']
            );

            // Assert
            // Мають фільтруватися null/undefined значення
            const calledArgs = sqlRequest.mock.calls[0][1];
            expect(calledArgs).not.toContain(null);
            expect(calledArgs).not.toContain(undefined);
        });
    });

    describe('🔬 Integration-like Tests', () => {
        it('should handle complete workflow: create, search, validate', async () => {
            // Arrange
            const testCharge = {
                tax_number: '1234567890',
                payer_name: 'Інтеграційний тест',
                amount: 15000,
                status: 'Не вручено'
            };

            // Мокаємо послідовність операцій
            sqlRequest
                .mockResolvedValueOnce([{ id: 999, ...testCharge }]) // create
                .mockResolvedValueOnce([{ data: [{ id: 999, ...testCharge }], count: 1 }]); // search

            // Act - створюємо
            const createResult = await debtChargesRepository.createDebtCharge(testCharge);
            
            // Act - шукаємо
            const searchResult = await debtChargesRepository.findDebtChargesByFilter(
                10, 0, 'Інтеграційний', {}, ['id', 'payer_name', 'amount']
            );

            // Assert
            expect(createResult[0].payer_name).toBe('Інтеграційний тест');
            expect(searchResult[0].data[0].payer_name).toBe('Інтеграційний тест');
            expect(sqlRequest).toHaveBeenCalledTimes(2);
        });

        it('should handle complex multi-criteria search', async () => {
            // Arrange
            const complexFilters = {
                amount_from: 1000,
                amount_to: 50000,
                tax_classifier: 'ЗП',
                status: 'Вручено',
                document_date_from: '2024-01-01',
                document_date_to: '2024-12-31',
                payer_name: 'ТОВ',
                cadastral_number: '123:45'
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtChargesRepository.findDebtChargesByFilter(
                20, 40, 'Комплексний пошук', complexFilters, 
                ['id', 'payer_name', 'amount'], 'amount', 'desc'
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('amount >= $'),
                expect.arrayContaining([
                    1000, 50000, 'ЗП', 'Вручено', '2024-01-01', '2024-12-31',
                    '%ТОВ%', '%123:45%', '%Комплексний пошук%', 20, 40
                ])
            );
        });

        it('should handle statistics with empty data gracefully', async () => {
            // Arrange - мокаємо порожню таблицю
            sqlRequest
                .mockResolvedValueOnce([{ // statistics
                    total_charges: 0, total_amount: null, avg_amount: null,
                    min_amount: null, max_amount: null, unique_taxpayers: 0,
                    delivered_count: 0, not_delivered_count: 0
                }])
                .mockResolvedValueOnce([]) // classifiers
                .mockResolvedValueOnce([]) // statuses
                .mockResolvedValueOnce([]); // payment info

            // Act
            const stats = await debtChargesRepository.getDebtChargesStatistics();
            const classifiers = await debtChargesRepository.getUniqueClassifiers();
            const statuses = await debtChargesRepository.getUniqueStatuses();
            const paymentInfo = await debtChargesRepository.getUniquePaymentInfo();

            // Assert
            expect(stats[0].total_charges).toBe(0);
            expect(classifiers).toEqual([]);
            expect(statuses).toEqual([]);
            expect(paymentInfo).toEqual([]);
        });
    });

    describe('🛠️ Helper Methods', () => {
        it('should insert single record successfully', async () => {
            // Arrange
            const charge = {
                tax_number: '1234567890',
                payer_name: 'Одиночний запис',
                amount: 5000,
                status: 'Не вручено'
            };
            sqlRequest.mockResolvedValue([{ id: 1, ...charge }]);

            // Act
            const result = await debtChargesRepository.insertSingleRecord(charge);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debt_charges'),
                expect.arrayContaining(['1234567890', 'Одиночний запис', 5000, 'Не вручено'])
            );
            expect(result).toEqual([{ id: 1, ...charge }]);
        });

        it('should create single debt charge with validation', async () => {
            // Arrange
            const chargeData = {
                tax_number: '1234567890',
                payer_name: 'Валідований запис',
                amount: 7500
            };
            
            // Мокаємо validateChargeData та createDebtCharge
            jest.spyOn(debtChargesRepository, 'validateChargeData').mockReturnValue({
                ...chargeData,
                status: 'Не вручено'
            });
            jest.spyOn(debtChargesRepository, 'createDebtCharge').mockResolvedValue([{
                id: 1, 
                ...chargeData,
                status: 'Не вручено'
            }]);

            // Act
            const result = await debtChargesRepository.createSingleDebtCharge(chargeData);

            // Assert
            expect(debtChargesRepository.validateChargeData).toHaveBeenCalledWith(chargeData);
            expect(debtChargesRepository.createDebtCharge).toHaveBeenCalled();
            expect(result[0].payer_name).toBe('Валідований запис');
        });

        it('should handle createSingleDebtCharge validation errors', async () => {
            // Arrange
            const invalidChargeData = {
                tax_number: '',  // invalid
                payer_name: 'Test',
                amount: 'invalid'  // invalid
            };
            
            // Мокаємо validateChargeData щоб кидала помилку
            jest.spyOn(debtChargesRepository, 'validateChargeData').mockImplementation(() => {
                throw new Error('Помилки валідації: Відсутній податковий номер, Некоректна сума');
            });

            // Тимчасово приховуємо console.error
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Act & Assert
            await expect(debtChargesRepository.createSingleDebtCharge(invalidChargeData))
                .rejects.toThrow('Помилки валідації');

            // Відновлюємо console.error
            console.error = originalConsoleError;
        });

        it('should validate record structure correctly', () => {
            // Arrange
            const validRecord = {
                tax_number: '1234567890',
                payer_name: 'Valid Record',
                amount: 1000
            };

            // Act & Assert - не має кидати помилку
            expect(() => debtChargesRepository.validateRecordStructure(validRecord))
                .not.toThrow();
        });

        it('should build WHERE conditions correctly', () => {
            // Arrange
            const whereConditions = {
                tax_number: '123456',
                amount_from: 1000,
                amount_to: 50000,
                status: 'Вручено',
                payer_name: 'ТОВ Тест'
            };

            // Act
            const result = debtChargesRepository.buildDebtChargesWhereCondition(whereConditions, 1);

            // Assert
            expect(result.text).toContain('tax_number ILIKE $');
            expect(result.text).toContain('amount >= $');
            expect(result.text).toContain('amount <= $');
            expect(result.text).toContain('status = $');
            expect(result.text).toContain('payer_name ILIKE $');
            expect(result.value).toEqual(['%123456%', 1000, 50000, 'Вручено', '%ТОВ Тест%']);
        });

        it('should handle empty WHERE conditions', () => {
            // Arrange
            const emptyConditions = {};

            // Act
            const result = debtChargesRepository.buildDebtChargesWhereCondition(emptyConditions, 1);

            // Assert
            expect(result.text).toBe('');
            expect(result.value).toEqual([]);
        });
    });
});