/* eslint-disable indent */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/jsx-indent */
import {
	useState,
	ChangeEvent,
	FormEvent,
	KeyboardEvent,
	RefObject,
	useEffect,
	MouseEvent,
	SetStateAction,
	Dispatch
} from "react";
import SendButton from "./SendButton/SendButton";
import VoiceButton from "./VoiceButton/VoiceButton";
import GPTSelection from "./GPTSelection/GPTSelection";
import { isDesktop } from "../../services/Utils";
import { useBotOptions } from "../../context/BotOptionsContext";
import { stopVoiceRecording } from "../../services/VoiceService";

import "./ChatBotInput.css";
import { Flow } from "../../types/Flow";
import { CustomGPT } from "../../types/CustomGPT";

/**
 * Contains chat input field for user to enter messages.
 * 
 * @param inputRef reference to the textarea
 * @param textAreaDisabled boolean indicating if textarea is disabled
 * @param textAreaSensitveMode boolean indicating is textarea is in sensitve mode
 * @param voiceToggledOn boolean indicating if voice is toggled on
 * @param getCurrPath retrieves the current path of user
 * @param handleToggleVoice handles toggling of voice
 * @param handleActionInput handles action input from user
 * @param hasFlowStarted boolean indicating if flow has started
 * @param setHasFlowStarted sets whether the flow has started
 */
