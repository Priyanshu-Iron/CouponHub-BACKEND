import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCLOUDINARY } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // console.log("Request Body:", req.body);
    // console.log("Request Files:", req.files);

    const { fullName, email, username, password, mobileNumber, address, bio, city } = req.body;

    if ([fullName, email, username, password, mobileNumber, address, bio, city].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User With email or username already exists");
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // let coverImageLocalPath;
    // if (req.files?.coverImage && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path;
    // }

    // if (!avatarLocalPath) {
    //     throw new ApiError(400, "Avatar file is required");
    // }

    // const avatar = await uploadOnCLOUDINARY(avatarLocalPath);
    // const coverImage = await uploadOnCLOUDINARY(coverImageLocalPath);

    // if (!avatar) {
    //     throw new ApiError(400, "Avatar file upload failed");
    // }

    const user = await User.create({
        fullName,
        // avatar: avatar.url,
        // coverImage: coverImage?.url || "",
        email,
        password,
        mobileNumber,
        address,
        bio,
        city,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    // console.log("Request Body:", req.body);
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail) {
        throw new ApiError(400, "Username or email is required");
    }

    const isEmail = /\S+@\S+\.\S+/;
    const user = await User.findOne({
        $or: [
            { username: usernameOrEmail },
            { email: isEmail.test(usernameOrEmail) ? usernameOrEmail : undefined }
        ]
    });

    if (!user) {
        throw new ApiError(404, "User Not Found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: false
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged In Successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        if (!user || incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid or expired refresh token");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false
        };

        const { accessToken, recogniseToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken");
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
    const { fullName, email, username, mobileNumber, address, bio, city } = req.body;

    // Validate email format if provided
    if (email) {
        const isValidEmail = /\S+@\S+\.\S+/.test(email);
        if (!isValidEmail) {
            throw new ApiError(400, "Invalid email format");
        }
    }

    // Validate username format if provided (e.g., no spaces, minimum length)
    if (username) {
        if (username.includes(" ") || username.length < 3) {
            throw new ApiError(400, "Username must be at least 3 characters long and contain no spaces");
        }
    }

    // Check if email or username is already taken
    if (email || username) {
        const existingUser = await User.findOne({
            $and: [
                { _id: { $ne: req.user?._id } },
                {
                    $or: [
                        { email: email || "" },
                        { username: username || "" }
                    ]
                }
            ]
        });

        if (existingUser) {
            throw new ApiError(409, "Email or username is already taken");
        }
    }

    // Process avatar file if uploaded
    let avatarUrl;
    if (req.files?.avatar && req.files.avatar.length > 0) {
        const avatarLocalPath = req.files.avatar[0].path;
        const avatar = await uploadOnCLOUDINARY(avatarLocalPath);
        
        if (avatar) {
            avatarUrl = avatar.url;
        }
    }

    // Process cover image if uploaded
    let coverImageUrl;
    if (req.files?.coverImage && req.files.coverImage.length > 0) {
        const coverLocalPath = req.files.coverImage[0].path;
        const coverImage = await uploadOnCLOUDINARY(coverLocalPath);
        
        if (coverImage) {
            coverImageUrl = coverImage.url;
        }
    }

    // Build updateData object with only provided fields
    const updateData = {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(username && { username: username.toLowerCase() }),
        ...(mobileNumber && { mobileNumber }),
        ...(address && { address }),
        ...(bio && { bio }),
        ...(city && { city }),
        ...(avatarUrl && { avatar: avatarUrl }),
        ...(coverImageUrl && { coverImage: coverImageUrl })
    };

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        updateData,
        { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(500, "Failed to update user profile");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// Update user password
const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both old and new passwords are required");
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Verify old password
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid old password");
    }

    // Update password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateUserProfile,
    updatePassword
};