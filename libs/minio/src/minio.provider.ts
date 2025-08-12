import * as Minio from 'minio';
import { environment } from './config';

export const MINIO_PROVIDER = 'MINIO_PROVIDER';

export const MinioProvider = {
  provide: MINIO_PROVIDER,
  useFactory: () => {
    const MinioProvider = new Minio.Client({
      endPoint: environment.MINIO.ENDPOINT,
      port: environment.MINIO.PORT,
      useSSL: environment.MINIO.USE_SSL,
      accessKey: environment.MINIO.ACCESS_KEY,
      secretKey: environment.MINIO.SECRET_KEY,
    });

    return MinioProvider;
  },
};
