const { RouterGuard } = require('../../../helpers/Guard');
const logController = require('../controller/log-controller');
const { logInfoSchema, logFilterSchema, securelogFilterSchema, blackListSchema, insertBlackListSchema, messagesLogFilterSchema } = require('../schema/log-schema');
const { viewLimit } = require('../../../utils/ratelimit');
const { accessLevel } = require('../../../utils/constants');

const routes = async (fastify) => {
    fastify.post("/", { schema: logFilterSchema, preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) }, logController.getAllLogs);
    fastify.get("/:id", { schema: logInfoSchema, preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }), config: viewLimit }, logController.findLogById);
    fastify.post("/secure", { schema: securelogFilterSchema, preParsing: RouterGuard({ permissionLevel: "secure", permissions: accessLevel.VIEW }) }, logController.allSecureLog);
    fastify.post("/blacklist/all", { schema: blackListSchema, preParsing: RouterGuard({ permissionLevel: "blacklist", permissions: accessLevel.VIEW }) }, logController.allBlackListIp);
    fastify.post("/blacklist", { schema: insertBlackListSchema, preParsing: RouterGuard({ permissionLevel: "blacklist", permissions: accessLevel.INSERT }) }, logController.addToBlacklistIP);
    fastify.delete("/blacklist/:id", { schema: logInfoSchema, preParsing: RouterGuard({ permissionLevel: "blacklist", permissions: accessLevel.DELETE }) }, logController.removeFromBlacklistIP);
    fastify.post("/detailed", { schema: logFilterSchema, preParsing: RouterGuard({ permissionLevel: "reports", permissions: accessLevel.VIEW }) }, logController.detailedLog);
    
    fastify.post("/messages", { 
        //schema: messagesLogFilterSchema, 
        preParsing: RouterGuard({ 
            permissionLevel: "logs", 
            permissions: accessLevel.VIEW 
        }) 
    }, logController.getMessagesLog);

    fastify.post("/ower", { 
        schema: logFilterSchema, 
        preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
    }, logController.owerSearchLog);
    
    // Експорт логів заборгованостей
    fastify.post("/ower/export", { 
        preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
    }, logController.exportOwnerSearchLog);
    // Основний endpoint для admin search log
    fastify.post("/admin-search", { 
        schema: logFilterSchema, 
        preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
    }, logController.adminSearchLog);

    fastify.get("/groups", { 
        preParsing: RouterGuard({ permissionLevel: "reports", permissions: accessLevel.VIEW }) 
    }, logController.getAccessGroups);
// ========================================
// НОВІ ENDPOINT'И ДЛЯ СИСТЕМИ ПЕРЕВІРКИ ОПЛАТ
// ========================================

// Оновлення статусу оплати для одного запису (з перевірками часу)
fastify.post("/admin-search/:id/update-payment", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.EDIT }) 
}, logController.updatePaymentStatus);

// Примусове оновлення статусу оплати (обходить часові обмеження)
fastify.post("/admin-search/:id/force-update-payment", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.EDIT }) 
}, logController.forceUpdatePaymentStatus);

// Діагностика конкретної перевірки оплати
fastify.post("/admin-search/:id/diagnose", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
}, logController.diagnosePaymentCheck);

// Масове оновлення статусів оплат
fastify.post("/admin-search/update-all-payments", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.EDIT }) 
}, logController.updateAllPaymentStatuses);

// Статистика готовності до перевірки
fastify.get("/admin-search/check-readiness-stats", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
}, logController.getCheckReadinessStats);

// Експорт звіту ефективності (оновлений з новими полями)
fastify.post("/admin-search/export", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
}, logController.exportEffectivenessReport);

// ========================================
// ENDPOINT'И ДЛЯ УПРАВЛІННЯ РЕЄСТРАМИ
// ========================================

// Імпорт реєстру до історії
fastify.post("/registry/import", { 
    preParsing: RouterGuard({ permissionLevel: "reports", permissions: accessLevel.INSERT }) 
}, logController.importRegistry);

// Список доступних реєстрів
fastify.get("/registry/available", { 
    preParsing: RouterGuard({ permissionLevel: "reports", permissions: accessLevel.VIEW }) 
}, logController.getAvailableRegistries);

// ========================================
// СИСТЕМНІ ENDPOINT'И
// ========================================

// Перевірка стану системи перевірки оплат
fastify.get("/system/health-check", { 
    preParsing: RouterGuard({ permissionLevel: "logs", permissions: accessLevel.VIEW }) 
}, logController.getSystemHealthCheck);
}

module.exports = routes;