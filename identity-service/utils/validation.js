const Joi = require("joi");

const registrationValidation =  (data)=>{
    const schema = Joi.object({
        userName : Joi.string().min(3).max(50).required(),
        email : Joi.string().email().required(),
        password : Joi.string().min(6).required()
    })
    return schema.validate(data);
}

const loginValidation =  (data)=>{
    const schema = Joi.object({
        
        email : Joi.string().email().required(),
        password : Joi.string().min(6).required()
    })
    return schema.validate(data);
}
module.exports = {registrationValidation ,loginValidation}