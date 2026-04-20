require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const {connectToRabbitMQ , consumeEvent} = require("./utils/rabbitmq");
const searchRoutes = require("./routes/search-routes");
const { handlePostCreated  , handlePostDeleted} = require('./event-handlers/search-event-handlers');

const app = express();
const PORT = process.env.PORT || 3004;

//connect to mongodb
mongoose.connect(process.env.MONGO_URI).then(()=>{
    logger.info(`mongo uri ${process.env.MONGO_URI}`)
    logger.info("Connected to mongodb");
}).catch((e)=>{
    logger.error("Mongo connection error ",e)
});

const redisClient = new Redis(process.env.REDIS_URL);

//middleware 
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req,res,next)=>{
    logger.info(`recieved ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
})

//implemet the rateLimiting 
//implement the Redis Cachin 

app.use("/api/search" , searchRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await connectToRabbitMQ();
        //consume the events 
        await consumeEvent('post.created' , handlePostCreated);
        await consumeEvent('post.deleted' , handlePostDeleted);
        app.listen(PORT , ()=>{
            logger.info(`Search service is running on the port : ${PORT}`)
        })
    } catch (error) {
        logger.error(error ,'Failed to start search service');
        process.exit(1);
    }
}

startServer();