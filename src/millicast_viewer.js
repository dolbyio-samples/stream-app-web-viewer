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
	// This will store a mapping: sourceId => transceiver media ids
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

	const addStreamToYourVideoTag = async (sourceId) => {
		// Create Media stream and create transceivers
		const mediaStream = new MediaStream();
		const videoTransceiver = await millicastView.addRemoteTrack("video", [mediaStream]);
		// Optionally we can also add audio
		const audioTransceiver = await millicastView.addRemoteTrack("audio", [mediaStream]);

		// Add sourceId -> transceiver pair to the Map
		sourceIdTransceiversMap.set(sourceId || "main", {
			videoMediaId: videoTransceiver.mid,
			audioMediaId: audioTransceiver.mid,
		});
		console.log(sourceIdTransceiversMap.size);
		// We need to define this function, this function will render a new video tag into the html using the mediaStream as a srcObject
		createVideoElement(mediaStream, sourceId, sourceIdTransceiversMap.size);

		// Finally we project the new source into the transceivers
		await millicastView.project(sourceId, [
			{
				trackId: "video",
				mediaId: videoTransceiver.mid,
				media: "video",
			}, // Optionally we also project audio
			{
				trackId: "audio",
				mediaId: audioTransceiver.mid,
				media: "audio",
			},
		]);
	};
	const unprojectAndRemoveVideo = async (sourceId) => {
		// We get the transceivers associated with the source id
		const sourceTransceivers = sourceIdTransceiversMap.get(sourceId);
		sourceIdTransceiversMap.delete(sourceId);
		// We unproject the sources of the transceivers
		await millicastView.unproject([sourceTransceivers.videoMediaId, sourceTransceivers.audioMediaId]);
		// Delete the video from the DOM
		const video = document.getElementById(sourceId);
		document.getElementById("remoteMain").removeChild(video);
	};

	const createVideoElement = (mediaStream, sourceId, vidCount) => {
		const remoteMain = document.getElementById("remoteMain");
		const switchView = document.getElementById("switchView");
		const video = document.createElement("video");
		if (vidCount < 2) {
			console.log("main");
			video.className = "vidBox";
		} else {
			switchView.disabled = false;
			console.log("sub");
			video.className = "subVidBox";
		}
		video.id = sourceId || "main";
		video.srcObject = mediaStream;
		video.autoplay = true;
		video.muted = true;
		remoteMain.appendChild(video);
	};

	try {
		// Step 3: Connecting to the Stream.
		await millicastView.connect(options);
		millicastView.webRTCPeer.initStats();
	} catch (e) {
		console.log("Connection failed, handle error", e);
		millicastView.reconnect();
	}
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

function switchStream() {
	const remoteMain = document.getElementById("remoteMain");
	console.log(remoteMain.children);
	var temp = remoteMain.children[0];
	temp.className = "subVidBox";
	remoteMain.removeChild(remoteMain.children[0]);
	remoteMain.appendChild(temp);
	remoteMain.children[0].className = "vidBox";
}

// Listens for changes in the streamName user input box.
document.getElementById("streamName").addEventListener("change", enableButton, false);
