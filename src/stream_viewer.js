//Millicast.js is the brain of the stream viewer, handling all functionality.
// Learn More @ https://docs.millicast.com/docs/web-draft
const DOLBYIO_STREAMING_ACCOUNT_ID = "";
const DOLBYIO_STREAMING_STREAM_NAME = "";
const PUBNUB_PUBLISH_KEY = "";
const PUBNUB_SUBSCRIBE_KEY = "";

async function connectStream() {
	// Connects the stream and does a majority of the functionality for the app.
	const activeSources = new Set();
	let rtt = document.getElementById("rtt"); //round trip time
	let viewers = document.getElementById("viewers");
	let stopBtn = document.getElementById("stopBtn");
	let chatBox = document.getElementById("chatBox");
	let usrName = document.getElementById("usrName").value;
	let video = document.getElementById("videoPlayer");
	let streamBtn = document.getElementById("startBtn");
	let statusBar = document.getElementById("statusBar");
	let inputFormVisCont = document.getElementById("inputFormVisCont");

	console.log("Joining livestream with:");
	console.log("Account ID: " + DOLBYIO_STREAMING_ACCOUNT_ID);
	console.log("Stream Name: " + DOLBYIO_STREAMING_STREAM_NAME);
	video.hidden = false;
	streamBtn.disabled = true;
	stopBtn.disabled = false;
	inputFormVisCont.hidden = true;

	// Step 1: Authentication with the Dolby.io Streaming SDK
	const options = {
		disableVideo: false,
		disableAudio: false,
		bandwidth: 0,
	};

	const tokenGenerator = () =>
		window.millicast.Director.getSubscriber({
			streamName: DOLBYIO_STREAMING_STREAM_NAME,
			streamAccountId: DOLBYIO_STREAMING_ACCOUNT_ID,
		});

	const millicastView = new window.millicast.View(DOLBYIO_STREAMING_STREAM_NAME, tokenGenerator);

	// Step 2: Adding the Stream to your <video> tag
	millicastView.on("track", (event) => {
		addStreamToYourVideoTag(event.streams[0]);
	});

	// Optional Step: Live updating the stream status
	await millicastView.on("broadcastEvent", (event) => {
		const { name, data } = event;
		console.log(event, "broadcastEvent");
		switch (name) {
			case "active":
				activeSources.add(data.sourceId);
				console.log("Active Stream.");
				statusBar.innerText = DOLBYIO_STREAMING_STREAM_NAME + " is Live";
				statusBar.hidden = false;
				break;
			case "inactive":
				activeSources.delete(data.sourceId);
				if (activeSources.size === 0) {
					statusBar.innerText = "No active stream ...";
					statusBar.hidden = false;
					console.log("No active Stream.");
				}
				break;
			default:
				break;
		}
	});

	// Step 4: Connect to PubNub Chat ConnectChat
	(function () {
		chatBox.hidden = false;
		var pubnub = new PubNub({
			publishKey: PUBNUB_PUBLISH_KEY,
			subscribeKey: PUBNUB_SUBSCRIBE_KEY,
			userId: usrName,
		});

		var box = document.getElementById("outputDiv"),
			inputText = document.getElementById("inputChat"),
			inputButton = document.getElementById("enterButton"),
			channel = "dlbChat";

		box.innerHTML += newChat("Welcome to the Stream: " + DOLBYIO_STREAMING_STREAM_NAME, "Admin");
		box.innerHTML += newChat("You've Joined as: " + usrName, "Admin");

		// Subscribe to the dblChat
		pubnub.subscribe({ channels: [channel] });

		// Listen for messages being added, update the UI accordingly
		pubnub.addListener({
			message: function (m) {
				box.innerHTML += newChat(m.message, m.publisher);
				box.scrollTop = box.scrollHeight;
			},
		});

		// Listen for enter key
		inputText.addEventListener("keypress", function (e) {
			(e.keyCode || e.charCode) === 13 &&
				inputText.value != "" &&
				pubnub.publish({
					channel: channel,
					message: inputText.value,
					x: (inputText.value = ""),
				});
		});
		//Listen for users clicking submit button
		inputButton.addEventListener("click", function (e) {
			inputText.value != "" &&
				pubnub.publish({
					channel: channel,
					message: inputText.value,
					x: (inputText.value = ""),
				});
		});

		//Optional for updating the viewer widget
		pubnub.addListener({
			presence: (presenceEvent) => {
				if (presenceEvent.occupancy == 0) {
					viewers.innerText = "1 Viewer";
				} else {
					viewers.hidden = false;
					viewers.innerText = presenceEvent.occupancy + " Viewers";
				}
			},
		});
	})();

	// Style message and assign it the appropriate CSS class
	function newChat(message, publisher) {
		var youId = "";
		var messageClass = "messageSent";
		var messageChat = ("" + message).replace(/[<>]/g, "");
		var date = "<br><span class='messageTime'>" + new Date().toLocaleString() + "</span>";

		if (usrName === publisher) {
			youId = "<span> (You)</span>";
			messageClass = "messageSent"; // For messages you send
		} else if (publisher == "Admin") {
			youId = "<span> (You)</span>";
			messageClass = "messageAdmin"; // For chat join message

			return "<div class='" + messageClass + "'>" + messageChat + "</div>";
		} else {
			youId = "<span'> (" + publisher + ")</span>";
			messageClass = "messageReceived"; // For messages you receive
		}
		return "<div class='" + messageClass + "'>" + messageChat + date + youId + "</div>";
	}

	try {
		// Step 3: Connecting to the Stream.
		await millicastView.connect(options);
	} catch (e) {
		console.log("Connection failed, handle error", e);
		millicastView.reconnect();
	}

	// Optional Step: Updating the Livestream latency.
	millicastView.webRTCPeer.initStats();
	await millicastView.webRTCPeer.on("stats", (stats) => {
		console.log(stats);
		rtt.innerText = "Round Trip Time: " + stats.currentRoundTripTime * 1000 + " milliseconds";
		rtt.hidden = false;
	});
}

function stopStream() {
	//Closes Stream and resets browser.
	location.reload();
}

function addStreamToYourVideoTag(elem) {
	//Adds Stream to the <video> tag.
	let video = document.getElementById("videoPlayer");
	video.srcObject = elem;
	video.autoplay = true;
}

function enableButton() {
	// Enabled the startStream button in the HTML.
	let streamBtn = document.getElementById("startBtn");
	streamBtn.disabled = false;
}

// Listens for changes in the streamName user input box.
document.getElementById("usrName").addEventListener("change", enableButton, false);
