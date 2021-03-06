/// <reference types="node" />

import net = require("net");
import { EventEmitter } from 'events';
import { Socket } from './socket';
import I = require('./interfaces');

export class Server extends EventEmitter {

	public sockets: Socket[] = [];
	public socketsEmitter = new EventEmitter();

	private _server = net.createServer();
	private _sockets_id = 0;
	private _sync_callbacks: Array<{
		event: string;
		listener: (socket: Socket, arg: any) => Promise<any>;
	}> = [];
	private _pending_event_callbacks: { event: string; resolve: Function; reject: Function; }[] = [];
	private _timeouts: { event: string; clock: number; }[] = [];
	private _timeouts_handle: NodeJS.Timer = null;

	constructor(public options: I.Options = {}) {
		super();

		this._server.on('connection', (s: net.Socket) => {
			let socket = new Socket(this.options, s, ++this._sockets_id);
			this.sockets.push(socket);
			this._sync_callbacks.forEach((c) => {
				socket.onSync(c.event, (arg: any) => {
					return c.listener(socket, arg);
				});
			});
			let broadcast = (event: string, arg: any) => {
				let callbacks = this._pending_event_callbacks.filter((e) => {
					return e.event == event;
				});
				callbacks.forEach(e => { e.resolve(arg); });
				this._pending_event_callbacks = this._pending_event_callbacks.filter((e) => {
					return e.event != event;
				});
				this.socketsEmitter.emit(event, socket, arg);
			}
			let remove = () => {
				this.sockets.splice(this.sockets.indexOf(socket), 1);
				this.socketsEmitter.emit('remove', socket);
			}
			socket.on('close', remove);
			socket.on("error", remove);
			socket.on(Socket.ALL_DATA_MESSAGE, broadcast);
			super.emit('connection', socket);
		});

		this._server.on('close', () => {
			super.emit('close');
		});
		this._server.on('error', (error: any) => {
			super.emit('error', error);
		});
		this._server.on('listening', () => {
			super.emit('listening');
		});
	}

	public listen(address: string, port: number) {
		return new Promise((resolve, reject) => {
			let listening = () => {
				resolve();
				this._server.removeListener('listening', listening);
				this._server.removeListener('error', error);
			}
			let error = (err: Error) => {
				reject(err);
				this._server.removeListener('listening', listening);
				this._server.removeListener('error', error);
			}
			this._server.once('listening', listening);
			this._server.once('error', error);
			this._server.listen(port, address);
		});
	}

	public address() {
		return this._server.address();
	}

	public close(callback?: Function) {
		if (callback) {
			this.once('close', callback);
		}
		this._server.close();
		return this;
	}

	public broadcast(event: string, arg?: any, except?: Socket[] | Socket) {
		this.sockets.forEach((socket) => {
			if (except instanceof Array && except.indexOf(socket) !== -1) return;
			if (except == socket) return;
			socket.emit(event, arg);
		});
	}

	public onSocketSync(event: string, listener: (socket: Socket, arg: any) => Promise<any>) {
		this.sockets.forEach((s) => {
			let socket = s;
			socket.onSync(event, (arg: any) => {
				return listener(socket, arg);
			});
		});
		this._sync_callbacks.push({
			event: event,
			listener: listener
		});
	}

	public waitForEvent(event: string, timeout: number = 0) {
		return new Promise<any>((resolve, reject) => {
			this._pending_event_callbacks.push({
				event: event,
				resolve: resolve,
				reject: reject
			});
			if (timeout != 0) this._registerTimeout(event, Date.now() + timeout);
		});
	}

	private _registerTimeout(event: string, clock: number) {
		this._timeouts.push({
			event: event,
			clock: clock
		});
		this._buildTimeout();
	}
	private _buildTimeout() {
		if (this._timeouts_handle != null) {
			clearTimeout(this._timeouts_handle);
			this._timeouts_handle = null;
		}
		let now = Date.now();
		let timeouts = this._timeouts.filter(t => { return t.clock < now; });
		this._timeouts = this._timeouts.filter(t => { return t.clock >= now; });

		let events = timeouts.map(t => { return t.event; });
		let event_callbacks = this._pending_event_callbacks.filter(t => { return events.indexOf(t.event) != -1 });
		this._pending_event_callbacks = this._pending_event_callbacks.filter(t => { return events.indexOf(t.event) == -1 });
		event_callbacks.forEach(t => { return t.reject(new Error('timeout')); });

		let clock = 0;
		this._timeouts.forEach(t => {
			if (clock == 0 || clock > t.clock)
				clock = t.clock;
		});
		if (clock != 0) {
			this._timeouts_handle = setTimeout(() => { this._buildTimeout(); }, clock - Date.now() + 5);
		}
	}
}
