const logger  = require('../utils/logger');
const jwt = require('jsonwebtoken');
const validateToken = (req , res , next)=>{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    if(!token){
        logger.warn("Access attempt without the token");
        return res.status(401).json({
            success : false ,
            message : "Authentication Failed"
        })
    }
    jwt.verify(token , process.env.SECRET_KEY,(err,user)=>{
        if(err){
            logger.warn("Invalid token");
            return res.status(401).json({
                success : false,
                message : "Invalid token"
            })
        }
        req.user = user;// actually it is nothing but the const {decoded} = jwt.verify(toke,secret) , that decoded is user
        next();
    });
    
}

module.exports = {validateToken};