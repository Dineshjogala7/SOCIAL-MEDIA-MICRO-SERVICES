const winston = require('winston')

//logger has 3 main parts 1.level , 2.format ,3.transport(destination of the logs )

const logger = winston.createLogger({
    level : process.env['NODE_ENV'] === 'production' ? 'info':'debug',
    format : winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({stack : true}),
        winston.format.splat(),//works as the template string  , like python printf 
        winston.format.json()
        
    ),
    defaultMeta : {service : "media-service"},
    transports : [
        new winston.transports.Console({// provide the formatted logs in the console
            format : winston.format.combine(
                winston.format.colorize(),//this will color the terminal op
                winston.format.simple()
            )
        }),
        new winston.transports.File({filename:'error.log' , level:'error'}),//only the error logs will be stored in this file and the file format is .log
        new winston.transports.File({filename:"combined.log"})//normal all logs will be stored in this file
    ]
});


module.exports = logger;