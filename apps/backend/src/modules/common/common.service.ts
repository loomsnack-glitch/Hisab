import { STATUS_CODES, type ServiceResponse } from "@repo/types";
import { generateSignedUrl, generateUploadSignedUrl } from "@/services/storage";

const bucketName = (
    process.env.STORAGE_PROVIDER === "s3"
        ? process.env.AWS_BUCKET_NAME
        : process.env.MINIO_BUCKET_NAME
) || "";

const getBucketName = (): ServiceResponse<never> | string => {
    if (!bucketName) {
        return {
            status: "error",
            message: "Storage bucket is not configured",
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return bucketName;
};

export const getSignedURL = async (path: string): Promise<ServiceResponse<string>> => {
    const resolvedBucketName = getBucketName();
    if (typeof resolvedBucketName !== "string") {
        return resolvedBucketName;
    }

    const signedURL = await generateSignedUrl(resolvedBucketName, path);
    if (!signedURL) {
        return {
            status: "error",
            message: "Failed to generate signed URL",
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        message: "Signed URL generated successfully",
        data: signedURL,
        code: STATUS_CODES.SUCCESS,
    };
};

export const getSignedURLForUpload = async (path: string): Promise<ServiceResponse<string>> => {
    const resolvedBucketName = getBucketName();
    if (typeof resolvedBucketName !== "string") {
        return resolvedBucketName;
    }

    const signedURL = await generateUploadSignedUrl(resolvedBucketName, path);
    if (!signedURL) {
        return {
            status: "error",
            message: "Failed to generate signed URL",
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        message: "Signed URL generated successfully",
        data: signedURL,
        code: STATUS_CODES.SUCCESS,
    };
};
