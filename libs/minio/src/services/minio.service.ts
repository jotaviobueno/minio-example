import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { environment } from '../config';
import { MINIO_PROVIDER } from '../minio.provider';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName = environment.MINIO.BUCKET_NAME;

  constructor(
    @Inject(MINIO_PROVIDER)
    private readonly minioClient: Minio.Client,
  ) {}

  async onModuleInit() {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);

      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket '${this.bucketName}' criado com sucesso`);
      }

      const publicPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: ['*'],
            },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(
        this.bucketName,
        JSON.stringify(publicPolicy),
      );
    } catch (err) {
      this.logger.error(`Erro ao inicializar MinIO: ${err.message}`);
      throw err;
    }
  }

  /**
   * Faz upload de um arquivo para o MinIO
   * @param file Buffer do arquivo
   * @param objectName Nome do objeto no MinIO
   * @returns File preview URL
   */
  async uploadFile(
    file: Express.Multer.File,
    objectName: string,
  ): Promise<string> {
    try {
      const metaData = {
        'Content-Type': file.mimetype,
      };

      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file.buffer,
        file.size,
        metaData,
      );

      const filePreviewUrl = this.getPublicUrl(objectName);

      return filePreviewUrl;
    } catch (err) {
      this.logger.error(`Erro ao fazer upload: ${err.message}`);
      throw new Error(`Falha no upload do arquivo: ${err.message}`);
    }
  }

  /**
   * Recupera um arquivo do MinIO
   * @param objectName Nome do objeto no MinIO
   * @returns Stream do arquivo
   */
  async getFile(objectName: string): Promise<NodeJS.ReadableStream> {
    try {
      return await this.minioClient.getObject(this.bucketName, objectName);
    } catch (err) {
      this.logger.error(`Erro ao recuperar arquivo: ${err.message}`);
      throw new Error(`Falha ao recuperar arquivo: ${err.message}`);
    }
  }

  /**
   * Recupera um arquivo como Buffer
   * @param objectName Nome do objeto no MinIO
   * @returns Buffer com o conteúdo do arquivo
   */
  async getFileAsBuffer(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(
        this.bucketName,
        objectName,
      );
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (err) {
      this.logger.error(`Erro ao recuperar arquivo: ${err.message}`);
      throw new Error(`Falha ao recuperar arquivo: ${err.message}`);
    }
  }

  /**
   * Gera uma URL pré-assinada para acesso temporário
   * @param objectName Nome do objeto
   * @param expirySeconds Tempo em segundos para expiração da URL
   * @returns URL pré-assinada
   */
  async generatePresignedUrl(objectName: string): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
      );
    } catch (err) {
      this.logger.error(`Erro ao gerar URL: ${err.message}`);
      throw new Error(`Falha ao gerar URL: ${err.message}`);
    }
  }

  /**
   * Remove um arquivo do MinIO
   * @param objectName Nome do objeto
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (err) {
      this.logger.error(`Erro ao excluir arquivo: ${err.message}`);
      throw new Error(`Falha ao excluir arquivo: ${err.message}`);
    }
  }

  /**
   * Lista objetos em um bucket
   * @param prefix Prefixo para filtrar objetos (opcional)
   * @param recursive Busca recursiva (opcional)
   * @returns Lista de objetos
   */
  async listObjects(prefix = '', recursive = true): Promise<any[]> {
    try {
      const objectStream = this.minioClient.listObjects(
        this.bucketName,
        prefix,
        recursive,
      );

      return new Promise((resolve, reject) => {
        const objects: any[] = [];

        objectStream.on('data', (obj) => {
          objects.push(obj);
        });

        objectStream.on('end', () => {
          resolve(objects);
        });

        objectStream.on('error', (err) => {
          reject(err);
        });
      });
    } catch (err) {
      this.logger.error(`Erro ao listar objetos: ${err.message}`);
      throw new Error(`Falha ao listar objetos: ${err.message}`);
    }
  }

  getPublicUrl(objectName: string): string {
    const endpoint = environment.MINIO.ENDPOINT;
    const port = environment.MINIO.PORT;
    const useSSL = environment.MINIO.USE_SSL;

    const protocol = useSSL ? 'https' : 'http';
    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${objectName}`;
  }
}
