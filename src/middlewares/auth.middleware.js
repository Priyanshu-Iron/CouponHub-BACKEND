import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Get token from cookies or Authorization header
        let token;
        
        if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
            // console.log("Token from cookie:", token);
        } else if (req.header("Authorization")) {
            const authHeader = req.header("Authorization");
            
            // Make sure the Authorization header follows the Bearer scheme
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7); // Remove "Bearer " prefix
                // console.log("Token from Authorization header:", token);
            } else {
                // console.log("Malformed Authorization header:", authHeader);
                throw new ApiError(401, "Authorization header must start with 'Bearer '");
            }
        }
        
        // Check if token exists
        if (!token || token === "undefined" || token === "null") {
            // console.log("No token provided");
            throw new ApiError(401, "No access token provided");
        }
        
        // Verify the token and handle specific errors
        try {
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            // console.log("Token verified successfully for user ID:", decodedToken?._id);
            
            // Find user by ID from token
            const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
            
            if (!user) {
                // console.log("User not found for ID:", decodedToken?._id);
                throw new ApiError(401, "Invalid Access Token - User not found");
            }
            
            // Attach user to request object
            req.user = user;
            next();
            
        } catch (jwtError) {
            // Handle specific JWT verification errors
            // console.error("JWT verification error:", jwtError.name, jwtError.message);
            
            if (jwtError.name === "TokenExpiredError") {
                throw new ApiError(401, "Access token has expired");
            } else if (jwtError.name === "JsonWebTokenError") {
                throw new ApiError(401, "Invalid token format");
            } else {
                throw new ApiError(401, "Token validation failed");
            }
        }
    } catch (error) {
        // If it's already an ApiError, pass it along, otherwise create a new one
        if (error instanceof ApiError) {
            throw error;
        } else {
            // console.error("Unexpected error in auth middleware:", error);
            throw new ApiError(500, "Authentication process failed");
        }
    }
});