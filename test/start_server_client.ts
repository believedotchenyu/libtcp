/// <reference types="node" />

import { Server, Client, Socket, I } from '../';
const PORT = 3766;

export = function (options: I.Options) {
	return new Promise<{ server: Server; client: Client; server_socket: Socket; }>(async function (resolve, reject) {
		console.log('Start Server and Client');

		let server = new Server(options);
		let client = new Client(options);

		//Start Server
		await server.listen("localhost", PORT);
		console.log('Server Started');

		server.on('connection', function (socket: Socket) {
			console.log('New Connection');
			let server_socket = socket;
			resolve({
				server: server,
				client: client,
				server_socket: server_socket
			});
		});

		//Start Client
		await client.connect('localhost', PORT);
		console.log('Client Started');
	});
}
