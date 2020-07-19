
const NeDB = require('nedb');
const Path = require('path');

const Defaults = {
  dataPath: './data',
  autoCreate: true,
  reservedNames: [],
  onChange: null
};

class Database {

  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.databases = {};
  }

  find (collection, query, projections) {
    return new Promise((resolve, reject) => {
      let database = this.getDatabase(collection);
      database.find(query || {}, projections || {}, (error, docs) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(docs);
      });
    });
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
        let result;
        if (options && options.multi) result = (options.returnUpdatedDocs ? docs : numAffected);
        else result = (options.returnUpdatedDocs ? [docs] : numAffected);
        this.onChange('update', collection, numAffected, result);
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
        this.onChange('insert', collection, 1, [newDoc]);
      });
    });
  }

  remove (collection, query, options) {
    return new Promise((resolve, reject) => {
      let database = this.getDatabase(collection);
      this.find(collection, query)
        .then((docs) => {
          database.remove(query, options, (error, numRemoved) => {
            if (error) {
              reject(new Error(error));
              return;
            }
            if (numRemoved !== docs.length) {
              reject(new Error(`Mismatch in removed documents, ${docs.length} found versus ${numRemoved} removed.`));
              return;
            }
            resolve(docs);
            this.onChange('remove', collection, docs.length, docs);
          });
        })
    });
  }


  onChange (action, collection, count, data) {
    if (!this.Config.onChange) return;
    if (!data || !data.length) return;
    this.Config.onChange({ action, collection, count, data });
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
