---
tipo: analise
dono: Diogo Santos
revisado_em: 2026-09-23
validade: números de navegador medidos em macOS e página NÃO logada — medir no container com sessão logada antes de decidir
status: propostas; nenhuma alteração de código
complementa: analise-atualizacoes-2026-09.md
---

# wwebjs: memória e CPU — o que reduz, o que não reduz, e se o projeto precisa dele (23/09/2026)

Pergunta do dono (23/09): _"tem algo do wwebjs que diminui consumo de memória? Hoje está tudo
Baileys, pois o wwebjs consome muita memória e processamento."_

Método: workflow com 4 frentes (código do gateway · Chromium/puppeteer · upstream e referências ·
"precisa de wwebjs?") + 4 verificadores adversariais. Medições locais descartáveis (macOS arm64,
Chrome for Testing 146 = revisão do puppeteer 24.38.0 do repo, **flags exatas** de
`wwebjs.engine.ts:733-757`), **nenhuma conta pareada**. Evidência bruta por item:
[reference/analise-wwebjs-memoria-2026-09.json](reference/analise-wwebjs-memoria-2026-09.json).

## 1. Resposta curta

- **Não existe "modo pouca memória" no whatsapp-web.js** (nem no guia oficial, nem no fork do WAHA,
  nem no WPPConnect). O custo é o próprio Chromium — ~146 MB fixos por browser (browser + gpu +
  network + storage) que **não se dividem entre sessões** (o wwebjs não suporta 1 browser com
  vários contextos persistentes) + o renderer do WhatsApp Web, que cresce com o tempo.
- O projeto **já aplica** ~20 flags de economia. O que resta nas flags é **~7–10%** (§4).
- A maior alavanca está no **nosso código**: como a mídia é baixada e enviada (§3, §5).
- A resposta mais útil: **o projeto provavelmente não precisa do wwebjs** — o Baileys rc14 já
  lê o telefone dos participantes no roster do grupo (§6). Teste A/B decide sem risco.

## 2. Números de referência

| Fonte                                                                        | wwebjs                                                                                                                                                            | Baileys / outros                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| FAQ oficial do WAHA (tabela no repo desde 03/11/2025; "approximate example") | 1 sessão ~400 MB / 0,3 CPU · 10: 2,5 GB / 3 CPU · 50: 20 GB / 15 CPU                                                                                              | NOWEB (Baileys) 50: 4 GB / 2 CPU · GOWS (whatsmeow) 50: 3 GB / 1,5 CPU |
| Medição local, tela de QR **sem login**                                      | ~370 MB de footprint em 8 processos; ~2,5–2,9% de 1 núcleo ocioso                                                                                                 | socket Baileys em QR: **+4,6 MB** RSS, 0,04–0,07% de CPU               |
| Produção (docs)                                                              | 13/08: container ~450 MB com 1 wwebjs travada · 01–07/09: 5 WWEBJS WORKING 6 dias em 4 GB sem OOM · 14/08: OOM do cgroup de 2 GB com mídia de grupo (P-017/D-014) | 18/08: frota Baileys ~13% de 4 GB                                      |
| Comunidade                                                                   | RAM do Chromium "grows steadily over time" (mantenedores); #3957: ~350→575 MB/sessão em 3 dias (derivado de % da máquina); waha#1296: contas com 5–7 GB           | —                                                                      |

Observações: os números do WAHA usam flags que o gateway não usa (`--renderer-process-limit=2`,
`--disable-site-isolation-trials`, `--no-zygote`); com 1–10 sessões a diferença oficial é de
1,25–2,5×, e 5–7× só com 50. **Não existe medição por sessão logada no repo** (P-060 item 1).

## 3. Onde o NOSSO código gasta (medido)

