const logger = require("../utils/logger");
const Post = require("../models/Post");
const {validateCreatePost} = require("../utils/validation");
const {publishEvent} = require("../utils/rabbitmq");

//Invalidate Cache Keys otherwise same data will be repeated

async function invalidatePostCache(req ,input) {
    const cachedKey = `posts:${input}`
    await req.redisClient.del(cachedKey);

    const keys = await req.redisClient.keys('posts:*');
    if(keys.length > 0){
        await req.redisClient.del(...keys);
    }   
}

//create Post
const createPost = async(req , res)=>{
    logger.info('Create-post end point hit')
    try {
        const {error} = validateCreatePost(req.body);
        if (error){
            logger.warn("Post  Validation error" , error.details[0].message)
            return res.status(400).json({
                success : false,
                message : error.details[0].message})
        }
        const {content , mediaIds} = req.body;
        const newlyCreatedPost = new Post({
            user : req.user.userId,
            content,
            mediaIds : mediaIds || []
        })
        await newlyCreatedPost.save();
        await invalidatePostCache(req , newlyCreatedPost._id.toString());

        await publishEvent('post.created',{
            postId : newlyCreatedPost._id.toString(),
            userId : newlyCreatedPost.user.toString(),
            content : newlyCreatedPost.content,
            createdAt : newlyCreatedPost.createdAt
        })
        logger.info('post created successfully' , newlyCreatedPost);
        res.status(201).json({
            success :  true,
            message : "Post created successfully"
        })
    } catch (error) {
        logger.error("Error in create Post" , error.message);
        res.status(500).json({
            success :  false,
            message : "Error in create post",
        })
    }
}

//get All post 
const  getAllPosts = async(req , res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit)||10;
        const startIndex = (page - 1)*limit;
        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find({}).sort({createdAt : -1}).skip(startIndex).limit(limit);
        const totalNoOfPosts = await Post.countDocuments();

        const result = {
            posts,
            currentPage : page,
            totalPages : Math.ceil(totalNoOfPosts/limit),
            totalPosts : totalNoOfPosts
        }
        //cache This data in the redis Cache
        await req.redisClient.setex(cacheKey , 300 , JSON.stringify(result));
        return res.json(result);
    } catch (error) {
        logger.error("Error in getting all posts" , error.message);
        res.status(500).json({
            success :  false,
            message : "Error in getting all posts" ,
        })

    }
}

//Get a single post by ID

const  getPost = async(req , res)=>{
    try {
        const postId = req.params.id;
        const cacheKey = `posts:${postId}`;
        const cachedPost = await req.redisClient.get(cacheKey);

        if(cachedPost){
            return res.json(JSON.parse(cachedPost));
        }
        const singlePostById = await Post.findById(postId);
        if(!singlePostById){
            return res.status(404).json({
                success : false,
                message : "Post not found"
            })
        }
        await req.redisClient.setex(cacheKey , 300 , JSON.stringify(singlePostById));
        return res.json(singlePostById);
    } catch (error) {
        logger.error("Error in fecthing post by id" , error.message);
        res.status(500).json({
            success :  false,
            message : "Error in fetching post by ID" ,
        })

    }
}

//delete a post by ID
const  deletePost = async(req , res)=>{
    try {
        const postId = req.params.id;
        const userId = req.user.userId;
        if(!postId){
            return res.status(404).json({
                success :  false,
                message : "Invalid post "
            });
        }
        const deletedPost = await Post.findByIdAndDelete({
            _id:postId,
            user : userId
        });
        if(!deletedPost){
            return res.status(400).json({
                success : false,
                message : "Post not found "
            })
        }


        //publishing the post.deleted method to make media delete
        await publishEvent("post.deleted",{
            postId : deletedPost._id.toString(),
            userId : req.user.userId,
            mediaIds : deletedPost.mediaIds
        })
        await invalidatePostCache(req , postId);
        
        return res.json({
            message : 'Post deleted successfully'
        });
    } catch (error) {
        logger.error("Error in deleting a post by id" , error.message);
        res.status(500).json({
            success :  false,
            message : "Error in deleting a post by ID" ,
        })

    }
}


module.exports = {createPost , getAllPosts , getPost , deletePost}