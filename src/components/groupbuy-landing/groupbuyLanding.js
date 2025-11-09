import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from "react-router-dom";
import Web3 from 'web3';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../../contracts/config";
import { GlobalToolBar } from "../../global";
import "../../global.css";
import "./groupbuyLanding.css";

// --- A mapping to define the look of each campaign ID ---
const CAMPAIGN_METADATA = {
    0: {
        name: "SHA-7 Mechanical Keyboard",
        image: "/keyboard.png"
    },
    1: {
        name: "Hydro Flask Water Bottle",
        image: "/water_bottle.png"
    },
    2: {
        name: "Custom Phone Case",
        image: "/phone_case.png"
    },
    // Add more entries here for Campaign #3, #4, etc.
};

const ProductCard = ({ campaign }) => {
    const metadata = CAMPAIGN_METADATA[campaign.id] || {
        name: `[GB] Campaign #${campaign.id}`,
        image: "/placeholder.png"
    };

    let displayStatus = 'Open';
    if (campaign.successful) {
        displayStatus = 'Order Confirmed';
    } else if (Date.now() / 1000 > campaign.deadline && campaign.deadline !== 0) {
        displayStatus = 'Cancelled';
    } else if (campaign.userHasJoined) {
        displayStatus = 'Committed';
    }

    const progressPercent = campaign.goal > 0 ? (campaign.committed / campaign.goal) * 100 : 0;

    return (
        <div className="product-card-landing">
            <div className={`status-badge ${displayStatus.toLowerCase().replace(/\s+/g, '-')}`}>{displayStatus}</div>
            <div className="product-image-landing">
                <img src={process.env.PUBLIC_URL + metadata.image} alt={metadata.name} />
            </div>
            <div className="product-info-landing">
                <h3>{metadata.name}</h3>
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
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const fetchCampaigns = useCallback(async () => {
        if (!window.ethereum) {
            console.log("MetaMask not installed, cannot fetch campaigns.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];

            const web3Instance = new Web3(window.ethereum);
            const contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            const campaignPromises = [];
            const MAX_CAMPAIGNS_TO_FETCH = 10;
            for (let i = 0; i < MAX_CAMPAIGNS_TO_FETCH; i++) {
                campaignPromises.push(contract.methods.campaigns(i).call());
            }
            const results = await Promise.all(campaignPromises);

            const activeCampaignsData = results
                .map((c, index) => ({ ...c, id: index }))
                .filter(c => c.organizer !== '0x0000000000000000000000000000000000000000');

            if (activeCampaignsData.length > 0) {
                const detailedCampaignPromises = activeCampaignsData.map(async (campaign) => {
                    try {
                        const progress = await contract.methods.getProgress(campaign.id).call();
                        const userHasJoined = await contract.methods.hasCommitted(campaign.id, userAddress).call();
                        return {
                            ...campaign,
                            committed: parseInt(progress.committed),
                            goal: parseInt(progress.goal),
                            successful: progress.successful,
                            userHasJoined: userHasJoined,
                            deadline: parseInt(campaign.deadline),
                            unitPrice: campaign.unitPrice
                        };
                    } catch (detailError) {
                        console.warn(`Failed to fetch details for campaign ID ${campaign.id}:`, detailError.message);
                        return { ...campaign, committed: 0, goal: 0, successful: false, userHasJoined: false };
                    }
                });
                const campaignsWithFullDetails = await Promise.all(detailedCampaignPromises);
                setCampaigns(campaignsWithFullDetails);
            } else {
                setCampaigns([]);
            }
        } catch (fullFetchError) {
            console.error("CRITICAL ERROR during fetchCampaigns:", fullFetchError);
            setError(`Failed to fetch campaigns: ${fullFetchError.message}. Please ensure you are on the correct network.`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (props.isConnected) {
            fetchCampaigns();
        } else {
            setCampaigns([]);
            setIsLoading(false);
        }
    }, [props.isConnected, fetchCampaigns]);

    // --- FUNCTION WITH THE FIX ---
    const handleCreateNewCampaign = async () => {
        if (!window.ethereum) { alert("Please install MetaMask."); return; }

        if (!props.isConnected) {
            setError("Please connect your wallet to create a campaign.");
            return;
        }

        // --- THIS IS THE MODIFIED SECTION ---
        const durationInput = window.prompt("Enter campaign duration (in days)");
        if (durationInput === null) {
            console.log("Campaign creation cancelled by user.");
            return;
        }

        // Use parseFloat to allow for decimals

        let durationInDays = parseFloat(durationInput);
        if (isNaN(durationInDays) || durationInDays < 0) {
            alert("Invalid duration. Please enter a positive number or 0.");
            setError("Invalid duration. Please enter a positive number or 0.");
            return;
        }

        // If the user enters 0 for testing, we change it to a tiny non-zero value.
        // 0.0001 days is about 9 seconds. This will pass the contract's "> 0" check.
        // if (durationInDays === 0) {
        //     durationInDays = 0.0001;
        // }
        // --- END OF MODIFIED SECTION ---

        setIsCreating(true);
        setError("");

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];

            if (!userAddress) {
                throw new Error("Could not retrieve wallet address. Please unlock MetaMask and try again.");
            }

            const web3Instance = new Web3(window.ethereum);
            const contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            const nextCampaignIdToCreate = campaigns.length;
            const CAMPAIGN_PRICE_ETH = "0.001";
            const CAMPAIGN_GOAL = 2;
            // The variable now holds our potentially tiny decimal value
            let CAMPAIGN_DURATION_SECONDS;
            if (durationInDays === 0) {
                CAMPAIGN_DURATION_SECONDS = 30;
            } else {
                CAMPAIGN_DURATION_SECONDS = durationInDays * 86400;
            }
            const COMPANY_ADDRESS = userAddress;

            const priceInWei = ethers.utils.parseEther(CAMPAIGN_PRICE_ETH);

            await contract.methods.commit(
                nextCampaignIdToCreate,
                COMPANY_ADDRESS,
                priceInWei.toString(),
                CAMPAIGN_GOAL,
                CAMPAIGN_DURATION_SECONDS // Send the correct value to the contract
            ).send({ from: userAddress, value: priceInWei.toString() });

            // Add a small delay to give the blockchain a moment to sync before re-fetching
            setTimeout(() => {
                fetchCampaigns();
            }, 1000);

        } catch (err) {
            console.error("Failed to create new campaign:", err);
            setError(`Failed to create new campaign: ${err.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const LandingPage = () => (
        <div className="groupbuy-landing-page">
            <div className="landing-header-container">
                <h1>Active Group Buys</h1>
                <div className="create-campaign-section">
                    <button
                        className="commit-button"
                        onClick={handleCreateNewCampaign}
                        disabled={isCreating || !props.isConnected}
                    >
                        {isCreating ? "Creating..." : "Create New Group Buy"}
                    </button>
                    {!props.isConnected && <p className="wallet-prompt">Connect your wallet to start.</p>}
                </div>
            </div>

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
                        <p>There are no active group buys yet. Be the first to start one!</p>
                    </div>
                )
            )}
            <GlobalToolBar/>
        </div>
    );

    return (
        <div>
            {props.isConnected ? <LandingPage /> : <Navigate to='/sha-frontend' />}
        </div>
    );
}