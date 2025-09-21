const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit, insertLimit, updateLimit } = require('../../../utils/ratelimit');
const receiptController = require('../controller/receipt-controller');

const routes = async (fastify) => {
    // 📋 Список квитанцій для адмін панелі - викликається з ReceiptList
    fastify.post("/receipts/list", { 
        preParsing: RouterGuard({ 
            permissionLevel: "receipt", 
            permissions: accessLevel.VIEW 
        }),
        config: viewLimit
    }, receiptController.getReceiptsList);

    // 📄 Отримання конкретної квитанції - викликається з ReceiptForm при редагуванні
    fastify.get("/receipts/:id", { 
        preParsing: RouterGuard({ 
            permissionLevel: "receipt", 
            permissions: accessLevel.VIEW 
        }),
        config: viewLimit
    }, receiptController.getReceiptById);

    // ➕ Створення нової квитанції - викликається з ReceiptForm
    fastify.post("/receipts", { 
        preParsing: RouterGuard({ 
            permissionLevel: "receipt", 
            permissions: accessLevel.INSERT 
        }),
        config: insertLimit
    }, receiptController.createReceipt);

    // ✏️ Оновлення квитанції - викликається з ReceiptForm
    fastify.put("/receipts/:id", { 
        preParsing: RouterGuard({ 
            permissionLevel: "receipt", 
            permissions: accessLevel.UPDATE 
        }),
        config: updateLimit
    }, receiptController.updateReceipt);

    // 📥 Експорт квитанцій - викликається з ReceiptList 
    fastify.post("/receipts/export", { 
        preParsing: RouterGuard({ 
            permissionLevel: "receipt", 
            permissions: accessLevel.VIEW 
        })
    }, receiptController.exportReceipts);

    
    fastify.post("/scan-activity/list", { 
        preParsing: RouterGuard({ 
            permissionLevel: "receipt", 
            permissions: accessLevel.VIEW 
        })
    }, receiptController.getScanActivitiesList);


};

module.exports = routes;