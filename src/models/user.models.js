import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/ // Basic email validation regex
    },    
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true
    },
    bio: {
      type: String
    },
    city: {
      type: String
    },
    // avatar: {
    //   type: String, // Cloudinary URL
    //   required: true,
    // },
    // coverImage: {
    //   type: String, // Cloudinary URL
    // },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// Middleware to hash the password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to check if the entered password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate the access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      mobileNumber: this.mobileNumber,
      address: this.address,
      bio: this.bio,
      city: this.city
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // Fix the typo here (expiresIn, not expiresIN)
    }
  );
};

// Method to generate the refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // Fix the typo here as well
    }
  );
};

export const User = mongoose.model("User", userSchema);
