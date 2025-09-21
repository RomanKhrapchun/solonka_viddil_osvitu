const CnapRepository = require('../../../modules/cnap/repository/cnap.repository');
const { sqlRequest } = require('../../../helpers/database');

// Мокаємо базу даних
jest.mock('../../../helpers/database', () => ({
    sqlRequest: jest.fn()
}));

// Мокаємо логер
jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

describe('CnapRepository Unit Tests', () => {
    let cnapRepository;

    beforeEach(() => {
        // Очищуємо моки перед кожним тестом
        jest.clearAllMocks();
        
        // Отримуємо інстанс репозиторія
        cnapRepository = CnapRepository;
    });

    describe('🏢 Services Management', () => {
        describe('📋 getServices', () => {
            it('should return services with pagination and search', async () => {
                // Arrange
                const filter = { page: 1, limit: 10, search: 'послуга' };
                const mockServices = [
                    { id: 1, identifier: 'SRV001', name: 'Тестова послуга', price: 100.50 },
                    { id: 2, identifier: 'SRV002', name: 'Друга послуга', price: 200.00 }
                ];
                const mockCount = [{ total: 25 }];
                sqlRequest.mockResolvedValueOnce(mockServices).mockResolvedValueOnce(mockCount);

                // Act
                const result = await cnapRepository.getServices(filter);

                // Assert
                expect(sqlRequest).toHaveBeenCalledTimes(2);
                
                // Перевіряємо основний запит
                const [servicesSQL, servicesParams] = sqlRequest.mock.calls[0];
                expect(servicesSQL).toContain('SELECT');
                expect(servicesSQL).toContain('FROM admin.cnap_services s');
                expect(servicesSQL).toContain("AND (s.name ILIKE '%послуга%' OR s.identifier ILIKE '%послуга%')");
                expect(servicesSQL).toContain('AND s.enabled = true');
                expect(servicesSQL).toContain('ORDER BY s.create_date DESC');
                expect(servicesSQL).toContain('LIMIT $1 OFFSET $2');
                expect(servicesParams).toEqual([10, 0]);

                // Перевіряємо запит підрахунку
                const [countSQL] = sqlRequest.mock.calls[1];
                expect(countSQL).toContain('SELECT COUNT(*) as total');
                expect(countSQL).toContain('FROM admin.cnap_services s');

                expect(result).toEqual({
                    items: mockServices,
                    totalItems: 25
                });
            });

            it('should return services without search filter', async () => {
                // Arrange
                const filter = { page: 2, limit: 5 };
                sqlRequest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

                // Act
                await cnapRepository.getServices(filter);

                // Assert
                const [servicesSQL, servicesParams] = sqlRequest.mock.calls[0];
                expect(servicesSQL).not.toContain('ILIKE');
                expect(servicesParams).toEqual([5, 5]); // offset = (2-1) * 5 = 5
            });
        });

        describe('🤝 getServicesWithExecutors', () => {
            it('should return services with executor information', async () => {
                // Arrange
                const mockServicesWithExecutors = [
                    { id: 1, name: 'Послуга 1', executor_id: 1, executor_name: 'Надавач А' },
                    { id: 2, name: 'Послуга 2', executor_id: null, executor_name: null }
                ];
                sqlRequest.mockResolvedValue(mockServicesWithExecutors);

                // Act
                const result = await cnapRepository.getServicesWithExecutors();

                // Assert
                expect(sqlRequest).toHaveBeenCalledTimes(1);
                const [calledSQL] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('FROM admin.cnap_services s');
                expect(calledSQL).toContain('LEFT JOIN admin.cnap_executors e ON s.executor_id = e.id');
                expect(calledSQL).toContain('WHERE s.enabled = true');
                expect(calledSQL).toContain('ORDER BY');
                expect(calledSQL).toContain('CASE WHEN e.name IS NULL THEN 1 ELSE 0 END');
                expect(result).toEqual({ items: mockServicesWithExecutors });
            });
        });

        describe('🔍 getServiceById', () => {
            it('should return service by ID', async () => {
                // Arrange
                const serviceId = 123;
                const mockService = {
                    id: 123,
                    identifier: 'SRV123',
                    name: 'Тестова послуга',
                    price: 150.75,
                    edrpou: '12345678',
                    iban: 'UA123456789',
                    create_date: '2024-08-11T10:00:00Z'
                };
                sqlRequest.mockResolvedValue([mockService]);

                // Act
                const result = await cnapRepository.getServiceById(serviceId);

                // Assert
                expect(sqlRequest).toHaveBeenCalledTimes(1);
                expect(sqlRequest).toHaveBeenCalledWith(
                    expect.stringContaining('SELECT id, identifier, name, price, edrpou, iban, create_date'),
                    [serviceId]
                );
                expect(result).toEqual(mockService);
            });

            it('should return undefined when service not found', async () => {
                // Arrange
                sqlRequest.mockResolvedValue([]);

                // Act
                const result = await cnapRepository.getServiceById(999);

                // Assert
                expect(result).toBeUndefined();
            });
        });

        describe('🔎 getServiceByIdentifier', () => {
            it('should return service by identifier', async () => {
                // Arrange
                const identifier = 'SRV001';
                const mockService = { id: 1, identifier: 'SRV001', name: 'Послуга' };
                sqlRequest.mockResolvedValue([mockService]);

                // Act
                const result = await cnapRepository.getServiceByIdentifier(identifier);

                // Assert
                expect(sqlRequest).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE identifier = $1'),
                    [identifier]
                );
                expect(result).toEqual(mockService);
            });
        });

        describe('➕ createService', () => {
            it('should create new service successfully', async () => {
                // Arrange
                const queryData = {
                    query: 'INSERT INTO admin.cnap_services (identifier, name, price) VALUES ($1, $2, $3) RETURNING id, identifier, name',
                    values: ['SRV001', 'Нова послуга', 100.00]
                };
                const mockResult = [{ id: 101, identifier: 'SRV001', name: 'Нова послуга' }];
                sqlRequest.mockResolvedValue(mockResult);

                // Act
                const result = await cnapRepository.createService(queryData);

                // Assert
                expect(sqlRequest).toHaveBeenCalledWith(queryData.query, queryData.values);
                expect(result).toEqual(mockResult[0]);
            });

            it('should handle unique constraint violation', async () => {
                // Arrange
                const queryData = {
                    query: 'INSERT INTO admin.cnap_services (identifier) VALUES ($1)',
                    values: ['DUPLICATE']
                };
                const uniqueError = new Error('duplicate key value');
                uniqueError.code = '23505';
                sqlRequest.mockRejectedValue(uniqueError);

                // Act & Assert
                await expect(cnapRepository.createService(queryData)).rejects.toThrow('Послуга з таким ідентифікатором вже існує');
            });

            it('should handle empty result from insert', async () => {
                // Arrange
                const queryData = { query: 'INSERT...', values: [] };
                sqlRequest.mockResolvedValue([]);

                // Act & Assert
                await expect(cnapRepository.createService(queryData)).rejects.toThrow('Помилка при створенні послуги');
            });
        });

        describe('✏️ updateService', () => {
            it('should update service successfully', async () => {
                // Arrange
                const serviceId = 5;
                const serviceData = {
                    identifier: 'UPD001',
                    name: 'Оновлена послуга',
                    price: 250.00,
                    edrpou: '87654321',
                    iban: 'UA987654321'
                };
                const mockUpdated = { id: 5, ...serviceData, update_date: '2024-08-11T12:00:00Z' };
                sqlRequest.mockResolvedValue([mockUpdated]);

                // Act
                const result = await cnapRepository.updateService(serviceId, serviceData);

                // Assert
                const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('UPDATE admin.cnap_services');
                expect(calledSQL).toContain('SET identifier = $1');
                expect(calledSQL).toContain('WHERE id = $6');
                expect(calledParams).toEqual([serviceData.identifier, serviceData.name, serviceData.price, serviceData.edrpou, serviceData.iban, serviceId]);
                expect(result).toEqual(mockUpdated);
            });

            it('should throw error when service not found for update', async () => {
                // Arrange
                sqlRequest.mockResolvedValue([]);

                // Act & Assert
                await expect(cnapRepository.updateService(999, {})).rejects.toThrow('Service not found');
            });
        });

        describe('❌ deleteService', () => {
            it('should soft delete service', async () => {
                // Arrange
                const serviceId = 10;
                const mockResult = [{ id: 10 }];
                sqlRequest.mockResolvedValue(mockResult);

                // Act
                const result = await cnapRepository.deleteService(serviceId);

                // Assert
                const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('UPDATE admin.cnap_services');
                expect(calledSQL).toContain('SET enabled = false');
                expect(calledSQL).toContain('WHERE id = $1');
                expect(calledParams).toEqual([serviceId]);
                expect(result).toEqual(mockResult[0]);
            });

            it('should throw error when service not found for deletion', async () => {
                // Arrange
                sqlRequest.mockResolvedValue([]);

                // Act & Assert
                await expect(cnapRepository.deleteService(999)).rejects.toThrow('Service not found');
            });
        });
    });

    describe('👥 Executors Management', () => {
        describe('📋 getExecutors', () => {
            it('should return executors with services count', async () => {
                // Arrange
                const mockExecutors = [
                    { id: 1, name: 'Надавач А', services_count: 5 },
                    { id: 2, name: 'Надавач Б', services_count: 0 }
                ];
                sqlRequest.mockResolvedValue(mockExecutors);

                // Act
                const result = await cnapRepository.getExecutors();

                // Assert
                expect(sqlRequest).toHaveBeenCalledTimes(1);
                const [calledSQL] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('FROM admin.cnap_executors e');
                expect(calledSQL).toContain('LEFT JOIN admin.cnap_services s ON e.id = s.executor_id');
                expect(calledSQL).toContain('COUNT(s.id) as services_count');
                expect(calledSQL).toContain('GROUP BY e.id, e.name');
                expect(calledSQL).toContain('ORDER BY e.name ASC');
                expect(result).toEqual({ items: mockExecutors });
            });
        });

        describe('➕ createExecutor', () => {
            it('should create new executor', async () => {
                // Arrange
                const executorData = { name: 'Новий Надавач' };
                const mockResult = [{ id: 20, name: 'Новий Надавач' }];
                sqlRequest.mockResolvedValue(mockResult);

                // Act
                const result = await cnapRepository.createExecutor(executorData);

                // Assert
                expect(sqlRequest).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT INTO admin.cnap_executors (name)'),
                    [executorData.name]
                );
                expect(result).toEqual(mockResult[0]);
            });
        });

        describe('✏️ updateExecutor', () => {
            it('should update executor name', async () => {
                // Arrange
                const executorId = 3;
                const executorData = { name: 'Оновлений Надавач' };
                const mockResult = [{ id: 3, name: 'Оновлений Надавач' }];
                sqlRequest.mockResolvedValue(mockResult);

                // Act
                const result = await cnapRepository.updateExecutor(executorId, executorData);

                // Assert
                const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('UPDATE admin.cnap_executors');
                expect(calledSQL).toContain('SET name = $1');
                expect(calledSQL).toContain('WHERE id = $2');
                expect(calledParams).toEqual([executorData.name, executorId]);
                expect(result).toEqual(mockResult[0]);
            });
        });

        describe('❌ deleteExecutor', () => {
            it('should delete executor when no linked services', async () => {
                // Arrange
                const executorId = 5;
                sqlRequest.mockResolvedValueOnce([{ count: 0 }]); // check services count
                sqlRequest.mockResolvedValueOnce([{ id: 5, name: 'Видалений Надавач' }]); // delete

                // Act
                const result = await cnapRepository.deleteExecutor(executorId);

                // Assert
                expect(sqlRequest).toHaveBeenCalledTimes(2);
                
                // Перевіряємо запит підрахунку
                const [checkSQL, checkParams] = sqlRequest.mock.calls[0];
                expect(checkSQL).toContain('SELECT COUNT(*) as count');
                expect(checkSQL).toContain('FROM admin.cnap_services');
                expect(checkSQL).toContain('WHERE executor_id = $1');
                expect(checkParams).toEqual([executorId]);

                // Перевіряємо запит видалення
                const [deleteSQL, deleteParams] = sqlRequest.mock.calls[1];
                expect(deleteSQL).toContain('DELETE FROM admin.cnap_executors');
                expect(deleteSQL).toContain('WHERE id = $1');
                expect(deleteSQL).toContain('RETURNING id, name');
                expect(deleteParams).toEqual([executorId]);
                
                expect(result).toEqual({ id: 5, name: 'Видалений Надавач' });
            });

            it('should throw error when executor has linked services', async () => {
                // Arrange
                const executorId = 1;
                sqlRequest.mockResolvedValue([{ count: 3 }]);

                // Act & Assert
                await expect(cnapRepository.deleteExecutor(executorId)).rejects.toThrow('Cannot delete executor. There are 3 services linked to this executor.');
            });
        });

        describe('🔗 updateServiceExecutor', () => {
            it('should update service executor relationship', async () => {
                // Arrange
                const serviceId = 10;
                const executorId = 5;
                const mockResult = [{ id: 10, name: 'Послуга', executor_id: 5 }];
                sqlRequest.mockResolvedValue(mockResult);

                // Act
                const result = await cnapRepository.updateServiceExecutor(serviceId, executorId);

                // Assert
                const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('UPDATE admin.cnap_services');
                expect(calledSQL).toContain('SET executor_id = $1');
                expect(calledSQL).toContain('WHERE id = $2');
                expect(calledParams).toEqual([executorId, serviceId]);
                expect(result).toEqual(mockResult[0]);
            });

            it('should set executor to null', async () => {
                // Arrange
                const serviceId = 10;
                const executorId = null;
                sqlRequest.mockResolvedValue([{ id: 10, name: 'Послуга', executor_id: null }]);

                // Act
                await cnapRepository.updateServiceExecutor(serviceId, executorId);

                // Assert
                const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
                expect(calledParams).toEqual([null, serviceId]);
            });
        });
    });

    describe('💳 Accounts Management', () => {
        describe('📋 getAccounts', () => {
            it('should return accounts with pagination', async () => {
                // Arrange
                const filter = { page: 1, limit: 20 };
                const mockAccounts = [
                    { id: 1, account_number: 'ACC001', payer: 'Тест Платник', amount: 500.00 }
                ];
                const mockCount = [{ total: 50 }];
                sqlRequest.mockResolvedValueOnce(mockAccounts).mockResolvedValueOnce(mockCount);

                // Act
                const result = await cnapRepository.getAccounts(filter);

                // Assert
                expect(sqlRequest).toHaveBeenCalledTimes(2);
                expect(result).toEqual({
                    items: mockAccounts,
                    totalItems: 50
                });
            });
        });

        describe('🔍 getAccountById', () => {
            it('should return account by ID', async () => {
                // Arrange
                const accountId = 100;
                const mockAccount = {
                    id: 100,
                    account_number: 'ACC100',
                    payer: 'Тестовий платник',
                    amount: 300.00
                };
                sqlRequest.mockResolvedValue([mockAccount]);

                // Act
                const result = await cnapRepository.getAccountById(accountId);

                // Assert
                const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('FROM admin.cnap_accounts a');
                expect(calledSQL).toContain('JOIN admin.cnap_services s');
                expect(calledSQL).toContain('WHERE a.id = $1');
                expect(calledParams).toEqual([accountId]);
                expect(result).toEqual(mockAccount);
            });
        });

        describe('🔢 getAccountByNumber', () => {
            it('should return account by account number', async () => {
                // Arrange
                const accountNumber = 'ACC12345';
                const mockAccount = {
                    id: 50,
                    account_number: 'ACC12345',
                    service_name: 'Тестова послуга'
                };
                sqlRequest.mockResolvedValue([mockAccount]);

                // Act
                const result = await cnapRepository.getAccountByNumber(accountNumber);

                // Assert
                expect(sqlRequest).toHaveBeenCalledWith(
                    expect.stringContaining('WHERE a.account_number = $1'),
                    [accountNumber]
                );
                expect(result).toEqual(mockAccount);
            });
        });

        describe('➕ createAccount', () => {
            it('should create new account', async () => {
                // Arrange
                const accountData = {
                    account_number: 'NEW001',
                    service_code: 'SRV001',
                    administrator: 'Admin User',
                    payer: 'Test Payer',
                    amount: 250.50,
                    time: '14:30:00'
                };
                const mockResult = [{
                    id: 200,
                    account_number: 'NEW001',
                    service_id: 'SRV001',
                    administrator: 'Admin User',
                    payer: 'Test Payer',
                    amount: 250.50,
                    create_date: '2024-08-11T14:30:00Z'
                }];
                sqlRequest.mockResolvedValue(mockResult);

                // Act
                const result = await cnapRepository.createAccount(accountData);

                // Assert
                expect(sqlRequest).toHaveBeenCalledWith(
                    expect.stringContaining('INSERT INTO admin.cnap_accounts'),
                    [accountData.account_number, accountData.service_code, accountData.administrator, accountData.payer, accountData.amount, accountData.time]
                );
                const [calledSQL] = sqlRequest.mock.calls[0];
                expect(calledSQL).toContain('CURRENT_DATE');
                expect(calledSQL).toContain('$6::time');
                expect(calledSQL).toContain('$5::decimal');
                expect(result).toEqual(mockResult[0]);
            });
        });
    });

    describe('📊 Edge Cases & Error Handling', () => {
        it('should handle database connection errors', async () => {
            // Arrange
            const dbError = new Error('Connection timeout');
            sqlRequest.mockRejectedValue(dbError);

            // Act & Assert
            await expect(cnapRepository.getServices({ page: 1, limit: 10 })).rejects.toThrow('Connection timeout');
        });

        it('should handle malformed search input', async () => {
            // Arrange
            const maliciousFilter = { page: 1, limit: 10, search: "'; DROP TABLE admin.cnap_services; --" };
            sqlRequest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

            // Act
            await cnapRepository.getServices(maliciousFilter);

            // Assert
            const [calledSQL] = sqlRequest.mock.calls[0];
            // SQL injection спроба повинна бути екранована в запиті
            expect(calledSQL).toContain("'; DROP TABLE admin.cnap_services; --");
        });

        it('should handle large pagination values', async () => {
            // Arrange
            const largeFilter = { page: 999999, limit: 1000 };
            sqlRequest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

            // Act
            await cnapRepository.getServices(largeFilter);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams[0]).toBe(1000); // limit
            expect(calledParams[1]).toBe(999998000); // offset = (999999-1) * 1000
        });

        it('should handle special characters in executor names', async () => {
            // Arrange
            const specialExecutorData = { name: "Надавач з спец символами: @#$%^&*()" };
            sqlRequest.mockResolvedValue([{ id: 1, name: specialExecutorData.name }]);

            // Act
            const result = await cnapRepository.createExecutor(specialExecutorData);

            // Assert
            expect(result.name).toBe(specialExecutorData.name);
        });
    });

    describe('🔬 Integration-like Tests', () => {
        it('should handle complete service lifecycle', async () => {
            // Arrange
            const serviceData = {
                query: 'INSERT INTO admin.cnap_services (identifier, name, price) VALUES ($1, $2, $3) RETURNING id',
                values: ['LIFECYCLE001', 'Lifecycle Test', 100.00]
            };
            const updateData = { identifier: 'LIFECYCLE001', name: 'Updated Service', price: 150.00, edrpou: '12345678', iban: 'UA123' };

            sqlRequest.mockResolvedValueOnce([{ id: 300 }]); // create
            sqlRequest.mockResolvedValueOnce([{ id: 300, ...updateData }]); // update
            sqlRequest.mockResolvedValueOnce([{ id: 300 }]); // delete

            // Act
            const created = await cnapRepository.createService(serviceData);
            const updated = await cnapRepository.updateService(300, updateData);
            const deleted = await cnapRepository.deleteService(300);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(3);
            expect(created.id).toBe(300);
            expect(updated.name).toBe('Updated Service');
            expect(deleted.id).toBe(300);
        });

        it('should handle executor with service dependencies', async () => {
            // Arrange
            const executorData = { name: 'Test Executor' };
            
            // Create executor
            sqlRequest.mockResolvedValueOnce([{ id: 100, name: 'Test Executor' }]);
            // Update service to use executor
            sqlRequest.mockResolvedValueOnce([{ id: 1, name: 'Service', executor_id: 100 }]);
            // Try to delete executor (should fail)
            sqlRequest.mockResolvedValueOnce([{ count: 1 }]);

            // Act
            const executor = await cnapRepository.createExecutor(executorData);
            const updatedService = await cnapRepository.updateServiceExecutor(1, 100);
            
            // Assert - should throw when trying to delete
            await expect(cnapRepository.deleteExecutor(100)).rejects.toThrow('Cannot delete executor');
            
            expect(executor.id).toBe(100);
            expect(updatedService.executor_id).toBe(100);
        });

        it('should handle accounts with service relationships', async () => {
            // Arrange
            const accountData = {
                account_number: 'COMPLEX001',
                service_code: 'SRV001',
                administrator: 'Test Admin',
                payer: 'Test Payer',
                amount: 999.99,
                time: '15:45:00'
            };

            sqlRequest.mockResolvedValueOnce([{
                id: 500,
                account_number: 'COMPLEX001',
                service_id: 'SRV001',
                administrator: 'Test Admin',
                payer: 'Test Payer',
                amount: 999.99
            }]);

            sqlRequest.mockResolvedValueOnce([{
                id: 500,
                account_number: 'COMPLEX001',
                service_name: 'Test Service'
            }]);

            // Act
            const created = await cnapRepository.createAccount(accountData);
            const retrieved = await cnapRepository.getAccountByNumber('COMPLEX001');

            // Assert
            expect(created.id).toBe(500);
            expect(retrieved.service_name).toBe('Test Service');
        });
    });
});