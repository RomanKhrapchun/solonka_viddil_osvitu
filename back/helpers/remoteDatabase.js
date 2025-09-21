const { Pool } = require('pg')
const Logger = require('../utils/logger')

// Окремий пул для віддаленої бази даних
const remotePool = new Pool({
    min: 0,
    max: 10, // менше з'єднань для окремої БД
    application_name: "Remote DB Service",
    host: process.env.REMOTE_DB_HOST,
    user: process.env.REMOTE_DB_USERNAME,
    password: process.env.REMOTE_DB_PASSWORD,
    database: process.env.REMOTE_DB_DATABASE,
    port: process.env.REMOTE_DB_PORT || 5432,
    idleTimeoutMillis: 5000,
})

remotePool.on("error", (err, client) => {
    Logger.error(`Remote DB Error: ${err.message}`)
})

// Функція для запитів до віддаленої БД
const remoteSqlRequest = async (sqlText = '', params = []) => {
    try {
        const start = new Date()
        let placeholders = 0;
        let replacedText = sqlText.replace(/\?/g, () => {
            placeholders++;
            return '$' + placeholders;
        });
        
        const result = await remotePool.query(replacedText, params)
        console.log(`Remote Query time: ${new Date() - start} ms`)
        
        if (result) return result.rows
    } catch (e) {
        Logger.error(`Remote DB Query Error: ${e.message}`, {})
        throw new Error('Помилка запиту до віддаленої бази даних');
    }
}

module.exports = {
    remoteSqlRequest,
    remotePool
}