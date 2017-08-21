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
  }, function() {
    jQuery('[name=content]').val('');
    alert('Content was entrypted');
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
  }, function() {

  });

});




jQuery('#upload-form').on('submit', function (e) {
  e.preventDefault();

  var name = jQuery('[name=uploadname]').val();
  //var file = jQuery('[name=uploadfile]').val();

  if(name === '') {
    alert('Enter name');
    return;
  };

  var file = jQuery('[name=uploadfile]')[0].files[0];
  var extraParams = {foo: 'bar'};
  try{
    //delivery.send(file, extraParams);
    var stream = ss.createStream();
    ss(socket).emit('file.upload', stream, {
      name: name,
      fileName: file.name,
      size: file.size,
      type: file.type});
    ss.createBlobReadStream(file).pipe(stream);
    alert('File saved');
    jQuery('[name=uploadname]').val('');
    jQuery('[name=uploadfile]').val('');
  } catch (e) {
    alert('Was not able to save file');
  }
});


socket.on('pingContent', function(data) {
  var content = jQuery('[name=decryptcontent]').val(data);
  //alert(data);
});

jQuery('#signin-form').on('submit', function (e) {
  e.preventDefault();

  var email = jQuery('[name=email]').val();
  var password = jQuery('[name=password]').val();


  socket.emit('signin', {
    email,
    password
  }, function() {
    alert('You signed in successfully');
  }).catch(function (e) {
    alert(e.message);
  });

});


  jQuery('#download-form').on('submit', function (e) {
    e.preventDefault();

    var name = jQuery('[name=downloadname]').val();

    if(name === '') {
      alert('Enter name');
      return;
    };

    //var stream = ss.createStream();

    // socket.emit('file.request', {name}, function() {
    //    alert('File requested');
    //  });
    return downloadFile(name, 'test.fil');


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
