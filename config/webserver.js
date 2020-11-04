
const Path = require('path');

module.exports = {
  httpPort: 8880,
  httpsPort: 4443,
  keyFile: Path.resolve("./config/certs/webserver.key"),
  crtFile: Path.resolve("./config/certs/webserver.crt")
};
