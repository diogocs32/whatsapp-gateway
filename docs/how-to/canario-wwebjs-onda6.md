---
tipo: runbook
dono: Diogo Santos
revisado_em: 2026-09-26
status: preparado — não executar antes do deploy W em janela aprovada pelo dono
origem: E5/P-059, D-032
---

# Canário da build do WhatsApp Web na Onda 6

**Agora:** nenhum passo operacional. O deploy derruba contas conectadas e o dono o adiou enquanto a equipe trabalha. Este roteiro só vale **depois** do merge e deploy manual da Onda 6 (E5+E6), idealmente após o deploy A e B-004 (stop-first). A branch/PR da E5, isolada, não altera produção.

1. Na janela de deploy W escolhida pelo dono, conferir migração `20260926123000_wwebjs_web_version_por_sessao`, `/health` e reidratação das sessões. Anotar `WWEBJS_WEB_VERSION` global vigente; o default do código permanece na build validada `2.3000.1045101284-alpha` até decisão posterior ao canário.
2. Escolher **uma sessão WWEBJS de teste**, com chip próprio e proxy residencial. Sem tocar nas sessões da equipe, configurar `PATCH /api/sessions/{sessao}/config` com `{"wwebjsWebVersion":"2.3000.1046934385-alpha"}`. Confirmar pelo `GET` que a versão foi persistida. O PATCH **não reinicia** a sessão.
3. Iniciar ou reiniciar **somente** a sessão de teste, na janela. No log `wwebjs: build efetiva e Chromium da sessão`, conferir `requestedVersion = effectiveVersion = 2.3000.1046934385-alpha` e registrar a versão real do Chromium. Divergência gera WARN e impede promover o canário.
4. No chip, provar pareamento por QR ou código, sincronização até WORKING (sem ficar em 99%), leitura dos grupos, extração de leads com `phone` e nome, envio de texto **e de imagem/áudio/documento** para outro aparelho próprio, recebimento e uma reconexão. Se algum item falhar, guardar o erro e não promover a build. Não usar conta da equipe para o teste.
   - Antes dos envios, anotar 3 amostras do log `wwebjs: perfil de memória da sessão` (uma ao ready e duas a cada 5 min): `jsHeapUsedBytes`, `chromiumPssBytes`, `chromiumProcessCount`, `indexedDbBytes`, `browserPid` e versão do Chromium. Repetir após receber mídia 1:1 e após enviar arquivo de até 24 MB. PSS só existe no Linux com `/proc`; não comparar com soma de RSS do macOS.
   - Receber imagem/vídeo/áudio **em grupo** com `WWEBJS_AUTO_DOWNLOAD_GROUP_MEDIA` ausente: webhook deve manter `type`, `mediaType`, remetente e metadados, mas sem `mediaKey`; `/media` dá 404. Para testar o opt-in, mudar a env para `true` exige outro Deploy e outra janela — não fazê-lo só por este canário. Confirmar que mídia 1:1 ainda oferece `mediaKey` e baixa em `GET .../media`.
   - Enviar **vídeo** para aparelho próprio: a E6 removeu `--disable-software-rasterizer`; confirmar que o arquivo chega e reproduz. Um arquivo acima de 24 MB no WWEBJS deve receber 400 antes de sair (usar `idempotencyKey` e destinatário próprio). Se a resposta disser "sem confirmação", conferir o destino antes de tentar novamente.
   - Observar reconexão/heal: `syncAddressBook` e merge de LID não devem repetir em todo `ready`; parar a sessão de teste deve encerrar os PIDs daquele Chromium sem matar outra sessão. A E6 não reinicia contas da equipe para fazer essa prova.
5. Para voltar essa sessão ao modo global, `PATCH .../config` com `{"wwebjsWebVersion":null}`; a mudança só vale no próximo start. Após o canário aprovado, o dono decide quando trocar `WWEBJS_WEB_VERSION` global em outra janela de Deploy; salvar env no Dokploy por si só não a aplica.

A candidata consta no [catálogo wa-version](https://github.com/wppconnect-team/wa-version/blob/main/versions.json) até 07/11/2026. O catálogo comprova disponibilidade do HTML, não compatibilidade com o chip. Se a build anterior expirar em 13/10 antes do canário, não usar `auto`/`live` como promoção implícita: ambas podem introduzir mudanças do WhatsApp Web ainda não testadas.
