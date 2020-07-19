'use strict';

const OS = require('os');
const FS = require('fs');
const Spawn = require('child_process').spawn;

const Defaults = {
  keyPath: './default.key',
  csrPath: './default.csr',
  crtPath: './default.crt',
  configPath: './openssl.cnf',
  expireDays: 365,
  keyBits: 2048
};

class OpenSSL {
  constructor (options) {
    this.options = Object.assign({}, Defaults, options);

    // automatically export underscored methods for this instance
    this.autoExport();
  }

  // create an instance of each underscored method with a bind to this instance
  autoExport () {
    let self = this;
    Object.getOwnPropertyNames(Object.getPrototypeOf(self)).forEach(function (name) {
      if (/^_[^_]+/.test(name)) {
        self[name.replace(/^_/, '')] = self[name].bind(self);
      }
    });
  }

  // generate private key
  async _generateKey (keyBits, keyPath, progress) {
    await this.opensslCommand([
      'genrsa',
      '-out',
      keyPath,
      keyBits || this.options.keyBits
    ], progress);
  }

  // generate certificate signing request
  async _generateCsr (keyPath, csrPath, configPath, altDNSs, altIPs, progress) {
    let altNames = this.altsToAltNames(altDNSs, altIPs).join('\n');
    await this.opensslCommand([
      'req',
      '-new',
      '-key',
      keyPath,
      '-out',
      csrPath,
      '-sha256',
      '-subj',
      '"/C=XX/ST=XX/CN=localhost/O=Org/OU=OrgUnit"',
      '-config',
      '<(cat ' + configPath + ' <(printf "\n' + altNames + '\n"))'
    ], progress);
  }

  // create a self singed certificate
  async _selfSign (keyPath, csrPath, crtPath, configPath, altDNSs, altIPs, progress) {
    let altNames = this.altsToAltNames(altDNSs, altIPs).join('\n');
    await this.opensslCommand([
      'req',
      '-x509',
      '-nodes',
      '-key',
      keyPath,
      '-days',
      this.options.expireDays,
      '-out',
      crtPath,
      '-in',
      csrPath,
      '-config',
      '<(cat ' + configPath + ' <(printf "\n' + altNames + '\n"))'
    ], progress);
  }

  // import certificate
  async _importCertificate (keyPath, crtPath, certificate, progress) {
    const data = new Uint8Array(Buffer.from(certificate));
    FS.writeFile(crtPath, data, (err) => {
      if (err) {
        throw err;
      }
    });
    // return result of check that certificate matches private key
    let pk1 = Buffer.from(await this.publicKeyFromCertificate(crtPath));
    let pk2 = Buffer.from(await this.publicKeyFromPrivateKey(keyPath));
    return pk1.equals(pk2);
  }

  // get public key from certificate
  async _publicKeyFromCertificate (crtPath) {
    let output = '';
    await this.opensslCommand(
      ['x509', '-noout', '-in', crtPath, '-pubkey', '-outform', 'pem'],
      (o => { output += o; })
    );
    return output;
  }

  // get public key from private key
  async _publicKeyFromPrivateKey (keyPath) {
    let output = '';
    await this.opensslCommand(
      ['pkey', '-in', keyPath, '-pubout', '-outform', 'pem'],
      (o => { output += o; })
    );
    return output;
  }

  // execute an openssl command
  async _opensslCommand (args, progress) {
    let errorMessage = '';
    let command = 'openssl ' + args.join(' ');
    let exitCode = await this.spawnProcess('/bin/bash', ['-c', command], progress, (err) => { errorMessage += err; });
    if (exitCode) {
      throw new Error(errorMessage);
    }
  }

  // spawn a process to run a command
  _spawnProcess (command, args, onstdout, onstderr) {
    return new Promise((resolve, reject) => {
      let shell = Spawn(command, args);
      shell.on('close', (code) => {
        resolve(code);
      });

      shell.stdout.on('data', (data) => {
        if (onstdout) {
          let d = data.toString();
          if (d.length > 1) onstdout(d);
        }
      });

      shell.stderr.on('data', (data) => {
        if (onstderr) {
          let d = data.toString();
          if (d.length > 1) onstderr(d);
        }
      });
    });
  }

  // get alternate IPv4 addresses that may be assigned to a certificate request
  _getAltIPs () {
    let interfaces = OS.networkInterfaces();
    let altIPs = ['127.0.0.1'];
    for (let iface in interfaces) {
      interfaces[iface].forEach((address) => {
        if (!address.internal && address.family === 'IPv4') {
          altIPs.push(address.address);
        }
      });
    }
    return altIPs;
  }

  // convert arrays of alt DNS and alt IP values to alt_name fields for the openssl.cnf template
  _altsToAltNames (altDNSs, altIPs) {
    altDNSs = (altDNSs || []).map((dns, i) => { return 'DNS.' + (i + 1) + ' = ' + dns; });
    altIPs = (altIPs || []).map((ip, i) => { return 'IP.' + (i + 1) + ' = ' + ip; });
    return altDNSs.concat(altIPs);
  }

}

module.exports = OpenSSL;
