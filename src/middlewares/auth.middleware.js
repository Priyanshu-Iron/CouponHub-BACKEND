import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    // Retrieve token from cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
    // Check if token is missing
    if (!token) {
        throw new ApiError(401, "No access token provided");
    }
    
    // Verify and decode token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    // Find user by decoded ID and exclude sensitive fields
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(401, "Invalid Access Token");
    }
    
    // Attach user to the request object for further access
    req.user = user;
    next();

});
