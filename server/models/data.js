var mongoose = require('mongoose');
var validator = require('validator');
//const jwt = require('jsonwebtoken');
//const _ = require('lodash');
//const cryptoUtils = require('./../utils/crypto-utils.js');
const {Crypt} = require('./../utils/crypto-utils.js');
const {PKI} = require('./../utils/pki-utils.js');

var DataSchema = new mongoose.Schema({
  _creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  content: {
    name: {
      type: String,
      default: ''
    },
    fileName: {
      type: String,
      default: ''
    },
    path: {
      type: String,
      default: ''
    },
    contentType: {
      type: String,
      default: ''
    },
    encryptedData: {
      type: String,
      default: ''
    },
    size: {
      type: Number,
      default: ''
    },
    mac: {
      type: String,
      default: ''
    },
    iv: {
      type: String,
      default: ''
    }
  }
});

DataSchema.methods.createNewData = async function (contentData, key) {
  var data = this;

  try{
    var iv = PKI.generateIV();
    var encryptedData = Crypt.encryptAES(contentData, key, iv);
    var mac = Crypt.signData(encryptedData);

    data.content.encryptedData = encryptedData;
    data.content.mac = mac;
    data.content.iv = iv;

    return data.save().then(() => {
      return  Promise.resolve(data);
    });
    return  Promise.reject();
  } catch(e) {
    return  Promise.reject(e);
  }
};

DataSchema.methods.unencryptData = function (key) {
  var data = this;

  if(Crypt.verifyMac(data.content.encryptedData, data.content.mac)){
    return Crypt.decryptAES(data.content.encryptedData, key, data.content.iv);
  }
  return false;
}

var Data = mongoose.model('Datas', DataSchema);

module.exports = {Data};
