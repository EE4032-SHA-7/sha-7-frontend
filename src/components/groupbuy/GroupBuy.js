import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from "react-router-dom";
import Web3 from 'web3';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../../contracts/config";
import { GlobalToolBar } from "../../global";
import "../../global.css";
import Modal from '../modal/modal';
import './GroupBuy.css';

const CAMPAIGN_METADATA = {
    0: { name: "Mechanical Keyboard", image: "/keyboard.png" },
    1: { name: "Hydro Flask Water Bottle", image: "/water_bottle.png" },
    2: { name: "Custom Phone Case", image: "/phone_case.png" },
};

export default function GroupBuy() {
    const { id } = useParams();

    const [address, setAddress] = useState(null);
    const [contract, setContract] = useState(null);
    const [campaignData, setCampaignData] = useState(null);
    const [userHasCommitted, setUserHasCommitted] = useState(false);
    const [userHasRefunded, setUserHasRefunded] = useState(false);
    const [status, setStatus] = useState("Connecting...");
    const [isLoading, setIsLoading] = useState(true);
    const [isCommitting, setIsCommitting] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchCampaignData = useCallback(async (contractInstance, userAddress) => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const progress = await contractInstance.methods.getProgress(id).call();
            if (progress.organizer === '0x0000000000000000000000000000000000000000') {
                setStatus("Not Found");
                setCampaignData(null);
                return;
            }

            const hasCommitted = await contractInstance.methods.hasCommitted(id, userAddress).call();
            const hasRefunded = await contractInstance.methods.hasRefunded(id, userAddress).call();
            const fullCampaign = await contractInstance.methods.campaigns(id).call();

            const data = {
                committed: parseInt(progress.committed),
                goal: parseInt(progress.goal),
                successful: progress.successful,
                deadline: parseInt(progress.deadline),
                unitPrice: fullCampaign.unitPrice
            };
            setCampaignData(data);
            setUserHasCommitted(hasCommitted);
            setUserHasRefunded(hasRefunded);

            if (data.successful) setStatus('Order Confirmed');
            else if (Date.now() / 1000 > data.deadline && data.deadline !== 0) setStatus('Cancelled');
            else setStatus('Open');

        } catch (error) {
            console.error("CRITICAL ERROR while fetching data for campaign:", id, error);
            setStatus("Error");
            setErrorMessage("Could not read from contract. Check config.js and network.");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const connectAndInitialize = useCallback(async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask!");
            setErrorMessage("MetaMask is not installed.");
            setIsLoading(false);
            return;
        }
        setErrorMessage("");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];
            const web3Instance = new Web3(window.ethereum);
            const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            setAddress(userAddress);
            setContract(contractInstance);
            await fetchCampaignData(contractInstance, userAddress);

        } catch (error) {
            console.error("Error connecting wallet:", error);
            setErrorMessage(error.message);
            setIsLoading(false);
        }
    }, [fetchCampaignData]);

    useEffect(() => {
        connectAndInitialize();
    }, [connectAndInitialize]);

    const handleCommitClick = async () => {
        if (!contract || !address || !isChecked || userHasCommitted || status !== 'Open' || !campaignData) {
            setErrorMessage("Cannot commit: check conditions (policy, committed status, campaign open).");
            return;
        }
        setErrorMessage("");
        setIsCommitting(true);
        try {
            await contract.methods.commit(id, '0x0000000000000000000000000000000000000000', 0, 0, 0)
                .send({ from: address, value: campaignData.unitPrice });
            await fetchCampaignData(contract, address);
            setIsChecked(false);
        } catch (error) {
            console.error("Commit transaction failed:", error);
            setErrorMessage(error.message);
        } finally {
            setIsCommitting(false);
        }
    };

    const handleRefundClick = async () => {
        if (!contract || !address || !userHasCommitted || userHasRefunded || status !== 'Cancelled') {
            setErrorMessage("Cannot refund: check conditions (campaign cancelled, committed status, not yet refunded).");
            return;
        }
        setErrorMessage("");
        setIsRefunding(true);
        try {
            await contract.methods.refund(id).send({ from: address });
            await fetchCampaignData(contract, address);
        } catch (error) {
            console.error("Refund transaction failed:", error);
            setErrorMessage(error.message);
        } finally {
            setIsRefunding(false);
        }
    };

    const openModal = (e) => { e.preventDefault(); setIsModalOpen(true); };
    const closeModal = () => setIsModalOpen(false);
    const getStatusClass = (s) => s.toLowerCase().replace(/\s+/g, '-');
    const progressPercent = (campaignData && campaignData.goal > 0) ? Math.min((campaignData.committed / campaignData.goal) * 100, 100) : 0;

    const GroupBuyPage = () => {
        if (isLoading) return <p>Loading campaign data...</p>;
        if (!campaignData) return <p>Campaign #{id} could not be found.</p>;

        let displayStatus = status;
        if (status === 'Open' && userHasCommitted) { displayStatus = 'Committed'; }

        const campaignIdNum = parseInt(id);
        const metadata = CAMPAIGN_METADATA[campaignIdNum] || { name: `[GB] Campaign #${id}`, image: "/placeholder.png" };

        return (
            <div className="groupbuy-card">
                <div className="groupbuy-image">
                    <div className={`status-badge-detail ${getStatusClass(displayStatus)}`}>{displayStatus}</div>
                    <img src={process.env.PUBLIC_URL + metadata.image} alt={metadata.name} />
                </div>
                <div className="groupbuy-content">
                    <h2>{metadata.name}</h2>
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

                    {/* ================================================================= */}
                    {/* =============== THE FIX IS IN THIS SECTION BELOW ================ */}
                    {/* ================================================================= */}
                    {status === 'Cancelled' && (
                        userHasCommitted ? (
                            userHasRefunded ? (
                                <div className="status-message-box committed">
                                    <p>Your refund for this campaign has already been claimed.</p>
                                </div>
                            ) : (
                                <div className="refund-section">
                                    <p>This campaign was cancelled. You may claim a refund.</p>
                                    <button
                                        className="commit-button cancel"
                                        onClick={handleRefundClick}
                                        disabled={isRefunding}
                                    >
                                        {isRefunding ? "Processing..." : "CLAIM REFUND"}
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="status-message-box cancelled">
                                <p>This campaign was cancelled.</p>
                            </div>
                        )
                    )}
                    {/* ================================================================= */}
                    {/* ======================= END OF FIX SECTION ====================== */}
                    {/* ================================================================= */}

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
                    <p>Connecting to wallet...</p>
                </div>
            ) : <GroupBuyPage />}

            {isModalOpen && <Modal onClose={closeModal}>
                <div className="policy-content">
                    <h3>Group Buy Policy</h3>
                    <p>By participating in this group buy, you agree to the following terms:</p>
                    <ul>
                        <li>All sales are final after the group buy successfully concludes.</li>
                        <li>Refunds are only issued if the group buy does not meet its funding goal by the deadline.</li>
                        <li>Estimated fulfillment dates are subject to change due to manufacturing delays.</li>
                        <li>You understand that this is a pre-order for a product that is not yet manufactured.</li>
                        <li>By clicking "ORDER NOW", you commit to purchasing the item at the listed unit price.</li>
                    </ul>
                </div>
            </Modal>}
            <GlobalToolBar/>
        </div>
    );
}