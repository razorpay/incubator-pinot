/* eslint-env node */

'use strict';

const path = require('path');

module.exports = function(/* env */) {
  return {
    clientAllowedKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_AUTH_REDIRECT_URL"],
    failOnMissingKey: false,
    path: path.join(path.dirname(__dirname), ".env"),
  };
};
