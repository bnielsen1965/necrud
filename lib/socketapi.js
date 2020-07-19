
const Defaults = {};

class SocketAPI {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
  }

  configure (socketServer) {
    this.socketServer = socketServer;
    this.socketServer.on('error', this.onError.bind(this));
    this.socketServer.on('connection', this.onConnection.bind(this));
    this.socketServer.on('message', this.onMessage.bind(this));
  }

  onError (error) {
    console.log('ERROR', error);
  }

  onConnection () {
    console.log('CONNECTION');
  }

  onMessage (msgEvent, uuid) {
    switch (msgEvent.data.action) {
      case 'ping':
        console.log(`Recieved ping from ${msgEvent.uuid}.`);
        this.onPing(msgEvent.uuid);
        break;

      default:
        console.log(`No action ${msgEvent.data.action}.`);
        break;
    }
  }

  onPing (uuid) {
    this.socketServer.sendMessage('pong', { text: 'Hello World' }, uuid);
  }
}

module.exports = SocketAPI;
