//Millicast.js is the brain of the stream viewer, handling all functionality.
// Learn More @ https://docs.millicast.com/docs/web-draft
const DOLBYIO_STREAMING_ACCOUNT_ID = "";
const DOLBYIO_STREAMING_STREAM_NAME = "";
const PUBNUB_PUBLISH_KEY = "";
const PUBNUB_SUBSCRIBE_KEY = "";

async function connectStream() {
	// Connects the stream and does a majority of the functionality for the app.
	const activeSources = new Set();
	let rtt = document.getElementById("rtt");
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

	// Step 1: Authentication with the Millicast SDK
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

	var countTx = 0,
		countRx = 0,
		id = usrName;
	console.log("HEHEHEHH");
	chatBox.hidden = false;
	(function () {
		var pubnub = new PubNub({
			publishKey: PUBNUB_PUBLISH_KEY,
			subscribeKey: PUBNUB_SUBSCRIBE_KEY,
			userId: id,
		});

		pubnub.subscribe({
			// Subscribe to user presence
			channels: ["active"],
			withPresence: true,
		});
		var box = document.getElementById("outputDiv"),
			inputText = document.getElementById("inputChat"),
			inputButton = document.getElementById("enterButton"),
			channel = "10chat";

		box.innerHTML += newRow("Welcome to the Stream: " + DOLBYIO_STREAMING_STREAM_NAME, "Admin");
		box.innerHTML += newRow("You've Joined as: " + id, "Admin");
		pubnub.subscribe({ channels: [channel] });
		pubnub.addListener({
			message: function (m) {
				box.innerHTML += newRow(m.message, m.publisher);
				box.scrollTop = box.scrollHeight;
			},
		});
		inputText.addEventListener("keypress", function (e) {
			(e.keyCode || e.charCode) === 13 &&
				inputText.value != "" &&
				pubnub.publish({
					channel: channel,
					message: inputText.value,
					x: (inputText.value = ""),
				});
		});
		inputButton.addEventListener("click", function (e) {
			inputText.value != "" &&
				pubnub.publish({
					channel: channel,
					message: inputText.value,
					x: (inputText.value = ""),
				});
		});

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

	hljs.highlightAll();

	function newRow(m, publisher) {
		var date = "<br><span class='messageTime'>" + new Date().toLocaleString() + "</span>";
		var youId = "";
		var messageClass = "messageThem";
		var messageChat = ("" + m).replace(/[<>]/g, "");

		if (id === publisher) {
			youId = "<span class='youText'> (You)</span>";
			messageClass = "messageThem";
			countTx++;
		} else if (publisher == "Admin") {
			youId = "<span class='youText'> (You)</span>";
			messageClass = "messageAdmin";
			countTx++;
			return "<div class='" + messageClass + "'>" + messageChat + "</div>";
		} else {
			youId = "<span class='youText'> (" + publisher + ")</span>";
			messageClass = "messageYou";
			countRx++;
		}
		return "<div class='" + messageClass + "'>" + messageChat + date + youId +"</div>";
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
