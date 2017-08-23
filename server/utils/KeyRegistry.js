class KeyRegistry {
  constructor () {
    //Here to implement generation of the master key
    this.registry = [];
  }

  addUser (userId, socketId, key) {
    var encryptedKey; //Here to implement encryption of the

    //removeUser(socketId);

    var user = {
      userId,
      socketId,
      key
    };
    this.registry.push(user);
    return user;
  }

  getUser (id) {
    var selectedUser = this.registry.filter((user)=> user.socketId === id);
    // console.log('getUser number of records found is ', selectedUser.length);
    if(selectedUser.length > 0){
      return selectedUser[0];
    }
    return undefined;
  }

  removeUser (id) {
    var removingUser = [];
    removingUser = this.registry.filter((user) => user.socketId === id);
    if(removingUser.length > 0){
      var index = this.registry.indexOf(removingUser[0]);
      if(index > -1){
        this.registry.splice(index, 1);
        return removingUser[0];
      }
    }
    return undefined;
  }
}

module.exports = {KeyRegistry};
