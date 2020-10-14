
const Config = require('./config');
const Application = require('./application');

let app = new Application(Config);
app.init()
  .then(() => {
    return app.listen();
  })
  .catch(error => {
    console.log('ERROR', error);
    process.exit(1);
  });
