
function info(message, meta) {
    log('info', message, meta);
}

function error(message, meta) {
    log('error', message, meta);
}

function warn(message, meta = {}) {
    log('warn', message, meta);
}

// function log(level, message, meta) {
//     const loggingFunction = level === 'error' ? console.error : console.log;

//     loggingFunction(`<${level}> [${new Date().toISOString()}] ${message}`, meta);
// }

function log(level, message, meta) {
    const loggingFunction = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : console.log;

    loggingFunction(`<${level}> [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : '');
}


module.exports = {
    log,
    info,
    error,
    warn
}