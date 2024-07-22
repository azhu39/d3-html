let socket = null;
const controlStatus = document.getElementById('controlStatus');
const controlPanel = document.getElementById('controlPanel');
const robotVideo = document.getElementById('robotVideo');

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
    button.addEventListener('click',()=>{
      sendToServer({type:'requestLock', user:'user1'})
    });  
  
    button.addEventListener('mousedown', () => {
        const throttle = parseFloat(button.getAttribute('data-throttle'));
        const turn = parseFloat(button.getAttribute('data-turn'));
        sendToServer({ type: 'navigateDrive', throttle: throttle, turn: turn });
    });

    button.addEventListener('mouseup', () => {
        sendToServer({ type: 'navigateDrive', throttle: 0, turn: 0 });
        sendToServer({type:'releaseLock', user:'user1'});
    });

    button.addEventListener('mouseleave', () => {
        sendToServer({ type: 'navigateDrive', throttle: 0, turn: 0 });
        sendToServer({type:'releaseLock', user:'user1'});
    });
});

// var robotVideoOverlay = document.getElementById('robotVideoOverlay');
var robotVideoOverlay = document.getElementById('contentFrame');
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


//WebRTCed version
// import { UserWebRTC } from './user_webrtc.js';

// var webrtc = null;
// var iceConfig = null;

// // WebSocket
// var socket = null;
// function connectWebsocket() {
//   socket = new WebSocket("wss://" + window.location.hostname + "/user1");
//   socket.onopen = function(event) { log("Connected to server"); };

//   socket.onclose = function() {
//     log("Disconnected from server");
//     window.endUserCall();
//     socket = null;
//     setTimeout(connectWebsocket, 1000);
//   }

//   socket.onmessage = function(event) {
//     var signal = null;
//     try {
//       signal = JSON.parse(event.data);
//     } catch (e) {
//       log(event.data);
//     }

//     if (signal) {
//       if (!signal.type && signal.candidate) {
//         signal.type = "candidate";
//       }
//       switch (signal.type) {
//         case "userOffer":
//           webrtc.handleVideoOffer(signal.sdp);
//           break;
//         case "userCandidate":
//           webrtc.handleCandidate(signal.candidate);
//           break;
//         case "controlStatus":
//           handleControlStatus(signal);
//           break;
//         case "send_iframe":
//           handleSendIframe(signal);
//           break;
//       }
//     }
//   };
// }

// window.sendToServer = (message) => {
//   socket.send(JSON.stringify(message));
// };

// connectWebsocket();

// // User Interface
// var controlStatus = document.getElementById("controlStatus");
// var controlPanel = document.getElementById("controlPanel");
// var robotVideo = document.getElementById("robotVideo");
// var contentFrame = document.getElementById("contentFrame");

// function handleControlStatus(signal) {
//   if (signal.hasControl) {
//     controlStatus.textContent = "You have control";
//     controlPanel.style.display = "block";
//   } else {
//     controlStatus.textContent = "Waiting for control...";
//     controlPanel.style.display = "none";
//   }
// }

// function handleSendIframe(signal) {
//   console.log('Received send_iframe message:', signal);
//   console.log('Updating iframe source to:', signal.address);
//   contentFrame.src = signal.address;
// }

// // ... (keep the rest of the UI event listeners as they were)

// window.startUserCall = () => {
//   iceConfig = {
//     iceServers: [
//       { urls: 'stun:stun.l.google.com:19302' },
//       {
//         urls: 'turn:numb.viagenie.ca',
//         credential: 'muazkh',
//         username: 'webrtc@live.com'
//       }
//     ],
//     sdpSemantics: "unified-plan"
//   };
  
//   webrtc = new UserWebRTC(iceConfig, log, window.sendToServer, window.endUserCall);
//   window.sendToServer({
//     type: "requestUserStream",
//     servers: iceConfig.iceServers,
//     transportPolicy: iceConfig.iceTransportPolicy
//   });
// };

// window.endUserCall = () => {
//   if (webrtc) {
//     webrtc.closeVideoCall();
//     window.sendToServer({ type: "endUserStream" });
//     webrtc = null;
//   }
// };

// // Log
// var logs = document.querySelector("#logs");
// function log(text) {
//   if (text && text.name) {
//     text = text.name;
//   }
//   console.log(text);
//   logs.innerHTML += "<div>" + text + "</div>";
// }

// // Keep the websocket connection alive
// window.setInterval(() => {
//   window.sendToServer({ ping: 1 });
// }, 1000);
