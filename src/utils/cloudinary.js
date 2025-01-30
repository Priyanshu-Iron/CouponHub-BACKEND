import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCLOUDINARY = async (localFilePath) => {
    try {
        // Check if file exists
        if (!localFilePath) {
            console.error("No file path provided");
            return null;
        }

        // Check if file exists on disk
        if (!fs.existsSync(localFilePath)) {
            console.error("File does not exist at path:", localFilePath);
            return null;
        }

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // console.log("Cloudinary upload successful. URL:", response.url);
        
        // Clean up: remove the local file
        fs.unlinkSync(localFilePath);
        
        return response;

    } catch (error) {
        console.error("Error in uploadOnCLOUDINARY:", error);
        
        // Clean up: remove the local file if it exists
        try {
            if (localFilePath && fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (unlinkError) {
            console.error("Error deleting local file:", unlinkError);
        }
        
        return null;
    }
}

// Add a verification function to check Cloudinary configuration
const verifyCloudinaryConfig = () => {
    const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('Missing Cloudinary configuration:', missing);
        return false;
    }
    return true;
}

// Verify configuration on module load
if (!verifyCloudinaryConfig()) {
    console.error('Cloudinary configuration is incomplete');
}

export { uploadOnCLOUDINARY };