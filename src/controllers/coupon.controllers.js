import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Coupon } from "../models/coupon.models.js";
import { uploadOnCLOUDINARY } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Controller to create a new coupon.
 */
const createCoupon = asyncHandler(async (req, res) => {
    try {
        // console.log("Request body:", req.body);
        // console.log("Request file:", req.file);
        
        const { name, couponCode, place, couponDescription, couponValue, expiryDate, owner } = req.body;

        // Validate input fields
        if ([name, couponCode, place, couponDescription, couponValue, expiryDate, owner].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        // Check if a coupon with the same name and owner exists
        // const existingCoupon = await Coupon.findOne({ name, owner });
        // if (existingCoupon) {
        //     throw new ApiError(409, "Coupon with the same name and owner already exists");
        // }

        let imageUrl = "";
        if (req.file) {
            // console.log("Uploading file to Cloudinary...");
            const uploadResult = await uploadOnCLOUDINARY(req.file.path);
            
            if (!uploadResult) {
                throw new ApiError(400, "Image upload to Cloudinary failed");
            }
            
            imageUrl = uploadResult.url;
            // console.log("Cloudinary upload successful, URL:", imageUrl);
        }

        // console.log("Creating coupon in database...");
        const newCoupon = await Coupon.create({
            name, 
            couponCode, 
            place, 
            couponDescription, 
            couponValue, 
            expiryDate, 
            owner,
            image: imageUrl,
            userId: req.user._id
        });

        // console.log("Coupon created successfully:", newCoupon);

        return res.status(201).json(
            new ApiResponse(201, newCoupon, "Coupon created successfully")
        );

    } catch (error) {
        console.error("Error in createCoupon:", error);
        throw error;
    }
});

/**
 * Controller to get all coupons.
 */
const getCoupons = asyncHandler(async (req, res) => {
    const coupons = await Coupon.find();

    if (!coupons || coupons.length === 0) {
        throw new ApiError(404, "No coupons found");
    }

    return res.status(200).json(new ApiResponse(200, coupons, "Coupons fetched successfully"));
});

/**
 * Controller to fetch a single coupon by ID.
 */
const getCouponById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
        throw new ApiError(404, "Coupon not found");
    }

    return res.status(200).json(new ApiResponse(200, coupon, "Coupon fetched successfully"));
});

/**
 * Controller to update a coupon by ID.
 */
const updateCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, couponCode, place, couponDescription, couponValue, expiryDate, owner } = req.body;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
        throw new ApiError(404, "Coupon not found");
    }

    if (req.file) {
        // Update image if a new one is uploaded
        const image = await uploadOnCLOUDINARY(req.file.path);
        if (!image) {
            throw new ApiError(400, "Image upload failed");
        }
        coupon.image = image.url;
    }

    // Update other fields (only if provided in request)
    coupon.name = name || coupon.name;
    coupon.place = place || coupon.place;
    coupon.expiryDate = expiryDate || coupon.expiryDate;
    coupon.owner = owner || coupon.owner;

    await coupon.save();

    return res.status(200).json(new ApiResponse(200, coupon, "Coupon updated successfully"));
});

/**
 * Controller to delete a coupon by ID.
 */
const deleteCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
        throw new ApiError(404, "Coupon not found");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Coupon deleted successfully"));
});

const getUserCoupons = asyncHandler(async (req, res) => {
    const userId = req.user._id; // Get the user ID from the authenticated user

    // Find all coupons associated with the user
    const coupons = await Coupon.find({ userId });

    if (!coupons || coupons.length === 0) {
        throw new ApiError(404, "No coupons found for this user");
    }

    return res.status(200).json(new ApiResponse(200, coupons, "User coupons fetched successfully"));
});

