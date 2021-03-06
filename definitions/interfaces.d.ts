export interface Options {
    compress?: 'zlib';
    crypto?: {
        algorithm: string;
        secret_key: string;
    };
}
export interface DataPackage {
    event: string;
    arg: any;
}
export declare enum ReceivedDataType {
    send = 0,
    accepted = 1,
    sendSync = 2,
    syncReply = 3,
    syncError = 4,
}
export interface ReceivedData {
    type: ReceivedDataType;
    index: number;
    length: number;
    event?: string;
    arg?: any;
}
export declare enum SocketState {
    pending = 0,
    connecting = 1,
    connected = 2,
    closing = 3,
    closed = 4,
}
