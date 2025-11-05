import { useState, useEffect, useCallback } from 'react';
import { Link } from "react-router-dom";
import { ethers } from 'ethers';
import Web3 from 'web3';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../../contracts/config";
import "./groupbuyLanding.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

const ProductCard = ({ campaign }) => {
    let status = 'Open';
    if (campaign.successful) status = 'Successful';
    else if (Date.now() / 1000 > campaign.deadline && campaign.deadline !== "0") status = 'Failed';
    const progressPercent = campaign.goal > 0 ? (parseInt(campaign.committed) / parseInt(campaign.goal)) * 100 : 0;
    return (
        <div className="product-card-landing">
            <div className={`status-badge ${status.toLowerCase()}`}>{status}</div>
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

export default function GroupBuyLanding() {
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!window.ethereum) {
                setError("MetaMask is not installed.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const web3Instance = new Web3(window.ethereum);
                const contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

                // Since the contract has no campaign counter, we check the first 10 IDs.
                const campaignPromises = [];
                for (let i = 0; i < 10; i++) {
                    campaignPromises.push(contract.methods.campaigns(i).call());
                }
                const results = await Promise.all(campaignPromises);
                const activeCampaigns = results
                    .map((c, index) => ({ ...c, id: index }))
                    .filter(c => c.organizer !== '0x0000000000000000000000000000000000000000');

                setCampaigns(activeCampaigns);
            } catch (err) {
                console.error("Failed to fetch campaigns:", err);
                setError("Could not fetch campaign list. Is your wallet connected to the Sepolia network?");
            } finally {
                setIsLoading(false);
            }
        };
        fetchCampaigns();
    }, []); // Runs once on component load

    return (
        <div className="groupbuy-landing-page">
            <h1>Active Group Buys</h1>
            {isLoading && <p>Loading active campaigns...</p>}
            {error && <p className="error-message-box">{error}</p>}
            {!isLoading && !error && (
                <div className="product-grid-landing">
                    {campaigns.length > 0 ? (
                        campaigns.map(c => (
                            <Link key={c.id} to={`/InterfaceDemo/groupbuy/${c.id}`}>
                                <ProductCard campaign={c} />
                            </Link>
                        ))
                    ) : (
                        <p>No active group buys found.</p>
                    )}
                </div>
            )}
            <GlobalToolBar/>
        </div>
    );
}