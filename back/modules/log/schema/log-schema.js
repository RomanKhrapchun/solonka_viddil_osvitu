const { isValidDate } = require('../../../utils/function')
const { isIPv4 } = require('net')

const logFilterSchema = {
    body: {
        limit: {
            type: 'number',
            optional: true,
        },
        action_stamp_tx: {
            type: 'custom',
            optional: true,
            check(value, errors, schema) {
                if (value && typeof value === 'string' && value.length > 1 && isValidDate(value?.split('_')[0]) && isValidDate(value?.split('_')[1])) {
                    return value
                }
                return errors.push({ type: "action_stamp_tx" })
            }
        },
    }
}

const messagesLogFilterSchema = {
    body: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', enum: [16, 32, 48] },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' },
            groupNumber: { type: 'string' },
            username: { type: 'string' },
            year: { type: 'integer' },
            month: { type: 'integer', minimum: 1, maximum: 12 },
            periodType: { type: 'string', enum: ['single', 'multiple'] }
        },
        additionalProperties: false
    }
};

const securelogFilterSchema = {
    body: {
        limit: {
            type: 'number',
            optional: true,
        },
        date_add: {
            type: 'custom',
            optional: true,
            check(value, errors, schema) {
                if (value && typeof value === 'string' && value.length > 1 && isValidDate(value?.split('_')[0]) && isValidDate(value?.split('_')[1])) {
                    return value
                }
                return errors.push({ type: "action_stamp_tx" })
            }
        },
    }
}

const blackListSchema = {
    body: {
        limit: {
            type: 'number',
            optional: true,
        },
        create_date: {
            type: 'custom',
            optional: true,
            check(value, errors, schema) {
                if (value && typeof value === 'string' && value.length > 1 && isValidDate(value?.split('_')[0]) && isValidDate(value?.split('_')[1])) {
                    return value
                }
                return errors.push({ type: "action_stamp_tx" })
            }
        },
        ip: {
            type: 'string',
            optional: true,
            trim: true,
            min: 1,
        }
    }
}

const logInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

const insertBlackListSchema = {
    body: {
        ip: {
            type: 'custom',
            check(value, errors, schema) {
                if (!isIPv4(value)) errors.push({ type: "ip" })
                return value
            }
        },
        agent: {
            type: 'string',
            trim: true,
            min: 1,
            optional: true,
        },
        details: {
            type: 'string',
            trim: true,
            min: 1,
            optional: true
        }
    }
}

const detailedLog = {
    body: {
        year: {
            type: 'string',
            numeric: true,
            convert: true,
            optional: true,
        },
        month: {
            type: 'string',
            numeric: true,
            convert: true,
            optional: true,
        }
    }
}

module.exports = {
    logInfoSchema,
    logFilterSchema,
    securelogFilterSchema,
    blackListSchema,
    insertBlackListSchema,
    messagesLogFilterSchema
}