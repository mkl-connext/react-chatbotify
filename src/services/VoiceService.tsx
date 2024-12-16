import { RefObject, Dispatch, SetStateAction } from "react";
import { Options } from "../types/Options";

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingFinished = false;
let toggleOn = false;

/**
 * Starts voice recording for input into textarea.
 *
 * @param handleToggleVoice handles toggling of voice
 */
export const startVoiceRecording = (
	handleToggleVoice: () => void
) => {
	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		console.error("Browser does not support audio recording.");
		return;
	}

	toggleOn = true;

	navigator.mediaDevices
		.getUserMedia({ audio: true })
		.then((stream) => {
			mediaRecorder = new MediaRecorder(stream);

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				stream.getTracks().forEach((track) => track.stop());
				recordingFinished = true;
			};

			mediaRecorder.start();
		})
		.catch((error) => {
			console.error("Error accessing microphone:", error);
			handleToggleVoice();
			toggleOn = false;
			recordingFinished = true;
		});
};

/**
 * Stops voice recording.
 *
 * @param botOptions options provided to the bot, including custom SpeechRecognition
 * @param inputRef reference to textarea for input
 * @param setInputLength sets the input length to reflect character count & limit
 */
export const stopVoiceRecording = async (
	botOptions: Options,
	inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement>,
	setInputLength: Dispatch<SetStateAction<number>>
) => {
	const customRecognition = botOptions.voice?.SpeechRecognition;

	if (!customRecognition) {
		console.error("No custom SpeechRecognition function provided.");
		return;
	}

	if (!mediaRecorder) {
		return;
	}

	toggleOn = false;

	mediaRecorder.stop();

	//wait for tracks to be closed
	while (!recordingFinished){
		await new Promise(f => setTimeout(f, 100));
	}

	const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

	try {
		const transcript = await customRecognition(audioBlob);

		if (inputRef.current) {
			const characterLimit = botOptions.chatInput?.characterLimit;
			const newInput = inputRef.current.value + transcript;

			if (
				characterLimit != null &&
				characterLimit >= 0 &&
				newInput.length > characterLimit
			) {
				inputRef.current.value = newInput.slice(0, characterLimit);
			} else {
				inputRef.current.value = newInput;
			}

			setInputLength(inputRef.current.value.length);
		}
	} catch (error) {
		console.error("Custom SpeechRecognition failed:", error);
	} finally {
		audioChunks = [];
		mediaRecorder = null;
		recordingFinished = false;
	}
};


/**
 * Syncs voice toggle to textarea state (voice should not be enabled if textarea is disabled).
 * 
 * @param keepVoiceOn boolean indicating if voice was on and thus is to be kept toggled on
 * @param botOptions options provided to the bot
 */
export const syncVoiceWithChatInput = (keepVoiceOn: boolean, botOptions: Options) => {

	if (botOptions.voice?.disabled || !botOptions.chatInput?.blockSpam ) {
		return;
	}

	if (keepVoiceOn && !toggleOn) {
		toggleOn = true;
	} else if (!keepVoiceOn) {
		toggleOn = false;
	}
}
