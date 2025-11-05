import { useState, useEffect, useCallback } from 'react';
import { useParams } from "react-router-dom";
import { ethers } from 'ethers';
import Web3 from 'web3';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../../contracts/config";
import Modal from '../modal/modal';
import './GroupBuy.css';
import "../../global.css";
import { GlobalToolBar } from "../../global";

export default function GroupBuy() {
    const { id } = useParams(); // Gets ID from the URL (e.g., "0")

    const [address, setAddress] = useState(null);
    const [contract, setContract] = useState(null);
    const [campaignData, setCampaignData] = useState(null);
    const [userHasCommitted, setUserHasCommitted] = useState(false);
    const [status, setStatus] = useState("Connect Wallet");
    const [isLoading, setIsLoading] = useState(true);
    const [isCommitting, setIsCommitting] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const connectAndInitialize = async () => {
        if (!window.ethereum) {
            alert("Please install MetaMask!");
            return;
        }
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
    };

    const fetchCampaignData = useCallback(async () => {
        if (!contract || !address) return;

        setIsLoading(true);
        setErrorMessage("");
        try {
            const progress = await contract.methods.getProgress(id).call();
            if (progress.organizer === '0x0000000000000000000000000000000000000000') {
                setStatus("Not Found");
                setCampaignData(null);
                return;
            }

            const hasCommitted = await contract.methods.hasCommitted(id, address).call();
            const fullCampaign = await contract.methods.campaigns(id).call();
            const data = {
                committed: parseInt(progress.committed),
                goal: parseInt(progress.goal),
                successful: progress.successful,
                deadline: parseInt(progress.deadline),
                unitPrice: fullCampaign.unitPrice,
            };
            setCampaignData(data);
            setUserHasCommitted(hasCommitted);

            if (data.successful) setStatus('Successful');
            else if (Date.now() / 1000 > data.deadline && data.deadline !== 0) setStatus('Failed');
            else setStatus('Open');

        } catch (error) {
            console.error("CRITICAL ERROR while fetching data:", error);
            setStatus("Error");
            setErrorMessage("Could not read from contract. Ensure your config.js is correct and you are on the Sepolia network.");
        } finally {
            setIsLoading(false);
        }
    }, [contract, address, id]);

    useEffect(() => {
        if (contract && address) {
            fetchCampaignData();
        }
    }, [contract, address, fetchCampaignData]);

    const handleCommitClick = async () => {
        if (!contract || !address || !isChecked || userHasCommitted || status !== 'Open') return;
        setErrorMessage("");
        setIsCommitting(true);
        try {
            await contract.methods.commit(id).send({ from: address, value: campaignData.unitPrice });
            fetchCampaignData(); // Refresh data after successful transaction
        } catch (error) {
            console.error("Commit transaction failed:", error);
            setErrorMessage(error.message);
        } finally {
            setIsCommitting(false);
        }
    };

    const openModal = (e) => { e.preventDefault(); setIsModalOpen(true); };
    const closeModal = () => setIsModalOpen(false);
    const getStatusClass = (s) => s.toLowerCase().replace(/\s+/g, '-');
    const progressPercent = (campaignData && campaignData.goal > 0)
        ? Math.min((campaignData.committed / campaignData.goal) * 100, 100) : 0;

    return (
        <div className="groupbuy-container">
            <h1 className="main-header">SHA-7 Group Buy (Campaign #{id})</h1>

            {errorMessage && <div className="error-message-box"><p>{errorMessage}</p></div>}

            {!address ? (
                <div className="connect-wallet-container">
                    <p>Please connect your wallet to participate.</p>
                    <button className="commit-button" onClick={connectAndInitialize}>CONNECT WALLET</button>
                </div>
            ) : isLoading ? (
                <p>Loading campaign data...</p>
            ) : !campaignData ? (
                <p>Campaign #{id} could not be found.</p>
            ) : (
                <div className="groupbuy-card">
                    <div className="groupbuy-image">
                        <div className={`status-badge-detail ${getStatusClass(status)}`}>{status}</div>
                        <img src={process.env.PUBLIC_URL + '/keyboard.png'} alt="Item" />
                    </div>
                    <div className="groupbuy-content">
                        <h2>[GB] SHA-7 Mechanical Keyboard</h2>
                        <p className="price">{ethers.utils.formatEther(campaignData.unitPrice)} ETH</p>
                        <p className="commit-status">{campaignData.committed} / {campaignData.goal} committed</p>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPercent}%` }}></div></div>

                        {status !== 'Open' ? (
                            <p className="goal-reached">{status === 'Successful' ? '🎉 Success!' : `Status: ${status}`}</p>
                        ) : (
                            <>
                                <button className="commit-button" onClick={handleCommitClick} disabled={!isChecked || userHasCommitted || isCommitting}>
                                    {isCommitting ? "Confirming..." : (userHasCommitted ? "You've Joined!" : "ORDER NOW")}
                                </button>
                                <div className="declaration">
                                    <label>
                                        <input type="checkbox" checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} disabled={userHasCommitted || isCommitting}/>
                                        <span>I agree to the <button onClick={openModal} className="policy-link">policy</button>.</span>
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {isModalOpen && <Modal onClose={closeModal}>{/* Modal Content */}</Modal>}
            <GlobalToolBar/>
        </div>
    );
}