
const JWT = require('jsonwebtoken');
const Crypto = require('crypto');

const Defaults = {
  allowRoutes: ['/js', '/css'],
  disallowRoutes: ['/..'],
  apiRoute: '',
  authenticationRoute: '/authentication',
  hashRoute: '/hash',
  loginPage: '/login.html',
  logoutPage: '/logout.html',
  homePage: '/index.html',
  Users: [],
  JWT: {
    options: {
      algorithm: 'HS256',
      expiresIn: '1 days'
    },
    key: 'USER SHOULD PROVIDE A SECRET KEY',
    tokenName: 'token'
  },
  Hash: {
    algorithm: 'sha512',
    saltLength: 16
  }
};

// authentication middleware for HTTP requests
class Authentication {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.Config.apiRoute = Authentication.trimTrailingSlash(this.Config.apiRoute);
    let allow = [...this.Config.allowRoutes, this.Config.loginPage];
    this.allowRegEx = new RegExp(allow.map(a => '^' + Authentication.escapeRegExp(a)).join('|'));
    this.disallowRegEx = new RegExp(this.Config.disallowRoutes.map(a => Authentication.escapeRegExp(a)).join('|'));
  }

  // configure authentication middleware
  configure (app) {
    // configure non-protected routes
    app.post(`${this.Config.loginPage}`, this.authenticate.bind(this));
    app.post(`${this.Config.apiRoute}${this.Config.authenticationRoute}`, this.authenticate.bind(this));
    // configure authorization checks on all requests
    app.use(async (req, res, next) => {
      // run handlers until one handles the request or end with error
      this.allowedHandler(req, res, next) ||
      await this.authorizedHandler(req, res, next) ||
      this.handleRequestError(req, res, new Error('Authorization failed'));
    });
    app.use(`${this.Config.logoutPage}`, this.logout.bind(this));
    app.post(`${this.Config.apiRoute}${this.Config.hashRoute}`, this.hash.bind(this));
    return app; // return app to allow for config chaining
  }


  // handle allowed and disallowed requests
  allowedHandler (req, res, next) {
    // check for allowed and disallowed routes
    if (this.disallowRegEx.test(req.originalUrl)) {
      // request is not allowed
      res.status(403).send('Disallowed');
      return true;
    }
    if (this.allowRegEx.test(req.originalUrl)) {
      // request is allowed to pass
      next();
      return true;
    }
    // not handled
    return false;
  }

  // handle authorized requests
  async authorizedHandler (req, res, next) {
    // validate authorization
    let authorized;
    try {
      authorized = await Authentication.isRequestAuthorized(req, this.Config.JWT.key, this.Config.JWT.tokenName);
    }
    catch (error) {
      this.handleRequestError(req, res, new Error(error));
      return true;
    }
    if (authorized) {
      next();
      return true;
    }
    // not handled
    return false;
  }


  // logout route handler
  logout (req, res, next) {
    res.clearCookie(this.Config.JWT.tokenName);
    next();
  }


  // hash route handler
  hash (req, res, next) {
    if (!req.body.password || !req.body.password.length) {
      return this.handleRequestError(req, res, 'Invalid password for hashing');
    }
    return res.json({ hash: this.hashPassword(req.body.password) });
  }

  // hash a password
  hashPassword (password, salt) {
    salt = salt || Authentication.genRandomString(this.Config.Hash.saltLength);
    // check if we need to extract the salt from a passed salt$hash
    let match = /^(.+)\$(.+)$/.exec(salt);
    if (match) salt = match[1];
    let hash = Crypto.createHmac(this.Config.Hash.algorithm, salt);
    hash.update(password);
    return salt + '$' + hash.digest('hex');
  }


  // authentication route handler
  async authenticate (req, res, next) {
    try {
      await this.authenticateUser(req.body);
    }
    catch (error) {
      return this.handleRequestError(req, res, new Error(error.message));
    }
    let token = this.createToken({ username: req.body.username });
    if (req.get('accept')) {
      if (req.accepts('text/html')) return this.authenticatedHTML(req, res, token);
      if (req.accepts('application/json')) return this.authenticatedJSON(req, res, token);
    }
    return res.status(500).send('No supported "accept" type detected (application/json, text/html) in request headers');
  }

  // response for HTML authenticaiton
  authenticatedHTML (req, res, token) {
    this.setTokenCookie(res, token);
    // redirect authenticated user
    let path = '/' + this.Config.homePage.replace(/^\//, '');
    return this.redirectToPath(req, res, path);
  }

  // resposne for JSON authentication
  authenticatedJSON (req, res, token) {
    this.setTokenCookie(res, token);
    res.json({ token });
  }

  // set token cookie
  setTokenCookie (res, token) {
    // send token in cookie
    let decode = JWT.decode(token);
    res.cookie(this.Config.JWT.tokenName, token, { expires: new Date(decode.exp * 1000) });
  }


  // check if request has been pre-authorized
  static async isRequestAuthorized (req, key, tokenName) {
    return await this.verifyToken(Authentication.getTokenFromRequest(req, tokenName), key);
  }

  // get token out of the request
  static getTokenFromRequest (req, tokenName) {
    // check cookies
    if (req.cookies && req.cookies[tokenName]) return req.cookies[tokenName];

    // check headers
    let authorizationHeader;
    if (req.headers && req.headers.authorization) {
      authorizationHeader = req.headers.authorization;
    }
    else if (req.header && typeof(req.header) === 'function') {
      authorizationHeader = req.header('Authorization');
    }
    if (authorizationHeader) {
      let match = /([^\s]+)\s+([^\s]+)/.exec(authorizationHeader);
      if (match && !/bearer/i.test(match[1])) {
        // not a bearer token
        return;
      }
      else if (match) {
        // return bearer token
        return match[2];
      }
      // token type is not specified
      return authorizationHeader;
    }

    // check websocket upgrade headers
    if (req.headers && req.headers['sec-websocket-protocol']) {
      let tregex = new RegExp(`${tokenName}_([^;]*)`);
      let match = tregex.exec(req.headers['sec-websocket-protocol']);
      if (match) return match[1];
    }

    // check query string
    if (req.url) {
      let tregex = new RegExp(`\\?([^&]*&)?${tokenName}=([^&]*)`);
      let match = tregex.exec(req.url);
      if (match) return match[2];
    }
  }

  // verify a token
  static verifyToken (token, key) {
    return new Promise((resolve, reject) => {
      if (!token || !token.length) reject(new Error('No token'));
      JWT.verify(token, key, (error, decoded) => {
        if (error) reject(new Error(error));
        resolve(decoded);
      });
    });
  }


  // redirect to login page
  redirectLogin (req, res, queryString) {
    let path = '/' + this.Config.loginPage.replace(/^\//, '') + (queryString ? '?' + queryString : '');
    return this.redirectToPath(req, res, path);
  }

  redirectToPath (req, res, path) {
    let site = req.protocol + '://' + req.headers['host'];
    return res.redirect(302, site + path);
  }

  handleRequestError (req, res, error) {
    if (req.get('accept')) {
      if (req.accepts('text/html')) return this.requestHTMLError(req, res, error);
      if (req.accepts('application/json')) return this.requestJSONError(req, res, error);
    }
    return res.status(500).send('No supported "accept" type detected (application/json, text/html)');
  }

  requestHTMLError (req, res, error) {
    let q = 'error=' + error.message;
    if (req.body.username) q += '&username=' + req.body.username;
    return this.redirectLogin(req, res, q);
  }

  requestJSONError (req, res, error) {
    return res.json({ error: error.message });
  }


  // authenticate user credentials against user list
  async authenticateUser (credentials) {
    if (credentials.jwt) {
      return await this.authenticateJWT(credentials);
    }
    return this.authenticateUserList(credentials);
  }

  // authenticate user credentials against user list
  authenticateUserList (credentials) {
    for (let i = 0; i < this.Config.Users.length; i++) {
      let user = this.Config.Users[i];
      if (credentials.username === user.username && ((!credentials.password && !user.password) || (this.hashPassword(credentials.password, user.password) === user.password))) return true;
    }
    throw new Error('Invalid credentials');
  }

  // authenticate JWT to enable renewal
  async authenticateJWT (credentials) {
    return await Authentication.verifyToken(credentials.jwt, this.Config.JWT.key);
  }

  // create an authorization token
  createToken (payload) {
    return JWT.sign(payload, this.Config.JWT.key, this.Config.JWT.options);
  }

  // escape string that will be used in a RegExp
  static escapeRegExp (string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // trim trailing slash
  static trimTrailingSlash (str) {
    return str.replace(/\/$/, '');
  }

  // generate a random string of characters
  static genRandomString (length) {
    return Crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

}

module.exports = Authentication;