const ChatBotInput = ({
	inputRef,
	textAreaDisabled,
	textAreaSensitiveMode,
	voiceToggledOn,
	getCurrPath,
	handleToggleVoice,
	handleActionInput,
	hasFlowStarted,
	setHasFlowStarted
}: {
	inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement>;
	textAreaDisabled: boolean;
	textAreaSensitiveMode: boolean;
	voiceToggledOn: boolean;
	getCurrPath: () => keyof Flow | null;
	handleToggleVoice: () => void;
	handleActionInput: (path: keyof Flow, userInput: string, sendUserInput?: boolean) => Promise<void>;
	hasFlowStarted: boolean;
	setHasFlowStarted: Dispatch<SetStateAction<boolean>>;
}) => {

	// handles options for bot
	const { botOptions } = useBotOptions();

	// tracks if chat input is focused
	const [isFocused, setIsFocused] = useState<boolean>(false);

	// tracks length of input
	const [inputLength, setInputLength] = useState<number>(0);

	// tracks selected GPTs
	const [selectedGPTs, setSelectedGPTs] = useState<CustomGPT[]>([]);

	// serves as a workaround (together with useEffect hook) for sending voice input, can consider a better approach
	const [voiceInputTrigger, setVoiceInputTrigger] = useState<boolean>(false);
	useEffect(() => {
		const currPath = getCurrPath();
		if (!currPath) {
			return;
		}
		handleActionInput(currPath, inputRef.current?.value as string);
		setInputLength(0);
	}, [voiceInputTrigger])

	// Add state for GPT selection
	const [showGPTSelection, setShowGPTSelection] = useState(false);

	const handleGPTSelect = (option: CustomGPT) => {
		if (inputRef.current) {
			// Remove the @ character
			const value = inputRef.current.value;
			const lastAtIndex = value.lastIndexOf('@');
			if (lastAtIndex !== -1) {
				inputRef.current.value = value.substring(0, lastAtIndex) + value.substring(lastAtIndex + 1);
				setInputLength(inputRef.current.value.length);
			}
		}
		setSelectedGPTs([option]); // Only allow one GPT
		botOptions.chatInput?.onCustomGPTSelect?.(option);
		setShowGPTSelection(false);
	};

	const handleRemoveGPT = () => {
		setSelectedGPTs([]);
		botOptions.chatInput?.onCustomGPTRemove?.();
	};

	// styles for text area
	const textAreaStyle: React.CSSProperties = {
		boxSizing: isDesktop ? "content-box" : "border-box",
		...botOptions.chatInputAreaStyle,
	};

	// styles for focused text area
	const textAreaFocusedStyle: React.CSSProperties = {
		outline: !textAreaDisabled ? "none" : "",
		boxShadow: !textAreaDisabled ? `0 0 5px ${botOptions.theme?.primaryColor}` : "",
		boxSizing: isDesktop ? "content-box" : "border-box",
		...botOptions.chatInputAreaStyle, // by default inherit the base style for input area
		...botOptions.chatInputAreaFocusedStyle,
	};

	// styles for disabled text area
	const textAreaDisabledStyle: React.CSSProperties = {
		cursor: `url(${botOptions.theme?.actionDisabledIcon}), auto`,
		caretColor: "transparent",
		boxSizing: isDesktop ? "content-box" : "border-box",
		...botOptions.chatInputAreaStyle, // by default inherit the base style for input area
		...botOptions.chatInputAreaDisabledStyle,
	};

	// styles for character limit
	const characterLimitStyle: React.CSSProperties = {
		color: "#989898",
		...botOptions.characterLimitStyle
	};

	// styles for character limit reached
	const characterLimitReachedStyle: React.CSSProperties = {
		color: "#ff0000",
		...botOptions.characterLimitReachedStyle
	};

	// styles for input placeholder
	const placeholder = textAreaDisabled
		? botOptions.chatInput?.disabledPlaceholderText
		: botOptions.chatInput?.enabledPlaceholderText;

	/**
	 * Handles focus event on chat input.
	 */
	const handleFocus = () => {
		if (textAreaDisabled) {
			return;
		}
		setIsFocused(true);
	};

	/**
	 * Handles blur event on chat input.
	 */
	const handleBlur = () => {
		setIsFocused(false);
	};

	/**
	 * Handles keyboard events and proceeds to submit user input if enter button is pressed.
	 * 
	 * @param event keyboard event
	 */ 
	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
		if (event.key === "Enter") {
			if (event.shiftKey) {
				if (!botOptions.chatInput?.allowNewline) {
					event.preventDefault();
				}
				return;
			}
			handleSubmit(event);
		}

		if (event.key === "@") {
			const selectionStart = event.currentTarget.selectionStart;
			if (selectionStart !== null && botOptions.chatInput?.customGPTs
				 && botOptions.chatInput?.customGPTs.length > 0) {
				setShowGPTSelection(true);
			}
		}

		// Hide GPT selection on escape
		if (event.key === "Escape") {
			setShowGPTSelection(false);
		}
	};

	/**
	 * Handles textarea value changes.
	 * 
	 * @param event textarea change event
	 */
	const handleTextareaValueChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
		if (textAreaDisabled && inputRef.current) {
			// prevent input and keep current value
			inputRef.current.value = "";
			return;
		}

		if (inputRef.current) {
			const characterLimit = botOptions.chatInput?.characterLimit
			/*
			* @params allowNewline Boolean
			* allowNewline [true] Allow input values to contain line breaks '\n'
			* allowNewline [false] Replace \n with a space
			* */
			const allowNewline = botOptions.chatInput?.allowNewline
			const newInput = allowNewline ? event.target.value : event.target.value.replace(/\n/g, " ");
			if (characterLimit != null && characterLimit >= 0 && newInput.length > characterLimit) {
				inputRef.current.value = newInput.slice(0, characterLimit);
			} else {
				inputRef.current.value = newInput
			}
			setInputLength(inputRef.current.value.length);
		}
	};

	/**
	 * Handles submission of user input via enter key or send button.
	 * 
	 * @param event form event or mouse event
	 */
	const handleSubmit = async (event: (FormEvent | MouseEvent)) => {
		event.preventDefault();
		const currPath = getCurrPath();
		if (!currPath) {
			return;
		}
		// If voice is toggled on, stop and transcribe before sending
		if (voiceToggledOn && botOptions.voice && !botOptions.voice.disabled) {
			await stopVoiceRecording(botOptions, inputRef, setInputLength);
		}
		handleActionInput(currPath, inputRef.current?.value as string);
		setInputLength(0);
		setSelectedGPTs([]); // Clear selected GPTs after sending
	};

	/**
	 * Handles submission of user voice input.
	 */
	const triggerSendVoiceInput = () => {
		setVoiceInputTrigger(prev => !prev);
	}

	// Add click handler to hide GPT selection when clicking outside
	useEffect(() => {
		const handleClickOutside = () => {
			if (showGPTSelection) {
				setShowGPTSelection(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showGPTSelection]);

	return (
		<div 
			onMouseDown={(event: MouseEvent) => {
				event.stopPropagation();
				if (!hasFlowStarted && botOptions.theme?.flowStartTrigger === "ON_CHATBOT_INTERACT") {
					setHasFlowStarted(true);
				}
			}}
			style={botOptions.chatInputContainerStyle} 
			className="rcb-chat-input"
		>
			{showGPTSelection && (
				<GPTSelection
					isVisible={showGPTSelection}
					options={botOptions.chatInput?.customGPTs || []}
					onSelect={handleGPTSelect}
				/>
			)}
			{selectedGPTs.length > 0 && (
				<div className="rcb-selected-gpts">
					{selectedGPTs.map((gpt) => (
						<div key={gpt.id} className="rcb-selected-gpt">
							{gpt.image && (
								<img src={gpt.image} alt={gpt.title} className="rcb-selected-gpt-icon" />
							)}
							<span>{gpt.title}</span>
							<button 
								className="rcb-selected-gpt-remove" 
								onClick={handleRemoveGPT}
								aria-label="Remove GPT"
							>
								×
							</button>
						</div>
					))}
				</div>
			)}
			<div className="rcb-chat-input-main">
				{/* textarea intentionally does not use the disabled property 
				to prevent keyboard from closing on mobile */}
				{textAreaSensitiveMode
					?
						<input
						ref={inputRef as RefObject<HTMLInputElement>}
						type="password"
						className="rcb-chat-input-textarea"
						style={textAreaDisabled
							? textAreaDisabledStyle
							: (isFocused ? textAreaFocusedStyle : textAreaStyle)}
						placeholder={placeholder}
						onChange={handleTextareaValueChange}
						onKeyDown={handleKeyDown}
						onFocus={handleFocus}
						onBlur={handleBlur}
					/>
					:
					<textarea
							ref={inputRef as RefObject<HTMLTextAreaElement>}
							style={textAreaDisabled
							? textAreaDisabledStyle
							: (isFocused ? textAreaFocusedStyle : textAreaStyle)}
							rows={1}
							className="rcb-chat-input-textarea"
							placeholder={placeholder}
							onChange={handleTextareaValueChange}
							onKeyDown={handleKeyDown}
							onFocus={handleFocus}
							onBlur={handleBlur}
					/>
				}
				<div className="rcb-chat-input-button-container">
					{!botOptions.voice?.disabled &&
						<VoiceButton inputRef={inputRef}
							voiceToggledOn={voiceToggledOn} handleToggleVoice={handleToggleVoice}
							triggerSendVoiceInput={triggerSendVoiceInput} setInputLength={setInputLength}
						/>
					}
					<SendButton handleSubmit={handleSubmit}/>
					{botOptions.chatInput?.showCharacterCount
						&& botOptions.chatInput?.characterLimit != null
						&& botOptions.chatInput?.characterLimit > 0
						&&
						<div 
							className="rcb-chat-input-char-counter"
							style={inputLength >= botOptions.chatInput?.characterLimit
								? characterLimitReachedStyle
								: characterLimitStyle
							}
						>
							{inputLength}/{botOptions.chatInput?.characterLimit}
						</div>
					}
				</div>
			</div>
		</div>
	);
};

export default ChatBotInput;