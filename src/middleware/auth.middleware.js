import jwt from "jsonwebtoken";

import User from "../models/user.js";

const protectRoute=async(req,res,next)=>{
    try {
        //get token
         const token = authHeader.replace("Bearer ", "").trim();
         if(!token) return res.status(401).json({message:"No authentication token,access denied"});
        //verfy the token
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        //find user
        const user =await User.findById(decoded.userId).select("-password")
        if(!user) return res.status(401).json({message:"token are not valid"});
       
        req.user=user;
        next();
    } catch (error) {
        console.error("Authrntication error",error.message);
        res.status(401).json({message:"Token is not valid"});
    }
}
export default protectRoute;