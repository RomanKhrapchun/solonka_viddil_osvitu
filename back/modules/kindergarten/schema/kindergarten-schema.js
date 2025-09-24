const kindergartenInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

const kindergartenFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        title: {
            type: 'string',
            optional: true,
            min: 1,
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
    }
}

// ===============================
// СХЕМИ ДЛЯ ГРУП САДОЧКА
// ===============================

const kindergartenGroupFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number', 
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        kindergarten_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_type: {
            type: 'string',
            optional: true,
        },
    }
}

const kindergartenGroupCreateSchema = {
    body: {
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        group_name: {
            type: 'string',
            min: 1,
            max: 50,
        },
        group_type: {
            type: 'string',
            enum: ['young', 'older'],
        },
    }
}

const kindergartenGroupUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        kindergarten_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        group_name: {
            type: 'string',
            min: 1,
            max: 50,
            optional: true,
        },
        group_type: {
            type: 'string',
            enum: ['young', 'older'],
            optional: true,
        },
    }
}

const kindergartenGroupDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

// ===============================
// СХЕМИ ДЛЯ ДІТЕЙ САДОЧКА
// ===============================

const childrenInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

const childrenFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number', 
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        parent_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        phone_number: {
            type: 'string',
            pattern: '^[0-9\\s\\-\\(\\)]{10,20}$',
            optional: true,
        },
        group_id: {
            type: 'number',
            minimum: 1,
            optional: true,
        },
    }
}

const childrenCreateSchema = {
    body: {
        child_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        parent_name: {
            type: 'string',
            min: 1,
            max: 100,
        },
        phone_number: {
            type: 'string',
            pattern: '^[0-9\\s\\-\\(\\)]{10,20}$',
            optional: true,
        },
        group_id: {
            type: 'number',
            minimum: 1,
        },
    }
}

const childrenUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        child_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        parent_name: {
            type: 'string',
            min: 1,
            max: 100,
            optional: true,
        },
        phone_number: {
            type: 'string',
            pattern: '^[0-9\\s\\-\\(\\)]{10,20}$',
            optional: true,
        },
        group_id: {
            type: 'number',
            minimum: 1,
            optional: true,
        },
    }
}

const childrenDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

// ===============================
// СХЕМИ ДЛЯ ВІДВІДУВАНОСТІ
// ===============================

const attendanceInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

const attendanceFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number', 
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        child_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        group_name: {
            type: 'string',
            optional: true,
            min: 1,
        },
        date_from: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_to: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        attendance_status: {
            type: 'string',
            optional: true,
            enum: ['present', 'absent', 'sick', 'vacation'],
        },
        child_id: {
            type: 'number',
            optional: true,
        },
    }
}

const attendanceCreateSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        child_id: {
            type: 'number',
            minimum: 1,
        },
        attendance_status: {
            type: 'string',
            enum: ['present', 'absent', 'sick', 'vacation'],
        },
        notes: {
            type: 'string',
            optional: true,
            max: 500,
        },
    }
}

const attendanceUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        child_id: {
            type: 'number',
            minimum: 1,
            optional: true,
        },
        attendance_status: {
            type: 'string',
            enum: ['present', 'absent', 'sick', 'vacation'],
            optional: true,
        },
        notes: {
            type: 'string',
            optional: true,
            max: 500,
        },
    }
}

const attendanceDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

// ===============================
// СХЕМИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
// ===============================

const dailyFoodCostFilterSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number', 
            optional: true,
        },
        sort_by: {
            type: 'string',
            optional: true,
        },
        sort_direction: {
            type: 'string',
            optional: true,
        },
        date_from: {
            type: 'string',
            optional: true,
            format: 'date',
        },
        date_to: {
            type: 'string',
            optional: true,
            format: 'date',
        },
    }
}

const dailyFoodCostCreateSchema = {
    body: {
        date: {
            type: 'string',
            format: 'date',
        },
        young_group_cost: {
            type: 'number',
            minimum: 0,
            maximum: 9999.99,
        },
        older_group_cost: {
            type: 'number',
            minimum: 0,
            maximum: 9999.99,
        },
    }
}

const dailyFoodCostUpdateSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        date: {
            type: 'string',
            format: 'date',
            optional: true,
        },
        young_group_cost: {
            type: 'number',
            minimum: 0,
            maximum: 9999.99,
            optional: true,
        },
        older_group_cost: {
            type: 'number',
            minimum: 0,
            maximum: 9999.99,
            optional: true,
        },
    }
}

const dailyFoodCostDeleteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

module.exports = {
    // Основні схеми садочка
    kindergartenFilterSchema,
    kindergartenInfoSchema,
    
    // Схеми для груп
    kindergartenGroupFilterSchema,
    kindergartenGroupCreateSchema,
    kindergartenGroupUpdateSchema,
    kindergartenGroupDeleteSchema,
    
    // Схеми для дітей
    childrenFilterSchema,
    childrenInfoSchema,
    childrenCreateSchema,
    childrenUpdateSchema,
    childrenDeleteSchema,

    // Схеми для відвідуваності
    attendanceFilterSchema,
    attendanceInfoSchema,
    attendanceCreateSchema,
    attendanceUpdateSchema,
    attendanceDeleteSchema,

    // Схеми для вартості харчування
    dailyFoodCostFilterSchema,
    dailyFoodCostCreateSchema,
    dailyFoodCostUpdateSchema,
    dailyFoodCostDeleteSchema,
}