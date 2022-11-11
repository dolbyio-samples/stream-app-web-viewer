// streaming_viewer.js is the brain of the livestream multi-viewer, handling all functionality.
// Learn More @ https://docs.dolby.io/streaming-apis/docs/create-multi-view-web-app

async function connectStream() {
	// Connects the stream and does a majority of the functionality for the app.

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
	streamBtn.disabled = true;
	stopBtn.disabled = false;
	inputFormVisCont.hidden = true;

	// Step 1: Authentication with the Dolby.io Millicast SDK
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

	// Step 2: Define MillicastView and sourceID mapping
	const millicastView = new window.millicast.View(streamName, tokenGenerator);

	const activeSources = new Set();
	const sourceIdTransceiversMap = new Map();

	// Optional Step: Live updating the stream status
	await millicastView.on("broadcastEvent", (event) => {
		console.log(event.name);
		const { name, data } = event;
		console.log(event, "broadcastEvent");
		switch (name) {
			case "active":
				activeSources.add(data.sourceId);
				console.log("Active Stream.");
				statusBar.innerText = streamName + " is Live";
				statusBar.hidden = false;
				addStreamToYourVideoTag(data.sourceId);
				break;
			case "inactive":
				activeSources.delete(data.sourceId);
				unprojectAndRemoveVideo(data.sourceId);
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

	// Optional Step: Updating the Livestream latency.
	await millicastView.webRTCPeer.on("stats", (stats) => {
		console.log(stats);
		viewers.innerText = "Round Trip Time: " + stats.currentRoundTripTime * 1000 + " milliseconds";
		viewers.hidden = false;
	});

	// Step 4: Create and add video streams with sourceId
	const addStreamToYourVideoTag = async (sourceId) => {
		const mediaStream = new MediaStream();
		const videoTransceiver = await millicastView.addRemoteTrack("video", [mediaStream]);
		const audioTransceiver = await millicastView.addRemoteTrack("audio", [mediaStream]);

		sourceIdTransceiversMap.set(sourceId || "main", {
			videoMediaId: videoTransceiver.mid,
			audioMediaId: audioTransceiver.mid,
		});
		createVideoElement(mediaStream, sourceId, sourceIdTransceiversMap.size);

		await millicastView.project(sourceId, [
			{
				trackId: "video",
				mediaId: videoTransceiver.mid,
				media: "video",
			},
			{
				trackId: "audio",
				mediaId: audioTransceiver.mid,
				media: "audio",
			},
		]);
	};

	// Step 5: Add video stream to video element
	const createVideoElement = (mediaStream, sourceId, vidCount) => {

		const feedMain = document.getElementById("feedMain");
		const switchView = document.getElementById("switchView");
		const video = document.createElement("video");

		// If feed is the first to be added default it to main view
		if (vidCount < 2) {
			console.log("main");
			video.className = "vidBox"; //Main view css class
		} else {
			switchView.disabled = false;
			console.log("sub");
			video.className = "subVidBox";// Sub view css class
		}

		video.id = sourceId || "main";
		video.srcObject = mediaStream;
		video.autoplay = true;
		video.controls = true;
		video.muted = true;

		feedMain.appendChild(video);
	};

	// Step 6: If feed is disconnected remove video element
	const unprojectAndRemoveVideo = async (sourceId) => {
		const video = document.getElementById(sourceId);
		const sourceTransceivers = sourceIdTransceiversMap.get(sourceId);

		sourceIdTransceiversMap.delete(sourceId);
		await millicastView.unproject([sourceTransceivers.videoMediaId, sourceTransceivers.audioMediaId]);
		document.getElementById("feedMain").removeChild(video);
	};

		// Step 3: Connect to stream and add stats
	try {
		await millicastView.connect(options);
		millicastView.webRTCPeer.initStats();
	} catch (e) {
		console.log("Connection failed, handle error", e);
		millicastView.reconnect();
	}
}

//Optional: Functionality for switching stream views between Main and Sub
function switchStream() {
	const feedMain = document.getElementById("feedMain");
	console.log(feedMain.children);
	var temp = feedMain.children[0];
	temp.className = "subVidBox";
	feedMain.removeChild(feedMain.children[0]);
	feedMain.appendChild(temp);
	feedMain.children[0].className = "vidBox";
}

function stopStream() {
	//Closes Stream and resets browser.
	location.reload();
}

function enableButton() {
	// Enabled the startStream button in the HTML.
	let streamBtn = document.getElementById("startBtn");
	streamBtn.disabled = false;
}

// Listens for changes in the streamName user input box.
document.getElementById("streamName").addEventListener("change", enableButton, false);
