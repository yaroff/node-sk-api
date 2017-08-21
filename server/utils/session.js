var connect = require('connect');

var getSession = (session_store, socket_client) => {
  var cookie_string = socket_client.request.headers.cookie;
  var parsed_cookies = connect.utils.parseCookie(cookie_string);
  var connect_sid = parsed_cookies['connect.sid'];
  if (connect_sid) {
    session_store.get(connect_sid, function (error, session) {
      return session;
    });
  }
  return undefined;
}

module.exports = {getSession};
