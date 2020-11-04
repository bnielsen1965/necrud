
const Path = require('path');
const FS = require('fs');
const HTTP = require('http');
const HTTPS = require('https');
const Express = require('express');
const FavIcon = require('serve-favicon');
const BodyParser = require('body-parser');
const CookieParser = require('cookie-parser');

const Defaults = {
  httpPort: 80,
  httpsPort: 443,
  address: '0.0.0.0',
  htmlDirectory: 'public',
  faviconFile: 'favicon.ico',
  httpsRedirect: true,
  keyFile: null,
  crtFile: null
};

class WebServer {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
  }

  // create the HTTP server based on the provided configuration
  createServer (app) {
    this.app = app || Express();
    let server = this.createHTTPSServer(this.app);
    this.server = server || this.createHTTPServer(this.app);
    return this;
  }

  // close server
  close () {
    return new Promise((resolve, reject) => {
      if (this.redirectHttpServer) {
        this.redirectHttpServer.close(() => {
          this.server.close(() => resolve);
        });
      }
      else {
        this.server.close(() => resolve);
      }
    });
  }

  // check if web server is running a secure instance
  isSecure () {
    return !!this.httpsServer;
  }

  // create HTTPS server with the provided credentials if possible
  createHTTPSServer (app) {
    let keySSL, certSSL;
    try {
      keySSL = FS.readFileSync(this.Config.keyFile, 'UTF8');
      certSSL = FS.readFileSync(this.Config.crtFile, 'UTF8')
    }
    catch (error) {
      console.log('Error reading SSL files. ' + error.message);
      return null;
    }
    try {
      this.httpsServer = HTTPS.createServer({ key: keySSL, cert: certSSL }, app);
    }
    catch (error) {
      console.log('Error creating https server. ' + error.message);
      return null;
    }
    if (this.Config.httpsRedirect) {
      this.createHTTPSRedirect();
    }
    return this.httpsServer;
  }

  // create a basic HTTP server
  createHTTPServer (app) {
    this.httpServer = HTTP.createServer(app);
    return this.httpServer;
  }

  // create a redirect service to send all HTTP traffic to HTTPS
  createHTTPSRedirect () {
    let _this = this;
    _this.redirectHttpServer = HTTP.createServer((req, res) => {
      res.writeHead(307, { "Location": "https://" + req.headers['host'].replace(/:[0-9]+/, '') + (_this.Config.httpsPort !== 443 ? ':' + _this.Config.httpsPort : '') + req.url });
      res.end();
    }).listen(_this.Config.httpPort, _this.Config.address, () => {
      console.log('HTTPS redirect server up on port ' + _this.Config.httpPort);
    });
  }

  // configure the favicon.ico handler
  configureFavIcon () {
    this.app.use(FavIcon(Path.join(__dirname, '..', this.Config.htmlDirectory, 'favicon.ico')));
    return this;
  }

  // configure parsers that will support forms, json, and cookies
  configureParsers () {
    this.app.use(BodyParser.urlencoded({ extended: true }));
    this.app.use(BodyParser.json());
    this.app.use(CookieParser());
    return this;
  }

  // configure static routes to serve up web pages
  configureStaticRoutes () {
    this.app.use(Express.static(Path.join(__dirname, '..', this.Config.htmlDirectory)));
    return this;
  }

  configureLastRoute () {
    this.app.use(this.lastRoute.bind(this));
  }

  // last web server route to run
  lastRoute (req, res, next) {
    if (res.headersSent) {
      next();
      return;
    };
    if (req.get('accept') && req.accepts('application/json') && !req.accepts('text/html')) {
      // provide a JSON error message when request cannot be handled for a JSON request
      return res.json({ error: 'Invalid request' });
    }
    res.status(404).send('Not found.');
  }

  // start server listening for connections
  listen () {
    return new Promise((resolve, reject) => {
      let port = (this.httpsServer ? this.Config.httpsPort : this.Config.httpPort);
      this.server.listen(port, this.Config.address, () => {
        resolve({ port: port, address: this.Config.address });
      })
    });
  }
}

module.exports = WebServer;
