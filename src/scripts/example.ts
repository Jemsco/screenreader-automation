import { voiceOver } from "@guidepup/guidepup";

(async () => {
	console.log("Starting VoiceOver");
	await voiceOver.start();

	// Move to the next item.
	console.log("Moving to the next item");
	await voiceOver.next();

	const spoken = await voiceOver.lastSpokenPhrase();
	console.log("Last Spoken Phrase Spoken:", spoken);

	console.log("Stopping VoiceOver");
	await voiceOver.stop();
})();