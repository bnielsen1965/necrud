
const NeDB = require('nedb');
const FS = require('fs');
const Path = require('path');

const Defaults = {
  dataPath: './data',
  fileExtension: 'db',
  autoCreate: true,
  reservedNames: [],
  onChange: null
};

class Database {

  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.databases = {};
  }

  async init () {
    let names = await this.getDatabaseFilenames();
    for (let i = 0; i < names.length; i++) {
      this.createDatabase(names[i]);
    }
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

  async remove (collection, query, options) {
    let docs = await this.find(collection, query);
    let numRemoved = await this._remove(collection, query, options);
    if (numRemoved !== docs.length) {
      throw new Error(`Mismatch in removed documents, ${docs.length} found versus ${numRemoved} removed.`);
      return;
    }
    this.onChange('remove', collection, docs.length, docs);
    return docs;
    /*
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
    */
  }

  _remove (collection, query, options) {
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


  onChange (action, collection, count, data) {
    if (!this.Config.onChange) return;
    if (!data || !data.length) return;
    this.Config.onChange({ action, collection, count, data });
  }

  validName (name) {
    if (!name || !name.length) return false;
    return ! (/[^A-Za-z0-9_\-]/.test(name));
  }

  getDatabase (name) {
    // TODO check auto create
    return this.databases[name] || (this.Config.autoCreate && this.createDatabase(name));
  }

  createDatabase (name) {
    if (!this.validName(name)) throw new Error(`Invalid database name ${name}`);
    let db = new NeDB({ filename: Path.join(Path.resolve(this.Config.dataPath), `${name}.${this.Config.fileExtension}`), autoload: true });
    this.databases[name] = db;
    return db;
  }

  deleteDatabase (name) {
    if (!this.databases[name]) throw new Error(`No database named ${name}`);
    FS.unlinkSync(this.getDatabasePath(name));
    delete this.databases[name];
  }

  getDatabaseNames () {
    return Object.keys(this.databases);
  }

  async getDatabaseFilenames () {
    let files = await this.readDir(this.Config.dataPath);
    let fileRegex = new RegExp(`\\.${this.Config.fileExtension}$`);
    return files.filter(file => { return fileRegex.test(file); }).map(file => file.replace(/\.[^.]*$/, ''));
  }

  getDatabasePath (name) {
    return Path.join(Path.resolve(this.Config.dataPath), `${name}.${this.Config.fileExtension}`);
  }

  // get filenames from directory path
  readDir (path) {
    return new Promise((resolve, reject) => {
      FS.readdir(Path.resolve(path), (error, items) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(items);
      });
    });
  }

}

module.exports = Database;
