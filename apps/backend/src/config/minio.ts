import * as Minio from 'minio'

const parseBoolean = (value?: string) => {
    if (!value) return false;
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const useSSL = parseBoolean(process.env.MINIO_USE_SSL);
const port = Number(process.env.MINIO_PORT || (useSSL ? 443 : 9000));

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "",
    port,
    useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || "",
    secretKey: process.env.MINIO_SECRET_KEY || "",
    region: process.env.MINIO_REGION || 'us-east-1',
})

export default minioClient;
