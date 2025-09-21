const debtorService = require("../service/debtor-service");
const Logger = require("../../../utils/logger")

class DebtorController {

    async getDebtByDebtorId(request, reply) {
        try {
            const debtData = await debtorService.getDebtByDebtorId(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async addPhoneToDebtor(request, reply) {
        try {
            const { phone, debtId } = request.body;
            
            const result = await debtorService.enrichPhoneFromLocalDB(phone, debtId);
            
            if (result.success) {
                return reply.status(200).send({
                    message: 'Операція виконана успішно',
                    data: result.data
                });
            } else {
                return reply.status(400).send({
                    error: true,
                    message: result.error.message,
                    code: result.error.code
                });
            }
            
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(500).send({ error: true, message: 'Внутрішня помилка сервера' });
        }
    }

    async findDebtByFilter(request, reply) {
        try {
            const debtData = await debtorService.findDebtByFilter(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async generateWordByDebtId(request, reply) {
        try {
            const debtData = await debtorService.generateWordByDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async printDebtId(request, reply) {
        try {
            const debtData = await debtorService.printDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async getDebtorCallsByIdentifier(request, reply) {
    try {
        const calls = await debtorService.getDebtorCallsByIdentifier(request);
        reply.status(200).send(calls);
    } catch (error) {
        console.error('Error getting debtor calls by identifier:', error);
        
        if (error.message === 'Debtor ID or person name is required') {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'ID боржника або ПІБ є обов\'язковим'
                });
            }

            if (error.message.includes('not found')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Боржника не знайдено'
                });
            }

            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Помилка при отриманні дзвінків'
            });
        }
    }

    // Створити новий дзвінок по ower.id або ПІБ
    async createDebtorCallByIdentifier(request, reply) {
        try {
            const newCall = await debtorService.createDebtorCallByIdentifier(request);
            reply.status(201).send(newCall);
        } catch (error) {
            console.error('Error creating debtor call by identifier:', error);
            
            if (error.message === 'Debtor ID or person name is required') {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'ID боржника або ПІБ є обов\'язковим'
                });
            }

            if (error.message === 'All fields (call_date, call_topic) are required') {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Всі поля (call_date, call_topic) є обов\'язковими'
                });
            }

            if (error.message.includes('not found')) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Боржника не знайдено'
                });
            }

            if (error.message && error.message.includes('Call date cannot be in the future')) {
                return reply.status(400).send({
                    error: 'Validation Error',
                    message: 'Дата дзвінка не може бути в майбутньому'
                });
            }
            
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Помилка при створенні дзвінка'
            });
        }
    }

    async updateCall(request, reply) {
        try {
            const newCall = await debtorService.updateCall(request);
            return reply.status(201).send(newCall);
        } catch (error) {
            console.error('Error creating debtor call by identifier:', error);
            
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Помилка при створенні дзвінка'
            });
        }
    }

    async getDebtorReceiptInfoByIdentifier(request, reply) {
        try {
            const receiptsInfo = await debtorService.getDebtorReceiptInfoByIdentifier(request);
            reply.status(200).send(receiptsInfo);
        } catch (error) {
            console.error('Error getting debtor receipt info by identifier:', error);
            
            if (error.message === 'Debtor ID or person name is required') {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'ID боржника або ПІБ є обов\'язковим'
                    });
                }
    
                if (error.message.includes('not found')) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Боржника не знайдено'
                    });
                }
    
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Помилка при отриманні дзвінків'
                });
            }
        }

        async createDebtorReceiptInfoByIdentifier(request, reply) {
            try {
                const newReceiptInfo = await debtorService.createDebtorReceiptInfoByIdentifier(request);
                reply.status(201).send(newReceiptInfo);
            } catch (error) {
                console.error('Error creating debtor receipt info by identifier:', error);
                
                if (error.message === 'Debtor ID or person name is required') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'ID боржника або ПІБ є обов\'язковим'
                    });
                }
    
                if (error.message.includes('not found')) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Боржника не знайдено'
                    });
                }
    
                if (error.message && error.message.includes('Receipt info date cannot be in the future')) {
                    return reply.status(400).send({
                        error: 'Validation Error',
                        message: 'Дата дзвінка не може бути в майбутньому'
                    });
                }
                
                reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Помилка при створенні дзвінка'
                });
            }
        }
    
}




module.exports = new DebtorController();