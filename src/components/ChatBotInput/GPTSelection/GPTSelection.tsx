import React from 'react';
import './GPTSelection.css';
import { CustomGPT } from '../../../types/CustomGPT';


type GPTSelectionProps = {
  isVisible: boolean;
  options: CustomGPT[];
  onSelect: (option: CustomGPT) => void;
}

const GPTSelection: React.FC<GPTSelectionProps> = ({ isVisible, options, onSelect }) => {
	if (!isVisible) return null;

	return (
		<div className="rcb-gpt-selection">
			{options.map((option) => (
				<div
					key={option.id}
					className="rcb-gpt-option"
					onMouseDown={(e) => {
						onSelect(option);
						e.stopPropagation();
					}}
				>
					{option.image && (
						<img src={option.image} alt={option.title} className="rcb-gpt-option-icon" />
					)}
					<div className="rcb-gpt-option-content">
						<div className="rcb-gpt-option-name">{option.title}</div>
						<div className="rcb-gpt-option-description">{option.description}</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default GPTSelection;