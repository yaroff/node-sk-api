var socket = io();

jQuery('#signup-form').on('submit', function (e) {
  e.preventDefault();

  var name = jQuery('[name=name]').val();
  var email = jQuery('[name=email]').val();
  var password = jQuery('[name=password]').val();
  var password_verify = jQuery('[name=password_verify]').val();

  if(password !== password_verify) {
    alert('Password does not match');
    return;
  };

  socket.emit('signup', {
    name,
    email,
    password
  }, function() {
    window.location.href = '/content.html';
  });

});
