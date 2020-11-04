
const Defaults = {
  apiRoute: '/api',
  dbRoute: '/db'
};

class WebAPI {
  constructor (database, Config) {
    this.database = database;
    this.Config = Object.assign({}, Defaults, Config);
  }

  configure (webServer) {
    this.webServer = webServer;
    this.configureCRUD();
    this.configureAPI();
  }

  // configure database collection CRUD endpoints
  configureCRUD () {
    this.webServer.app.get(`${this.Config.dbRoute}/:collection`, this.dbFind.bind(this));
    this.webServer.app.get(`${this.Config.dbRoute}/:collection/:id`, this.dbFindOne.bind(this));
    this.webServer.app.post(`${this.Config.dbRoute}/:collection`, this.dbInsert.bind(this));
    this.webServer.app.put(`${this.Config.dbRoute}/:collection/:id`, this.dbReplaceOne.bind(this));
    this.webServer.app.patch(`${this.Config.dbRoute}/:collection`, this.dbPatch.bind(this));
    this.webServer.app.patch(`${this.Config.dbRoute}/:collection/:id`, this.dbPatchOne.bind(this));
    this.webServer.app.delete(`${this.Config.dbRoute}/:collection`, this.dbDelete.bind(this));
    this.webServer.app.delete(`${this.Config.dbRoute}/:collection/:id`, this.dbDeleteOne.bind(this));
  }

  // configure api endpoints
  configureAPI () {
    this.webServer.app.use(`${this.Config.apiRoute}/:command/:collection`, this.apiCommand.bind(this));
    this.webServer.app.use(`${this.Config.apiRoute}/:command`, this.apiCommand.bind(this));
  }

  // process api command request
  async apiCommand (req, res, next) {
    switch (req.params.command) {
      case 'collections':
        return await this.apiCollections(req, res, next);

      default:
        return this.errorResponse(res, `Invalid api command ${req.params.command}`, 400);
    }
  }

  // process api collections command
  async apiCollections (req, res, next) {
    switch (req.method.toLowerCase()) {
      case 'get':
        return await this.getCollections(req, res, next);

      case 'post':
        return await this.postCollection(req, res, next);

      case 'delete':
        return await this.deleteCollection(req, res, next);

      default:
        return this.errorResponse(res, `Unsupported command request method ${req.method}`, 400);
    }
  }

  // process api collections get command
  async getCollections (req, res, next) {
    let collections = await this.database.getDatabaseNames();
    return res.json({ collections });
  }

  // process api collections post command
  async postCollection (req, res, next) {
    try {
      this.database.createDatabase(req.body.collection);
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    return res.json({ success: true });
  }

  // process api collections delete command
  async deleteCollection (req, res, next) {
    try {
      this.database.deleteDatabase(req.params.collection);
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    return res.json({ success: true });
  }

  // replace a specific collection document
  async dbReplaceOne (req, res, next) {
    let doc;
    try {
      doc = await this.database.update(req.params.collection, { _id: req.params.id }, req.body, { multi: false, returnUpdatedDocs: true });
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(doc);
  }

  // patch multiple documents
  async dbPatch (req, res, next) {
    let docs;
    try {
      let q = (req.query.q && req.query.q.length ? JSON.parse(req.query.q) : {});
      docs = await this.database.update(req.params.collection, q, req.body, { multi: true, returnUpdatedDocs: true });
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(docs);
  }

  // patch a specific document
  async dbPatchOne (req, res, next) {
    let doc;
    try {
      doc = await this.database.update(req.params.collection, { _id: req.params.id }, req.body, { multi: false, returnUpdatedDocs: true });
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(doc);
  }

  // find multiple documents
  async dbFind (req, res, next) {
    let docs;
    try {
      let q = (req.query.q && req.query.q.length ? JSON.parse(req.query.q) : {});
      docs = await this.database.find(req.params.collection, q);
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(docs);
  }

  // find a specific document
  async dbFindOne (req, res, next) {
    let docs;
    try {
      docs = await this.database.find(req.params.collection, { _id: req.params.id });
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    if (!docs.length) return this.errorResponse(res, `Document not found with _id ${req.params.id}.`, 404);
    res.json(docs[0]);
  }

  // insert a document or multiple documents from an array
  async dbInsert (req, res, next) {
    let doc;
    try {
      doc = await this.database.insert(req.params.collection, req.body);
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(doc);
  }

  // delete multiple documents
  async dbDelete (req, res, next) {
    let result;
    try {
      let q = (req.query.q && req.query.q.length ? JSON.parse(req.query.q) : {});
      result = await this.database.remove(req.params.collection, q, { multi: true });
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(result);
  }

  // delete a specific document
  async dbDeleteOne (req, res, next) {
    let result;
    try {
      result = await this.database.remove(req.params.collection, { _id: req.params.id }, { multi: false });
    }
    catch (error) {
      return this.errorResponse(res, error, 400);
    }
    res.json(result);
  }

  // response with an error message
  errorResponse (res, error, status) {
    res.status(status || 500).json({ error: error.message || error });
  }

}

module.exports = WebAPI;
