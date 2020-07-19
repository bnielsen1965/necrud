
const NeDB = require('nedb');
const Path = require('path');

const Defaults = {
  apiRoute: '/db',
  dataPath: './data',
  autoCreate: true,
  reservedNames: ['authentication', 'hash']
};

class WebAPI {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.databases = {};
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
      doc = await this.update(this.getDatabase(req.params.collection), { _id: req.params.id }, req.body, { multi: false, returnUpdatedDocs: true });
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
      docs = await this.update(this.getDatabase(req.params.collection), req.query, req.body, { multi: true, returnUpdatedDocs: true });
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
      doc = await this.update(this.getDatabase(req.params.collection), { _id: req.params.id }, req.body, { multi: false, returnUpdatedDocs: true });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(doc);
  }

  update (database, query, update, options) {
    return new Promise((resolve, reject) => {
      database.update(query, update, options, (error, numAffected, docs, upsert) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(docs || numAffected);
      });
    });
  }



  async dbFind (req, res, next) {
    let docs;
    try {
      docs = await this.find(this.getDatabase(req.params.collection));
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
      docs = await this.find(this.getDatabase(req.params.collection), { _id: req.params.id });
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

  find (database, query) {
    return new Promise((resolve, reject) => {
      database.find(query || {}, (error, docs) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(docs);
      });
    });
  }


  async dbInsert (req, res, next) {
    let doc;
    try {
      doc = await this.insert(this.getDatabase(req.params.collection), req.body);
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json(doc);
  }

  insert (database, doc) {
    return new Promise((resolve, reject) => {
      database.insert(doc, (error, newDoc) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(newDoc);
      });
    });
  }


  async dbDelete (req, res, next) {
    let count;
    try {
      count = await this.remove(this.getDatabase(req.params.collection), req.query || {}, { multi: true });
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
      count = await this.remove(this.getDatabase(req.params.collection), { _id: req.params.id }, { multi: false });
    }
    catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ count });
  }

  remove (database, query, options) {
    return new Promise((resolve, reject) => {
      database.remove(query, options, (error, numRemoved) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(numRemoved);
      });
    });
  }



  getDatabase (name) {
    return this.databases[name] || this.createDatabase(name);
  }

  createDatabase (name) {
    // TODO validate name
    let db = new NeDB({ filename: Path.join((this.Config.dataPath || './'), name), autoload: true });
    this.databases[name] = db;
    return db;
  }
}

module.exports = WebAPI;
