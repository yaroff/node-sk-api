var socket = io();

jQuery('#signin-form').on('submit', function (e) {
  e.preventDefault();

  var email = jQuery('[name=email]').val();
  var password = jQuery('[name=password]').val();


  socket.emit('signin', {
    email,
    password
  }, function() {
    window.location.href = '/content.html';
  }).catch(function (e) {
    alert(e.message);
  });

});
