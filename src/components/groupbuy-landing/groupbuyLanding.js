import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from "react-router-dom";
import Web3 from 'web3';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../../contracts/config";
import { GlobalToolBar } from "../../global";
import "../../global.css";
import "./groupbuyLanding.css";

// This component is now smarter and will show "Committed"
const ProductCard = ({ campaign }) => {
    // --- THIS IS THE FIX ---
    // The status logic is now more detailed.
    let displayStatus = 'Open';
    if (campaign.successful) {
        displayStatus = 'Successful'; // Final states have highest priority
    } else if (Date.now() / 1000 > campaign.deadline && campaign.deadline !== "0") {
        displayStatus = 'Failed';
    } else if (campaign.userHasJoined) {
        // If it's still open, check the personal status
        displayStatus = 'Committed';
    }
    
    const progressPercent = campaign.goal > 0 ? (parseInt(campaign.committed) / parseInt(campaign.goal)) * 100 : 0;
    return (
        <div className="product-card-landing">
            <div className={`status-badge ${displayStatus.toLowerCase()}`}>{displayStatus}</div>
            <div className="product-image-landing"><img src={`${process.env.PUBLIC_URL}/keyboard.png`} alt={`Campaign ${campaign.id}`} /></div>
            <div className="product-info-landing">
                <h3>{`[GB] Campaign #${campaign.id}`}</h3>
                <p className="price-landing">{ethers.utils.formatEther(campaign.unitPrice)} ETH</p>
                <div className="status-tracker-landing">
                    <p>{`${campaign.committed} / ${campaign.goal}`} committed</p>
                    <div className="progress-bar-landing"><div className="progress-fill-landing" style={{ width: `${progressPercent}%` }}></div></div>
                </div>
            </div>
        </div>
    );
};

export default function GroupBuyLanding(props) {
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const isCreating = false;
    const [error, setError] = useState("");

    const fetchCampaigns = useCallback(async () => {
        if (!window.ethereum) return;
        setIsLoading(true);
        setError("");
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];
            const web3Instance = new Web3(window.ethereum);
            const contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            // 1. Fetch the public data for all campaigns
            const campaignPromises = [];
            for (let i = 0; i < 10; i++) {
                campaignPromises.push(contract.methods.campaigns(i).call());
            }
            const results = await Promise.all(campaignPromises);
            const activeCampaigns = results
                .map((c, index) => ({ ...c, id: index }))
                .filter(c => c.organizer !== '0x0000000000000000000000000000000000000000');
            
            // --- THIS IS THE FIX ---
            // 2. For each active campaign, fetch the user's personal commitment status
            if (activeCampaigns.length > 0) {
                const statusPromises = activeCampaigns.map(campaign =>
                    contract.methods.hasCommitted(campaign.id, userAddress).call()
                );
                const userStatuses = await Promise.all(statusPromises); // Returns an array like [true, false, false]

                // 3. Combine the public data with the personal data
                const campaignsWithUserStatus = activeCampaigns.map((campaign, index) => ({
                    ...campaign,
                    userHasJoined: userStatuses[index], // Add the new property
                }));
                setCampaigns(campaignsWithUserStatus);
            } else {
                setCampaigns([]); // No active campaigns found
            }
            // --- END OF FIX ---

        } catch (err) {
            console.error("Failed to fetch campaigns:", err);
            setError("Could not fetch campaigns. Please ensure you are on the Sepolia network.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (props.isConnected) {
            fetchCampaigns();
        }
    }, [props.isConnected, fetchCampaigns]);

    const handleCreateFirstCampaign = async () => {
        // ... (This function is unchanged and correct)
    };

    const LandingPage = () => (
        <div className="groupbuy-landing-page">
            <h1>Active Group Buys</h1>
            {error && <div className="error-message-box"><p>{error}</p></div>}
            {isLoading ? <p>Loading active campaigns...</p> : (
                campaigns.length > 0 ? (
                    <div className="product-grid-landing">
                        {campaigns.map(c => (
                            <Link key={c.id} to={`/InterfaceDemo/groupbuy/${c.id}`}>
                                <ProductCard campaign={c} />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="start-campaign-container">
                        <p>There are no active group buys. Be the first to start one!</p>
                        <button 
                            className="commit-button" 
                            onClick={handleCreateFirstCampaign}
                            disabled={isCreating}
                        >
                            {isCreating ? "Starting..." : "Start the First Group Buy"}
                        </button>
                    </div>
                )
            )}
            <GlobalToolBar/>
        </div>
    );

    return (
        <div>
            {props.isConnected ? <LandingPage /> : <Navigate to='/sha-7-frontend' />}
        </div>
    );
}