var mongoose = require('mongoose');
var validator = require('validator');

const {Crypt} = require('./../utils/crypto-utils.js');
const {PKI} = require('./../utils/pki-utils.js');

//const cryptoUtils = require('./../utils/crypto-utils.js');

var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email'
    }
  },
  security: {
    verification: {
      iv: {
        type: String
      },
      salt: {
        type: String
      },
      verificationMac: {
        type: String
      }
    }
  },
  name: {
    type: String,
    trim: true,
    minlength: 1
  }
});

UserSchema.methods.registerNewUser =  function (email, password, name) {
  var currentUser = this;

  return User.findOne({email}).then((user) => {
    if(user) {
      return Promise.reject('User already exist');
    } else {
      return new Promise((respond, reject) => {
        // console.log('Keyset started to be generated');
        try{
          var keySet = PKI.generateKeySet(email, password);
          var key = Crypt.wrapPBKDF2(password, keySet.salt);
          var encryptedData = Crypt.encryptAES(email, key, keySet.iv);
          var signature = Crypt.signData(encryptedData);
          currentUser.security = {
            verification: {
              iv: keySet.iv,
              salt: keySet.salt,
              verificationMac: signature
            }
          }
          currentUser.save().then((result) => {
            // console.log('User created ', email);
            return respond(result);
          }).catch((e)=>{
            reject(e);
          });
        } catch(e){
          // console.log('Error during user registration ', e);
          reject(e.message);
        }
      });
    }
  }).catch((e)=>{
    // console.log('Error during finding creating the user', e.message);
    return Promise.reject('Error during creating the user');
  });
};

UserSchema.methods.verifyUserCredential = function (email, password) {

    return User.findOne({email}).then((user) =>{
      if(!user) {
        return Promise.reject();
      }
      return new Promise((response, reject) => {
        var key = Crypt.verifyUserCredentials(
          email,
          password,
          user.security.verification.iv,
          user.security.verification.salt,
          user.security.verification.verificationMac
        );
        if(key){
          user.key = key;
          return response(user);
        }
        return reject();
      });
    }).catch((e) => {
      return Promise.reject();
    });

}

var User = mongoose.model('Users', UserSchema);

module.exports = {User};