const getOtherUserCoupons = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // Get all coupons not owned by the current user
    let coupons = await Coupon.find({ userId: { $ne: userId } })
        .populate('userId', 'username')
        .select('name place couponDescription couponValue expiryDate owner image isCodeVisible allowedUsers couponCode notifications');
    
    if (!coupons || coupons.length === 0) {
        throw new ApiError(404, "No other user coupons found");
    }
    
    // Map through coupons and handle code visibility
    const mappedCoupons = coupons.map(coupon => {
        const couponObj = coupon.toObject();
        
        // Show code if user is in allowedUsers array
        const isAllowed = couponObj.allowedUsers.some(id => id.toString() === userId.toString());
        
        // Check if there's an accepted notification for this user
        const hasAcceptedRequest = couponObj.notifications.some(notification => 
            notification.userId.toString() === userId.toString() && 
            notification.status === 'accepted'
        );
        
        // Only show code if user is allowed or has accepted request
        if (!isAllowed && !hasAcceptedRequest) {
            couponObj.couponCode = '****-****-****';
        }
        
        return couponObj;
    });
    
    return res.status(200).json(
        new ApiResponse(200, mappedCoupons, "Other user coupons fetched successfully")
    );
});

const requestCouponAccess = asyncHandler(async (req, res) => {
    const { id: couponId } = req.params;
    const userId = req.user._id;
    
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
        throw new ApiError(404, "Coupon not found");
    }
    
    // Create notification with coupon details
    const notification = {
        userId: userId,
        message: `User ${req.user.username} has requested access to your coupon "${coupon.name}"`,
        read: false,
        status: 'pending',
        couponId: coupon._id,
        couponName: coupon.name // Add the coupon name directly to the notification
    };
    
    coupon.notifications.push(notification);
    await coupon.save();
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Access request sent successfully")
    );
});

const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // Find coupons and populate necessary fields
    const coupons = await Coupon.find({ userId })
        .select('notifications name')
        .populate({
            path: 'notifications.userId',
            select: 'username'
        })
        .populate({
            path: 'notifications.couponId',
            select: 'name'
        });
    
    // Map notifications with proper coupon information
    const notifications = coupons.flatMap(coupon => 
        coupon.notifications.map(notification => ({
            ...notification.toObject(),
            couponName: notification.couponId ? notification.couponId.name : coupon.name
        }))
    );
    
    return res.status(200).json(
        new ApiResponse(
            200, 
            notifications,
            notifications.length > 0 ? "Notifications fetched successfully" : "No notifications found"
        )
    );
});

const handleNotificationResponse = asyncHandler(async (req, res) => {
    const { notificationId, action } = req.params;
    const userId = req.user._id;

    const coupon = await Coupon.findOne({
        'notifications._id': notificationId
    });

    if (!coupon) {
        throw new ApiError(404, "Notification not found");
    }

    const notification = coupon.notifications.id(notificationId);
    const requestingUserId = notification.userId;

    if (action === 'accept') {
        // Add user to allowed users if not already added
        if (!coupon.allowedUsers.includes(requestingUserId)) {
            coupon.allowedUsers.push(requestingUserId);
        }
        notification.status = 'accepted';

        // Update notification for requesting user
        const userNotification = {
            userId: coupon.userId,
            message: `Your request for access to coupon "${coupon.name}" has been accepted. You can now view the coupon code.`,
            status: 'accepted',
            couponId: coupon._id,
            couponName: coupon.name
        };

        await Coupon.findOneAndUpdate(
            { userId: requestingUserId },
            { $push: { notifications: userNotification } }
        );
    } else if (action === 'decline') {
        notification.status = 'declined';
        
        const userNotification = {
            userId: coupon.userId,
            message: `Your request for access to coupon "${coupon.name}" has been declined.`,
            status: 'declined',
            couponId: coupon._id,
            couponName: coupon.name
        };

        await Coupon.findOneAndUpdate(
            { userId: requestingUserId },
            { $push: { notifications: userNotification } }
        );
    }

    await coupon.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            { status: notification.status },
            `Request ${action}ed successfully`
        )
    );
});

export {
    createCoupon,
    getCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    getUserCoupons,
    getOtherUserCoupons,
    requestCouponAccess,
    handleNotificationResponse,
    getNotifications,
};