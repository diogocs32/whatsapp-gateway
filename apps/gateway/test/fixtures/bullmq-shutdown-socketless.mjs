import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createConnection, createServer } from 'node:net';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

// Probe descartável: o caso observado NÃO encerra via worker.close(). O pai
// registra esse resultado e só então termina este processo para limpar a fixture.
// SIGTERM do harness não é evidência de graceful shutdown, nem correção de P-100.
process.once('message', async ({ version, connection, prefix }) => {
  try {
    assert(['5.81.5', '6.3.10'].includes(version));
    assert(['localhost', '127.0.0.1', '::1'].includes(connection.host));
    assert.equal(connection.db, 11);
    assert(prefix.startsWith('e18-p100-'));
    const { Worker } = await import(
      version === '5.81.5' ? 'bullmq-v5' : 'bullmq'
    );
    const sockets = new Set();
    let online = true;
    let refused = 0;
    const server = createServer((downstream) => {
      if (!online) {
        refused++;
        downstream.destroy();
        return;
      }
      const upstream = createConnection({
        host: connection.host,
        port: connection.port,
      });
      sockets.add(downstream).add(upstream);
      downstream.on('error', () => undefined);
      upstream.on('error', () => downstream.destroy());
      downstream.on('close', () => {
        sockets.delete(downstream);
        upstream.destroy();
      });
      upstream.on('close', () => {
        sockets.delete(upstream);
        downstream.destroy();
      });
      downstream.pipe(upstream).pipe(downstream);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    let processed = 0;
    const worker = new Worker(
      'shutdown',
      async () => {
        processed++;
      },
      {
        prefix,
        connection: {
          ...connection,
          host: '127.0.0.1',
          port: server.address().port,
        },
        autorun: false,
      },
    );
    worker.on('error', () => undefined); // queda TCP deliberada.
    await worker.waitUntilReady();
    const backend = version === '5.81.5' ? worker : worker.getBackend();
    const client = await (version === '5.81.5'
      ? worker.client
      : backend.client);
    const blockingConnection = backend.blockingConnection;
    const blocking = await blockingConnection.client;
    let blockingEndEvents = 0;
    blocking.on('end', () => {
      blockingEndEvents++;
    });
    assert.equal(client.options.maxRetriesPerRequest, null);
    assert.equal(blocking.options.maxRetriesPerRequest, null);

    const observe = (promise) => {
      const result = { status: 'pending' };
      void promise.then(
        () => {
          result.status = 'fulfilled';
        },
        () => {
          result.status = 'rejected';
        },
      );
      return result;
    };
    const waitUntil = async (check) => {
      const until = Date.now() + 10_000;
      while (!check()) {
        assert(Date.now() < until, 'probe não atingiu a barreira em 10 s');
        await delay(25);
      }
    };
    let command;
    let commandState;
    let submittedBeforeCut = false;
    const sendCommand = client.sendCommand.bind(client);
    client.sendCommand = (next, stream) => {
      if (
        !command &&
        next.name === 'evalsha' &&
        Number(next.args[1]) === 11 &&
        next.args[2] === `${prefix}:shutdown:wait` &&
        next.args[3] === `${prefix}:shutdown:active`
      ) {
        command = next;
        const result = sendCommand(next, stream);
        submittedBeforeCut = client.commandQueue
          .toArray()
          .some((item) => item.command === next);
        commandState = observe(next.promise);
        online = false;
        for (const socket of sockets) socket.destroy();
        return result;
      }
      return sendCommand(next, stream);
    };
    let disconnectState;
    const disconnect = blockingConnection.disconnect.bind(blockingConnection);
    blockingConnection.disconnect = (wait) => {
      const result = disconnect(wait);
      disconnectState = observe(result);
      return result;
    };
    const runningState = observe(worker.run());
    await waitUntil(
      () =>
        command &&
        refused > 0 &&
        client.status === 'reconnecting' &&
        blocking.status === 'reconnecting',
    );
    const loopState = observe(worker.mainLoopRunning);
    const closingState = observe(worker.close());
    await delay(750);
    const evidence = (phase) => ({
      phase,
      version,
      submittedBeforeCut,
      command: command.name,
      commandState: commandState.status,
      loopState: loopState.status,
      runningState: runningState.status,
      closingState: closingState.status,
      disconnectState: disconnectState?.status,
      mainStatus: client.status,
      blockingStatus: blocking.status,
      blockingEndEvents,
      processed,
    });
    process.send(evidence('offline'));
    online = true;
    await waitUntil(
      () =>
        commandState.status === 'fulfilled' && loopState.status === 'fulfilled',
    );
    await delay(750);
    process.send(evidence('restored'));
    // Fica vivo com o socket principal aberto. O pai não chama close(true),
    // não altera retries nem conta sua terminação como sucesso do worker.
  } catch (error) {
    process.send({ phase: 'error', message: error.message });
  }
});
