let socket = null;
const controlStatus = document.getElementById('controlStatus');
const controlPanel = document.getElementById('controlPanel');
const remoteVideo = document.getElementById('remoteVideo');

function connectWebsocket() {
    socket = new WebSocket("wss://" + window.location.hostname + "/user1");
    
    socket.onopen = function(event) {
        console.log("Connected to server");
    };

    socket.onclose = function() {
        console.log("Disconnected from server");
        controlStatus.textContent = "Disconnected from server";
        controlPanel.style.display = 'none';
        setTimeout(connectWebsocket, 1000);
    };

    socket.onmessage = function(event) {
        let signal = null;
        try {
            signal = JSON.parse(event.data);
        } catch (e) {
            console.log(event.data);
            return;
        }

        switch(signal.type) {
            case "controlStatus":
                handleControlStatus(signal);
                break;
            case "offer":
                handleVideoOffer(signal);
                break;
            case "candidate":
                handleCandidate(signal);
                break;
        }
    };
}

function handleControlStatus(signal) {
    if (signal.hasControl) {
        controlStatus.textContent = "You have control";
        controlPanel.style.display = 'block';
    } else {
        controlStatus.textContent = "Waiting for control...";
        controlPanel.style.display = 'none';
    }
}

function sendToServer(message) {
    socket.send(JSON.stringify(message));
}

// Set up control buttons
document.querySelectorAll('.control-button').forEach(button => {
    button.addEventListener('mousedown', () => {
        const throttle = parseFloat(button.getAttribute('data-throttle'));
        const turn = parseFloat(button.getAttribute('data-turn'));
        sendToServer({ type: 'navigateDrive', throttle: throttle, turn: turn });
    });

    button.addEventListener('mouseup', () => {
        sendToServer({ type: 'navigateDrive', throttle: 0, turn: 0 });
    });

    button.addEventListener('mouseleave', () => {
        sendToServer({ type: 'navigateDrive', throttle: 0, turn: 0 });
    });
});

// WebRTC code
let peerConnection;

function handleVideoOffer(offer) {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendToServer({
                type: "candidate",
                candidate: event.candidate
            });
        }
    };

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            sendToServer({
                type: "answer",
                sdp: peerConnection.localDescription
            });
        })
        .catch(e => console.error(e));
}

function handleCandidate(message) {
    let candidate = new RTCIceCandidate(message.candidate);
    peerConnection.addIceCandidate(candidate)
        .catch(e => console.error("Error adding received ice candidate", e));
}

// Start the WebSocket connection
connectWebsocket();

// Keep the websocket connection alive
setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        sendToServer({ type: "ping" });
    }
}, 1000);