const CryptoJS = require('crypto-js');

class PKI {
  constructor() {

  }

  static generateSalt () {
    return CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(process.env.salt_length_PBKDF2));
  }

  static generateIV () {
    return CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(process.env.iv_length_AES));
  }

  static generateKeySet (phrase, password) {
    var iv = this.generateIV();
    var salt = this.generateSalt();
    //var key = this.generateKey(password, salt);
    return {
      iv,
      salt
    }
  }

}

module.exports = {PKI};
