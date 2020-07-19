
const NeDB = require('nedb');
const Path = require('path');

const Defaults = {
  dataPath: './data',
  autoCreate: true,
  reservedNames: []
};

class Database {

  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.databases = {};
  }

  update (collection, query, update, options) {
    return new Promise((resolve, reject) => {
      let database = this.getDatabase(collection);
      database.update(query, update, options, (error, numAffected, docs, upsert) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(docs || numAffected);
      });
    });
  }

  find (collection, query) {
    return new Promise((resolve, reject) => {
      let database = this.getDatabase(collection);
      database.find(query || {}, (error, docs) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(docs);
      });
    });
  }

  insert (collection, doc) {
    return new Promise((resolve, reject) => {
      let database = this.getDatabase(collection);
      database.insert(doc, (error, newDoc) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(newDoc);
      });
    });
  }

  remove (collection, query, options) {
    return new Promise((resolve, reject) => {
      let database = this.getDatabase(collection);
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
    // TODO check auto create
    return this.databases[name] || this.createDatabase(name);
  }

  createDatabase (name) {
    // TODO validate name
    let db = new NeDB({ filename: Path.join((this.Config.dataPath || './'), name), autoload: true });
    this.databases[name] = db;
    return db;
  }
}

module.exports = Database;
