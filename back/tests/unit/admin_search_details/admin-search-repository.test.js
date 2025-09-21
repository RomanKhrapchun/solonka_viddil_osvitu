const AdminSearchRepository = require('../../../modules/admin_search_details/repository/admin-search-repository');
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

describe('AdminSearchRepository Unit Tests', () => {
    let adminSearchRepository;

    beforeEach(() => {
        // Очищуємо моки перед кожним тестом
        jest.clearAllMocks();
        
        // Отримуємо інстанс репозиторія
        adminSearchRepository = AdminSearchRepository;
    });

    describe('📝 create', () => {
        it('should create new search record', async () => {
            // Arrange
            const searchData = {
                logger_id: 1001,
                username: 'admin',
                searched_person_name: 'Іван Петренко',
                searched_person_id: 12345,
                search_type: 'debt_search',
                search_result: 'found',
                payment_status: 'has_debt',
                created_at: new Date('2024-08-11T10:00:00Z')
            };
            const mockResult = [{ id: 500 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await adminSearchRepository.create(searchData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('INSERT INTO log.admin_search_details');
            expect(calledSQL).toContain('logger_id, username, searched_person_name, searched_person_id, search_type, search_result, payment_status, created_at');
            expect(calledSQL).toContain('RETURNING id');
            expect(calledParams).toEqual(Object.values(searchData));
            expect(result).toEqual(mockResult);
        });

        it('should create minimal search record', async () => {
            // Arrange
            const minimalData = {
                username: 'user1',
                searched_person_name: 'Тест'
            };
            const mockResult = [{ id: 501 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await adminSearchRepository.create(minimalData);

            // Assert
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO log.admin_search_details'),
                Object.values(minimalData)
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('📋 getAllSearches', () => {
        beforeEach(() => {
            buildWhereCondition.mockReturnValue({
                text: ' and asd.search_type = ?',
                value: ['debt_search']
            });
        });

        it('should return searches with pagination and default fields', async () => {
            // Arrange
            const limit = 20;
            const offset = 0;
            const whereConditions = { search_type: 'debt_search' };
            const mockSearchData = [
                {
                    data: [
                        {
                            id: 1,
                            searched_person_name: 'Іван Петренко',
                            username: 'admin',
                            admin_full_name: 'Адміністратор Системи'
                        }
                    ],
                    count: 1
                }
            ];
            sqlRequest.mockResolvedValue(mockSearchData);

            // Act
            const result = await adminSearchRepository.getAllSearches(limit, offset, whereConditions);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('json_agg(rw) as data');
            expect(calledSQL).toContain('from log.admin_search_details asd');
            expect(calledSQL).toContain('left join log.logger l on l.id = asd.logger_id');
            expect(calledSQL).toContain('left join admin.users au on au.id = l.uid');
            expect(calledSQL).toContain('order by asd.id desc');
            expect(calledParams).toContain('debt_search');
            expect(calledParams).toContain(20);
            expect(calledParams).toContain(0);
            expect(buildWhereCondition).toHaveBeenCalledWith(whereConditions, 'asd');
            expect(result).toEqual(mockSearchData);
        });

        it('should use custom display fields', async () => {
            // Arrange
            const customFields = ['asd.id', 'asd.searched_person_name', 'asd.search_result'];
            buildWhereCondition.mockReturnValue({ text: '', value: [] });
            sqlRequest.mockResolvedValue([{ data: [], count: 0 }]);

            // Act
            await adminSearchRepository.getAllSearches(10, 0, {}, customFields);

            // Assert
            const [calledSQL] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain("'id', asd.id");
            expect(calledSQL).toContain("'searched_person_name', asd.searched_person_name");
            expect(calledSQL).toContain("'search_result', asd.search_result");
        });
    });

    describe('🔍 findSearchById', () => {
        it('should return detailed search information by ID', async () => {
            // Arrange
            const searchId = 123;
            const mockSearchDetail = [
                {
                    id: 123,
                    logger_id: 1001,
                    username: 'admin',
                    searched_person_name: 'Тест Користувач',
                    admin_full_name: 'Адмін Тестер',
                    admin_email: 'admin@test.com',
                    client_addr: '192.168.1.1',
                    action_stamp_tx: '2024-08-11T10:00:00Z',
                    application_name: 'Пошук боржника'
                }
            ];
            sqlRequest.mockResolvedValue(mockSearchDetail);

            // Act
            const result = await adminSearchRepository.findSearchById(searchId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            expect(sqlRequest).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [searchId]
            );
            const [calledSQL] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('FROM log.admin_search_details asd');
            expect(calledSQL).toContain('LEFT JOIN log.logger l ON l.id = asd.logger_id');
            expect(calledSQL).toContain('LEFT JOIN admin.users au ON au.id = l.uid');
            expect(calledSQL).toContain('WHERE asd.id = ?');
            expect(result).toEqual(mockSearchDetail);
        });

        it('should return empty array when search not found', async () => {
            // Arrange
            const searchId = 999;
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await adminSearchRepository.findSearchById(searchId);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('🔄 updateSearchResult', () => {
        it('should update search result with person ID', async () => {
            // Arrange
            const searchId = 123;
            const searchResult = 'debt_found';
            const searchedPersonId = 12345;
            const mockResult = [{ id: 123 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            const result = await adminSearchRepository.updateSearchResult(searchId, searchResult, searchedPersonId);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('UPDATE log.admin_search_details');
            expect(calledSQL).toContain('SET search_result = ?, searched_person_id = ?, updated_at = NOW()');
            expect(calledSQL).toContain('WHERE id = ?');
            expect(calledParams).toEqual([searchResult, searchedPersonId, searchId]);
            expect(result).toEqual(mockResult);
        });

        it('should update search result without person ID', async () => {
            // Arrange
            const searchId = 124;
            const searchResult = 'no_debt';
            const mockResult = [{ id: 124 }];
            sqlRequest.mockResolvedValue(mockResult);

            // Act
            await adminSearchRepository.updateSearchResult(searchId, searchResult);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toEqual([searchResult, null, searchId]);
        });
    });

    describe('👤 searchByPersonName', () => {
        it('should search persons by name with statistics', async () => {
            // Arrange
            const personName = 'Петренко';
            const limit = 5;
            const mockPersonsData = [
                {
                    searched_person_name: 'Іван Петренко',
                    searched_person_id: 12345,
                    search_count: 3,
                    last_search: '2024-08-11T10:00:00Z',
                    searched_by_admins: 'admin, user1'
                },
                {
                    searched_person_name: 'Марія Петренко',
                    searched_person_id: 12346,
                    search_count: 1,
                    last_search: '2024-08-10T15:30:00Z',
                    searched_by_admins: 'admin'
                }
            ];
            sqlRequest.mockResolvedValue(mockPersonsData);

            // Act
            const result = await adminSearchRepository.searchByPersonName(personName, limit);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('SELECT DISTINCT');
            expect(calledSQL).toContain('searched_person_name, searched_person_id');
            expect(calledSQL).toContain('COUNT(*) as search_count');
            expect(calledSQL).toContain('string_agg(DISTINCT username, \', \') as searched_by_admins');
            expect(calledSQL).toContain('FROM log.admin_search_details');
            expect(calledSQL).toContain('WHERE searched_person_name ILIKE ?');
            expect(calledSQL).toContain('GROUP BY searched_person_name, searched_person_id');
            expect(calledSQL).toContain('ORDER BY search_count DESC, last_search DESC');
            expect(calledSQL).toContain('LIMIT ?');
            expect(calledParams).toEqual([`%${personName}%`, limit]);
            expect(result).toEqual(mockPersonsData);
        });

        it('should use default limit when not provided', async () => {
            // Arrange
            const personName = 'Тест';
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.searchByPersonName(personName);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toEqual([`%${personName}%`, 10]);
        });
    });

    describe('👨‍💼 getRecentSearchesByAdmin', () => {
        it('should return recent searches by specific admin', async () => {
            // Arrange
            const username = 'admin';
            const limit = 15;
            const mockRecentSearches = [
                {
                    id: 501,
                    searched_person_name: 'Останній пошук',
                    username: 'admin',
                    client_addr: '192.168.1.1',
                    action_stamp_tx: '2024-08-11T12:00:00Z'
                }
            ];
            sqlRequest.mockResolvedValue(mockRecentSearches);

            // Act
            const result = await adminSearchRepository.getRecentSearchesByAdmin(username, limit);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('FROM log.admin_search_details asd');
            expect(calledSQL).toContain('LEFT JOIN log.logger l ON l.id = asd.logger_id');
            expect(calledSQL).toContain('LEFT JOIN admin.users au ON au.id = l.uid');
            expect(calledSQL).toContain('WHERE au.username = ?');
            expect(calledSQL).toContain('ORDER BY asd.created_at DESC');
            expect(calledSQL).toContain('LIMIT ?');
            expect(calledParams).toEqual([username, limit]);
            expect(result).toEqual(mockRecentSearches);
        });

        it('should use default limit when not provided', async () => {
            // Arrange
            const username = 'user1';
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getRecentSearchesByAdmin(username);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toEqual([username, 10]);
        });
    });

    describe('🧹 deleteOldSearches', () => {
        it('should delete searches older than specified days', async () => {
            // Arrange
            const olderThanDays = 90;
            const mockDeletedIds = [{ id: 1 }, { id: 2 }, { id: 3 }];
            sqlRequest.mockResolvedValue(mockDeletedIds);

            // Act
            const result = await adminSearchRepository.deleteOldSearches(olderThanDays);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('DELETE FROM log.admin_search_details');
            expect(calledSQL).toContain('WHERE created_at < NOW() - INTERVAL \'? days\'');
            expect(calledSQL).toContain('RETURNING id');
            expect(calledParams).toEqual([olderThanDays]);
            expect(result).toEqual(mockDeletedIds);
        });

        it('should use default retention period when not provided', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.deleteOldSearches();

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toEqual([365]);
        });
    });

    describe('📊 getTotalSearchCount', () => {
        it('should return total count without filters', async () => {
            // Arrange
            const mockCountResult = [{ total: 1250 }];
            sqlRequest.mockResolvedValue(mockCountResult);
            buildWhereCondition.mockReturnValue({ text: '', value: [] });

            // Act
            const result = await adminSearchRepository.getTotalSearchCount();

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('SELECT COUNT(*) as total FROM log.admin_search_details WHERE 1=1');
            expect(calledParams).toEqual([]);
            expect(result).toEqual(mockCountResult);
        });

        it('should return total count with filters', async () => {
            // Arrange
            const whereConditions = { search_type: 'debt_search', username: 'admin' };
            const mockCountResult = [{ total: 150 }];
            sqlRequest.mockResolvedValue(mockCountResult);
            buildWhereCondition.mockReturnValue({
                text: ' and search_type = ? and username = ?',
                value: ['debt_search', 'admin']
            });

            // Act
            const result = await adminSearchRepository.getTotalSearchCount(whereConditions);

            // Assert
            expect(buildWhereCondition).toHaveBeenCalledWith(whereConditions);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toEqual(['debt_search', 'admin']);
            expect(result).toEqual(mockCountResult);
        });
    });

    describe('🔄 getSearchesWithCursor', () => {
        it('should return searches with cursor pagination', async () => {
            // Arrange
            const itemsLength = 10;
            const cursor = 500;
            const sort = 'ASC';
            const whereConditions = { username: 'admin' };
            const mockCursorData = [
                {
                    id: 501,
                    searched_person_name: 'Cursor Test',
                    username: 'admin'
                }
            ];
            sqlRequest.mockResolvedValue(mockCursorData);

            // Act
            const result = await adminSearchRepository.getSearchesWithCursor(itemsLength, cursor, sort, whereConditions);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(1);
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('FROM log.admin_search_details asd');
            expect(calledSQL).toContain('and asd.id > ?');
            expect(calledSQL).toContain('ORDER BY asd.id ASC');
            expect(calledSQL).toContain('LIMIT 11');
            expect(calledParams).toContain(cursor);
            expect(calledParams).toContain('admin');
            expect(result).toEqual(mockCursorData);
        });

        it('should handle multiple usernames in cursor pagination', async () => {
            // Arrange
            const whereConditions = { username: 'admin,user1,user2' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getSearchesWithCursor(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('au.username = any (array[?::text[]])');
            expect(calledParams).toContainEqual(['admin', 'user1', 'user2']);
        });

        it('should handle date range in cursor pagination', async () => {
            // Arrange
            const whereConditions = { created_at: '2024-08-01_2024-08-31' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getSearchesWithCursor(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('asd.created_at BETWEEN ? AND ?');
            expect(calledParams).toContain('2024-08-01');
            expect(calledParams).toContain('2024-08-31');
        });

        it('should handle person name search in cursor pagination', async () => {
            // Arrange
            const whereConditions = { searched_person_name: 'Іванов' };
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getSearchesWithCursor(10, null, 'DESC', whereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('asd.searched_person_name ILIKE ?');
            expect(calledParams).toContain('%Іванов%');
        });
    });

    describe('📊 Edge Cases & Error Handling', () => {
        it('should handle SQL injection in search filters', async () => {
            // Arrange
            const maliciousInput = { searched_person_name: "'; DROP TABLE log.admin_search_details; --" };
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getSearchesWithCursor(10, null, 'DESC', maliciousInput);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toContain("%'; DROP TABLE log.admin_search_details; --%");
            expect(calledSQL).toContain('asd.searched_person_name ILIKE ?');
        });

        it('should handle database errors in create', async () => {
            // Arrange
            const searchData = { username: 'test' };
            const mockError = new Error('Database constraint violation');
            sqlRequest.mockRejectedValue(mockError);

            // Act & Assert
            await expect(adminSearchRepository.create(searchData)).rejects.toThrow('Database constraint violation');
        });

        it('should handle empty search results', async () => {
            // Arrange
            sqlRequest.mockResolvedValue([]);

            // Act
            const result = await adminSearchRepository.searchByPersonName('НеіснуючийБоржник');

            // Assert
            expect(result).toEqual([]);
        });

        it('should handle large cursor values', async () => {
            // Arrange
            const largeCursor = Number.MAX_SAFE_INTEGER;
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getSearchesWithCursor(10, largeCursor, 'DESC', {});

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledParams).toContain(largeCursor);
        });
    });

    describe('🔬 Integration-like Tests', () => {
        it('should handle complex search query with all filter types', async () => {
            // Arrange
            const complexWhereConditions = {
                username: 'admin,user1',
                search_type: 'debt_search,payment_check',
                created_at: '2024-08-01_2024-08-31',
                searched_person_name: 'Петренко'
            };
            sqlRequest.mockResolvedValue([]);

            // Act
            await adminSearchRepository.getSearchesWithCursor(20, 1000, 'ASC', complexWhereConditions);

            // Assert
            const [calledSQL, calledParams] = sqlRequest.mock.calls[0];
            expect(calledSQL).toContain('au.username = any (array[?::text[]])');
            expect(calledSQL).toContain('asd.search_type = any (array[?::text[]])');
            expect(calledSQL).toContain('asd.created_at BETWEEN ? AND ?');
            expect(calledSQL).toContain('asd.searched_person_name ILIKE ?');
            expect(calledSQL).toContain('and asd.id > ?');
            expect(calledSQL).toContain('ORDER BY asd.id ASC');
            expect(calledSQL).toContain('LIMIT 21');

            expect(calledParams).toContainEqual(['admin', 'user1']);
            expect(calledParams).toContainEqual(['debt_search', 'payment_check']);
            expect(calledParams).toContain('2024-08-01');
            expect(calledParams).toContain('2024-08-31');
            expect(calledParams).toContain('%Петренко%');
            expect(calledParams).toContain(1000);
        });

        it('should handle full search lifecycle', async () => {
            // Arrange
            const searchData = {
                username: 'admin',
                searched_person_name: 'Тестовий Боржник',
                search_type: 'debt_search'
            };
            const createResult = [{ id: 600 }];
            const updateResult = [{ id: 600 }];
            sqlRequest.mockResolvedValueOnce(createResult).mockResolvedValueOnce(updateResult);

            // Act - Create and then update
            const created = await adminSearchRepository.create(searchData);
            const updated = await adminSearchRepository.updateSearchResult(600, 'debt_found', 12345);

            // Assert
            expect(sqlRequest).toHaveBeenCalledTimes(2);
            expect(created).toEqual(createResult);
            expect(updated).toEqual(updateResult);
        });
    });
});