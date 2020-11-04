
const EventEmitter = require('events');
const WebSocket = require('ws');
const UUIDv4 = require('uuid').v4;
const Authentication = require('./authentication');

const Defaults = {
  JWT: {
  key: 'USER SHOULD PROVIDE A SECRET KEY' // must match the key for Authentication
  }
};

class SocketServer extends EventEmitter {
  constructor (Config) {
    super();
    this.Config = Object.assign({}, Defaults, Config);
    this.connections = {};
  }

  // create websocket server
  createServer (httpServer) {
    this.wss = new WebSocket.Server({ noServer: true });
    this.wss.on('connection', this.onConnection.bind(this));
    httpServer.on('upgrade', this.onUpgrade.bind(this));
    return this;
  }

  // close socket server
  close () {
    return new Promise((resolve, reject) => {
      this.wss.close(() => {
        resolve();
      });
    });
  }

  // process connections to websocket server
  onConnection (ws) {
    let _this = this;
    let uuid = UUIDv4();
    _this.connections[uuid] = { ws };
    ws
      .on('message', message => {
        _this.processMessage.call(_this, message, uuid);
      })
      .on('close', () => {
        _this.emit('close', { uuid });
        delete _this.connections[uuid];
      })
      .on('error', error => {
        _this.emit('error', error);
      });
  }

  // process HTTP socket upgrade request
  async onUpgrade (request, socket, head) {
    // use Authentication to validate sec-websocket-protocol has token
    let authorized;
    try {
      authorized = await Authentication.isRequestAuthorized(request, this.Config.JWT.key, this.Config.JWT.tokenName);
    }
    catch (error) {
      socket.write(
        'HTTP/1.1 401 Web Socket Protocol Handshake\r\n' +
        'Upgrade: WebSocket\r\n' +
        'Connection: Upgrade\r\n' +
        '\r\n'
      );
      socket.destroy();
      this.emit('error', 'Upgrade to WebSocket failed authorization, ' + error.message);
      return;
    }

    let _this = this;
    try {
      _this.wss.handleUpgrade(request, socket, head, ws => {
        _this.wss.emit('connection', ws, request);
        _this.emit('connection', ws);
      });
    }
    catch (error) {
      _this.emit('error', error);
    }
  }

  // process client socket message
  processMessage (message, uuid) {
    let data;
    try {
      data = JSON.parse(message);
    }
    catch (error) {
      this.emit('error', 'Error parsing JSON message from client ' + uuid + '. ' + error.message);
    }
    this.emit('message', { data, uuid });
  }

  sendMessage (action, data, uuid) {
    let message = JSON.stringify(Object.assign({}, data, { action }));
    if (uuid) return this.connections[uuid].ws.send(message);
    Object.keys(this.connections).forEach(uuid => {
      console.log('SEND', uuid, message)
      this.connections[uuid].ws.send(message);
    });
  }
}

module.exports = SocketServer;
