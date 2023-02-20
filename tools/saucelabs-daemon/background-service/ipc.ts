import {createServer, Server, Socket} from 'net';
import {IPC_PORT} from '../ipc-defaults';
import {BackgroundServiceReceiveMessages, NoAvailableBrowserMessage, InternalErrorMessage} from '../ipc-messages';
import {SaucelabsDaemon} from './saucelabs-daemon';

let nextSocketId = 0;

export class IpcServer {
  private readonly _server: Server;
  private _connections = new Map<number, Socket>();

  constructor(private _service: SaucelabsDaemon) {
    this._server = createServer(this._connectionHandler.bind(this));
    this._server.listen(IPC_PORT, () => console.info('Daemon IPC server listening.'));
  }

  private _connectionHandler(socket: Socket) {
    const socketId = nextSocketId++;
    this._connections.set(socketId, socket);
    socket.on('data', b =>
      this._processMessage(
        socket,
        socketId,
        JSON.parse(b.toString()) as BackgroundServiceReceiveMessages,
      ),
    );
  }

  private _processMessage(
    socket: Socket,
    socketId: number,
    message: BackgroundServiceReceiveMessages,
  ) {
    try {
      switch (message.type) {
        case 'start-test':
          console.debug(`Requesting test browser: SID#${socketId}: ${message.testDescription}`);
          this._service.startTest({
            testId: socketId,
            pageUrl: message.url,
            requestedBrowserId: message.browserId,
          }).then((started) => {
            if (!started) {
              console.debug('  > Browser not available.');
              this._noAvailableBrowser(socket);
            } else {
              console.debug('  > Browser available. Test can start.');
            }
          }).catch((err) => {
            console.error((err as Error).message)
            this._internalError(socket, (err as Error).message)
          })
          break;
        case 'end-test':
          console.debug(`Ending tests for SID#${socketId}`);
          this._service.endTest(socketId);
          break;
        default:
          throw new Error(`Unsupported msg type: ${(message as any).type}`)
      }
    } catch (err) {
      console.error((err as Error).message)
      this._internalError(socket, (err as Error).message)
    }
  }

  private _noAvailableBrowser(socket: Socket) {
    socket.write(JSON.stringify(new NoAvailableBrowserMessage()));
  }

  private _internalError(socket: Socket, msg: string) {
    socket.write(JSON.stringify(new InternalErrorMessage(msg)));
  }
}
