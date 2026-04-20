require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require("mongoose");
const app = express();
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const {RateLimiterRedis} = require('rate-limiter-flexible');
const Redis = require('ioredis');
const {rateLimit} = require('express-rate-limit');
const {RedisStore} = require('rate-limit-redis');
const {handlePostDeleted} = require("./eventHandlers/media-event-handlers");
const {connectToRabbitMQ, consumeEvent} = require("./utils/rabbitmq");
const PORT = process.env.PORT || 3003

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res , next)=>{
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info(`Request body , ${(req.body)}`);
    next();
});

// Implement the Ip based RateLimiting and sensitive Rate Limiting

mongoose.connect(process.env.MONGO_URI).then(()=>{
    logger.warn("Mongo is connected");
}).catch((error)=>{
    logger.error("Mongo Error " , error.message);
})

const redisClient = new Redis(process.env.REDIS_URL)

//DDos protection and global limiter
const rateLimiter = new RateLimiterRedis({
    storeClient : redisClient,
    keyPrefix : 'middleware',
    points : 10,
    duration : 1
})

//setting the middleware to use global ratelimit
app.use((req , res, next)=>{
    rateLimiter.consume(req.ip).then(()=>{next()}).
    catch(()=>{
        logger.warn(`Rate limit exceeds for IP : ${req.ip}`);
        res.status(429).json({success : false , message : "Too many requests"});
    })
})


//sensitive Ratelimiter for the sensitive end points
const sensitiveEndpointLimiter = rateLimit({
    windowMs : 15*60*1000,
    max: 50,
    standardHeaders : true,
    legacyHeaders : false,
    handler : (req , res)=>{
        logger.warn(`Sensitive endpoint rate limit exceeded for IP : ${req.ip}`);
        res.status(429).json({success : false, message : "Too many requests"})
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
})

app.use("/api/media/upload" , sensitiveEndpointLimiter )
app.use("/api/media" , mediaRoutes);

async function startServer() {
    try {
        await connectToRabbitMQ();

        //consume all the services
        await consumeEvent('post.deleted',handlePostDeleted);
        app.listen(PORT,()=>{
            logger.info(`Media service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to connect to server" , error);
        process.exit(1);
    }
}
startServer();

process.on('unhandledRejection' , (reason , promise)=>{
    logger.error("Unhandled Rejection at " , promise , "reason" , reason)
});