| Fonte de consumo                                                                                                                                                                                                      | Medição / evidência                                                                                                                                                                                                     | Onde                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Download automático de TODA mídia recebida (≤ 24 MB), inclusive grupos e mídia enviada pelo celular**, via `downloadMedia()` — base64 inteiro no renderer e pelo CDP; sem fila (`void onMessageCreate` em paralelo) | Pico no renderer ≈ **8–8,7×** o arquivo (≈10× somando processos): 16 MB → +140 MB; 24 MB → +188–201 MB; 64 MB → +503 MB. 4×16 MB simultâneos → +230 MB                                                                  | `wwebjs.engine.ts:1611-1634,1692-1703`                          |
| **Envio de mídia** passa o base64 como argumento do `page.evaluate`                                                                                                                                                   | ≈ **15×** no renderer: 24 MB → +383–398 MB; 64 MB → +837–922 MB. Com o teto V8 de 512 MB, enviar 64 MB com heap em ~400 MB **derrubou o renderer**, e depois do crash o CDP **pendura** até o `protocolTimeout` (240 s) | `sendMedia`; campanhas repetem por destinatário (concurrency 4) |
| Evento `ready` a cada conexão/reconexão/auto-heal refaz `syncAddressBook` (getContacts em lote) e re-resolução de LIDs com `queryWidExists` (rede) sem cache negativo                                                 | Não medido (exige login); 1.696 contatos vistos em produção                                                                                                                                                             | `wwebjs.engine.ts` (handler de ready)                           |
| Auto-heal sem teto: página travada recarregada a cada ~2 min para sempre                                                                                                                                              | ≥ 3,5 s de CPU por reload (página não logada — limite inferior)                                                                                                                                                         | `wwebjs.engine.ts:2164`                                         |
| Backfill resolve LID **por mensagem** sem cache negativo (até 500 msgs × 200 chats)                                                                                                                                   | Maior amplificador de evaluates e consultas de rede (leitura de código)                                                                                                                                                 | `toHistoryMessage`/`resolveNumberJid`                           |
| Listeners internos da lib: a cada mudança de "não lidas" um `getChatById` completo com participantes                                                                                                                  | Não medido; relato #3619: CPU 100% em contas com > 1.000 chats                                                                                                                                                          | lib `Client.js:1080-1222`                                       |
| O que **não** vale mexer: probes/watchdogs (0,17 ms por chamada); caches do Node (já com teto, < 2 MB); trocar `atob` por `Uint8Array.fromBase64` (sem ganho)                                                         | medido                                                                                                                                                                                                                  | —                                                               |

Nota: o teto `--max-old-space-size=512` vale **por isolate** (thread principal e cada worker do WA) e
**não limita** ArrayBuffer/Blob/DOM — não torna a RAM da sessão "previsível" como diz o comentário
em `wwebjs.engine.ts:743`; quando o heap JS encosta nele, o renderer cai.

## 4. Flags do Chromium testadas (tela de QR, sem login, macOS)

