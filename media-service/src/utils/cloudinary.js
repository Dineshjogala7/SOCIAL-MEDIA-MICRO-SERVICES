const logger = require("./logger");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key : process.env.API_KEY,
    api_secret : process.env.API_SECRET
});


//This way  , we are ssending the file buffer directly to the cloudinary , No intermediate disk storage 
const uploadMediaToCloudinary = (file)=>{
    return new Promise((resolve , reject)=>{
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type : "auto"
            },
            (error, result)=>{
                if(error){
                    logger.error("Error while uploading the media to cloudinary" ,error);
                    reject(error);
                }else{
                    resolve(result);
                }
            }
        );
        uploadStream.end(file.buffer);
    })
}

//delete data from the cloudinary 
const deleteMediaFromCloudinary = async(publicId)=>{
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        logger.info('media deleted from cloud storage' , publicId);
        return result;
    } catch (error) {
        logger.error('Error deleting media from cloudinary' , error);
        throw error
    }
}

module.exports = {uploadMediaToCloudinary , deleteMediaFromCloudinary}