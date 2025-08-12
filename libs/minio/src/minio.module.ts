import { Module } from '@nestjs/common';
import { MinioProvider } from './minio.provider';
import { MinioService } from './services';

@Module({
  providers: [MinioService, MinioProvider],
  exports: [MinioService],
})
export class MinioModule {}
