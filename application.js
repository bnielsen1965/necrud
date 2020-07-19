
const Config = require('./config');
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

  init () {
    this.webServer = new WebServer(this.Config.WebServer);
    this.webServer
    	.createServer()
    	.configureFavIcon()
    	.configureParsers();

    this.authentication = new Authentication(this.Config.Authentication);
    this.authentication.configure(this.webServer.app);

    this.webAPI = new WebAPI();
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
}

module.exports = Application;
