import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { FastifyAdapter } from '@nestjs/platform-fastify';

const DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB (cobre documentos grandes do WhatsApp)

// Adapter Fastify com parser de JSON tolerante a body vazio (FST_ERR_CTP_EMPTY_JSON_BODY).
// Reutilizado por main.ts e pelos testes e2e — o app deve ser criado com { bodyParser: false }
// para o Nest não registrar o parser dele e conflitar (FST_ERR_CTP_ALREADY_PRESENT).
export function buildFastifyAdapter(
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
): FastifyAdapter {
  const adapter = new FastifyAdapter({ trustProxy: true });
  const fastify = adapter.getInstance();

  // Upload de mídia (multipart/form-data) — usado por POST /sessions/:id/messages/media.
  void fastify.register(multipart, {
    limits: { fileSize: maxFileBytes, files: 1 },
  });
  // Cookies (item 19): o JWT do painel vai num cookie httpOnly (o dashboard não guarda mais nada
  // no localStorage). Registrado no adapter (e não no main) para os e2e terem o mesmo comportamento.
  void fastify.register(cookie);
  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        const text = typeof body === 'string' ? body : '';
        done(null, text.length > 0 ? JSON.parse(text) : undefined);
      } catch (err) {
        (err as { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );
  return adapter;
}
