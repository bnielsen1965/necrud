
const Users = require('./users');
const JWT = require('./jwt');
const Hash = require('./hash');

module.exports = {
  allowRoutes: ['/js', '/css', '/images', '/fonts'],
  disallowRoutes: ['/..'],
  apiRoute: '',
  authenticationRoute: '/authentication',
  hashRoute: '/hash',
  loginPage: '/login.html',
  logoutPage: '/logout.html',
  homePage: '/index.html',

  JWT: JWT,
  Hash: Hash,
  Users: Users
};
