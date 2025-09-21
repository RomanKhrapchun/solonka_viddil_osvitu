const LogRepository = require('../../../modules/log/repository/log-repository');
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

describe('LogRepository Unit Tests', () => {
    let logRepository;

    beforeEach(() => {
        // Очищуємо моки перед кожним тестом
        jest.clearAllMocks();
        
        // Отримуємо інстанс репозиторія
        logRepository = LogRepository;
    });

    describe('📋 allLogs', () => {
        it('should return logs with pagination (DESC order)', async () => {
            // Arrange
            const itemsLength = 10;
            const cursor = null;
            const sort = 'DESC';
            const whereConditions = {};
            const mockLogsData = [
                { id: 1, schema_name: 'ower', table_name: 'ower', action: 'SELECT', username: 'admin' },
                { id: 2, schema_name: 'admin', table_name: 'users', action: 'UPDATE', username: 'user1' }
            ];
            sqlRequest.mockResolvedValue(mockLogsData);

            // Act
            const result = await logRepository.allLogs(itemsLength, cursor, sort, whereConditions);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('SELECT logger.id, schema_name, table_name, action, row_pk_id, action_stamp_tx, users.username');
            expect(calledSQL).toContain('FROM log.logger');
            expect(calledSQL).toContain('left join admin.users on users_id = logger.uid');
            expect(calledSQL).toContain('ORDER BY logger.id DESC');
            expect(calledSQL).toContain('LIMIT 11');
            expect(result).toEqual(mockLogsData);
        });

        it('should return logs with cursor pagination (ASC order)', async () => {
            // Arrange
            const itemsLength = 5;
            const cursor = 100;
            const sort = 'ASC';
            const whereConditions = {};
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(itemsLength, cursor, sort, whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('and logger.id  > ?');
            expect(calledSQL).toContain('ORDER BY logger.id ASC');
            expect(calledParams).toContain(cursor);
        });

        it('should apply where conditions for single UID', async () => {
            // Arrange
            const whereConditions = { uid: '123' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('and logger.uid = ?');
            expect(calledParams).toContain('123');
        });

        it('should apply where conditions for multiple UIDs', async () => {
            // Arrange
            const whereConditions = { uid: '123,456,789' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('logger.uid = any (array[?::text[]])');
            expect(calledParams).toContainEqual(['123', '456', '789']);
        });

        it('should apply date range conditions', async () => {
            // Arrange
            const whereConditions = { action_stamp_tx: '2024-01-01_2024-12-31' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('action_stamp_tx BETWEEN ? AND ?');
            expect(calledParams).toContain('2024-01-01');
            expect(calledParams).toContain('2024-12-31');
        });

        it('should apply access group conditions', async () => {
            // Arrange
            const whereConditions = { access_group_id: '5' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('access_group.id = ?');
            expect(calledParams).toContain('5');
        });
    });

    describe('🔍 findLogById', () => {
        it('should return specific log by ID', async () => {
            // Arrange
            const logId = 123;
            const displayFields = ['id', 'schema_name', 'action', 'action_stamp_tx'];
            const mockLogData = [
                { id: 123, schema_name: 'ower', action: 'SELECT', action_stamp_tx: '2024-08-11T10:00:00Z' }
            ];
            sqlRequest.mockResolvedValue(mockLogData);

            // Act
            const result = await logRepository.findLogById(logId, displayFields);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                'select  id,  schema_name,  action,  action_stamp_tx from log.logger where id = ?',
                [logId]
            );
            expect(result).toEqual(mockLogData);
        });

        it('should return empty array when log not found', async () => {
            // Arrange
            const logId = 999;
            const displayFields = ['id', 'action'];
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await logRepository.findLogById(logId, displayFields);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('🔒 allSecureLog', () => {
        it('should return secure logs with proper joins', async () => {
            // Arrange
            const itemsLength = 10;
            const cursor = null;
            const sort = 'DESC';
            const whereConditions = {};
            const mockSecureData = [
                { id: 1, ip: '192.168.1.1', description: 'Login attempt', action: 'LOGIN', username: 'admin' }
            ];
            sqlRequest.mockResolvedValue(mockSecureData);

            // Act
            const result = await logRepository.allSecureLog(itemsLength, cursor, sort, whereConditions);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('SELECT secure.id, secure.ip, description, action, hostname, user_agent, details, date_add, users.username');
            expect(calledSQL).toContain('FROM log.secure');
            expect(calledSQL).toContain('left join admin.users on users.users_id = secure.uid');
            expect(result).toEqual(mockSecureData);
        });

        it('should apply secure log filters for multiple values', async () => {
            // Arrange
            const whereConditions = { action: 'LOGIN,LOGOUT,FAILED_LOGIN' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allSecureLog(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('action = any (array[?::text[]])');
            expect(calledParams).toContainEqual(['LOGIN', 'LOGOUT', 'FAILED_LOGIN']);
        });
    });

    describe('📝 createLog', () => {
        it('should create new log entry', async () => {
            // Arrange
            const logData = {
                row_pk_id: 12345,
                uid: 10,
                action: 'SEARCH',
                client_addr: '192.168.1.100',
                application_name: 'Пошук боржника',
                action_stamp_tx: new Date('2024-08-11T10:00:00Z'),
                action_stamp_stm: new Date('2024-08-11T10:00:00Z'),
                action_stamp_clk: new Date('2024-08-11T10:00:00Z'),
                schema_name: 'ower',
                table_name: 'ower',
                oid: '16504'
            };
            const mockResult = [{ id: 1001 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await logRepository.createLog(logData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('INSERT INTO log.logger');
            expect(calledSQL).toContain('row_pk_id, uid, action, client_addr, application_name, action_stamp_tx, action_stamp_stm, action_stamp_clk, schema_name, table_name, oid');
            expect(calledSQL).toContain('RETURNING id');
            expect(calledParams).toEqual(Object.values(logData));
            expect(result).toEqual(mockResult);
        });

        it('should create minimal log entry', async () => {
            // Arrange
            const minimalLogData = {
                uid: 5,
                action: 'UPDATE',
                schema_name: 'admin',
                table_name: 'users'
            };
            const mockResult = [{ id: 1002 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await logRepository.createLog(minimalLogData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO log.logger'),
                Object.values(minimalLogData)
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('🚫 removeFromBlacklistIP', () => {
        it('should remove IP from blacklist', async () => {
            // Arrange
            const blacklistId = 15;
            const mockResult = [{ id: 15 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await logRepository.removeFromBlacklistIP(blacklistId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                'DELETE FROM admin.black_list WHERE id=? RETURNING id',
                [blacklistId]
            );
            expect(result).toEqual(mockResult);
        });

        it('should return empty array when blacklist entry not found', async () => {
            // Arrange
            const blacklistId = 999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await logRepository.removeFromBlacklistIP(blacklistId);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('🔄 updateDeleteRecord', () => {
        it('should update delete record with new UID', async () => {
            // Arrange
            const newUid = 25;
            const recordId = 5000;
            const mockResult = [{ id: 789 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await logRepository.updateDeleteRecord(newUid, recordId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                'UPDATE log.logger SET uid=? WHERE row_pk_id=? and action=\'DELETE\' RETURNING id',
                [newUid, recordId]
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('📊 detailedLog', () => {
        it('should return detailed log statistics with default filters', async () => {
            // Arrange
            const limit = 20;
            const offset = 0;
            const whereConditions = {};
            const mockDetailedData = [
                {
                    data: [
                        {
                            group: 'Адміністратори',
                            username: 'admin',
                            fullName: 'Іван Петров',
                            year: 2024,
                            month_name: 'Серпень',
                            print_count: 5,
                            generate_count: 3,
                            search_count: 15
                        }
                    ],
                    count: 1
                }
            ];
            sqlRequest.mockResolvedValue(mockDetailedData);

            // Act
            const result = await logRepository.detailedLog(limit, offset, whereConditions);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('json_agg(rw) as data');
            expect(calledSQL).toContain('FROM log.logger l');
            expect(calledSQL).toContain('LEFT JOIN admin.users u ON u.users_id = l.uid');
            expect(calledSQL).toContain('LEFT JOIN admin.access_group ag ON ag.id = u.access_group');
            expect(calledSQL).toContain('WHERE l.action IN (\'PRINT\', \'GENERATE_DOC\', \'SEARCH\')');
            expect(calledSQL).toContain('COUNT(*) FILTER (WHERE l.action = \'PRINT\')');
            expect(result).toEqual(mockDetailedData);
        });

        it('should apply date range filters in detailed log', async () => {
            // Arrange
            const whereConditions = {
                dateFrom: '2024-01-01',
                dateTo: '2024-12-31'
            };
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await logRepository.detailedLog(10, 0, whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('l.action_stamp_tx BETWEEN ?');
            expect(calledParams).toContain('2024-01-01');
            expect(calledParams).toContain('2024-12-31');
        });
    });

    describe('📊 Edge Cases & Error Handling', () => {
        it('should handle SQL injection in allLogs filters', async () => {
            // Arrange
            const maliciousInput = { schema_name: "'; DROP TABLE log.logger; --" };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, null, 'DESC', maliciousInput);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toContain("'; DROP TABLE log.logger; --");
            // SQL should use parameterized queries
            expect(calledSQL).toContain('schema_name = ?');
        });

        it('should handle empty display fields in findLogById', async () => {
            // Arrange
            const logId = 123;
            const displayFields = [];
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.findLogById(logId, displayFields);

            // Assert
            const [calledSQL] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('select  from log.logger where id = ?');
        });

        it('should handle database errors in createLog', async () => {
            // Arrange
            const logData = { uid: 1, action: 'TEST' };
            const mockError = new Error('Database constraint violation');
            sqlRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(logRepository.createLog(logData)).rejects.toThrow('Database constraint violation');
        });

        it('should handle large cursor values', async () => {
            // Arrange
            const largeCursor = Number.MAX_SAFE_INTEGER;
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, largeCursor, 'DESC', {});

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toContain(largeCursor);
        });

        it('should handle complex comma-separated values', async () => {
            // Arrange
            const whereConditions = { 
                uid: '1,2,3,4,5',
                action: 'SELECT,UPDATE,DELETE,INSERT'
            };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toContainEqual(['1', '2', '3', '4', '5']);
            expect(calledParams).toContainEqual(['SELECT', 'UPDATE', 'DELETE', 'INSERT']);
        });
    });

    describe('🔬 Integration-like Tests', () => {
        it('should handle complex log query with all filters', async () => {
            // Arrange
            const itemsLength = 50;
            const cursor = 1000;
            const sort = 'ASC';
            const complexWhereConditions = {
                uid: '10,20,30',
                access_group_id: '5',
                action_stamp_tx: '2024-08-01_2024-08-31',
                schema_name: 'ower,admin'
            };
            sqlRequest.mockResolvedValue([]);

            // Act
            await logRepository.allLogs(itemsLength, cursor, sort, complexWhereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('logger.uid = any (array[?::text[]])');
            expect(calledSQL).toContain('access_group.id = ?');
            expect(calledSQL).toContain('action_stamp_tx BETWEEN ? AND ?');
            expect(calledSQL).toContain('schema_name = any (array[?::text[]])');
            expect(calledSQL).toContain('and logger.id  > ?');
            expect(calledSQL).toContain('ORDER BY logger.id ASC');
            expect(calledSQL).toContain('LIMIT 51');
            
            expect(calledParams).toContainEqual(['10', '20', '30']);
            expect(calledParams).toContain('5');
            expect(calledParams).toContain('2024-08-01');
            expect(calledParams).toContain('2024-08-31');
            expect(calledParams).toContainEqual(['ower', 'admin']);
            expect(calledParams).toContain(1000);
        });

        it('should handle createLog with all possible fields', async () => {
            // Arrange
            const fullLogData = {
                row_pk_id: 12345,
                uid: 10,
                action: 'COMPLEX_OPERATION',
                client_addr: '192.168.1.100',
                application_name: 'Тестова система',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'test_schema',
                table_name: 'test_table',
                oid: '16504',
                details: 'Детальна інформація про операцію'
            };
            const mockResult = [{ id: 9999 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await logRepository.createLog(fullLogData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO log.logger'),
                Object.values(fullLogData)
            );
            expect(result).toEqual(mockResult);
        });
    });
});