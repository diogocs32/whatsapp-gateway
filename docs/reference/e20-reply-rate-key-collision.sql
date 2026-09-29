-- P-103: reprodução somente leitura; nenhum acesso às tabelas do produto.
-- Condições de ReplyRateService (G4), alvo direto e follow-up por targetKeyId.
WITH mature("keyId", "chatJid", "timestamp") AS (
  VALUES ('shared-key', '1001@s.whatsapp.net', now() - interval '4 days'),
         ('shared-key', '1002@s.whatsapp.net', now() - interval '4 days')
), reaction("targetKeyId", "chatJid", "fromMe", "timestamp", "createdAt") AS (
  VALUES ('shared-key', '9001@lid', false, now() - interval '3 days', now() - interval '3 days')
), cold_followup("keyId", "chatJid", "timestamp") AS (
  VALUES ('cold-a', '1001@s.whatsapp.net', now() - interval '4 days'),
         ('cold-b', '1002@s.whatsapp.net', now() - interval '4 days')
), targets("keyId", "chatJid", "timestamp") AS (
  VALUES ('shared-followup', '1001@s.whatsapp.net', now() - interval '3 days'),
         ('shared-followup', '1002@s.whatsapp.net', now() - interval '3 days')
), followup_reaction("targetKeyId", "chatJid", "fromMe", "timestamp", "createdAt") AS (
  VALUES ('shared-followup', '9001@lid', false, now() - interval '2 days', now() - interval '2 days')
)
SELECT 'p103-cold' AS scenario, count(*) AS "coldMature",
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM reaction x WHERE x."fromMe" = false
         AND (x."targetKeyId" = c."keyId" OR (x."chatJid" = c."chatJid" AND x."timestamp" > c."timestamp"))
         AND (CASE WHEN x."createdAt" > c."timestamp" THEN LEAST(x."timestamp", x."createdAt") ELSE x."timestamp" END)
             <= c."timestamp" + interval '72 hours'
       )) AS responded, (SELECT count(*) FROM reaction) AS "reactionRows"
  FROM mature c
UNION ALL
SELECT 'p103-followup', count(*), count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM targets t JOIN followup_reaction x ON x."targetKeyId" = t."keyId"
         WHERE t."chatJid" = c."chatJid" AND t."timestamp" > c."timestamp"
           AND t."timestamp" <= c."timestamp" + interval '72 hours'
           AND x."fromMe" = false
           AND LEAST(x."timestamp", x."createdAt") <= c."timestamp" + interval '72 hours'
       )), (SELECT count(*) FROM followup_reaction)
  FROM cold_followup c;
