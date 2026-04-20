const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema   = new mongoose.Schema({
    userName: {
        type:String,
        required : true ,
        unique:true,
        trim :  true
    },
    email : {
        type :  String,
        required: true,
        unique :  true,
        lowercase: true,
        trim :  true
    },
    password : {
        type :String,
        required :  true
    },
    createdAt : {
        type:Date,
        default : Date.now
    }
},{timestamps : true})

userSchema.pre("save" , async function(){
    if(this.isModified('password')){
        try {
            this.password = await argon2.hash(this.password)
        } catch (error) {
            return next(error)
        }
    }
    
})

userSchema.methods.comparePassword = async function (candidatepassword){
    try {
        return await argon2.verify(this.password , candidatepassword )
    } catch (error) {
        throw error
    }

}

userSchema.index({userName : 'text'})

const User = mongoose.model("User" , userSchema)

module.exports = User;