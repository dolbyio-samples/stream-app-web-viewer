//Millicast.js is the brain of the stream viewer, handling all functionality.
// Learn More @ https://docs.millicast.com/docs/web-draft

async function connectStream() {
	// Connects the stream and does a majority of the functionality for the app.
	const activeSources = new Set();
	let viewers = document.getElementById("viewers");
	let stopBtn = document.getElementById("stopBtn");
	let accID = document.getElementById("accID").value;
	let video = document.getElementById("videoPlayer");
	let streamBtn = document.getElementById("startBtn");
	let statusBar = document.getElementById("statusBar");
	let streamName = document.getElementById("streamName").value;
	let inputFormVisCont = document.getElementById("inputFormVisCont");

	console.log("Joining livestream with:");
	console.log("Account ID: " + accID);
	console.log("Stream Name: " + streamName);
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
			streamName: streamName,
			streamAccountId: accID,
		});

	const millicastView = new window.millicast.View(streamName, tokenGenerator);

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
				statusBar.innerText = streamName + " is Live";
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
		console.log(stats)
		viewers.innerText = "Round Trip Time: " + stats.currentRoundTripTime*1000 + " milliseconds";
		viewers.hidden = false;
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
document.getElementById("streamName").addEventListener("change", enableButton, false);
