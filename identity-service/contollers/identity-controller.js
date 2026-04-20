const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const logger = require("../utils/logger");
const {registrationValidation , loginValidation} = require("../utils/validation");


//register User
const registerUser = async (req , res) => {
    logger.warn("Registration end point hit ..");
    try {
        
        const {error} = registrationValidation(req.body);
        if (error){
            logger.warn("Registraion Validation error" , error.details[0].message)
            return res.status(400).json({
                success : false,
                message : error.details[0].message})
        }
        const {userName , email , password} = req.body;
        let user = await User.findOne({$or: [{userName} , {email}]});
        if(user){
            logger.warn("User already exist ");
            return res.status(400).json({
                success :  false ,
                message : "User already exist"
            })
        } 
        user = new User({userName , email , password })
        await user.save();
        logger.warn("User created successfully !");
        const {accessToken , refreshToken} = await generateToken(user);
        return res.status(201).json({
            success : true ,
            message  : "User created successfully",
            accessToken,
            refreshToken
        })
    } catch (error) {
        logger.error("Registration error occurred",{
            message : error.message,
            stack : error.stack
        });
        return res.status(500).json({
            success : false,
            message : error.message
        })
    }
}

//user Login
const loginUser = async (req , res)=>{
    logger.warn('Login end point hit !');
    try {
        const {error} = loginValidation(req.body);
        if (error){
            logger.warn("Login Validation error" , error.details[0].message)
            return res.status(400).json({
                success : false,
                message : error.details[0].message})
        }
        const {email ,password} = req.body;
        const existingUser = await User.findOne({email});
        if(!existingUser){
            logger.warn("User not found ");
            return res.status(400).json({
                success:false,
                message : "User not found!"
            })
        } 
        const isMatch = await existingUser.comparePassword(password);
        if(!isMatch){
            logger.warn("Password incorrect!");
            res.status(400).json({
                success:false,
                message :"Password not matches !"
            })
        };

        const {accessToken , refreshToken} = await generateToken(existingUser);

        logger.warn("User Logged in suucessfully");
        return res.status(200).json({
            success:true,
            message : "User Logged in successfully!",
            accessToken,
            refreshToken,
            userId : existingUser._id
        })
    } catch (error) {
        logger.error("Login error occurred",{
            message : error.message,
            stack : error.stack
        });
        return res.status(500).json({
            success : false,
            message : error.message
        })
    }
}


//refreshToken
const refreshTokenUser = async(req , res)=>{
    logger.info("Refresh End point hit");
    try {
        const {refreshToken} = req.body;
        if(!refreshToken){
            logger.warn("Refresh Token is missing");
            return res.status(401).json({
                success : false,
                message : "Refresh Token is missing "
            })
        }
        const storedToken = await RefreshToken.findOne({token:refreshToken});
        if(!storedToken || storedToken.expiresAt < new Date()){
            logger.warn("Invalid or Expired Token");
            res.status(401).json({
                success : false,
                message : "Invalid or Expired Token"
            });
        }
        const user = await User.findById(storedToken.user);
        if(!user){
            logger.warn("Invalid User");
            res.status(401).json({
                success : false,
                message : "Invalid User"
            });
        }
        const {accessToken : newAccessToken , refreshToken : newRefreshToken} = await generateToken(user);

        //delete the old refresh token
        await RefreshToken.deleteOne({_id:storedToken._id});
        res.json({
            accessToken : newAccessToken,
            refreshToken : newRefreshToken
        }) 

    } catch (error) {
        logger.error("RefreshToken error occured ");
        res.status(500).json({
            success :  false,
            message : "Internal server error"
        })
    }
}

//logout
const logoutUser = async (req , res)=>{
    logger.warn("Logout end point hit");
    try {
        const {refreshToken} = req.body;
        if(!refreshToken){
            logger.warn("Refresh Token is missing");
            return res.status(400).json({
                success : false,
                message : "Refresh Token is missing"
            });
        }

        await RefreshToken.deleteOne({token : refreshToken});
        logger.info("Refresh token is deleted for the logout");
        res.json({
            success :  true,
            message :  "Logged out the user successfully"
        })
    } catch (e) {
        logger.error("Error occured in the Logout" , e)
    }
}
module.exports = {registerUser , loginUser , refreshTokenUser , logoutUser}