| Flag / modo                                                                                   | Resultado medido                                                                                       | Veredito                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--disable-features=SpareRendererForSitePerProcess`                                           | −7 a −8% (remove 2 renderers de reserva de ~23 MB); consistente em repetição                           | **testar** (única com ganho que se repete; no Linux o ganho em PSS deve ser menor)                                                                                                                                                                                                 |
| `--renderer-process-limit=1/2`, `--disable-site-isolation-trials`                             | −9 a −23% numa rodada; na remedição 1 de 2 execuções ficou ACIMA da base                               | evitar/só se o spare-off não bastar (cortam os mesmos renderers; menos isolamento)                                                                                                                                                                                                 |
| remover `--max-semi-space-size=64`                                                            | default do V8 é 32 → a flag **aumenta** o teto em ~81 MB por isolate (631→712 MB)                      | **testar remover**                                                                                                                                                                                                                                                                 |
| headless **shell** (`chrome-headless-shell`)                                                  | −44 a −50%, 5 processos                                                                                | **evitar**: zera plugins/mimeTypes/`window.chrome`/pdfViewer e nega Notification — exatamente o que `WAWebBrowserFeatures` do bundle atual coleta. Obs.: `headless:'shell'` com `/usr/bin/chromium` é no-op desde o Chrome 132; exigiria o pacote Debian `chromium-headless-shell` |
| `--single-process`                                                                            | 291 MB (não comparável)                                                                                | evitar (crash derruba o browser; relatos de CPU pior)                                                                                                                                                                                                                              |
| V8 `--optimize-for-size` / `--lite-mode` / `--jitless`                                        | ruído / −1–2% com **+37–42% de CPU**; sem WebAssembly (WA usa)                                         | evitar                                                                                                                                                                                                                                                                             |
| `--blink-settings=imagesEnabled=false`                                                        | sem ganho; **quebra `new Image()`** (setPicture do wwebjs pendura)                                     | evitar                                                                                                                                                                                                                                                                             |
| bloqueio de imagens/fontes por interceptação                                                  | não mensurável sem login; colide com o handler do wwebjs; risco no downloadMedia                       | evitar                                                                                                                                                                                                                                                                             |
| flags de throttling (`--disable-background-timer-throttling` etc.)                            | no-op (também são default do puppeteer; página headless já é "visible")                                | manter                                                                                                                                                                                                                                                                             |
| viewport menor, `--in-process-gpu`, network in-process, low-end-device-mode, áudio in-process | dentro do ruído (±20 MB); `--in-process-gpu` tem relato de `Target closed` (WAHA #725)                 | evitar                                                                                                                                                                                                                                                                             |
| `--disable-blink-features=AutomationControlled`                                               | a lib já aplica em todo launch (`Client.js:500`)                                                       | n/a                                                                                                                                                                                                                                                                                |
| `--disable-software-rasterizer` (já aplicado)                                                 | sem efeito de RAM; o WAHA removeu por **quebrar envio de vídeo** (waha#629)                            | testar envio de vídeo; remover se falhar                                                                                                                                                                                                                                           |
| CDP `Memory.simulatePressureNotification('critical')` periódico                               | −16/−17% na tela de QR, página funcional (no Linux o Chromium 146 não recebe pressão de memória do SO) | testar; `Memory.forciblyPurgeJavaScriptMemory` matou a página em 2/2 — evitar                                                                                                                                                                                                      |

## 5. Medidas recomendadas (se o wwebjs voltar) — P-060

Em ordem de ganho, nenhuma aumenta risco de conta:

1. **Medir antes** — por sessão: `page.metrics().JSHeapUsedSize`, PSS da árvore Chromium,
   `Storage.getUsageAndQuota` (IndexedDB), versão do Chromium; estender o `shared-kernel/memory.ts`.
2. **`downloadMediaStream()`** (já está no pin `1780711`, PR #201697; **não** está no npm 1.34.7) com
   blocos de 2 MB, feature-detect + fallback: 24 MB ~200 → ~34–44 MB; 64 MB ~503 → ~59 MB (medido).
   Não subir o teto de 24 MB (P-017) sem medir logado — a causa do crash de 14/08 segue desconhecida.
3. **Não baixar mídia de grupo automaticamente** (opção por sessão, opt-in, documentada em
   INTEGRACAO — webhook sai sem mediaKey). O WA retém até ~250 MB de blobs por página
   (`WAWebMediaInMemoryBlobCache`, LRU `sizeLimit 25e7` no bundle atual).
4. **Fila de mídia por sessão** (concorrência 1, teto de tempo, fallback de metadados), dentro da
   engine para cobrir também campanhas.
5. **Teto de envio de mídia 16–24 MB para engine WWEBJS** + teto de tempo próprio no `sendMedia`
   (contrato: 400 acima do teto — documentar).
6. `ready`: pular `syncAddressBook`/`mergeExistingLids` quando vier de heal/reconexão; auto-heal com
   1º heal imediato e backoff/teto a partir do 2º; cache negativo de LID no inbound e no backfill.
7. **Matar a árvore do Chromium órfão** por PID (`client.pupBrowser.process()` + SIGKILL quando o
   destroy estoura) em vez de só apagar `SingletonLock` (o tini não mata órfãos vivos).
8. Portar do fork WAHA o **single-flight do `onAppStateHasSyncedEvent`** (commits `b53e8e7`/`62174b1`:
   listeners do Store registrados em dobro = cada evento serializado 2×).
9. Flags: `--disable-features=SpareRendererForSitePerProcess`; remover `--max-semi-space-size=64`;
   testar vídeo sem `--disable-software-rasterizer`.

Evitar: headless shell, `--single-process`, jitless/lite-mode, desligar imagens, reload periódico
(re-sync empaca em 99% — P-019), limpar IndexedDB na mão, "GC manual", flags de cache, forks "enhanced".
Somando tudo: flags ~10%; mídia corta os **picos** (causa do OOM de 14/08). A ordem de grandeza
continua sendo um Chromium por conta.

## 6. O projeto precisa do wwebjs? — P-061

- Só **3 operações** dão 501 no Baileys: `listChats`, `fetchChatHistory` (backfill) e `setChatFlag`
  (archive/pin/mute/unread) — `baileys.engine.ts` (`UnsupportedEngineOperationError`).
- **Leads com telefone:** o Baileys rc14 já lê `phone_number` de cada participante `@lid` no roster
  (`node_modules/@whiskeysockets/baileys/lib/Socket/groups.js:337`) e o `resolveParticipantPhone` do
  gateway usa esse campo (`baileys.engine.ts:325-344`). O wwebjs usa a mesma fonte e só acrescenta
  `queryWidExists` (rede) para cada `@lid` sem telefone, em lotes de 50 — **não verificado** se revela
  telefone escondido; se revelar, é o tipo de coleta que os Termos proíbem (e o padrão de
  contact-check que o projeto já baniu no envio).
- **Teste A/B que decide (zero risco):** `/leads` pelo Baileys no mesmo grupo em que o wwebjs deu
  99/99 em 14/08, incluindo **um grupo `addressingMode: lid` onde a conta NÃO é admin** (anotar
  addressingMode). Se ≥ ~95% com telefone, o wwebjs perde a razão de existir.
- **Correções baratas no Baileys** (P-052): `recordGroupParticipants` lê `p.jid` (inexistente na
  rc14) e ignora `p.phoneNumber` (`baileys.engine.ts:1348-1357`); o gateway não consulta
  `signalRepository.lidMapping` (tabela LID↔PN do próprio Baileys, persistida em `wa_auth_keys`).
- **Backfill e gestão de chat sem Chromium** são viáveis com cuidados: `messaging-history.set` no
  pareamento + `fetchMessageHistory` sob demanda (âncora precisa do `remoteJid` original @lid, antes
  do merge LID→telefone; exige celular online); `chatModify` para pin/mute (doc e código **divergem no
  mute**: duração × timestamp absoluto; `chatModify` malformado pode deslogar todos os aparelhos;
  `resyncAppState` da rc14 pode girar sem fim em timeout — o `saveContact` já passa por ele);
  archive/unread exigem `lastMessages` exatos. Unread=false já existe via `readMessages`.
- **Caminho legítimo para telefone:** a doc v7 do Baileys oferece troca consentida
  (`requestPhoneNumber`/`sharePhoneNumber`) e orienta migrar a lógica para LID ("PNs are less
  reliable going forward"). Usernames (rollout 2026) tendem a esconder mais telefones em qualquer engine.
- **wwebjs efêmero sob demanda:** evitar como padrão (cada ciclo = reconexão/QR, build a revalidar
  quinzenalmente, e como 2º aparelho do mesmo número duplicaria webhooks/Inbox/guard-rail).
- **whatsmeow:** ~50–60 MB/sessão vs ~80 MB do Baileys (WAHA) — economia pequena nesta escala e
  mesma fonte de telefone; não justifica a troca só por memória.

## 7. Risco de conta (contexto para a decisão)

Entre 26/08 e 02/09, **11 chips WWEBJS foram desvinculados (LOGOUT)** em rajadas (5 em 28 min,
~18 h após parear), em chips que faziam cold outreach, com `WA_REQUIRE_PROXY` ausente no servidor
novo; a única Baileys seguiu WORKING (n=1, não prova nada). Causa aberta (B-003). Na issue wwebjs
#201849, o único setup relatado estável por 12 h foi **headful + Xvfb** — o oposto de economizar
memória. Voltar ao wwebjs exige antes: fechar B-003, revalidar a build (13/10) e o patch de mídia (P-059).

## 8. Limitações

macOS ≠ Linux (sem zygote; `phys_footprint` ≠ PSS/cgroup); Chromium 146 local × 150/153 do Debian
em produção; página não logada subestima muito (heap JS de ~34 MB na tela de QR); n pequeno por
configuração (ruído de ±20 MB). Nenhum número daqui vale como consumo de sessão logada.

## 9. Fontes

- Código: `wwebjs.engine.ts:727-757,1611-1735,2164`; lib pin `Message.js:514-600`, `Utils.js:1158-1233`,
  `Client.js:500,1080-1222,3242,3367-3384`; Baileys rc14 `groups.js:333-341`; `docker-entrypoint.sh:25-33`.
- wwebjs: PR #201697 (downloadMediaStream, merged 19/06/2026), #201849, #201853, #201914; issues
  #2831, #3619, #3692, #3957, #3961; fork WAHA `devlikeapro/whatsapp-web.js` (`b53e8e7`, `62174b1`, `481db6c`).
- WAHA: FAQ/engines (tabela de CPU/RAM), waha#629, #725, #1296, #1348.
- Chromium/puppeteer: pptr.dev (headless modes, FAQ de versões), switches do Chromium
  (`SpareRendererForSitePerProcess`, `renderer-process-limit`), V8 (`optimize-for-size`, jitless),
  packages.debian.org (`chromium-headless-shell` 150/153 em bookworm/trixie).
- Evidência bruta com medições e verificação adversarial: [reference/analise-wwebjs-memoria-2026-09.json](reference/analise-wwebjs-memoria-2026-09.json).
