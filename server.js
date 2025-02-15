const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

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
                    relayMessage(data);
                    break;
                case 'answer':
                    relayMessage(data);
                    break;
                case 'ice-candidate':
                    relayMessage(data);
                    break;
                case 'player-update':
                    relayMessage(data);
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });
    
    socket.on('close', () => {
        console.log('Client disconnected');
        // Remove socket from all rooms and notify others
        rooms.forEach((clients, roomId) => {
            if (clients.has(socket)) {
                const peerId = socket.peerId;
                clients.delete(socket);
                
                // Notify remaining clients about disconnection
                clients.forEach(client => {
                    client.send(JSON.stringify({
                        type: 'player-disconnected',
                        peerId: peerId
                    }));
                });
                
                if (clients.size === 0) {
                    rooms.delete(roomId);
                }
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
    
    // Assign peer ID
    socket.peerId = clients.size + 1;
    socket.room = room;
    
    // Add to room
    clients.add(socket);
    
    // Notify new client of their peer ID
    socket.send(JSON.stringify({
        type: 'peer-id',
        peerId: socket.peerId
    }));
    
    // Notify other clients about new player
    clients.forEach(client => {
        if (client !== socket) {
            client.send(JSON.stringify({
                type: 'player-joined',
                peerId: socket.peerId
            }));
            
            // Tell new player about existing players
            socket.send(JSON.stringify({
                type: 'player-joined',
                peerId: client.peerId
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
