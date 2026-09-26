export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

// connects to the quiz server WebSocket endpoint on the same host as the page
export function connectWebSocket(onMessage: (msg: WsMessage) => void): WebSocket {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);
  ws.onmessage = (event: MessageEvent) => {
    try {
      onMessage(JSON.parse(event.data) as WsMessage);
    } catch {}
  };
  return ws;
}

export function sendWs(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
