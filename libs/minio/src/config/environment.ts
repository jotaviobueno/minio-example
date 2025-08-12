export const environment = {
  MINIO: {
    ACCESS_KEY: process.env.MINIO_ACCESS_KEY!,
    SECRET_KEY: process.env.MINIO_SECRET_KEY!,
    ENDPOINT: process.env.MINIO_ENDPOINT!,
    PORT: +process.env.MINIO_PORT!,
    BUCKET_NAME: process.env.MINIO_BUCKET_NAME!,
    USE_SSL: process.env.MINIO_USE_SSL! === 'true',
  },
};
