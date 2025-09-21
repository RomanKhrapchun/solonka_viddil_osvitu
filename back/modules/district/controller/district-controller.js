const districtService = require("../service/district-service");
const Logger = require("../../../utils/logger")

class DistrictController {

    async getDebtByDebtorId(request, reply) {
        try {
            const debtData = await districtService.getDebtByDebtorId(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async findDebtByFilter(request, reply) {
        try {
            const debtData = await districtService.findDebtByFilter(request)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async generateWordByDebtId(request, reply) {
        try {
            const debtData = await districtService.generateWordByDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async printDebtId(request, reply) {
        try {
            const debtData = await districtService.printDebtId(request, reply)
            return reply.send(debtData)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async getDistricts(request, reply) {
        try {
            const districts = await districtService.getDistrictsList()
            return reply.send(districts)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }
    
    async getVillagesByDistrict(request, reply) {
        try {
            const { districtId } = request.params
            const villages = await districtService.getVillagesByDistrict(districtId)
            return reply.send(villages)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }

    async uploadLocationFile(request, reply) {
        try {
            Logger.info('Starting location file upload', { 
                userId: request?.user?.id,
                ip: request?.ip 
            });

            const result = await districtService.uploadLocationFile(request);
            
            Logger.info('Location file upload completed', { 
                success: result.success,
                totalRows: result.totalProcessedRows,
                successfulInserts: result.successfulInserts,
                duplicates: result.duplicates,
                errorsCount: result.errors?.length || 0,
                userId: request?.user?.id
            });

            return reply.code(200).send({
                success: true,
                ...result
            });

        } catch (error) {
            Logger.error('Location file upload failed', { 
                error: error.message, 
                stack: error.stack,
                userId: request?.user?.id,
                ip: request?.ip
            });

            return reply.code(400).send({
                success: false,
                error: error.message || 'Помилка завантаження файлу'
            });
        }
    }

    async getLocationsList(request, reply) {
        try {
            const result = await districtService.getLocationsList(request);
            return reply.send(result);
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(500).send({ 
                success: false,
                error: 'Помилка отримання списку локацій' 
            });
        }
    }

    async deleteLocation(request, reply) {
        try {
            const { locationId } = request.params;
            const result = await districtService.deleteLocation(locationId);
            
            if (result) {
                return reply.send({ 
                    success: true, 
                    message: 'Локацію успішно видалено' 
                });
            } else {
                return reply.status(404).send({ 
                    success: false, 
                    error: 'Локацію не знайдено' 
                });
            }
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(500).send({ 
                success: false,
                error: 'Помилка видалення локації' 
            });
        }
    }

    async getLocationStats(request, reply) {
        try {
            const stats = await districtService.getLocationStats();
            return reply.send({
                success: true,
                data: stats
            });
        } catch (error) {
            Logger.error(error.message, { stack: error.stack });
            reply.status(500).send({ 
                success: false,
                error: 'Помилка отримання статистики' 
            });
        }
    }
    
    async searchLocations(request, reply) {
        try {
            const results = await districtService.searchLocations(request);
            return reply.send({
                success: true,
                data: results
            });
        } catch (error) {
            Logger.error('Search locations failed', { 
                error: error.message, 
                stack: error.stack 
            });
            
            return reply.status(500).send({ 
                success: false,
                error: 'Помилка пошуку локацій' 
            });
        }
    }

    async getLocationsByDistrict(request, reply) {
        try {
            const { districtId } = request.params;
            const locations = await districtService.getLocationsByDistrict(districtId);
            
            return reply.send({
                success: true,
                data: locations
            });
        } catch (error) {
            Logger.error('Get locations by district failed', { 
                error: error.message, 
                stack: error.stack,
                districtId: request.params.districtId
            });
            
            return reply.status(500).send({ 
                success: false,
                error: error.message 
            });
        }
    }

    async getLocationsByVillage(request, reply) {
        try {
            const { villageId } = request.params;
            const locations = await districtService.getLocationsByVillage(villageId);
            
            return reply.send({
                success: true,
                data: locations
            });
        } catch (error) {
            Logger.error('Get locations by village failed', { 
                error: error.message, 
                stack: error.stack,
                villageId: request.params.villageId
            });
            
            return reply.status(500).send({ 
                success: false,
                error: error.message 
            });
        }
    }

}


module.exports = new DistrictController();