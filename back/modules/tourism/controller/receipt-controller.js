const receiptService = require("../service/receipt-service");
const Logger = require("../../../utils/logger");

class RecepitController {

    // 🔍 Перевірка квитанції по identifier (публічний endpoint)
    async checkReceiptByIdentifier(request, reply) {
        try {
            const receiptData = await receiptService.checkReceiptByIdentifier(request);
            return reply.send(receiptData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // 📋 Отримання списку квитанцій з фільтрами
    async getReceiptsList(request, reply) { 
        try {
            const receiptsData = await receiptService.getReceiptsList(request);
            return reply.send(receiptsData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // 📄 Отримання конкретної квитанції за ID
    async getReceiptById(request, reply) {
        try {
            const receiptData = await receiptService.getReceiptById(request);
            return reply.send(receiptData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // ➕ Створення нової квитанції
    async createReceipt(request, reply) {
        try {
            const newReceipt = await receiptService.createReceipt(request);
            return reply.status(201).send(newReceipt);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // ✏️ Оновлення квитанції
    async updateReceipt(request, reply) {
        try {
            const updatedReceipt = await receiptService.updateReceipt(request);
            return reply.send(updatedReceipt);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // 📥 Експорт квитанцій
    async exportReceipts(request, reply) {
        try {
            const exportData = await receiptService.exportReceipts(request);
            return reply.send(exportData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }

    // 📋 Отримання списку квитанцій з фільтрами
    async getScanActivitiesList(request, reply) { 
        try {
            const receiptsData = await receiptService.getScanActivitiesList(request);
            return reply.send(receiptsData);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(400).send(error);
        }
    }
}

const receiptController = new RecepitController();
module.exports = receiptController;