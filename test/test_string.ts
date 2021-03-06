/// <reference types="node" />

import {Server, Client, Socket, I} from '../src';
import assert = require('assert');

export = function (options: any) {
  let server_socket: Socket = options.server_socket;
  let client: Client = options.client;

  return new Promise(function (resolve, reject) {
    console.log('Test Send String');
    let message = '_message';

    console.time('sendString');
    console.log(message);
    server_socket.on('sendString', function (msg: any) {
      console.log(msg);
      console.timeEnd('sendString');
      assert(msg === message);
      resolve();
    });
    client.emit('sendString', message);
  });
}
