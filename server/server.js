require('./config/config');

var fs = require('fs');
var https = require('https');
var express = require('express');
var socketIO = require('socket.io');
var path = require('path');
var connect = require('connect');
var _ = require('lodash');

var {mongoose} = require('./db/mongoose');
var {Data} = require('./models/data');
var {User} = require('./models/user');
var {KeyRegistry} = require('./utils/KeyRegistry.js');
var userRegistry = new KeyRegistry();

var app = express();
var port = process.env.PORT || 3000;
var publicPath = path.join(__dirname, '../public');
var server = https.createServer({ key: fs.readFileSync('./server/cert/key.pem'), cert: fs.readFileSync('./server/cert/cert.pem') }, app);
var io = socketIO(server);
var ss = require('socket.io-stream');

app.use(express.static(publicPath));

io.on('connection', (socket)=> {
  //console.log('New user connection ' + socket.id);

  ss(socket).on('file.upload', async (stream, params, callback) => {
    //console.log(`User ${socket.id} requested file ${params.name}`);
    var user = userRegistry.getUser(socket.id);

    if(user){
      //console.log(`User with ID ${user.userId} found by session ID ${socket.id}`);
      var check = await Data.findOne({'content.name': params.name});
      if (check) {
        //console.log('Document already exist');
        return callback('Document with this name already exist');
      }
      var bufs = [];
      stream.on('data', (d) => bufs.push(d) );
      stream.on('end', () => {
        var buf = Buffer.concat(bufs);
        //console.log(`Buffer created. Length ${buf.length}`);
        try{
          var data = new Data({
            _creator: user.userId,
            content: {
              name: params.name || '',//params.name,
              fileName: params.fileName || '',
              size: params.size || 0,
              contentType: params.type
            }
          });
          data.createNewData(buf.toString('hex'), user.key).then((doc) => {
            //console.log(`Data named ${params.name} added`);
            return callback();
          });

        } catch (e) {
          //console.log(`Data not added. Error ${e.message}`);
          return callback('Data not added')
        }
      });
    } else {
      //console.log(`User with socket ID ${socket.id} not found`);
      return callback('User is not registered');
    }
  });

  ss(socket).on('file.download', async (stream, params, callback) => {
    //console.log(`User ${socket.id} requested file ${params.name}`);
    var user = userRegistry.getUser(socket.id);

    if(user){
      //console.log(`User with ID ${user.userId} found by session ID ${socket.id}`);
      try{
        var doc = await Data.findOne({ _creator: user.userId, "content.name": params.name });
        //console.log(`Data found. User key is ${user.key}`);
        var unencrypted = doc.unencryptData(user.key);
        //console.log('Data unencrypted');
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
      } catch(e) {
        //console.log(`Unable to unencrypt file. Error ${e.message}`);
        callback('Unable to unencrypt file');
      }
    } else {
      //console.log(`User not found by session ID ${socket.id}`);
      callback('User unauthorised');
    }

  });

  socket.on('signup', (params, callback) => {
    try{
      var user = new User({ email: params.email, name: params.name });
    } catch(e){
      //console.log(e.message);
      return callback(e.message);
    }
    //console.log('Creating new user');
    user.registerNewUser(params.email, params.password, params.name ).then((createdUser) => {
      //console.log(`User created (server.js) ${params.email}`);
      userRegistry.addUser(createdUser._id.toHexString(), socket.id, createdUser.security.verification.key);
      return callback();
    }).catch((e) => {
      //console.log('Error during registration of the user:', e.message);
      return callback('Unable to create user');
    });
  });

  socket.on('signin',  (params, callback) => {
    //console.log(`User with email ${params.email} tries to signin`);
    var currentUser = new User({
      email: params.email
    });
    //console.log('Verification starting');
    currentUser.verifyUserCredential(params.email, params.password).then((user) => {
      //console.log(`User ${user.name} returned from verification`);
      userRegistry.addUser(user._id.toHexString(), socket.id, user.key);
      //console.log(`User ${user.name} with session ID ${socket.id} is registered into registry `);
      return callback();
    }).catch((e) => {
      //console.log('Error during verification: ', e);
      return callback('Error during verification');
    });

  });

  socket.on('addData', async (params, callback) => {
    //console.log(`User ${socket.id} adds data`)
    var user = userRegistry.getUser(socket.id);
    if(user){
      var check = await Data.findOne({'content.name': params.name});
      if (check) {
        //console.log('Document already exist');
        return callback('Document with this name already exist');
      }
      //console.log(`User with ID ${user.userId} found by socket ID ${socket.id}`);
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
      try{
        await data.createNewData(params.content, user.key);
        //console.log(`Data with name ${params.name} added`);
        callback();
      } catch(e) {
        //console.log(`Data not added. Error ${e.message}`);
        callback('Unable to save data');
      }
    } else {
      //console.log('User not found by socket ID ', socket.id);
      callback('User unauthorised')
    }
  });

  socket.on('getData', async (params, callback)=>{
    var user = userRegistry.getUser(socket.id);
    if(user){
      //console.log(`User with ID ${user.userId} found by session ID ${socket.id}`);
      try{
        var doc = await Data.findOne({ _creator: user.userId, "content.name": params.name});
        var unencrypted = doc.unencryptData(user.key);
        callback(undefined, unencrypted);
      } catch(e) {
        // console.log(`Unable to unencrypt data. Error ${e.message}`);
        callback('Unable to unencrypt data');
      }
    } else {
      // console.log(`User not found by session ID ${socket.id}`);
      callback('User unauthorised');
    }
  })

  socket.on('getListOfData', (params, callback)=>{
    var user = userRegistry.getUser(socket.id);
    var dataRegistry = [];

    if(user){
      Data.find({_creator: user.userId}).then((doc) => {
        doc.forEach((d) => {
          dataRegistry.push({
            id: d._id.toHexString(),
            name: d.content.name,
            fileName: d.content.fileName,
            path: d.content.path,
            size: d.content.size,
            contentType: d.content.contentType
          });
        });
        return callback(undefined, dataRegistry);

      });
    }else{
      return callback('User not identified');
    }

  });

  socket.on('deleteData', (params, callback) => {
    var user = userRegistry.getUser(socket.id);
    if(user) {
      Data.deleteOne({
        'content.name': params.name,
        _creator: user.userId}).then((doc) => {
        if(doc.result.n > 0) {
          return callback();
        } else {
          callback('Unable to find requested data');
        }
      })
    } else {
      return callback('Unauthorised request');
    }
  })

  socket.on('updateData', (params, callback) => {
    var user = userRegistry.getUser(socket.id);
    if(user) {
      Data.findOneAndUpdate({
        _id: params.id,
        _creator: user.userId
      }, {
        'content.name': params.name,
        'content.path': params.path,
        'content.fileName': params.fileName
      }, {
        returnNewDocument: true
      }).then((d) => {
        if(d) {
          return callback(undefined, {
            id: d._id.toHexString(),
            name: d.content.name,
            fileName: d.content.fileName,
            path: d.content.path,
            size: d.content.size,
            contentType: d.content.contentType
          });
        } else {
          callback('Unable to update requested data');
        }
      })
    } else {
      return callback('Unauthorised request');
    }
  });

  socket.on('getDataInfo', (params, callback) => {
    var user = userRegistry.getUser(socket.id);
    if(user){
      Data.findOne({
        //_id: params.id,
        'content.name': params.name
      }).then((d) => {
        if(d){
          return callback(undefined, {
            id: d._id.toHexString(),
            name: d.content.name,
            fileName: d.content.fileName,
            path: d.content.path,
            size: d.content.size,
            contentType: d.content.contentType
          })
        } else {
          callback('Unable to get data info');
        }
      })
    }else{
      return callback('Unauthorised request');
    }
  });

  socket.on('disconnect', () => {
    var user = userRegistry.removeUser(socket.id);
  });
});

server.listen(port, () => {
  // console.log(`Server started at port ${port}`);
});


function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let buffers = [];
    stream.on('error', reject);
    stream.on('data', (data) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
