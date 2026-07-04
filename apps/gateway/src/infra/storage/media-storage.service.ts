import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../../bootstrap/config';

// Armazenamento de mídia em S3-compatível (MinIO em dev; R2/B2 em prod via env).
// Bucket privado: o acesso do dashboard é via URL pré-assinada temporária (§ mídia/F4).
@Injectable()
export class MediaStorage implements OnModuleInit {
  private readonly logger = new Logger(MediaStorage.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly ttl: number;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.ttl = config.get('MEDIA_URL_TTL', { infer: true });
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  // Garante o bucket no boot (idempotente). Não derruba o app se o S3 estiver fora.
  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" pronto`);
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" criado`);
      } catch (e) {
        this.logger.warn(
          `Não foi possível garantir o bucket "${this.bucket}": ${(e as Error).message}`,
        );
      }
    }
  }

  // Prova de ESCRITA no S3, com cache de 5 min (diagnóstico do CP-149: o write-on-receive
  // falhava em prod sem causa visível). O /health expõe `checks.storage` com este resultado e
  // o erro REAL do SDK vai para o log. Cache: o health é consultado a cada poucos segundos
  // (healthcheck do Docker + polling do dashboard) — não dá para fazer um PUT por consulta.
  private probeCache: { ok: boolean; at: number } | null = null;

  async probeWrite(): Promise<boolean> {
    const TTL = 5 * 60_000;
    if (this.probeCache && Date.now() - this.probeCache.at < TTL) {
      return this.probeCache.ok;
    }
    let ok = false;
    try {
      await this.put(
        'health/.probe',
        Buffer.from(new Date().toISOString()),
        'text/plain',
      );
      ok = true;
    } catch (e) {
      const err = e as Error & { name?: string };
      this.logger.error(
        `S3 write-probe FALHOU (${err.name ?? 'Erro'}): ${err.message} — mídia recebida NÃO está sendo armazenada; confira S3_ENDPOINT, S3_BUCKET (o bucket precisa EXISTIR — token escopado não cria) e as credenciais`,
      );
    }
    this.probeCache = { ok, at: Date.now() };
    return ok;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  // Bytes da mídia direto do S3 (streaming) — base do download via gateway (GAP 2, contrato
  // CP-149): o consumidor (n8n) baixa pelo próprio gateway com X-Api-Key, sem depender de o
  // S3_ENDPOINT ser público nem de URL pré-assinada dentro da validade. null = não existe/expirou.
  async getObject(key: string): Promise<{
    body: Readable;
    contentType: string | null;
    contentLength: number | null;
  } | null> {
    try {
      const out = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!out.Body) return null;
      return {
        body: out.Body as Readable,
        contentType: out.ContentType ?? null,
        contentLength: out.ContentLength ?? null,
      };
    } catch {
      return null;
    }
  }

  // URL pré-assinada de GET (válida por MEDIA_URL_TTL). Assinada contra o S3_ENDPOINT
  // (em prod, aponte S3_ENDPOINT p/ o host público para o link ser acessível pelo navegador).
  presignedGetUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.ttl },
    );
  }
}
