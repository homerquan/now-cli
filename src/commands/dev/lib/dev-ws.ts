import WebSocket from 'ws';

/* eslint-disable-next-line no-unused-vars */
const onOpen = function (this: WebSocket) {
  this.send('hi');
}

const onClose = function () {
  console.log('ws closed');
}

const onMessage = function (data: WebSocket.Data) {
  console.log(data);
}

export function initWebsocket (addr: string) {
  const ws = new WebSocket(addr);

  ws.on('open', onOpen);
  ws.on('close', onClose);
  ws.on('message', onMessage);

  return ws;
}
