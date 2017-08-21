const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

var generateSalt = () => {
  return CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(256/8));
};

var generateIV = () => {
  return CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.random(256/8));
}

var generateKey = (password, salt) => {
  var saltObject = CryptoJS.enc.Hex.parse(salt);
  var hashKey = CryptoJS.PBKDF2(password, saltObject, {
    keySize: 512/8,
    iterations: 64000
  });
  return CryptoJS.enc.Hex.stringify(hashKey);
};

var encryptAES = (data, key, iv) => {
  var ivObject = CryptoJS.enc.Hex.parse(iv);
  var keyObject = CryptoJS.enc.Hex.parse(key);
  var encryptedData = CryptoJS.AES.encrypt(data, keyObject, {iv: ivObject});
  return encryptedData.toString();
};

var decryptAES = (data, key, iv) => {
  var ivObject = CryptoJS.enc.Hex.parse(iv);
  var keyObject = CryptoJS.enc.Hex.parse(key);
  return CryptoJS.AES.decrypt(data, keyObject, {iv: ivObject}).toString(CryptoJS.enc.Utf8);//CryptoJS.enc.Utf8);
};

var generateHash = (data) => {
  return CryptoJS.SHA512(data).toString();
};

var verifyMac = (encryptedContent, verificationMac) => {
  var mac = generateHash(encryptedContent);
  if(mac === verificationMac) {
    return true;
  }
  return false;
};

var generateNewKeySet = (phrase, password) => {
  var iv = generateIV();
  var salt = generateSalt();
  var key = generateKey(password, salt);
  var verificationString = encryptAES(phrase, key, iv);
  var verificationMac = generateHash(verificationString);
  return {
    iv,
    salt,
    verificationMac
  }
};

var verifyUserCredentials = (phrase, password, iv, salt, verificationMac) => {
  var key = generateKey(password, salt);
  var encryptedString = encryptAES(phrase, key, iv);
  if(verifyMac(encryptedString, verificationMac)){
    return key;
  } else {
    return undefined;
  };
}


class KeyRegistry {
  constructor () {
    //Here to implement generation of the master key
    this.registry = [];
  }

  addUser (userId, socketId, key) {
    var encryptedKey; //Here to implement encryption of the

    //removeUser(socketId);

    var user = {
      userId,
      socketId,
      key
    };
    this.registry.push(user);
    return user;
  }

  getUser(id) {
    var selectedUser = this.registry.filter((user)=> user.socketId === id);
    console.log('getUser number of records found is ', selectedUser.length);
    if(selectedUser.length > 0){
      return selectedUser[0];
    }
    return undefined;
  }

  removeUser(id) {
    var removingUser = [];
    removingUser = this.registry.filter((user) => user.socketId === id);
    if(removingUser.length > 0){
      var index = this.registry.indexOf(removingUser[0]);
      if(index > -1){
        this.registry.splice(index, 1);
        return removingUser[0];
      }
    }
    return undefined;
  }
}


module.exports = {
  generateSalt,
  generateIV,
  generateKey,
  encryptAES,
  decryptAES,
  generateHash,
  generateNewKeySet,
  verifyUserCredentials,
  verifyMac,
  KeyRegistry
}
