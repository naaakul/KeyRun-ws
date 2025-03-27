import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { User, RoomState, WSMessage } from './types';
import { generateRoomCode } from './utils';

const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms: Map<string, RoomState> = new Map();
const clientToRoom: Map<WebSocket, string> = new Map();

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    const data: WSMessage = JSON.parse(message);

    switch (data.type) {
      case 'join':
        handleJoin(ws, data.payload);
        break;
      case 'update_progress':
        handleProgressUpdate(ws, data.payload);
        break;
      case 'start_game':
        handleStartGame(ws);
        break;
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleJoin(ws: WebSocket, payload: { username: string, roomCode: string }) {
  const { username, roomCode } = payload;
  const room = rooms.get(roomCode);

  if (room) {
    const user: User = {
      id: Date.now().toString(),
      username,
      roomCode
    };

    room.users.push(user);
    clientToRoom.set(ws, roomCode);

    // Broadcast updated room state to all users
    broadcastRoomState(roomCode);
  } else {
    ws.send(JSON.stringify({ error: 'Room not found' }));
  }
}

function handleProgressUpdate(ws: WebSocket, progress: any) {
  const roomCode = clientToRoom.get(ws);
  if (roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      broadcastRoomState(roomCode);
    }
  }
}

function handleStartGame(ws: WebSocket) {
  const roomCode = clientToRoom.get(ws);
  if (roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      room.started = true;
      broadcastRoomState(roomCode);
    }
  }
}

function handleDisconnect(ws: WebSocket) {
  const roomCode = clientToRoom.get(ws);
  if (roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      room.users = room.users.filter(user => 
        user.id !== Array.from(clientToRoom.entries())
          .find(([client, code]) => client === ws)?.[0]?.toString()
      );
      broadcastRoomState(roomCode);
      clientToRoom.delete(ws);
    }
  }
}

function broadcastRoomState(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    const clients = Array.from(clientToRoom.entries())
      .filter(([, code]) => code === roomCode)
      .map(([client]) => client);

    clients.forEach(client => {
      client.send(JSON.stringify(room));
    });
  }
}

function createRoom(username: string): string {
  const roomCode = generateRoomCode();
  const admin: User = {
    id: Date.now().toString(),
    username,
    roomCode
  };

  const roomState: RoomState = {
    roomCode,
    admin: admin.id,
    users: [admin],
    started: false
  };

  rooms.set(roomCode, roomState);
  return roomCode;
}

server.listen(8080, () => {
  console.log('WebSocket server running on port 8080');
});
