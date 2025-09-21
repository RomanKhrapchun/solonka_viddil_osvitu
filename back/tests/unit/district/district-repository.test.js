const DistrictRepository = require('../../../modules/district/repository/district-repository');
const { sqlRequest } = require('../../../helpers/database');

// Мокаємо базу даних
jest.mock('../../../helpers/database', () => ({
    sqlRequest: jest.fn()
}));

// Мокаємо утіліти
jest.mock('../../../utils/function', () => ({
    buildWhereCondition: jest.fn()
}));

const { buildWhereCondition } = require('../../../utils/function');

describe('DistrictRepository Unit Tests', () => {
    let districtRepository;

    beforeEach(() => {
        // Очищуємо моки перед кожним тестом
        jest.clearAllMocks();
        
        // Отримуємо інстанс репозиторія
        districtRepository = DistrictRepository;
    });

    describe('🏛️ getAllDistricts', () => {
        it('should return all active districts with debtors count', async () => {
            // Arrange
            const mockDistrictsData = [
                { id: 1, name: 'Центральний', code: 'CNT', description: 'Центральний район', debtors_count: 150 },
                { id: 2, name: 'Північний', code: 'NTH', description: 'Північний район', debtors_count: 89 }
            ];
            sqlRequest.mockResolvedValue(mockDistrictsData);

            // Act
            const result = await districtRepository.getAllDistricts();

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(expect.stringContaining('select'));
            expect(sqlRequest).toHaveBeenCalledWith(expect.stringContaining('d.active = true'));
            expect(result).toEqual(mockDistrictsData);
        });

        it('should handle empty districts list', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await districtRepository.getAllDistricts();

            // Assert
            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            // Arrange
            const mockError = new Error('Database connection failed');
            sqlRequest.mockRejectedValue(mockError);

            // Тимчасово приховуємо console.error для цього тесту
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Act & Assert
            await expect(districtRepository.getAllDistricts()).rejects.toThrow('Database connection failed');
            
            // Відновлюємо console.error
            console.error = originalConsoleError;
        });
    });

    describe('🏘️ getVillagesByDistrict', () => {
        it('should return villages for specific district', async () => {
            // Arrange
            const districtId = 5;
            const mockVillagesData = [
                { id: 101, name: 'Нова Гута', code: 'NG' },
                { id: 102, name: 'Стара Гута', code: 'SG' }
            ];
            sqlRequest.mockResolvedValue(mockVillagesData);

            // Act
            const result = await districtRepository.getVillagesByDistrict(districtId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('from ower.villages'),
                [districtId]
            );
            expect(result).toEqual(mockVillagesData);
        });

        it('should return empty array when no villages found', async () => {
            // Arrange
            const districtId = 999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await districtRepository.getVillagesByDistrict(districtId);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('💰 getDebtByDebtorId', () => {
        it('should return debt information for specific debtor', async () => {
            // Arrange
            const debtorId = 12345;
            const displayFields = ['id', 'name', 'debt_amount', 'districts'];
            const mockDebtData = [
                { id: 12345, name: 'Іван Петров', debt_amount: 15000, districts: 'Центральний' }
            ];
            sqlRequest.mockResolvedValue(mockDebtData);

            // Act
            const result = await districtRepository.getDebtByDebtorId(debtorId, displayFields);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                'select  id, name, debt_amount, districts from ower.ower where id = ?',
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
            const result = await districtRepository.getDebtByDebtorId(debtorId, displayFields);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('🔍 findDebtByFilter', () => {
        beforeEach(() => {
            buildWhereCondition.mockReturnValue({
                text: ' and o.status = ?',
                value: ['active']
            });
        });

        it('should find debts by district filter with pagination', async () => {
            // Arrange
            const filters = {
                districtId: 3,
                districtName: null,
                villageId: null,
                villageName: null
            };
            const limit = 10;
            const offset = 0;
            const title = null;
            const whereConditions = { status: 'active' };
            const displayFields = ['id', 'name', 'debt_amount'];
            
            const mockDebtData = [
                {
                    data: [
                        { id: 1, name: 'Боржник 1', debt_amount: 5000 },
                        { id: 2, name: 'Боржник 2', debt_amount: 7500 }
                    ],
                    count: 25
                }
            ];
            sqlRequest.mockResolvedValue(mockDebtData);

            // Act
            const result = await districtRepository.findDebtByFilter(
                filters, limit, offset, title, whereConditions, displayFields
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('from ower.v_ower_full o'),
                expect.arrayContaining([3, 'active', 10, 0])
            );
            expect(buildWhereCondition).toHaveBeenCalledWith(whereConditions, 'o');
            expect(result).toEqual(mockDebtData);
        });

        it('should find debts by village filter', async () => {
            // Arrange
            const filters = {
                districtId: 2,
                districtName: null,
                villageId: 105,
                villageName: null
            };
            const limit = 15;
            const offset = 30;
            const title = 'Петренко';
            const whereConditions = {};
            const displayFields = ['id', 'name'];

            buildWhereCondition.mockReturnValue({
                text: '',
                value: []
            });

            const mockDebtData = [{ data: [], count: 0 }];
            sqlRequest.mockResolvedValue(mockDebtData);

            // Act
            const result = await districtRepository.findDebtByFilter(
                filters, limit, offset, title, whereConditions, displayFields
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('exists'),
                expect.arrayContaining([2, 105, '%Петренко%', 15, 30])
            );
            expect(result).toEqual(mockDebtData);
        });

        it('should handle search by name', async () => {
            // Arrange
            const filters = { districtId: null, districtName: 'Центральний', villageId: null, villageName: null };
            const title = 'Іван';
            const whereConditions = {};
            const displayFields = ['name'];

            buildWhereCondition.mockReturnValue({ text: '', value: [] });
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await districtRepository.findDebtByFilter(filters, 10, 0, title, whereConditions, displayFields);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('o.name ILIKE ?'),
                expect.arrayContaining(['Центральний', '%Іван%'])
            );
        });
    });

    describe('🗺️ getAllDistrictsForMapping', () => {
        it('should return districts formatted for mapping', async () => {
            // Arrange
            const mockMappingData = [
                { id: 1, name: 'Центральний' },
                { id: 2, name: 'Північний' }
            ];
            sqlRequest.mockResolvedValue(mockMappingData);

            // Act
            const result = await districtRepository.getAllDistrictsForMapping();

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            // Перевіряємо що SQL містить потрібні елементи
            const calledSQL = sqlRequest.mock.calls[0][0];
            expect(calledSQL).toContain('SELECT id, name');
            expect(calledSQL).toContain('FROM ower.districts');
            expect(calledSQL).toContain('WHERE active = true');
            expect(calledSQL).toContain('ORDER BY name');
            expect(result).toEqual(mockMappingData);
        });
    });

    describe('🏘️ getAllVillagesForMapping', () => {
        it('should return villages formatted for mapping', async () => {
            // Arrange
            const mockVillagesMapping = [
                { id: 101, name: 'Село А', district_id: 1 },
                { id: 102, name: 'Село Б', district_id: 1 }
            ];
            sqlRequest.mockResolvedValue(mockVillagesMapping);

            // Act
            const result = await districtRepository.getAllVillagesForMapping();

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            // Перевіряємо що SQL містить потрібні елементи  
            const calledSQL = sqlRequest.mock.calls[0][0];
            expect(calledSQL).toContain('SELECT id, name, district_id');
            expect(calledSQL).toContain('FROM ower.villages');
            expect(calledSQL).toContain('WHERE active = true');
            expect(calledSQL).toContain('ORDER BY name');
            expect(result).toEqual(mockVillagesMapping);
        });
    });

    describe('📄 getRequisite', () => {
        it('should return requisite settings', async () => {
            // Arrange
            const mockRequisites = [
                { key: 'bank_name', value: 'ПриватБанк' },
                { key: 'account_number', value: '26001234567890' }
            ];
            sqlRequest.mockResolvedValue(mockRequisites);

            // Act
            const result = await districtRepository.getRequisite();

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith('select * from ower.settings');
            expect(result).toEqual(mockRequisites);
        });
    });

    describe('📍 checkLocationExists', () => {
        it('should return true when location exists', async () => {
            // Arrange
            const name = 'Локація Тест';
            const identification = 'ID123456';
            sqlRequest.mockResolvedValue([{ id: 1 }]);

            // Act
            const result = await districtRepository.checkLocationExists(name, identification);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM ower.ower_location'),
                [name, identification]
            );
            expect(result).toBe(true);
        });

        it('should return false when location does not exist', async () => {
            // Arrange
            const name = 'Неіснуюча локація';
            const identification = 'ID999';
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await districtRepository.checkLocationExists(name, identification);

            // Assert
            expect(result).toBe(false);
        });

        it('should exclude specific ID when provided', async () => {
            // Arrange
            const name = 'Локація';
            const identification = 'ID123';
            const excludeId = 5;
            sqlRequest.mockResolvedValue([]);

            // Act
            await districtRepository.checkLocationExists(name, identification, excludeId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('AND id != ?'),
                [name, identification, excludeId]
            );
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            const mockError = new Error('Database error');
            sqlRequest.mockRejectedValue(mockError);
            
            // Тимчасово приховуємо console.error для цього тесту
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Act & Assert
            await expect(districtRepository.checkLocationExists('test', 'test')).rejects.toThrow('Database error');
            
            // Відновлюємо console.error
            console.error = originalConsoleError;
        });
    });

    describe('🗑️ bulkDeleteLocations', () => {
        it('should delete multiple locations and return count', async () => {
            // Arrange
            const locationIds = [1, 2, 3, 4, 5];
            const mockDeleteResult = [
                { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
            ];
            sqlRequest.mockResolvedValue(mockDeleteResult);

            // Act
            const result = await districtRepository.bulkDeleteLocations(locationIds);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                'DELETE FROM ower.ower_location WHERE id IN (?,?,?,?,?) RETURNING id',
                locationIds
            );
            expect(result).toBe(5);
        });

        it('should return 0 when no IDs provided', async () => {
            // Act
            const result1 = await districtRepository.bulkDeleteLocations([]);
            const result2 = await districtRepository.bulkDeleteLocations(null);

            // Assert
            expect(result1).toBe(0);
            expect(result2).toBe(0);
            expect(sqlRequest).not.toHaveBeenCalled();
        });

        it('should handle deletion errors', async () => {
            // Arrange
            const locationIds = [1, 2];
            const mockError = new Error('Delete failed');
            sqlRequest.mockRejectedValue(mockError);

            // Тимчасово приховуємо console.error для цього тесту
            const originalConsoleError = console.error;
            console.error = jest.fn();

            // Act & Assert
            await expect(districtRepository.bulkDeleteLocations(locationIds)).rejects.toThrow('Delete failed');
            
            // Відновлюємо console.error
            console.error = originalConsoleError;
        });
    });

    describe('📊 Edge Cases & Error Handling', () => {
        it('should handle SQL injection attempts', async () => {
            // Arrange
            const maliciousTitle = "'; DROP TABLE ower.ower; --";
            const filters = { districtId: 1, districtName: null, villageId: null, villageName: null };
            
            buildWhereCondition.mockReturnValue({ text: '', value: [] });
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await districtRepository.findDebtByFilter(filters, 10, 0, maliciousTitle, {}, ['id']);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([`%${maliciousTitle}%`])
            );
        });

        it('should handle special characters in search', async () => {
            // Arrange
            const specialTitle = "Тест + & % _ test";
            const filters = { districtId: 1, districtName: null, villageId: null, villageName: null };
            
            buildWhereCondition.mockReturnValue({ text: '', value: [] });
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await districtRepository.findDebtByFilter(filters, 10, 0, specialTitle, {}, ['id']);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([1, `%${specialTitle}%`, 10, 0])
            );
        });
    });

    describe('🔬 Integration-like Tests', () => {
        it('should handle complex filter combination', async () => {
            // Arrange
            const complexFilters = {
                districtId: 3,
                districtName: null,
                villageId: 105,
                villageName: null
            };
            const complexWhereConditions = {
                status: 'active',
                debt_amount: '>1000'
            };
            
            buildWhereCondition.mockReturnValue({
                text: ' and o.status = ? and o.debt_amount > ?',
                value: ['active', '1000']
            });
            
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await districtRepository.findDebtByFilter(
                complexFilters, 20, 40, 'Іванов', complexWhereConditions, ['id', 'name']
            );

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('exists'),
                expect.arrayContaining([3, 105, 'active', '1000', '%Іванов%', 20, 40])
            );
        });
    });
});