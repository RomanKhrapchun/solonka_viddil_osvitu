const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit } = require('../../../utils/ratelimit');
const kindergartenController = require('../controller/kindergarten-controller');
const { 
    kindergartenFilterSchema, 
    kindergartenInfoSchema, 
    kindergartenGroupFilterSchema, 
    kindergartenGroupCreateSchema,
    kindergartenGroupUpdateSchema,
    kindergartenGroupDeleteSchema,
    childrenFilterSchema,
    childrenCreateSchema,
    childrenUpdateSchema,
    childrenDeleteSchema,
    childrenInfoSchema,
    attendanceFilterSchema,
    attendanceCreateSchema,
    attendanceUpdateSchema,
    attendanceDeleteSchema,
    attendanceInfoSchema
} = require('../schema/kindergarten-schema');

const routes = async (fastify) => {
    // Роути для основної функціональності садочків
    fastify.post("/filter", { 
        schema: kindergartenFilterSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, kindergartenController.findDebtByFilter);
    
    fastify.get("/info/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), 
        config: viewLimit 
    }, kindergartenController.getDebtByDebtorId);
    
    fastify.get("/generate/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, kindergartenController.generateWordByDebtId);
    
    fastify.get("/print/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, kindergartenController.printDebtId);

    // Роути для груп садочків
    fastify.post("/groups/filter", { 
        schema: kindergartenGroupFilterSchema 
    }, kindergartenController.findGroupsByFilter);

    fastify.post("/groups", { 
        schema: kindergartenGroupCreateSchema 
    }, kindergartenController.createGroup);

    fastify.put("/groups/:id", { 
        schema: kindergartenGroupUpdateSchema 
    }, kindergartenController.updateGroup);

    fastify.delete("/groups/:id", { 
        schema: kindergartenGroupDeleteSchema 
    }, kindergartenController.deleteGroup);

    // Роути для дітей садочку
    fastify.post("/childrenRoster/filter", { 
        schema: childrenFilterSchema, 
    }, kindergartenController.findChildrenByFilter);

    fastify.get("/childrenRoster/:id", { 
        schema: childrenInfoSchema,  
        config: viewLimit 
    }, kindergartenController.getChildById);

    fastify.post("/childrenRoster", { 
        schema: childrenCreateSchema 
    }, kindergartenController.createChild);

    fastify.put("/childrenRoster/:id", { 
        schema: childrenUpdateSchema 
    }, kindergartenController.updateChild);

    fastify.delete("/childrenRoster/:id", { 
        schema: childrenDeleteSchema 
    }, kindergartenController.deleteChild);

    // Роути для відвідуваності садочку
    fastify.post("/attendance/filter", { 
        schema: attendanceFilterSchema, 
    }, kindergartenController.findAttendanceByFilter);

    fastify.get("/attendance/:id", { 
        schema: attendanceInfoSchema,  
        config: viewLimit 
    }, kindergartenController.getAttendanceById);

    fastify.post("/attendance", { 
        schema: attendanceCreateSchema 
    }, kindergartenController.createAttendance);

    fastify.put("/attendance/:id", { 
        schema: attendanceUpdateSchema 
    }, kindergartenController.updateAttendance);

    fastify.delete("/attendance/:id", { 
        schema: attendanceDeleteSchema 
    }, kindergartenController.deleteAttendance);
}

module.exports = routes;