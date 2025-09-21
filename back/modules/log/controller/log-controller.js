const logService = require("../service/log-service")
const Logger = require("../../../utils/logger")
const { blockedIPMessage, unblockedIPNotification } = require("../../../utils/messages")

class LogController {

    async getAllLogs(request, reply) {
        try {
            const logData = await logService.getAllLogs(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async findLogById(request, reply) {
        try {
            const logData = await logService.findLogById(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async allSecureLog(request, reply) {
        try {
            const logData = await logService.allSecureLog(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async allBlackListIp(request, reply) {
        try {
            const logData = await logService.allBlackListIp(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async addToBlacklistIP(request, reply) {
        try {
            await logService.addToBlacklistIP(request)
            return reply.send(blockedIPMessage)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async removeFromBlacklistIP(request, reply) {
        try {
            await logService.removeFromBlacklistIP(request)
            return reply.send(unblockedIPNotification)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async detailedLog(request, reply) {
        try {
            const logData = await logService.detailedLog(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async getMessagesLog(request, reply) {
        try {
            const messagesData = await logService.getMessagesLog(request);
            return reply.send(messagesData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    async owerSearchLog(request, reply) {
        try {
            const logData = await logService.owerSearchLog(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }
    
    async exportOwnerSearchLog(request, reply) {
        try {
            const filters = request.body;
            const reportData = await logService.getOwnerSearchLogForExport(filters);
            
            // Якщо запитано Excel файл
            if (filters.format === 'excel') {
                const excelBuffer = await logService.generateOwnerSearchExcelReport(reportData, filters);
                
                reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                reply.header('Content-Disposition', `attachment; filename=owner-search-log-${new Date().toISOString().split('T')[0]}.xlsx`);
                
                return reply.send(excelBuffer);
            }
            
            // Якщо запитано JSON
            return reply.send({
                success: true,
                data: reportData,
                message: 'Лог пошуку заборгованостей згенеровано'
            });
            
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }
    

    async getAccessGroups(request, reply) {
        try {
            const groups = await logService.getAccessGroups()
            return reply.send({
                success: true,
                data: groups
            })
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({
                success: false,
                message: error.message
            })
        }
    }

    async adminSearchLog(request, reply) {
        try {
            const logData = await logService.adminSearchLog(request)
            return reply.send(logData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    // Оновлення статусу оплати для одного запису (з перевірками)
async updatePaymentStatus(request, reply) {
    try {
        const { id } = request.params;
        const { force = false } = request.body || {};
        
        const result = await logService.updatePaymentStatus(id, force);
            
            // Перевіряємо чи операція успішна
            if (result.includes('ПОМИЛКА') || result.includes('ЗАБОРОНЕНО') || result.includes('ЗАЧЕКАЙТЕ')) {
                return reply.status(400).send({ 
                    success: false, 
                    message: result 
                });
            }
            
            return reply.send({ 
                success: true, 
                message: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Примусове оновлення статусу оплати
    async forceUpdatePaymentStatus(request, reply) {
        try {
            const { id } = request.params;
            
            const result = await logService.updatePaymentStatus(id, true);
            
            return reply.send({ 
                success: true, 
                message: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Масове оновлення статусів оплат з налаштуваннями
    async updateAllPaymentStatuses(request, reply) {
        try {
            const { 
                limit = 100, 
                force = false,
                admin_name = null,
                days_back = null 
            } = request.body;
            
            const result = await logService.updateAllPaymentStatuses(limit, force, admin_name, days_back);
            
            return reply.send({ 
                success: true, 
                message: result.message,
                stats: result.stats
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Отримання статистики готовності до перевірки
    async getCheckReadinessStats(request, reply) {
        try {
            const stats = await logService.getCheckReadinessStats();
            return reply.send(stats);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Діагностика конкретної перевірки
    async diagnosePaymentCheck(request, reply) {
        try {
            const { id } = request.params;
            const diagnosis = await logService.diagnosePaymentCheck(id);
            
            return reply.send({
                success: true,
                ...diagnosis
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            
            if (error.message.includes('not found')) {
                return reply.status(404).send({ 
                    success: false, 
                    message: 'Запис не знайдено' 
                });
            }
            
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Експорт звіту ефективності з новими полями
    async exportEffectivenessReport(request, reply) {
        try {
            const filters = request.body;
            const reportData = await logService.getEffectivenessReportForExport(filters);
            console.log('Report data:', reportData);
            
            if (filters.format === 'excel') {
                const excelBuffer = await logService.generateExcelReport(reportData, filters);
                console.log('Excel buffer size:', excelBuffer.length);
                console.log('First few bytes:', excelBuffer.slice(0, 10));
                // Enhanced headers
                const filename = `admin-effectiveness-report-${new Date().toISOString().split('T')[0]}.xlsx`;
                
                reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
                reply.header('Content-Length', excelBuffer.length);
                reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
                reply.header('Pragma', 'no-cache');
                reply.header('Expires', '0');
                
                return reply.send(excelBuffer);
            }
            
            return reply.send({
                success: true,
                data: reportData,
                message: 'Звіт ефективності згенеровано'
            });
            
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(500).send({
                success: false,
                message: `Помилка генерації звіту: ${error.message}`
            });
        }
    }

    // Імпорт реєстру до історії
    async importRegistry(request, reply) {
        try {
            const { registry_date } = request.body;
            
            if (!registry_date) {
                return reply.status(400).send({
                    success: false,
                    message: 'Поле registry_date є обов\'язковим'
                });
            }
            
            const result = await logService.importRegistryToHistory(registry_date);
            return reply.send({ 
                success: true, 
                message: result 
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Отримання списку доступних реєстрів
    async getAvailableRegistries(request, reply) {
        try {
            const registries = await logService.getAvailableRegistries();
            return reply.send({
                success: true,
                data: registries
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Перевірка стану системи перевірки оплат
    async getSystemHealthCheck(request, reply) {
        try {
            const health = await logService.getSystemHealthCheck();
            return reply.send({
                success: true,
                data: health
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send({ 
                success: false, 
                message: error.message 
            });
        }
    }
}

module.exports = new LogController()