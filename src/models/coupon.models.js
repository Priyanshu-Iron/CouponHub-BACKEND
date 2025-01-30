import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    name: { type: String, required: true },
    couponCode: { type: String, required: true },
    place: { type: String, required: true },
    couponDescription: { type: String, required: true },
    couponValue: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    owner: { type: String, required: true },
    image: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isCodeVisible: { type: Boolean, default: false },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notifications: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String },
        status: { type: String, enum: ['pending', 'accepted', 'declined'] },
        couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
        couponName: { type: String },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }]
});

export const Coupon = mongoose.model('Coupon', couponSchema);