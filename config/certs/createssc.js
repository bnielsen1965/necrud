'use strict';

const Path = require('path');
const OpenSSL = require('./openssl');
const Config = require('./config');

let openSSL = new OpenSSL({
  keyPath: getKeyPath(),
  csrPath: getCsrPath(),
  crtPath: getCrtPath(),
  expireDays: 36500
});

generateFiles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log(error.stack);
    process.exit(1);
  });


async function generateFiles () {
  await openSSL.generateKey(2048, getKeyPath(), getOpensslConfigPath(), (msg) => { console.log(msg); }),
  await openSSL.generateCsr(getKeyPath(), getCsrPath(), getOpensslConfigPath(), ['localhost', 'localhost.localdomain'], openSSL.getAltIPs(), (msg) => { console.log(msg); }),
  await openSSL.selfSign(getKeyPath(), getCsrPath(), getCrtPath(), getOpensslConfigPath(), ['localhost', 'localhost.localdomain'], openSSL.getAltIPs(), (msg) => { console.log(msg); })
}

function getKeyPath() {
  return Path.join(__dirname, Config.keyFile);
}

function getCsrPath () {
  return Path.join(__dirname, Config.csrFile);
}

function getCrtPath () {
  return Path.join(__dirname, Config.crtFile);
}

function getOpensslConfigPath () {
  return Path.join(__dirname, 'openssl.cnf');
}
