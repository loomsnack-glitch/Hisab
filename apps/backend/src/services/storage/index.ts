import * as minioService from '../minio/minio.service.js';

const storageProvider = process.env.STORAGE_PROVIDER || 'minio';

const getStorageService = () => {
    switch (storageProvider.toLowerCase()) {
        case 'minio':
            return minioService;
        default:
            throw new Error(`Unsupported storage provider: ${storageProvider}`);
    }
};

const storageService = getStorageService();

export const listObjects = (bucketName: string, prefix: string) =>
    storageService.listObjects(bucketName, prefix);

export const getObject = (bucketName: string, key: string) =>
    storageService.getObject(bucketName, key);

export const uploadObject = (bucketName: string, key: string, body: string, mimetype: string) =>
    storageService.uploadObject(bucketName, key, body, mimetype);

export const generateSignedUrl = (bucketName: string, key: string, expiresIn?: number) =>
    storageService.generateSignedUrl(bucketName, key, expiresIn);

export const generateSignedUrlBeta = (bucketName: string, key: string, expiresIn: number, fileName: string) =>
    storageService.generateSignedUrlBeta(bucketName, key, expiresIn, fileName);

export const generateUploadSignedUrl = (bucketName: string, key: string, expiresIn?: number) =>
    storageService.generateUploadSignedUrl(bucketName, key, expiresIn);

export const deleteObject = (bucketName: string, key: string) =>
    storageService.deleteObject(bucketName, key);