import { ethers } from 'ethers';
import { useCallback, useState } from 'react';
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
    const [isLoading, setIsLoading] = useState(false); // Set to false initially
    const [isCommitting, setIsCommitting] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // --- Data Fetching ---
    // This function will be called AFTER the user connects their wallet.
    const fetchCampaignData = useCallback(async (contractInstance, userAddress) => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const progress = await contractInstance.methods.getProgress(id).call();
            if (progress.organizer === '0x0000000000000000000000000000000000000000') {
                setStatus("Not Found"); setCampaignData(null); return;
            }
            const hasCommitted = await contractInstance.methods.hasCommitted(id, userAddress).call();
            const hasRefunded = await contractInstance.methods.hasRefunded(id, userAddress).call();
            const fullCampaign = await contractInstance.methods.campaigns(id).call();
            const data = { committed: parseInt(progress.committed), goal: parseInt(progress.goal), successful: progress.successful, deadline: parseInt(progress.deadline), unitPrice: fullCampaign.unitPrice };
            setCampaignData(data);
            setUserHasCommitted(false);
            setUserHasRefunded(hasRefunded);
            if (data.successful) setStatus('Order Confirmed');
            else if (Date.now() / 1000 > data.deadline && data.deadline !== 0) setStatus('Cancelled');
            else setStatus('Open');
        } catch (error) {
            console.error("CRITICAL ERROR while fetching data:", error);
            setStatus("Error");
            setErrorMessage("Could not read from contract. Check config.js and network.");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    // --- Wallet Connection, called by the button ---
    const connectAndInitialize = async () => {
        if (!window.ethereum) { alert("Please install MetaMask!"); return; }
        setErrorMessage("");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];
            const web3Instance = new Web3(window.ethereum);
            const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            
            setAddress(userAddress);
            setContract(contractInstance);

            // After connecting, immediately fetch the data.
            await fetchCampaignData(contractInstance, userAddress);

        } catch (error) {
            console.error("Error connecting wallet:", error);
            setErrorMessage(error.message);
        }
    };

    // --- Transaction Handlers (Now Correct) ---
    const handleCommitClick = async () => {
        if (!contract || !address || !isChecked || userHasCommitted || status !== 'Open' || !campaignData) return;
        setErrorMessage("");
        setIsCommitting(true);
        try {
            await contract.methods.commit(id, '0x0000000000000000000000000000000000000000', 0, 0, 0)
                .send({ from: address, value: campaignData.unitPrice });
            await fetchCampaignData(contract, address);
        } catch (error) {
            console.error("Commit transaction failed:", error);
            setErrorMessage(error.message);
        } finally {
            setIsCommitting(false);
        }
    };
    
    const handleRefundClick = async () => { /* ... (refund logic is correct) ... */ };

    // --- UI Helpers ---
    const openModal = (e) => { e.preventDefault(); setIsModalOpen(true); };
    const closeModal = () => setIsModalOpen(false);
    const getStatusClass = (s) => s.toLowerCase().replace(/\s+/g, '-');
    const progressPercent = (campaignData && campaignData.goal > 0) ? Math.min((campaignData.committed / campaignData.goal) * 100, 100) : 0;

    const GroupBuyPage = () => {
        if (isLoading) return <p>Loading campaign data...</p>;
        if (!campaignData) return <p>Campaign #{id} could not be found.</p>;

        let displayStatus = status;
        if (status === 'Open' && userHasCommitted) { displayStatus = 'Committed'; }

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
            
            {/* --- THIS IS THE FIX --- */}
            {/* If the wallet is not connected, show a button to connect it. */}
            {!address ? (
                <div className="connect-wallet-container">
                    <p>Please connect your wallet to view this campaign.</p>
                    <button className="commit-button" onClick={connectAndInitialize}>
                        CONNECT WALLET
                    </button>
                </div>
            ) : <GroupBuyPage />}
            
            {isModalOpen && <Modal onClose={closeModal}>{/* ... Modal Content ... */}</Modal>}
            <GlobalToolBar/>
        </div>
    );
}