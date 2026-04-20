const logger = require("../utils/logger");
const {uploadMediaToCloudinary} = require("../utils/cloudinary")
const Media = require("../models/Media");
const uploadMedia = async(req , res)=>{
    try {
        if(!req.file){
            logger.error('No file found . Please add a file and try again!');
            return res.status(400).json({
                success : false,
                message : 'No file found . Please add a file and try again!'
            })
        }

        const {originalname , mimetype , buffer} = req.file;
        const userId = req.user.userId;
        logger.info(`File details: name = ${originalname} , type = ${mimetype}`);
        logger.info("Uploading to the cloudinary starting...");

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
        logger.info(`Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`);
        const newlyCreatedMedia = new Media({
            publicId : cloudinaryUploadResult.public_id,
            originalName : originalname,
            mimiType : mimetype,
            url : cloudinaryUploadResult.secure_url,
            userId
        });
        await newlyCreatedMedia.save();
        return res.status(201).json({
            success : true,
            mediaId : newlyCreatedMedia._id,
            url : newlyCreatedMedia.url,
            message : "Media upload is successfully"
        })
    } catch (error) {
        logger.error("Error creating the post" , error);
        res.status(500).json({
            success : false,
            message : "Error in uploading the files"
        });
    }
}


module.exports = {uploadMedia};