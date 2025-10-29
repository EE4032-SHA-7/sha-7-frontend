import { useState } from 'react';
import Modal from '../modal/modal';
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
    
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isGoalReached = currentCommit >= totalRequired;
    const progressPercent = Math.min((currentCommit / totalRequired) * 100, 100);

    const handleCommitClick = () => {
        if (!isChecked || hasCommitted || isGoalReached) return;
        setHasCommitted(true);
        setCurrentCommit(prev => Math.min(prev + 1, totalRequired));
    };
    
    const openModal = (e) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="groupbuy-container">
            <h1 className="main-header">SHA-7 Group Buy Demo</h1>

            <div className="groupbuy-card">
                <div className="groupbuy-image">
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
                            onClick={handleCommitClick}
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
                            <span>
                                I agree to the <a href="#" onClick={openModal} className="policy-link">SHA-7 group buy policy</a>, and I acknowledge that I am committing to the production of this product.
                            </span>
                        </label>
                    </div>
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

            {isModalOpen && (
                <Modal onClose={closeModal}>
                    <h2>Group Buy Policy</h2>
                    <p>
                        By committing to this group buy, you acknowledge and agree to the following terms:
                    </p>
                    <ul>
                        <li>This is a pre-order for a product that is not yet in production.</li>
                        <li>Once you have committed to the Group Buy, you are no longer allowed to withdraw from the purchase. Please consider carefully before making a confirmation.</li>
                        <li>The estimated fulfillment date is an estimate and is subject to change due to production delays.</li>
                        <li>You are responsible for any customs and import duties.</li>
                    </ul>
                    <p>
                        Thank you for your understanding and participation!
                    </p>
                </Modal>
            )}

        </div>
    );
}