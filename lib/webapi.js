
const Defaults = {
  apiRoute: '/db'
};

class WebAPI {
  constructor (database, Config) {
    this.database = database;
    this.Config = Object.assign({}, Defaults, Config);
  }

  configure (webServer) {
    this.webServer = webServer;
    this.webServer.app.get(`${this.Config.apiRoute}/:collection`, this.dbFind.bind(this));
    this.webServer.app.get(`${this.Config.apiRoute}/:collection/:id`, this.dbFindOne.bind(this));
    this.webServer.app.post(`${this.Config.apiRoute}/:collection`, this.dbInsert.bind(this));
    this.webServer.app.put(`${this.Config.apiRoute}/:collection/:id`, this.dbReplaceOne.bind(this));
    this.webServer.app.patch(`${this.Config.apiRoute}/:collection`, this.dbPatch.bind(this));
    this.webServer.app.patch(`${this.Config.apiRoute}/:collection/:id`, this.dbPatchOne.bind(this));
    this.webServer.app.delete(`${this.Config.apiRoute}/:collection`, this.dbDelete.bind(this));
    this.webServer.app.delete(`${this.Config.apiRoute}/:collection/:id`, this.dbDeleteOne.bind(this));
  }



  async dbReplaceOne (req, res, next) {
    let doc;
    try {
      doc = await this.database.update(req.params.collection, { _id: req.params.id }, req.body, { multi: false, returnUpdatedDocs: true });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(doc);
  }

  async dbPatch (req, res, next) {
    let docs;
    try {
      docs = await this.database.update(req.params.collection, req.query, req.body, { multi: true, returnUpdatedDocs: true });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(docs);
  }

  async dbPatchOne (req, res, next) {
    let doc;
    try {
      doc = await this.database.update(req.params.collection, { _id: req.params.id }, req.body, { multi: false, returnUpdatedDocs: true });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(doc);
  }

  async dbFind (req, res, next) {
    let docs;
    try {
      docs = await this.database.find(req.params.collection, req.query);
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(docs);
  }

  async dbFindOne (req, res, next) {
    let docs;
    try {
      docs = await this.database.find(req.params.collection, { _id: req.params.id });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!docs.length) {
      res.status(404).json({ error: `Document not found with _id ${req.params.id}.` });
    }
    res.json(docs[0]);
  }

  async dbInsert (req, res, next) {
    let doc;
    try {
      doc = await this.database.insert(req.params.collection, req.body);
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(doc);
  }

  async dbDelete (req, res, next) {
    let count;
    try {
      count = await this.database.remove(req.params.collection, req.query || {}, { multi: true });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ count });
  }

  async dbDeleteOne (req, res, next) {
    let count;
    try {
      count = await this.database.remove(req.params.collection, { _id: req.params.id }, { multi: false });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ count });
  }

}

module.exports = WebAPI;
