require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const express = require('express');
const Redis = require('ioredis');
const {RateLimiterRedis} = require("rate-limiter-flexible");
const {RedisStore}  =require('rate-limit-redis');
const {rateLimit} = require('express-rate-limit');
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const {connectToRabbitMQ} = require("./utils/rabbitmq");
const app = express();
const PORT = process.env.PORT || 3002;

mongoose.connect(process.env.MONGO_URI).then(()=>{
    logger.info("Connected to Mongo DB");
}).catch((e)=>{
    logger.error('Mongo COnnection error' , e);
});

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req , res , next)=>{
    logger.info(`Recieved ${req.method} request to ${req.url}`);
    logger.info('Request body ',req.body);
    next();
});

//apply the rateLimiting and sensitive ratelimiting based on the requirement 

//global rateLimiter
const rateLimiter = new RateLimiterRedis({
    storeClient : redisClient,
    keyPrefix : "middleware",
    points : 10 ,
    duration : 1
    
});

//apply it in the middleware (This one is the global limiter for the post-service)
app.use((req , res , next)=>{
    rateLimiter.consume(req.ip).then(()=>{next()}).
    catch(()=>{
        logger.warn(`Rate limit exceed for the ${req.ip}`)
        res.status(429).json({
            success :  false,
            message : `Too many requests for this ${req.ip}`
        })
    })
});

//sensitive End points Rate limiter serving only 50 req for 15 minutes

const sensitiveEndPointRateLimiter = rateLimit({
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


//applying the sensitive end point limiter for the create post function to reduce the unusual traffic 
app.use("/api/posts/create-post" , sensitiveEndPointRateLimiter);

//routes
app.use('/api/posts' , (req , res , next)=>{
    req.redisClient = redisClient;
    next();
} , postRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        app.listen(PORT ,()=>{
            logger.info(`Post service running on port ${PORT}`)
        });

    } catch (e) {
        logger.error("failed to connect to the server" ,e);
        process.exit(1);
    }
}

startServer();

//unhandled promise rejection

process.on("unhandledRejection",(reason , promise)=>{
    logger.error("unhandled rejection at" , promise , "reason :" , reason);
})