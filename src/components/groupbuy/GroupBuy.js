import { useState } from 'react';
import './GroupBuy.css';

export default function GroupBuy() {
    const [itemName, setItemName] = useState("[GB] SHA-7 Mechanical Keyboard");
    const [price, setPrice] = useState(0.5); // price in ETC
    const [currentCommit, setCurrentCommit] = useState(3);
    const [totalRequired, setTotalRequired] = useState(10);
    const [hasCommitted, setHasCommitted] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const timelineId = "timeline-panel";

    const isGoalReached = currentCommit >= totalRequired;
    const progressPercent = Math.min((currentCommit / totalRequired) * 100, 100);

    // Immediately commit (no modal)
    const handleCommitClick = () => {
    if (!isChecked || hasCommitted || isGoalReached) return;
    setHasCommitted(true);
    setCurrentCommit(prev => Math.min(prev + 1, totalRequired));
    // Optional: lock the checkbox after commit
    // setIsChecked(false);
    };

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
                            disabled={!isChecked}
                        >
                            {hasCommitted ? "Order Successful!" : "ORDER NOW"}
                        </button>
                    )}
                    <div className="declaration">
                        <label>
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                                disabled={hasCommitted}
                            />
                            &nbsp;I agree to the SHA-7 group buy policy, and I acknowledge that I am committing to the production of this product.
                        </label>
                    </div>
                    {/* Timeline dropdown */}
                    <div className="timeline">
                        <button
                        className="timeline-toggle"
                        onClick={() => setIsTimelineOpen(o => !o)}
                        aria-expanded={isTimelineOpen}
                        aria-controls={timelineId}
                        >
                        <strong>Timeline</strong>
                        <span className={`chevron ${isTimelineOpen ? 'open' : ''}`} aria-hidden>▾</span>
                        </button>

                        {isTimelineOpen && (
                        <div id={timelineId} className="timeline-panel">
                            <p><strong>Group Buy Ends</strong> - November 26</p>
                            <p><strong>Estimated Fulfillment Date</strong> - Q2 2026</p>
                        </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}