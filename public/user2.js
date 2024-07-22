let socket = null;
const controlStatus = document.getElementById('controlStatus');
const controlPanel = document.getElementById('controlPanel');
const robotVideo = document.getElementById('robotVideo');

function connectWebsocket() {
    socket = new WebSocket("wss://" + window.location.hostname + "/user2");
    
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
            case "send_iframe":
                console.log('Received send_iframe message:', signal);
                console.log('Updating iframe source to:', signal.address);
                const iframe = document.getElementById('contentFrame');
                iframe.src = signal.address;
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
        sendToServer({type:'requestLock', user:'user2'});
        sendToServer({ type: 'navigateDrive', throttle: throttle, turn: turn });
    });

    button.addEventListener('mouseup', () => {
        sendToServer({ type: 'navigateDrive', throttle: 0, turn: 0 });
        sendToServer({type:'releaseLock', user:'user2'});
    });

    button.addEventListener('mouseleave', () => {
        sendToServer({ type: 'navigateDrive', throttle: 0, turn: 0 });
        sendToServer({type:'releaseLock', user:'user2'});
    });
});

var robotVideoOverlay = document.getElementById('robotVideoOverlay');
robotVideoOverlay.addEventListener('click', function(event) {
    var rect = robotVideoOverlay.getBoundingClientRect();
    var getX = (event.clientX - rect.left) / rect.width;
    var getY = (event.clientY - rect.top) / rect.height;
        event.preventDefault(); 
        console.log(`Click coordinates: x=${getX}, y=${getY}`);
        window.sendToServer({ type: 'enableNavigation' });
        window.sendToServer({ type: 'click2Drive', x: getX, y: getY });
});

// Start the WebSocket connection
connectWebsocket();

// Keep the websocket connection alive
setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        sendToServer({ type: "ping" });
    }
}, 1000);