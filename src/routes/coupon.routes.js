// coupon.routes.js
import express from "express";
import { upload, handleMulterError } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
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
    cancelCouponRequest // New controller
} from "../controllers/coupon.controllers.js";

const router = express.Router();

// Routes with file upload
router.post("/", 
    verifyJWT, 
    upload.single('image'), 
    handleMulterError, 
    createCoupon
);

router.put("/:id", 
    verifyJWT, 
    upload.single('image'), 
    handleMulterError, 
    updateCoupon
);

// Other routes
router.get("/", verifyJWT, getCoupons);
router.post('/notifications/:notificationId/:action', verifyJWT, handleNotificationResponse);
router.get("/notifications", verifyJWT, getNotifications);
router.get("/others", verifyJWT, getOtherUserCoupons);
router.get("/user", verifyJWT, getUserCoupons);
router.get("/:id", verifyJWT, getCouponById);
router.delete("/:id", verifyJWT, deleteCoupon);
router.post("/:id/request-access", verifyJWT, requestCouponAccess);
router.post("/:id/cancel-request", verifyJWT, cancelCouponRequest); // New route

export default router;