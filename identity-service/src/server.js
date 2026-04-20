require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors  = require('cors')
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const {RateLimiterRedis} = require('rate-limiter-flexible');
const Redis = require('ioredis');
const {rateLimit} = require('express-rate-limit');
const {RedisStore} = require('rate-limit-redis')
const routes = require('../routes/identity-service');
const errorHandler = require('../middleware/errorHandler')
const app = express();
const PORT = process.env.PORT || 3001;
//connect Mongob
mongoose.connect(process.env.MONGO_URI).then(()=>{
    logger.info("Connected to mongodb");
}).catch((e)=>{
    logger.error("Mongo connection err" , e)
})

const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req , res , next)=>{
    logger.info(`recieved ${req.method} request to ${req.url}`);
    logger.info(`request body: ${JSON.stringify(req.body)}`);
    next(); 
})


//DDos Protection and rate-Limiting
const rateLimiter = new RateLimiterRedis({
    storeClient : redisClient,
    keyPrefix : 'middleware',
    points : 10,
    duration : 1
})

app.use((req , res , next)=>{
    rateLimiter.consume(req.ip).then(()=>{next()}).
    catch(()=>{
        logger.warn(`Rate limit exceeds for IP : ${req.ip}`);
        res.status(429).json({success : false , message : "Too many requests"});
    })
})


//ip based rate limiting for the sensitive end points
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


//apply this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register' , sensitiveEndpointLimiter);

//Routes
app.use('/api/auth' , routes);

//error Handler
app.use(errorHandler);

app.listen(PORT , ()=>{
    logger.info(`Identity service running on port ${PORT}`)
})

//unhandled promise rejection
//This is the global .catch handler , if we forgot , here we can catch it and protects the app from the crash
process.on('unhandledRejection', (reason, promise) => {
    logger.error("Unhandled Rejection", {
        promise,
        reason: reason instanceof Error ? reason.stack : reason
    });
});