var mongoose = require('mongoose');
var validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const cryptoUtils = require('./../utils/crypto-utils.js');

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
  // tokens: [{
  //   access: {
  //     type: String,
  //     required: true
  //   },
  //   token: {
  //     type: String,
  //     required: true
  //   }
  // }],
  name: {
    type: String,
    trim: true,
    minlength: 1
  }
});

UserSchema.methods.registerNewUser = function (email, password) {
  var currentUser = this;

  try{
    return User.findOne({email}).then((user) => {
      if(user) {
        // console.log('Error 1');
        return Promise.reject();
      }
      // console.log('Reached Promise creation');
      return new Promise((respond, reject) => {
        // console.log('Keyset started to be generated');
        var keyset;
        try{
           keyset = cryptoUtils.generateNewKeySet(email, password);
          //  console.log(keyset);
          //  console.log(currentUser);
           currentUser.security.verification = keyset;
        } catch(e){
          console.log('Error during keyset generation ', e);
        }
        // console.log(keyset);
        // console.log('Keyset is generated ', currentUser);
        currentUser.save().then((result) => {
          // console.log('User saved');
          respond(result);
        }).catch((e)=>{
          // console.log('Error during saving ', e);
          reject(e);
        });
      });
    })
  } catch(e) {
    console.log('Error 3:', e.message);
    return  Promise.reject(e);
  }
};

UserSchema.methods.verifyUserCredential = function (email, password) {
  //var User = this;

  try{
    return User.findOne({email}).then((user) => {
      if(!user) {
        return Promise.reject();
      }
      return new Promise((response, reject) => {
        var key = cryptoUtils.verifyUserCredentials(
          email,
          password,
          user.security.verification.iv,
          user.security.verification.salt,
          user.security.verification.verificationMac
        );
        if(key){
          user.key = key;
          response(user);
        }
        reject();
      });
    })
  } catch(e) {
    return Promise.reject(e);
  }
}



var User = mongoose.model('Users', UserSchema);

module.exports = {User};
