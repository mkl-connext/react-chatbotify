import { RefObject, Dispatch, SetStateAction, useEffect, MouseEvent } from "react";

import { startVoiceRecording, stopVoiceRecording } from "../../../services/VoiceService";
import { useBotOptions } from "../../../context/BotOptionsContext";

import "./VoiceButton.css";

/**
 * Toggles voice to text input to the chat bot.
 *
 * @param inputRef reference to the textarea
 * @param textAreaDisabled boolean indicating if textarea is disabled
 * @param voiceToggledOn boolean indicating if voice is toggled on
 * @param handleToggleVoice handles toggling of voice
 * @param triggerSendVoiceInput triggers sending of voice input into chat window
 * @param setInputLength sets the input length to reflect character count & limit
 */
const VoiceButton = ({
	inputRef,
	textAreaDisabled,
	voiceToggledOn,
	handleToggleVoice, setInputLength
}: {
	inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
	textAreaDisabled: boolean;
	voiceToggledOn: boolean;
	handleToggleVoice: () => void;
	triggerSendVoiceInput: () => void;
	setInputLength: Dispatch<SetStateAction<number>>;
}) => {

	// handles options for bot
	const { botOptions } = useBotOptions();
	
	// handles starting and stopping of voice recording on toggle
	useEffect(() => {
		if (voiceToggledOn) {
			startVoiceRecording(handleToggleVoice);
		} else {
			stopVoiceRecording(botOptions, inputRef, setInputLength);
		}
	}, [voiceToggledOn]);

	return (
		<div
			onMouseDown={(event: MouseEvent) => {
				event.preventDefault();
				handleToggleVoice();
			}}
			className={voiceToggledOn && !textAreaDisabled ? "rcb-voice-button-enabled" : "rcb-voice-button-disabled"}
		>
			<span className={voiceToggledOn && !textAreaDisabled ? "rcb-voice-icon-on" : "rcb-voice-icon-off"}
				style={{backgroundImage: `url(${botOptions.voice?.icon})`}}
			/>
		</div>
	);
};

export default VoiceButton;