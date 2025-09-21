const { sqlRequest } = require('../../../helpers/database');

// Мокаємо базу даних
jest.mock('../../../helpers/database', () => ({
    sqlRequest: jest.fn()
}));

const DebtorRepository = require('../../../modules/debtor/repository/debtor-repository');

describe('DebtorRepository Unit Tests', () => {
    let debtorRepository;

    beforeEach(() => {
        // Очищуємо моки перед кожним тестом
        jest.clearAllMocks();
        
        // Отримуємо інстанс репозиторія
        debtorRepository = DebtorRepository;
    });

    afterEach(() => {
        // Очищуємо спаї після кожного тесту
        jest.restoreAllMocks();
    });

    describe('💰 getDebtByDebtorId', () => {
        it('should return debt information for specific debtor ID', async () => {
            // Arrange
            const debtorId = 12345;
            const displayFields = ['id', 'name', 'identification', 'land_debt', 'residential_debt'];
            const mockDebtData = [
                { 
                    id: 12345, 
                    name: 'Іванов Іван Іванович', 
                    identification: '1234567890',
                    land_debt: 15000,
                    residential_debt: 5000
                }
            ];
            sqlRequest.mockResolvedValue(mockDebtData);

            // Act
            const result = await debtorRepository.getDebtByDebtorId(debtorId, displayFields);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('from ower.ower where id = ?'),
                [debtorId]
            );
            expect(result).toEqual(mockDebtData);
        });

        it('should return empty array when debtor not found', async () => {
            // Arrange
            const debtorId = 99999;
            const displayFields = ['id', 'name'];
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getDebtByDebtorId(debtorId, displayFields);

            // Assert
            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            // Arrange
            const debtorId = 123;
            const displayFields = ['id'];
            const mockError = new Error('Database connection failed');
            sqlRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(debtorRepository.getDebtByDebtorId(debtorId, displayFields))
                .rejects.toThrow('Database connection failed');
        });
    });

    describe('🔍 findDebtByFilter', () => {
        it('should find debtors with basic filtering and pagination', async () => {
            // Arrange
            const limit = 10;
            const offset = 0;
            const title = 'Іванов';
            const whereConditions = { status: 'active' };
            const displayFieldsUsers = ['id', 'name', 'identification']; // правильна назва параметра
            const sortBy = 'name';
            const sortDirection = 'asc';

            const mockDebtorsData = [{
                data: [
                    { id: 1, name: 'Іванов Петро', identification: '1234567890' },
                    { id: 2, name: 'Іванова Марія', identification: '0987654321' }
                ],
                count: 15
            }];
            sqlRequest.mockResolvedValue(mockDebtorsData);

            // Act
            const result = await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers, sortBy, sortDirection
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('from ower.ower'),
                expect.arrayContaining(['%Іванов%', 10, 0])
            );
            expect(result).toEqual(mockDebtorsData);
        });

        it('should handle district and village filtering', async () => {
            // Arrange
            const limit = 20;
            const offset = 40;
            const title = null;
            const whereConditions = { district_id: 3, village_id: 105 };
            const displayFieldsUsers = ['id', 'name'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('from ower.ower'),
                expect.arrayContaining([3, 105, 20, 40]) // включає whereConditions values
            );
        });

        it('should handle search by title only', async () => {
            // Arrange
            const limit = 10;
            const offset = 0;
            const title = 'Центральний';
            const whereConditions = {};
            const displayFieldsUsers = ['id'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('name ILIKE ?'),
                expect.arrayContaining(['%Центральний%'])
            );
        });

        it('should handle complex search conditions', async () => {
            // Arrange
            const limit = 15;
            const offset = 30;
            const title = 'Нова Гута';
            const whereConditions = { status: 'active', debt_amount: '>1000' };
            const displayFieldsUsers = ['id', 'name'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('name ILIKE ?'),
                expect.arrayContaining(['%Нова Гута%', 15, 30])
            );
        });

        it('should handle invalid sort parameters with defaults', async () => {
            // Arrange
            const limit = 10;
            const offset = 0;
            const title = null;
            const whereConditions = {};
            const displayFieldsUsers = ['id'];
            const invalidSortBy = 'malicious_field';
            const invalidSortDirection = 'INVALID';
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers, invalidSortBy, invalidSortDirection
            );

            // Assert
            const calledSQL = sqlRequest.mock.calls[0][0];
            expect(calledSQL).toContain('order by'); // має містити сортування
        });

        it('should return empty results when no matches found', async () => {
            // Arrange
            const limit = 10;
            const offset = 0;
            const title = 'NonExistent';
            const whereConditions = {};
            const displayFieldsUsers = ['id'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            const result = await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers
            );

            // Assert
            expect(result).toEqual([{ data: [], count: 0 }]);
        });
    });

    describe('👤 getDebtorNameById', () => {
        it('should return debtor name by ID', async () => {
            // Arrange
            const owerId = 12345;
            const mockDebtorData = [
                { id: 12345, person_name: 'Петренко Олег Миколайович' }
            ];
            sqlRequest.mockResolvedValue(mockDebtorData);

            // Act
            const result = await debtorRepository.getDebtorNameById(owerId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [owerId]
            );
            expect(result).toEqual(mockDebtorData[0]);
        });

        it('should return null when debtor not found', async () => {
            // Arrange
            const owerId = 99999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getDebtorNameById(owerId);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('📚 getHistoryIdByName', () => {
        it('should return history ID by person name', async () => {
            // Arrange
            const personName = 'Сидоренко Віталій';
            const mockHistoryData = [
                { 
                    history_id: 567, 
                    person_name: 'Сидоренко Віталій Петрович',
                    identification: '3334445556',
                    registry_date: '2024-01-15'
                }
            ];
            sqlRequest.mockResolvedValue(mockHistoryData);

            // Act
            const result = await debtorRepository.getHistoryIdByName(personName);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('FROM ower.ower_history'),
                [`%${personName}%`]
            );
            expect(result).toEqual(mockHistoryData[0]);
        });

        it('should return null when no history found', async () => {
            // Arrange
            const personName = 'Неіснуючий Боржник';
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getHistoryIdByName(personName);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('📞 getDebtorCalls', () => {
        it('should return all calls for specific history ID', async () => {
            // Arrange
            const historyId = 567;
            const mockCallsData = [
                { 
                    id: 1, 
                    history_record_id: 567,
                    call_date: '2024-08-10',
                    call_topic: 'Нагадування про борг',
                    created_at: '2024-08-10T10:00:00Z'
                },
                { 
                    id: 2, 
                    history_record_id: 567,
                    call_date: '2024-08-05',
                    call_topic: 'Перший дзвінок',
                    created_at: '2024-08-05T14:30:00Z'
                }
            ];
            sqlRequest.mockResolvedValue(mockCallsData);

            // Act
            const result = await debtorRepository.getDebtorCalls(historyId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('FROM ower.debtor_calls dc'),
                [historyId]
            );
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY dc.call_date DESC'),
                [historyId]
            );
            expect(result).toEqual(mockCallsData);
        });

        it('should return empty array when no calls found', async () => {
            // Arrange
            const historyId = 999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getDebtorCalls(historyId);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('➕ createDebtorCall', () => {
        it('should create new debtor call successfully', async () => {
            // Arrange
            const callData = {
                history_record_id: 567,
                call_date: '2024-08-11',
                call_topic: 'Угода про реструктуризацію'
            };

            const mockCreatedCall = [
                { 
                    id: 123, 
                    ...callData,
                    created_at: '2024-08-11T12:00:00Z',
                    updated_at: '2024-08-11T12:00:00Z'
                }
            ];
            sqlRequest.mockResolvedValue(mockCreatedCall);

            // Act
            const result = await debtorRepository.createDebtorCall(callData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debtor_calls'),
                [567, '2024-08-11', 'Угода про реструктуризацію']
            );
            expect(result).toEqual(mockCreatedCall[0]);
        });

        it('should handle creation with different result format', async () => {
            // Arrange
            const callData = {
                history_record_id: 567,
                call_date: '2024-08-11',
                call_topic: 'Тестовий дзвінок'
            };

            // Мокаємо результат у форматі {rows: [...]}
            const mockResult = {
                rows: [{ 
                    id: 124, 
                    ...callData,
                    created_at: '2024-08-11T12:00:00Z'
                }]
            };
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await debtorRepository.createDebtorCall(callData);

            // Assert
            expect(result).toEqual(mockResult.rows[0]);
        });

        it('should throw error for missing required fields', async () => {
            // Arrange
            const invalidCallData = {
                history_record_id: 567,
                // відсутні call_date та call_topic
            };

            // Act & Assert
            await expect(debtorRepository.createDebtorCall(invalidCallData))
                .rejects.toThrow('Missing required fields');
        });

        it('should handle database creation errors', async () => {
            // Arrange
            const callData = {
                history_record_id: 567,
                call_date: '2024-08-11',
                call_topic: 'Тест помилки'
            };
            const mockError = new Error('Foreign key constraint violation');
            sqlRequest.mockRejectedValue(mockError);

            // Тимчасово приховуємо console.error
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Act & Assert
            await expect(debtorRepository.createDebtorCall(callData))
                .rejects.toThrow('Foreign key constraint violation');
            
            // Відновлюємо console.error
            console.error = originalConsoleError;
        });

        it('should throw error when no data returned from INSERT', async () => {
            // Arrange
            const callData = {
                history_record_id: 567,
                call_date: '2024-08-11',
                call_topic: 'Тест пустого результату'
            };
            sqlRequest.mockResolvedValue([]); // порожній результат

            // Act & Assert
            await expect(debtorRepository.createDebtorCall(callData))
                .rejects.toThrow('No data returned from INSERT');
        });
    });

    describe('🆔 resolveHistoryId', () => {
        it('should resolve history ID by numeric ower ID', async () => {
            // Arrange
            const owerId = 12345;
            const mockDebtorName = { person_name: 'Коваленко Анна Сергіївна' };
            const mockHistoryRecord = { history_id: 789 };

            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(mockDebtorName);
            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue(mockHistoryRecord);

            // Act
            const result = await debtorRepository.resolveHistoryId(owerId);

            // Assert
            expect(debtorRepository.getDebtorNameById).toHaveBeenCalledWith(12345);
            expect(debtorRepository.getHistoryIdByName).toHaveBeenCalledWith('Коваленко Анна Сергіївна');
            expect(result).toBe(789);
        });

        it('should resolve history ID by person name string', async () => {
            // Arrange
            const personName = 'Мельник Олександр';
            const mockHistoryRecord = { history_id: 456 };

            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue(mockHistoryRecord);

            // Act
            const result = await debtorRepository.resolveHistoryId(personName);

            // Assert
            expect(debtorRepository.getHistoryIdByName).toHaveBeenCalledWith(personName);
            expect(result).toBe(456);
        });

        it('should throw error when debtor not found in ower.ower', async () => {
            // Arrange
            const owerId = 99999;
            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(null);

            // Act & Assert
            await expect(debtorRepository.resolveHistoryId(owerId))
                .rejects.toThrow('Debtor not found in ower.ower');
        });

        it('should throw error when history record not found', async () => {
            // Arrange
            const personName = 'Неіснуючий Боржник';
            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue(null);

            // Act & Assert
            await expect(debtorRepository.resolveHistoryId(personName))
                .rejects.toThrow('History record not found for this name');
        });
    });

    describe('📞 getCallsByIdentifier', () => {
        it('should get calls by ower ID identifier', async () => {
            // Arrange
            const owerId = 12345;
            const mockCalls = [
                { id: 1, call_topic: 'Тест 1' },
                { id: 2, call_topic: 'Тест 2' }
            ];

            jest.spyOn(debtorRepository, 'resolveHistoryId').mockResolvedValue(789);
            jest.spyOn(debtorRepository, 'getDebtorCalls').mockResolvedValue(mockCalls);

            // Act
            const result = await debtorRepository.getCallsByIdentifier(owerId);

            // Assert
            expect(debtorRepository.resolveHistoryId).toHaveBeenCalledWith(12345);
            expect(debtorRepository.getDebtorCalls).toHaveBeenCalledWith(789);
            expect(result).toEqual(mockCalls);
        });

        it('should get calls by person name identifier', async () => {
            // Arrange
            const personName = 'Шевченко Тарас';
            const mockCalls = [{ id: 1, call_topic: 'Поетичний дзвінок' }];

            jest.spyOn(debtorRepository, 'resolveHistoryId').mockResolvedValue(555);
            jest.spyOn(debtorRepository, 'getDebtorCalls').mockResolvedValue(mockCalls);

            // Act
            const result = await debtorRepository.getCallsByIdentifier(personName);

            // Assert
            expect(result).toEqual(mockCalls);
        });
    });

    describe('➕ createCallByIdentifier', () => {
        it('should create call by ower ID identifier', async () => {
            // Arrange
            const owerId = 12345;
            const callData = {
                call_date: '2024-08-11',
                call_topic: 'Дзвінок через ID'
            };
            const mockCreatedCall = { id: 999, ...callData };

            jest.spyOn(debtorRepository, 'resolveHistoryId').mockResolvedValue(789);
            jest.spyOn(debtorRepository, 'createDebtorCall').mockResolvedValue(mockCreatedCall);

            // Act
            const result = await debtorRepository.createCallByIdentifier(owerId, callData);

            // Assert
            expect(debtorRepository.resolveHistoryId).toHaveBeenCalledWith(12345);
            expect(debtorRepository.createDebtorCall).toHaveBeenCalledWith({
                history_record_id: 789,
                call_date: '2024-08-11',
                call_topic: 'Дзвінок через ID'
            });
            expect(result).toEqual(mockCreatedCall);
        });

        it('should create call by person name identifier', async () => {
            // Arrange
            const personName = 'Франко Іван';
            const callData = {
                call_date: '2024-08-11',
                call_topic: 'Літературний дзвінок'
            };
            const mockCreatedCall = { id: 888 };

            jest.spyOn(debtorRepository, 'resolveHistoryId').mockResolvedValue(333);
            jest.spyOn(debtorRepository, 'createDebtorCall').mockResolvedValue(mockCreatedCall);

            // Act
            const result = await debtorRepository.createCallByIdentifier(personName, callData);

            // Assert
            expect(result).toEqual(mockCreatedCall);
        });
    });

    describe('📞 getCallById', () => {
        it('should return call by specific ID', async () => {
            // Arrange
            const callId = 456;
            const mockCallData = [
                { 
                    id: 456,
                    history_record_id: 789,
                    call_date: '2024-08-11',
                    call_topic: 'Важлива розмова',
                    created_at: '2024-08-11T10:00:00Z'
                }
            ];
            sqlRequest.mockResolvedValue(mockCallData);

            // Act
            const result = await debtorRepository.getCallById(callId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('FROM ower.debtor_calls'),
                [callId]
            );
            expect(result).toEqual(mockCallData[0]);
        });

        it('should return null when call not found', async () => {
            // Arrange
            const callId = 99999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getCallById(callId);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('📋 getHistoryRecordById', () => {
        it('should return history record by ID', async () => {
            // Arrange
            const historyRecordId = 789;
            const mockHistoryData = [
                { 
                    id: 789, 
                    person_name: 'Лесь Українка',
                    identification: '1871002501'
                }
            ];
            sqlRequest.mockResolvedValue(mockHistoryData);

            // Act
            const result = await debtorRepository.getHistoryRecordById(historyRecordId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('FROM ower.ower_history'),
                [historyRecordId]
            );
            expect(result).toEqual(mockHistoryData);
        });

        it('should return empty array when history record not found', async () => {
            // Arrange
            const historyRecordId = 99999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getHistoryRecordById(historyRecordId);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('📄 getRequisite', () => {
        it('should return requisite settings', async () => {
            // Arrange
            const mockRequisites = [
                { 
                    id: 1,
                    bank_name: 'ПриватБанк',
                    account_number: '26001234567890',
                    recipient_name: 'Сільська рада'
                }
            ];
            sqlRequest.mockResolvedValue(mockRequisites);

            // Act
            const result = await debtorRepository.getRequisite();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith('select * from ower.settings');
            expect(result).toEqual(mockRequisites);
        });

        it('should return empty array when no settings found', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await debtorRepository.getRequisite();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('🔐 Security & Edge Cases', () => {
        it('should handle SQL injection attempts in search', async () => {
            // Arrange
            const maliciousTitle = "'; DROP TABLE ower.ower; --";
            const limit = 10;
            const offset = 0;
            const whereConditions = {};
            const displayFieldsUsers = ['id'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtorRepository.findDebtByFilter(
                limit, offset, maliciousTitle, whereConditions, displayFieldsUsers
            );

            // Assert
            // Перевіряємо що використовуються параметризовані запити
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([`%${maliciousTitle}%`, 10, 0])
            );
        });

        it('should handle special characters in person names', async () => {
            // Arrange
            const specialName = "О'Коннор-Шевченко Марія-Анна";
            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue({ history_id: 123 });

            // Act
            const result = await debtorRepository.resolveHistoryId(specialName);

            // Assert
            expect(debtorRepository.getHistoryIdByName).toHaveBeenCalledWith(specialName);
            expect(result).toBe(123);
        });

        it('should handle very long call topics', async () => {
            // Arrange
            const longTopic = 'Дуже довга тема дзвінка '.repeat(50); // ~1500 символів
            const callData = {
                history_record_id: 567,
                call_date: '2024-08-11',
                call_topic: longTopic
            };
            sqlRequest.mockResolvedValue([{ id: 1, ...callData }]);

            // Act
            const result = await debtorRepository.createDebtorCall(callData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debtor_calls'),
                expect.arrayContaining([567, '2024-08-11', longTopic])
            );
        });

        it('should handle Unicode characters in call topics', async () => {
            // Arrange
            const unicodeTopic = 'Розмова про борг 💰 та реструктуризацію 📞 ąčęėįšųūž';
            const callData = {
                history_record_id: 567,
                call_date: '2024-08-11',
                call_topic: unicodeTopic
            };
            sqlRequest.mockResolvedValue([{ id: 1, ...callData }]);

            // Act
            await debtorRepository.createDebtorCall(callData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ower.debtor_calls'),
                expect.arrayContaining([567, '2024-08-11', unicodeTopic])
            );
        });

        it('should handle edge case numeric string identifiers', async () => {
            // Arrange - рядок що виглядає як число але з літерами
            const nonNumericString = '12345abc'; // точно не число
            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue({ history_id: 999 });

            // Act
            const result = await debtorRepository.resolveHistoryId(nonNumericString);

            // Assert
            // Рядок "12345abc" не є валідним числом, тому обробляється як ім'я
            expect(debtorRepository.getHistoryIdByName).toHaveBeenCalledWith(nonNumericString);
            expect(result).toBe(999);
        });

        it('should handle string that looks like number but processed as string', async () => {
            // Arrange - рядок що виглядає як число
            const numericString = '00012345';
            
            // Мокаємо що getDebtorNameById повертає результат (так як рядок обробляється як число)
            const mockDebtorName = { person_name: 'Знайдений Боржник' };
            const mockHistoryRecord = { history_id: 777 };
            
            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(mockDebtorName);
            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue(mockHistoryRecord);

            // Act
            const result = await debtorRepository.resolveHistoryId(numericString);

            // Assert
            // "00012345" обробляється як число, тому викликається getDebtorNameById
            expect(debtorRepository.getDebtorNameById).toHaveBeenCalledWith(numericString);
            expect(debtorRepository.getHistoryIdByName).toHaveBeenCalledWith('Знайдений Боржник');
            expect(result).toBe(777);
        });

        it('should handle numeric string that fails debtor lookup', async () => {
            // Arrange - рядок що виглядає як число але боржника не знайдено
            const numericString = '99999999';
            
            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(null);

            // Act & Assert
            await expect(debtorRepository.resolveHistoryId(numericString))
                .rejects.toThrow('Debtor not found in ower.ower');
                
            expect(debtorRepository.getDebtorNameById).toHaveBeenCalledWith(numericString);
        });

        it('should handle pure numeric identifiers', async () => {
            // Arrange
            const pureNumber = 12345; // чисте число
            const mockDebtorName = { person_name: 'Числовий Тест' };
            const mockHistoryRecord = { history_id: 888 };

            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(mockDebtorName);
            jest.spyOn(debtorRepository, 'getHistoryIdByName').mockResolvedValue(mockHistoryRecord);

            // Act
            const result = await debtorRepository.resolveHistoryId(pureNumber);

            // Assert
            expect(debtorRepository.getDebtorNameById).toHaveBeenCalledWith(12345);
            expect(result).toBe(888);
        });

        it('should handle null and undefined values gracefully', async () => {
            // Arrange & Act & Assert
            await expect(debtorRepository.createDebtorCall(null))
                .rejects.toThrow(); // може кидати різні помилки залежно від реалізації

            await expect(debtorRepository.createDebtorCall(undefined))
                .rejects.toThrow();

            await expect(debtorRepository.createDebtorCall({}))
                .rejects.toThrow('Missing required fields');
        });
    });

    describe('🔬 Integration-like Tests', () => {
        it('should handle complete debtor workflow: find, get calls, create call', async () => {
            // Arrange
            const debtorSearchData = [{ 
                data: [{ id: 12345, name: 'Тестовий Боржник' }], 
                count: 1 
            }];
            const existingCalls = [
                { id: 1, call_topic: 'Перший дзвінок' },
                { id: 2, call_topic: 'Нагадування' }
            ];
            const newCallData = { call_date: '2024-08-11', call_topic: 'Фінальна угода' };
            const createdCall = { id: 3, ...newCallData };

            // Мокаємо послідовність операцій
            sqlRequest.mockResolvedValueOnce(debtorSearchData); // пошук боржника
            
            jest.spyOn(debtorRepository, 'resolveHistoryId').mockResolvedValue(789);
            jest.spyOn(debtorRepository, 'getDebtorCalls').mockResolvedValue(existingCalls);
            jest.spyOn(debtorRepository, 'createCallByIdentifier').mockResolvedValue(createdCall);

            // Act - пошук боржника
            const searchResult = await debtorRepository.findDebtByFilter(
                10, 0, 'Тестовий', {}, ['id', 'name']
            );
            
            // Act - отримання дзвінків
            const callsResult = await debtorRepository.getCallsByIdentifier(12345);
            
            // Act - створення нового дзвінка
            const createResult = await debtorRepository.createCallByIdentifier(12345, newCallData);

            // Assert
            expect(searchResult[0].data[0].name).toBe('Тестовий Боржник');
            expect(callsResult).toHaveLength(2);
            expect(createResult.call_topic).toBe('Фінальна угода');
        });

        it('should handle complex multi-district search with sorting', async () => {
            // Arrange
            const limit = 25;
            const offset = 50;
            const title = 'Багатокритерійний';
            const whereConditions = { 
                debt_amount: '>5000',
                status: 'active' 
            };
            const displayFieldsUsers = ['id', 'name', 'debt_amount'];
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await debtorRepository.findDebtByFilter(
                limit, offset, title, whereConditions, displayFieldsUsers, 'debt_amount', 'desc'
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('name ILIKE ?'),
                expect.arrayContaining(['%Багатокритерійний%', 25, 50])
            );
        });

        it('should handle error scenarios gracefully', async () => {
            // Arrange
            const owerId = 99999; // число, що не існує
            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(null);

            // Act & Assert - спочатку шукає як число, не знаходить, кидає помилку
            await expect(debtorRepository.resolveHistoryId(owerId))
                .rejects.toThrow('Debtor not found in ower.ower');
                
            expect(debtorRepository.getDebtorNameById).toHaveBeenCalledWith(owerId);
        });

        it('should handle chained operations with error recovery', async () => {
            // Arrange
            const owerId = 12345;
            
            // Перший виклик не знаходить в ower.ower
            jest.spyOn(debtorRepository, 'getDebtorNameById').mockResolvedValue(null);

            // Act & Assert
            await expect(debtorRepository.getCallsByIdentifier(owerId))
                .rejects.toThrow('Debtor not found in ower.ower');
        });

        it('should maintain data consistency across operations', async () => {
            // Arrange
            const historyId = 789;
            const callsData = [
                { id: 1, history_record_id: 789, call_topic: 'Дзвінок 1' },
                { id: 2, history_record_id: 789, call_topic: 'Дзвінок 2' }
            ];
            const historyData = [{ id: 789, person_name: 'Консистентний Тест' }];

            sqlRequest
                .mockResolvedValueOnce(callsData) // getDebtorCalls
                .mockResolvedValueOnce(historyData); // getHistoryRecordById

            // Act
            const calls = await debtorRepository.getDebtorCalls(historyId);
            const history = await debtorRepository.getHistoryRecordById(historyId);

            // Assert - перевіряємо консистентність даних
            expect(calls.every(call => call.history_record_id === historyId)).toBe(true);
            expect(history[0].id).toBe(historyId);
            expect(calls).toHaveLength(2);
        });
    });
});