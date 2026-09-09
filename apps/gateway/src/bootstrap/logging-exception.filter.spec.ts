import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { describeException } from './logging-exception.filter';

describe('describeException', () => {
  it('HttpException com corpo objeto: status, mensagem e código', () => {
    const d = describeException(
      new HttpException(
        {
          statusCode: 423,
          code: 'SESSION_QUARANTINED',
          message: 'sessão em quarentena',
        },
        423,
      ),
    );
    expect(d).toEqual({
      status: 423,
      message: 'sessão em quarentena',
      code: 'SESSION_QUARANTINED',
      known: true,
    });
  });

  it('validação com lista de mensagens vira uma string; `error` do Nest vira code', () => {
    const d = describeException(new BadRequestException(['a', 'b']));
    expect(d.status).toBe(400);
    expect(d.message).toBe('a; b');
    expect(d.code).toBe('Bad Request');
    expect(describeException(new ForbiddenException('csrf')).message).toBe(
      'csrf',
    );
    expect(describeException(new NotFoundException()).status).toBe(404);
  });

  it('HttpException com corpo string', () => {
    expect(describeException(new HttpException('parou', 503))).toEqual({
      status: 503,
      message: 'parou',
      known: true,
    });
  });

  it('erro estilo http-errors (statusCode + message) é tratado como deliberado', () => {
    const d = describeException({
      statusCode: 400,
      message: 'JSON inválido',
      code: 'FST_ERR_CTP_INVALID_JSON_BODY',
    });
    expect(d).toEqual({
      status: 400,
      message: 'JSON inválido',
      code: 'FST_ERR_CTP_INVALID_JSON_BODY',
      known: true,
    });
  });

  it('erro inesperado (ou lixo) vira 500 não-deliberado', () => {
    expect(describeException(new Error('boom'))).toEqual({
      status: 500,
      message: 'boom',
      known: false,
    });
    expect(describeException('x').status).toBe(500);
    expect(describeException(null).status).toBe(500);
    expect(describeException({ statusCode: 700 }).status).toBe(500);
  });
});
