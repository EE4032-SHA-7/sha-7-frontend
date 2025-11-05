import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import Web3 from 'web3';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../../contracts/config";
import { GlobalToolBar } from "../../global";
import "../../global.css";
import Modal from '../modal/modal';
import './GroupBuy.css';

export default function GroupBuy() {
    const { id } = useParams();

    // --- State Management ---
    const [address, setAddress] = useState(null);
    const [contract, setContract] = useState(null);
    const [campaignData, setCampaignData] = useState(null);
    const [userHasCommitted, setUserHasCommitted] = useState(false);
    const [userHasRefunded, setUserHasRefunded] = useState(false);
    const [status, setStatus] = useState("Connect Wallet");
    const [isLoading, setIsLoading] = useState(true);
    const isCommitting =false;
    const isRefunding =false;
    const [isChecked, setIsChecked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false); // State for the timeline toggle
    const [errorMessage, setErrorMessage] = useState("");

    // --- Wallet Connection ---
    const connectAndInitialize = useCallback(async () => {
        if (!window.ethereum) { alert("Please install MetaMask!"); return; }
        setErrorMessage("");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setAddress(accounts[0]);
            const web3Instance = new Web3(window.ethereum);
            const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            setContract(contractInstance);
        } catch (error) {
            console.error("Error connecting wallet:", error);
            setErrorMessage(error.message);
        }
    }, []);

    // --- Data Fetching ---
    const fetchCampaignData = useCallback(async () => {
        if (!contract || !address) return;
        setIsLoading(true);
        setErrorMessage("");
        try {
            const progress = await contract.methods.getProgress(id).call();
            if (progress.organizer === '0x0000000000000000000000000000000000000000') {
                setStatus("Not Found"); setCampaignData(null); return;
            }
            const hasCommitted = await contract.methods.hasCommitted(id, address).call();
            const hasRefunded = await contract.methods.hasRefunded(id, address).call();
            const fullCampaign = await contract.methods.campaigns(id).call();
            const data = { committed: parseInt(progress.committed), goal: parseInt(progress.goal), successful: progress.successful, deadline: parseInt(progress.deadline), unitPrice: fullCampaign.unitPrice };
            setCampaignData(data);
            setUserHasCommitted(hasCommitted);
            setUserHasRefunded(hasRefunded);
            if (data.successful) setStatus('Order Confirmed');
            else if (Date.now() / 1000 > data.deadline && data.deadline !== 0) setStatus('Cancelled');
            else setStatus('Open');
        } catch (error) {
            console.error("CRITICAL ERROR while fetching data:", error);
            setStatus("Error");
            setErrorMessage("Could not read from contract. Check your config.js and network.");
        } finally {
            setIsLoading(false);
        }
    }, [contract, address, id]);

    // --- Effects to run logic on load ---
    useEffect(() => { connectAndInitialize(); }, [connectAndInitialize]);
    useEffect(() => { if (contract && address) { fetchCampaignData(); } }, [contract, address, fetchCampaignData]);

    // --- Transaction Handlers ---
    const handleCommitClick = async () => { /* ... (unchanged) ... */ };
    const handleRefundClick = async () => { /* ... (unchanged) ... */ };

    // --- UI Helpers ---
    const openModal = (e) => { e.preventDefault(); setIsModalOpen(true); };
    const closeModal = () => setIsModalOpen(false);
    const getStatusClass = (s) => s.toLowerCase().replace(/\s+/g, '-');
    const progressPercent = (campaignData && campaignData.goal > 0) ? Math.min((campaignData.committed / campaignData.goal) * 100, 100) : 0;

    const GroupBuyPage = () => {
        if (isLoading) return <p>Loading campaign data...</p>;
        if (!campaignData) return <p>Campaign #{id} could not be found.</p>;

        // --- FIX #1: Determine the correct status to display on the badge ---
        let displayStatus = status;
        if (status === 'Open' && userHasCommitted) {
            displayStatus = 'Committed';
        }

        return (
            <div className="groupbuy-card">
                <div className="groupbuy-image">
                    <div className={`status-badge-detail ${getStatusClass(displayStatus)}`}>{displayStatus}</div>
                    <img src={process.env.PUBLIC_URL + '/keyboard.png'} alt="Item" />
                </div>
                <div className="groupbuy-content">
                    <h2>[GB] SHA-7 Mechanical Keyboard</h2>
                    <p className="price">{ethers.utils.formatEther(campaignData.unitPrice)} ETH</p>
                    <p className="commit-status">{campaignData.committed} / {campaignData.goal} committed</p>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPercent}%` }}></div></div>
                    
                    {/* --- Dynamic Action Area (Unchanged) --- */}
                    {status === 'Open' && (userHasCommitted ? (
                        <div className="status-message-box committed"><p>You have already joined this group buy!</p></div>
                    ) : (
                        <>
                            <button className="commit-button" onClick={handleCommitClick} disabled={!isChecked || isCommitting}>{isCommitting ? "Confirming..." : "ORDER NOW"}</button>
                            <div className="declaration">
                                <label><input type="checkbox" checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} disabled={isCommitting}/>
                                <span> I agree to the <button onClick={openModal} className="policy-link">policy</button>.</span></label>
                            </div>
                        </>
                    ))}
                    {status === 'Order Confirmed' && <div className="status-message-box order-confirmed"><p>🎉 Goal reached! This order is confirmed.</p></div>}
                    {status === 'Cancelled' && (userHasCommitted ? (userHasRefunded ? (
                        <div className="status-message-box committed"><p>Your refund has been processed.</p></div>
                    ) : (
                        <div className="refund-section"><p>This campaign was cancelled.</p><button className="commit-button cancel" onClick={handleRefundClick} disabled={isRefunding}>{isRefunding ? "Processing..." : "CLAIM REFUND"}</button></div>
                    )) : (
                        <div className="status-message-box cancelled"><p>This campaign was cancelled.</p></div>
                    ))}
                    
                    {/* --- FIX #2: Timeline is now always visible --- */}
                    <div className="timeline">
                        <button className="timeline-toggle" onClick={() => setIsTimelineOpen(o => !o)} aria-expanded={isTimelineOpen}>
                            <strong>Timeline</strong>
                            <span className={`chevron ${isTimelineOpen ? 'open' : ''}`} aria-hidden>▾</span>
                        </button>
                        {isTimelineOpen && (
                            <div className="timeline-panel">
                                <p><strong>Group Buy Ends</strong> - {new Date(campaignData.deadline * 1000).toLocaleDateString()}</p>
                                <p><strong>Estimated Fulfillment Date</strong> - Q2 2026</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <div className="groupbuy-container">
            <h1 className="main-header">SHA-7 Group Buy (Campaign #{id})</h1>
            {errorMessage && <div className="error-message-box"><p>{errorMessage}</p></div>}
            {!address ? (
                <div className="connect-wallet-container">
                    <p>Please connect your wallet to view this campaign.</p>
                </div>
            ) : <GroupBuyPage />}
            {isModalOpen && <Modal onClose={closeModal}>{/* ... Modal Content ... */}</Modal>}
            <GlobalToolBar/>
        </div>
    );
}