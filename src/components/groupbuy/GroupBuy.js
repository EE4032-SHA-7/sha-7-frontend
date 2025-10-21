import { useState } from 'react';
import './GroupBuy.css';

export default function GroupBuy() {
    const [itemName, setItemName] = useState("SHA-7 Mechanical Keyboard");
    const [price, setPrice] = useState(0.5); // price in ETC
    const [currentCommit, setCurrentCommit] = useState(3);
    const [totalRequired, setTotalRequired] = useState(10);
    const [hasCommitted, setHasCommitted] = useState(false);
    
    // New state to control the confirmation modal
    const [showConfirmation, setShowConfirmation] = useState(false);

    // This function now just opens the modal
    const handleCommitClick = () => {
        setShowConfirmation(true);
    };

    // This function contains the original commit logic and closes the modal
    const confirmCommit = () => {
        setHasCommitted(true);
        setCurrentCommit(prev => Math.min(prev + 1, totalRequired));
        setShowConfirmation(false); // Close the modal after confirming
    };

    // This function closes the modal without committing
    const cancelCommit = () => {
        setShowConfirmation(false);
    };

    const progressPercent = Math.min((currentCommit / totalRequired) * 100, 100);

    return (
        <div className="groupbuy-container">
            {/* 1. Header Added */}
            <h1 className="main-header">SHA-7 Group Buy Demo</h1>

            <div className="groupbuy-card">
                <div className="groupbuy-image">
                    {/* The image will now display as a full square */}
                    <img src="/keyboard.png" alt="Item" />
                </div>
                <div className="groupbuy-content">
                    <h2>{itemName}</h2>
                    <p className="price">{price} ETC</p>
                    <p className="commit-status">{currentCommit} / {totalRequired} committed</p>
                    
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>

                    {currentCommit >= totalRequired ? (
                        <p className="goal-reached">🎉 Group buy goal reached!</p>
                    ) : (
                        <button 
                            className="commit-button" 
                            onClick={handleCommitClick} // Changed to open modal
                            disabled={hasCommitted}
                        >
                            {hasCommitted ? "You have committed ✅" : "Commit to Buy"}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Confirmation Pop-up (Modal) */}
            {showConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <p className="modal-text">
                            This action is <strong>IRREVERSIBLE.</strong>
                            <br />
                            ARE YOU SURE you want to buy?
                        </p>
                        <div className="modal-actions">
                            <button className="modal-button confirm" onClick={confirmCommit}>
                                Yes, I'm Sure
                            </button>
                            <button className="modal-button cancel" onClick={cancelCommit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}