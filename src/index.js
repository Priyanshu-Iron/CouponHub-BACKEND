// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
dotenv.config();
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({path:'./.env'})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`⚙️ Server is running at Port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO DB connection failed !!! ",err);
})





/*
import express from "express";
const app = express()

(async ()=>{
    try {
        mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("ERROR",(error)=>{
            console.log("ERROR : ",error);
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
            
        })
    } catch (error) {
        console.log("ERROR : ",error);
        throw err
    }
})()
    */