var socket = io();


jQuery('#encrypt-form').on('submit', function (e) {
  e.preventDefault();

  var name = jQuery('[name=encryptname]').val();
  var content = jQuery('[name=encryptcontent]').val();

  if(content === '') {
    alert('Enter content');
    return;
  };

  socket.emit('addData', {
    name,
    content
  }, function(err) {
    if(err){
      alert(err);
    }else{
      jQuery('[name=encryptcontent]').val('');
      alert('Content was entrypted');
    }
  });

});


jQuery('#decrypt-form').on('submit', function (e) {
  e.preventDefault();

  var name = jQuery('[name=decryptname]').val();

  if(name === '') {
    alert('Enter name');
    return;
  };

  socket.emit('getData', {
    name
  }, function(err, data) {
    if(err){
      alert(err);
    }else{
      var content = jQuery('[name=decryptcontent]').val(data);
    }
  });

});


jQuery('#upload-form').on('submit', function (e) {
  e.preventDefault();

  var name = jQuery('[name=uploadname]').val();
  if(name === '') {
    alert('Enter name');
    return;
  };
  var file = jQuery('[name=uploadfile]')[0].files[0];
  //var extraParams = {foo: 'bar'};
  try{
    //delivery.send(file, extraParams);
    var stream = ss.createStream();
    ss(socket).emit('file.upload', stream, {
      name: name,
      fileName: file.name,
      size: file.size,
      type: file.type},
      function (err) {
        if(err){
          alert(err);
        } else {
          alert('File saved');
          jQuery('[name=uploadname]').val('');
          jQuery('[name=uploadfile]').val('');
        }
      });
    ss.createBlobReadStream(file).pipe(stream);
  } catch (e) {
    alert('Was not able to save file');
  }
});


socket.on('pingContent', function(data) {
  var content = jQuery('[name=decryptcontent]').val(data);
});

jQuery('#signin-form').on('submit', function (e) {
  e.preventDefault();

  var email = jQuery('[name=email]').val();
  var password = jQuery('[name=password]').val();


  socket.emit('signin', {
    email,
    password
  }, function(err) {
    if(err){
      alert('You havent sign in, ' + err);
    } else {
      alert('You signed in successfully');
    }
  });

});

jQuery('#signup-form').on('submit', function (e) {
  e.preventDefault();

  var name = jQuery('[name=signup_name]').val();
  var email = jQuery('[name=signup_email]').val();
  var password = jQuery('[name=signup_password]').val();
  var password_verify = jQuery('[name=signup_password_verify]').val();

  if(password !== password_verify) {
    alert('Password does not match');
    return;
  };

  if(name === '' || email === '' || password === ''){
    return alert('Enter user details');
  }

  socket.emit('signup', {
    name,
    email,
    password
  }, function(err) {
    if(err){
      return alert('You havent sign up, ' + err);
    } else {
      jQuery('[name=signup_name]').val('');
      jQuery('[name=signup_email]').val('');
      jQuery('[name=signup_password]').val('');
      jQuery('[name=signup_password_verify]').val('');
      return alert('You signed in successfully', name);
    }
  });
});


  jQuery('#download-form').on('submit', function (e) {
    e.preventDefault();
    var name = jQuery('[name=downloadname]').val();
    if(name === '') {
      alert('Enter name');
      return;
    };
    return downloadFile(name, 'test.fil');
  });


  jQuery('#delete-form').on('submit', function (e) {
    e.preventDefault();
    var name = jQuery('[name=delete_name]').val();
    if(name === '') {
      alert('Enter name');
      return;
    };
    socket.emit('deleteData', {
      name
    }, function(err) {
      if(err){
        return alert('Data is not deleted ' + err);
      } else {
        jQuery('[name=delete_name]').val('');
        return alert('Data is deleted successfully', name);
      }
    });
  });

jQuery('#getListOfData-form').on('submit', function (e) {
  e.preventDefault();

  socket.emit('getListOfData', {}, function (error, data) {
    if(error){
      console.log('Error:', error);
    } else {
      console.log(data);
    }
  });
});


  function downloadFile(name, originalFilename) {

    var deferred = $.Deferred();

    //== Create stream for file to be streamed to and buffer to save chunks
    var stream = ss.createStream(),
    fileBuffer = [],
    fileLength = 0;

    //== Emit/Request
    ss(socket).emit('file.download', stream, {name: name}, function (fileError, fileInfo) {
        if (fileError) {
            deferred.reject(fileError);
        } else {

            console.log(['File Found!', fileInfo]);

            //== Receive data
            stream.on('data', function (chunk) {
                fileLength += chunk.length;
                var progress = Math.floor((fileLength / fileInfo.size) * 100);
                progress = Math.max(progress - 2, 1);
                deferred.notify(progress);
                fileBuffer.push(chunk);
            });

            stream.on('end', function () {

                var filedata = new Uint8Array(fileLength),
                i = 0;

                //== Loop to fill the final array
                fileBuffer.forEach(function (buff) {
                    for (var j = 0; j < buff.length; j++) {
                        filedata[i] = buff[j];
                        i++;
                    }
                });

                deferred.notify(100);

                //== Download file in browser
                downloadFileFromBlob([filedata], fileInfo.fileName);

                deferred.resolve();
            });
        }
    });

    //== Return
    return deferred;
}

var downloadFileFromBlob = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data, fileName) {
        var blob = new Blob(data, {
                type : "octet/stream"
            }),
        url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());
