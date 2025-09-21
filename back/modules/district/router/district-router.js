const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit } = require('../../../utils/ratelimit');
const districtController = require('../controller/district-controller');
const { districtFilterSchema, districtInfoSchema } = require('../schema/district-schema');

const routes = async (fastify) => {
    fastify.post("/filter/:districtId", { schema: districtFilterSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, districtController.findDebtByFilter);
    fastify.get("/info/:id", { schema: districtInfoSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), config: viewLimit }, districtController.getDebtByDebtorId);
    fastify.get("/generate/:id", { schema: districtInfoSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, districtController.generateWordByDebtId);
    fastify.get("/print/:id", { schema: districtInfoSchema, preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) }, districtController.printDebtId);
    fastify.get("/", { 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, districtController.getDistricts);
    fastify.get("/:districtId/villages", { 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), 
        config: viewLimit 
    }, districtController.getVillagesByDistrict);
    fastify.post("/locations/upload", {
        preParsing: RouterGuard({ 
            permissionLevel: "debtor", 
            permissions: accessLevel.EDIT 
        })
    }, districtController.uploadLocationFile);
}
module.exports = routes;