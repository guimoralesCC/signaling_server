const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

// Keep track of rooms and connections
const rooms = new Map();

server.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data);
            
            switch(data.type) {
                case 'join':
                    handleJoin(socket, data);
                    break;
                case 'offer':
                case 'answer':
                case 'ice-candidate':
                    relayMessage(data);
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });
    
    socket.on('close', () => {
        console.log('Client disconnected');
        // Remove socket from all rooms
        rooms.forEach((clients, roomId) => {
            clients.delete(socket);
            if (clients.size === 0) {
                rooms.delete(roomId);
            }
        });
    });
});

function handleJoin(socket, data) {
    const { room } = data;
    console.log(`Client joining room: ${room}`);
    
    if (!rooms.has(room)) {
        rooms.set(room, new Set());
    }
    
    const clients = rooms.get(room);
    clients.add(socket);
    
    // Assign a peer ID
    socket.peerId = clients.size;
    socket.room = room;
    
    // Notify client of their peer ID
    socket.send(JSON.stringify({
        type: 'peer-id',
        peerId: socket.peerId
    }));
    
    // Notify other clients in the room
    clients.forEach(client => {
        if (client !== socket) {
            client.send(JSON.stringify({
                type: 'player-joined',
                peerId: socket.peerId
            }));
        }
    });
}

function relayMessage(data) {
    const { room } = data;
    const clients = rooms.get(room);
    
    if (clients) {
        clients.forEach(client => {
            if (client.peerId !== data.peerId) {
                client.send(JSON.stringify(data));
            }
        });
    }
}

console.log('Signaling server running on ws://localhost:8080');
