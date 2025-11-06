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
        name: "[GB] SHA-7 Mechanical Keyboard",
        image: "/keyboard.png"
    },
    1: {
        name: "[GB] Hydro Flask Water Bottle",
        image: "/water_bottle.png" 
    },
    2: {
        name: "[GB] Custom Phone Case",
        image: "/phone_case.png"
    },
    // Add more entries here for Campaign #3, #4, etc.
    // Ensure you have placeholder images in your public folder for these paths
    // Example:
    // 3: { name: "[GB] Smart Home Hub", image: "/smart_hub.png" },
    // 4: { name: "[GB] Ergonomic Mouse", image: "/ergonomic_mouse.png" }
};

const ProductCard = ({ campaign }) => {
    // Determine campaign metadata or use a generic one if not found
    const metadata = CAMPAIGN_METADATA[campaign.id] || { 
        name: `[GB] Campaign #${campaign.id}`, 
        image: "/placeholder.png" // Ensure you have a generic placeholder.png in your public folder
    };

    let displayStatus = 'Open';
    if (campaign.successful) {
        displayStatus = 'Successful'; // Final states have highest priority
    } else if (Date.now() / 1000 > campaign.deadline && campaign.deadline !== 0) {
        displayStatus = 'Failed';
    } else if (campaign.userHasJoined) {
        // If it's still open, check the personal status
        displayStatus = 'Committed';
    }
    
    const progressPercent = campaign.goal > 0 ? (campaign.committed / campaign.goal) * 100 : 0;

    return (
        <div className="product-card-landing">
            <div className={`status-badge ${displayStatus.toLowerCase()}`}>{displayStatus}</div>
            <div className="product-image-landing">
                {/* Use the image from metadata or placeholder */}
                <img src={process.env.PUBLIC_URL + metadata.image} alt={metadata.name} />
            </div>
            <div className="product-info-landing">
                {/* Use the name from metadata or generic */}
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
    const [isCreating, setIsCreating] = useState(false); // Reinstated as state
    const [error, setError] = useState("");

    // --- Core function to fetch all campaign data from the blockchain ---
    const fetchCampaigns = useCallback(async () => {
        // --- Reverted to your stable version's logic for getting userAddress ---
        if (!window.ethereum) { 
            console.log("MetaMask not installed, cannot fetch campaigns.");
            setIsLoading(false);
            return; 
        }
        
        setIsLoading(true);
        setError(""); // Clear any previous errors

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0]; // Get user address inside the function
            
            const web3Instance = new Web3(window.ethereum);
            const contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

            // --- 1. Fetch the public data for all campaigns ---
            // Using a fixed loop (0 to 9) as in your stable version
            const campaignPromises = [];
            const MAX_CAMPAIGNS_TO_FETCH = 10; // Or dynamically get from contract if available
            for (let i = 0; i < MAX_CAMPAIGNS_TO_FETCH; i++) {
                campaignPromises.push(contract.methods.campaigns(i).call());
            }
            const results = await Promise.all(campaignPromises);

            const activeCampaignsData = results
                .map((c, index) => ({ ...c, id: index }))
                .filter(c => c.organizer !== '0x0000000000000000000000000000000000000000');
            
            // --- 2. For each active campaign, fetch progress and the user's personal commitment status ---
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
                        return { ...campaign, committed: 0, goal: 0, successful: false, userHasJoined: false }; // Return a fallback
                    }
                });
                const campaignsWithFullDetails = await Promise.all(detailedCampaignPromises);
                setCampaigns(campaignsWithFullDetails);
            } else {
                setCampaigns([]); // No active campaigns found
            }
        } catch (fullFetchError) {
            // Catch any critical errors during the overall fetch process
            console.error("CRITICAL ERROR during fetchCampaigns:", fullFetchError);
            setError(`Failed to fetch campaigns: ${fullFetchError.message}. Please ensure you are on the correct network (e.g., Sepolia).`);
        } finally {
            setIsLoading(false); // Always clear loading state
        }
    }, []); // Removed props.address from dependencies because userAddress is fetched internally

    // --- useEffect to trigger campaign fetching on initial load and connection status ---
    useEffect(() => {
        // This useEffect now primarily depends on props.isConnected
        if (props.isConnected) {
            fetchCampaigns();
        } else {
            // If not connected, clear campaigns and loading state
            setCampaigns([]);
            setIsLoading(false);
        }
    }, [props.isConnected, fetchCampaigns]); // fetchCampaigns is stable, props.isConnected changes

    // --- Function to handle creating a new campaign ---
    // This assumes your contract's 'commit' function is designed to *create* a new campaign
    // if the 'id' provided does not yet exist, and it takes these specific parameters.
    const handleCreateNewCampaign = async () => {
        if (!window.ethereum) { alert("Please install MetaMask."); return; }
        // Ensure wallet is connected for creating campaign
        if (!props.isConnected || !props.address) { 
            setError("Please connect your wallet to create a campaign."); 
            return; 
        }
        
        setIsCreating(true);
        setError(""); // Clear previous errors

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0]; // Get user address for sending the transaction
            
            const web3Instance = new Web3(window.ethereum);
            const contract = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            
            // Determine the next campaign ID.
            // Based on your stable version's loop of 0-9, we'll try to create the next available.
            // For robust creation, using `campaigns.length` is reasonable here.
            const nextCampaignIdToCreate = campaigns.length; 

            const CAMPAIGN_PRICE_ETH = "0.001";
            const CAMPAIGN_GOAL = 10;
            const CAMPAIGN_DURATION_DAYS = 30; // 30 days
            const COMPANY_ADDRESS = userAddress; // The creator is the organizer

            const priceInWei = ethers.utils.parseEther(CAMPAIGN_PRICE_ETH);

            // Call the contract method to create/commit
            await contract.methods.commit(
                nextCampaignIdToCreate,
                COMPANY_ADDRESS,
                priceInWei.toString(),
                CAMPAIGN_GOAL,
                CAMPAIGN_DURATION_DAYS
            ).send({ from: userAddress, value: priceInWei.toString() }); // Include value if the first commit also pays the unit price

            await fetchCampaigns(); // Re-fetch campaigns to update the list
        } catch (err) {
            console.error("Failed to create new campaign:", err);
            setError(`Failed to create new campaign: ${err.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const LandingPage = () => (
        <div className="groupbuy-landing-page">
            <h1>Active Group Buys</h1>
            <div className="create-campaign-section">
                <button 
                    className="commit-button" 
                    onClick={handleCreateNewCampaign}
                    disabled={isCreating || !props.isConnected} // Disable if not connected or already creating
                >
                    {isCreating ? "Creating..." : "Create New Group Buy"}
                </button>
                {!props.isConnected && <p className="wallet-prompt">Connect your wallet to create a new group buy.</p>}
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
                        <p>There are no active group buys. Be the first to start one!</p>
                        {props.isConnected && <p>Click "Create New Group Buy" above to begin!</p>}
                    </div>
                )
            )}
            <GlobalToolBar/>
        </div>
    );

    return (
        <div>
            {/* If not connected, navigate to the connection page, otherwise show the landing page */}
            {props.isConnected ? <LandingPage /> : <Navigate to='/sha-frontend' />}
        </div>
    );
}