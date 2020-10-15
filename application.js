
const Config = require('./config');
const Database = require('./lib/database');
const WebServer = require('./lib/webserver');
const WebAPI = require('./lib/webapi');
const SocketServer = require('./lib/socketserver');
const SocketAPI = require('./lib/socketapi');
const Authentication = require('./lib/authentication');

const Defaults = {};

class Application {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
  }

  async init () {
    this.database = new Database(Object.assign({}, this.Config.Database, { onChange: this.onDatabaseChange.bind(this) }));
    await this.database.init();

    this.webServer = new WebServer(this.Config.WebServer);
    this.webServer
    	.createServer()
    	.configureFavIcon()
    	.configureParsers();

    this.authentication = new Authentication(this.Config.Authentication);
    this.authentication.configure(this.webServer.app);

    this.webAPI = new WebAPI(this.database, this.Config.WebAPI);
    this.webAPI.configure(this.webServer);

    this.webServer.configureStaticRoutes();
    this.webServer.configureLastRoute();

    this.socketServer = new SocketServer(this.Config.SocketServer);
    this.socketServer.createServer(this.webServer.server);
    this.socketAPI = new SocketAPI();
    this.socketAPI.configure(this.socketServer);

    return this; // return this to enable chaining
  }

  async listen () {
    let settings = await this.webServer.listen();
    console.log('Server up on port ' + settings.port);
  }

  onDatabaseChange (message) {
    // TODO send websocket message
    console.log('DATA CHANGE', message)
  }
}

module.exports = Application;
