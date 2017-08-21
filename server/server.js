require('./config/config');

var fs = require('fs');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var socketIO = require('socket.io');
var path = require('path');
var _ = require('lodash');
//var dl  = require('./utils/delivery.server.js');
// var MemoryStore = require('connect/middleware/session/memory');
var connect = require('connect');
var sessionUtils = require('./utils/session.js');

var app = express();
var port = process.env.PORT;
var publicPath = path.join(__dirname, '../public');
var server = https.createServer({
  key: fs.readFileSync('./cert/key.pem'),
  cert: fs.readFileSync('./cert/cert.pem')
}, app);
var io = socketIO(server);
var ss = require('socket.io-stream');
//var session_store = new express.session.MemoryStore();


var {mongoose} = require('./db/mongoose');
var {Data} = require('./models/data');
var {User} = require('./models/user');
var {KeyRegistry} = require('./utils/crypto-utils.js');
var userRegistry = new KeyRegistry();

// app.configure(function () {
//   app.use(express.session({ store: session_store }));
// });

app.use(express.static(publicPath));


io.on('connection', (socket)=> {
  console.log('New user connection ' + socket.id);

  ss(socket).on('file.upload', (stream, params) => {
    console.log(`User ${socket.id} requested file ${params.name}`);
    var user = userRegistry.getUser(socket.id);

    if(user){
      console.log(`User with ID ${user.userId} found by session ID ${socket.id}`);
      var data = new Data({
        _creator: user.userId,
        content: {
          name: params.name || '',//params.name,
          fileName: params.fileName || '',
          size: params.size || 0,
          contentType: params.type
        }
      });
      var bufs = [];
      stream.on('data', function(d){ bufs.push(d); });
      stream.on('end', function(){
        var buf = Buffer.concat(bufs);
        console.log(`Buffer created. Length ${buf.length}`);
        data.createNewData(buf.toString('hex'), user.key).then((doc) =>  {
          console.log(`Data named added`);
          //console.log(`doc`);
          return true;
        }).catch((e)=>{
          console.log(`Data not added. Error ${e.message}`);
          //callback('Unable to save data');
        });;
      });
    } else {
      console.log(`User with socket ID ${socket.id} not found`);
    }

  });

  ss(socket).on('file.download', (stream, params, callback) => {
    console.log(`User ${socket.id} requested file ${params.name}`);
    var user = userRegistry.getUser(socket.id);

    if(user){
      console.log(`User with ID ${user.userId} found by session ID ${socket.id}`);
      var data = Data.findOne({
        _creator: user.userId,
        "content.name": params.name
      }).then((doc)=> {
        console.log(`Data found. User key is ${user.key}`);
        console.log(doc);
        var unencrypted = doc.unencryptData(user.key);
        //socket.emit('pingContent', unencrypted);
        console.log('Data unencrypted');
        var buffer = Buffer.from(unencrypted, 'hex');

        let Duplex = require('stream').Duplex;
        let unencodedStream = new Duplex();
        unencodedStream.push(buffer);
        unencodedStream.push(null);

        callback(undefined, {
          fileName : doc.content.fileName,
          size : doc.content.size,
          type: doc.content.contentType
        });

        unencodedStream.pipe(stream);

        //callback();
      }).catch((e)=> {
        console.log(`Unable to unencrypt file. Error ${e.message}`);
        callback('Unable to unencrypt file');
      })
    } else {
      console.log(`User not found by session ID ${socket.id}`);
      callback('User unauthorised');
    }

  });

  socket.on('signup', (params, callback) => {
    // console.log(params);

    var user = new User({
      email: params.email,
      name: params.name
    });

    user.registerNewUser(params.email, params.password).then((createdUser)=> {
      if(createdUser){
        userRegistry.addUser(createdUser._id.toHexString(), socket.id, createdUser.security.verification.key);
        callback();
      }
      callback('Unable to create user');
    }).catch((e)=>{
      callback('Unable to create user.');
    })

  });

  socket.on('signin', (params, callback) => {
    console.log(`User with email ${params.email} tries to signin`);
    var currentUser = new User({
      email: params.email
    });
    currentUser.verifyUserCredential(params.email, params.password).then((user)=>{
      if(user){
        console.log(`User ${user.name} returned from verification`);
        var tempUser = userRegistry.addUser(user._id.toHexString(), socket.id, user.key);
        console.log(`User ${user.name} with session ID ${tempUser.socketId} is registered into registry `);
        //console.log(userRegistry.registry);
        callback();
      }else{
        console.log(`User ${params.email} not found`);
        callback('User not verified');
      }
    }).catch((e)=>{
      console.log(`User ${params.email} not verified`)
      callback('User not verified');
    });

  });

  socket.on('addData', (params, callback) => {
    console.log(`User ${socket.id} adds data`)
    var user = userRegistry.getUser(socket.id);
    if(user){
      console.log(`User with ID ${user.userId} found by socket ID ${socket.id}`);
      var data = new Data({
        _creator: user.userId,
        content: {
          name: params.name,
          contentType: 'text',
          encryptedData: '',
          mac: '',
          iv:''
        }
      });
      data.createNewData(params.content, user.key).then((doc) =>  {
        console.log(`Data named added`);
        callback();
      }).catch((e)=>{
        console.log(`Data not added. Error ${e.message}`);
        callback('Unable to save data');
      });
    } else {
      console.log('User not found by socket ID ', socket.id);
      callback('User unauthorised')
    }
  });

  socket.on('getData', (params, callback)=>{
    var user = userRegistry.getUser(socket.id);

    if(user){
      console.log(`User with ID ${user.userId} found by session ID ${socket.id}`);
      var data = Data.findOne({
        _creator: user.userId,
        "content.name": params.name
      }).then((doc)=> {
        console.log(`Data found`);
        //console.log(doc);
        var unencrypted = doc.unencryptData(user.key);
        socket.emit('pingContent', unencrypted);
        callback();
      }).catch((e)=> {
        console.log(`Unable to unencrypt data. Error ${e.message}`);
        callback('Unable to unencrypt data');
      })
    } else {
      console.log(`User not found by session ID ${socket.id}`);
      callback('User unauthorised');
    }

  })


  socket.on('disconnect', () => {
    var user = userRegistry.removeUser(socket.id);

    if(user) {
    };
  });

});


server.listen(port, () => {
  console.log(`Server started at port ${port}`);
});






function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let buffers = [];
    stream.on('error', reject);
    stream.on('data', (data) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
