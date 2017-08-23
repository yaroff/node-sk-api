const CryptoJS = require('crypto-js');

class Crypt {
  constructor() {

  }

  static encryptAES (data, key, iv)  {
    var ivObject = CryptoJS.enc.Hex.parse(iv);
    var keyObject = CryptoJS.enc.Hex.parse(key);
    var encryptedData = CryptoJS.AES.encrypt(data, keyObject, {iv: ivObject});
    return encryptedData.toString();
  }

  static decryptAES (data, key, iv) {
    var ivObject = CryptoJS.enc.Hex.parse(iv);
    var keyObject = CryptoJS.enc.Hex.parse(key);
    return CryptoJS.AES.decrypt(data, keyObject, {iv: ivObject}).toString(CryptoJS.enc.Utf8);//CryptoJS.enc.Utf8);
  }

  static generateHash (data) {
    return CryptoJS.SHA512(data).toString();
  };

  static verifyMac (encryptedContent, verificationMac) {
    var mac = this.generateHash(encryptedContent);
    if(mac === verificationMac) {
      return true;
    }
    return false;
  }

  static wrapPBKDF2 (password, salt) {
    var saltObject = CryptoJS.enc.Hex.parse(salt);
    var hashKey = CryptoJS.PBKDF2(password, saltObject, {
      keySize: process.env.key_length_AES,
      iterations: process.env.iterations_PBKDF2
    });
    return CryptoJS.enc.Hex.stringify(hashKey);
  }

  static signData (data) {
    //var verificationString = encryptAES(data, key, iv);
    var verificationMac = this.generateHash(data);
    return verificationMac;
  }

  static verifyUserCredentials (phrase, password, iv, salt, verificationMac) {
    var key = this.wrapPBKDF2(password, salt);
    var encryptedString = this.encryptAES(phrase, key, iv);
    if(this.verifyMac(encryptedString, verificationMac)){
      return key;
    } else {
      return undefined;
    }
  }

}

module.exports = {Crypt};
