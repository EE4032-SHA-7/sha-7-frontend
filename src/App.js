import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from "react-router-dom";
import Web3 from "web3";

import './App.css';
import History from "./components/history/history";
import Leader from "./components/leader/leader";
import Login from "./components/login/login";
import ProducerDashboard from './components/producerDashboard/producerDashboard';
import Profile from "./components/profile/profile";
import Storage from "./components/storage/storage";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contracts/config";
import { CONTRACT_ABI_2, CONTRACT_ADDRESS_2 } from "./contracts/config_2";
import GroupBuyLanding from "./components/groupbuy-landing/groupbuyLanding";
import GroupBuy from "./components/groupbuy/GroupBuy";

export default function App() {
    // --- All of your existing state remains the same ---
    const [haveMetamask, setHaveMetamask] = useState(true);
    const [address, setAddress] = useState(null);
    const [network, setNetwork] = useState(null);
    const [balance, setBalance] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [contract, setContract] = useState(null);
    const [contract2, setContract2] = useState(null);
    // ... (other state variables)
    const [storedPending, setStoredPending] = useState(false);
    const [storedDone, setStoredDone] = useState(false);
    const [showVal, setShowVal] = useState(0);
    const [historyRecord, setHistoryRecord] = useState([]);
    const [recordLen, setRecordLen] = useState(0);
    const maxRecordLen = 50;
    const [commitPending, setCommitPending] = useState(false);
    const [commitDone, setCommitDone] = useState(false);
    const [revealPending, setRevealPending] = useState(false);
    const [revealAccepted, setRevealAccepted] = useState(false);
    const [resetDone, setResetDone] = useState(false);
    const [showLead, setShowLead] = useState("0x0000000000000000000000000000000000000000");
    const [electionOn, setElectionOn] = useState(false);
    const [revealOn, setRevealOn] = useState(false);
    const [elected, setElected] = useState(false);
    const navigate = useNavigate();

    // --- NEW: State for the GroupBuy components, managed here in App.js ---
    const [campaigns, setCampaigns] = useState([]); // For the landing page
    const [campaignData, setCampaignData] = useState(null); // For the detail page
    const [userHasCommitted, setUserHasCommitted] = useState(false);
    const [gb_status, setGb_status] = useState("Loading...");
    const [gb_isLoading, setGb_isLoading] = useState(true);
    const [gb_isCommitting, setGb_isCommitting] = useState(false);
    const [gb_errorMessage, setGb_errorMessage] = useState("");

    // --- All existing functions (connectWallet, storeData, etc.) remain the same ---
    useEffect(() => { /* ... */ }, []);
    const connectWallet = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) { setHaveMetamask(false); return; }
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            const web3Instance = new Web3(window.ethereum);
            const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            setContract(contractInstance);
            const contract2Instance = new web3Instance.eth.Contract(CONTRACT_ABI_2, CONTRACT_ADDRESS_2);
            setContract2(contract2Instance);
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            let balanceVal = await web3Provider.getBalance(accounts[0]);
            let bal = ethers.utils.formatEther(balanceVal);
            if (chainId === '0x3') setNetwork('Ropsten Test Network');
            else if (chainId === '0x5') setNetwork('Goerli Test Network');
            else if (chainId === '0xaa36a7') setNetwork('Sepolia Test Network');
            else setNetwork('Other Test Network');
            setAddress(accounts[0]);
            setBalance(bal);
            setIsConnected(true);

            // --- FIXED: Navigate to Profile page after connecting ---
            navigate("/InterfaceDemo/profile");

        } catch (error) {
            console.error("Error connecting wallet:", error);
            setIsConnected(false);
        }
    }
    // ... (all your other functions like storeData, RecordPush, etc.)
    const storeData = async (inputVal) => { if (!contract) return; return await contract.methods.set(inputVal).send({ from: address }); }
    const getData = async () => { if (!contract) return; return await contract.methods.get().call(); }
    const RecordOverFlow = () => { /* ... */ }
    const RecordPush = (opr, val, detail) => { /* ... */ }
    const commitValUpdate = async () => { /* ... */ }
    const revealVal = async () => { /* ... */ }
    const resetHandle = async () => { /* ... */ }
    useEffect(() => { /* ... */ }, [contract2]);
    const getLeader = async () => { if (!contract2) return "0x0"; return await contract2.methods.get_leader().call(); }
    const storedValUpdate = async () => { /* ... */ }
    const showValUpdate = async () => { /* ... */ }
    const showLeaderUpdate = async () => { /* ... */ }

    // --- NEW: Functions for the GroupBuy components, managed here in App.js ---
    const fetchCampaigns = async () => {
        if (!contract) return;
        setGb_isLoading(true);
        try {
            const campaignPromises = [];
            // We assume a max of 10 campaigns for this example
            for (let i = 0; i < 10; i++) {
                campaignPromises.push(contract.methods.campaigns(i).call());
            }
            const results = await Promise.all(campaignPromises);
            const activeCampaigns = results
                .map((c, index) => ({ ...c, id: index }))
                .filter(c => c.organizer !== '0x0000000000000000000000000000000000000000');
            setCampaigns(activeCampaigns);
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
            setGb_errorMessage("Could not fetch campaign list.");
        } finally {
            setGb_isLoading(false);
        }
    };

    // This function fetches data for a SINGLE campaign ID
    const fetchCampaignData = async (id) => {
        if (!contract || !address) return;
        setGb_isLoading(true);
        setGb_errorMessage(""); // Clear errors on new fetch
        try {
            const progress = await contract.methods.getProgress(id).call();
            // Assuming this is Campaign ID 0 that needs auto-creation
            if (id === "0" && progress.organizer === '0x0000000000000000000000000000000000000000') {
                setGb_status("Not Created (Auto-creating)");
                const CAMPAIGN_PRICE_ETH = "0.5"; // Hardcode for ID 0
                const CAMPAIGN_GOAL = 10;
                const CAMPAIGN_DURATION_DAYS = 30;
                const COMPANY_ADDRESS = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"; // Replace with your real address

                const priceInWei = ethers.utils.parseEther(CAMPAIGN_PRICE_ETH);
                await contract.methods.commit(
                    id, COMPANY_ADDRESS, priceInWei.toString(), CAMPAIGN_GOAL, CAMPAIGN_DURATION_DAYS
                ).send({ from: address, value: priceInWei.toString() });

                // After creation, re-fetch the data for ID 0
                await fetchCampaignData(id);
                return;
            }

            // Normal fetch if campaign exists or is not ID 0
            const hasCommitted = await contract.methods.hasCommitted(id, address).call();
            const fullCampaign = await contract.methods.campaigns(id).call();
            const data = { committed: parseInt(progress.committed), goal: parseInt(progress.goal), successful: progress.successful, deadline: parseInt(progress.deadline), unitPrice: fullCampaign.unitPrice };
            setCampaignData(data);
            setUserHasCommitted(hasCommitted);
            if (data.successful) setGb_status('Successful');
            else if (Date.now() / 1000 > data.deadline) setGb_status('Failed');
            else setGb_status('Open');
        } catch (error) {
            console.error("Error fetching campaign data:", error);
            setGb_status("Error");
            setGb_errorMessage(error.message);
        } finally {
            setGb_isLoading(false);
        }
    };

    const handleCommitClick = async (id, unitPrice) => {
        if (!contract || !address || !campaignData) return;
        setGb_isCommitting(true);
        setGb_errorMessage("");
        try {
            await contract.methods.commit(id).send({ from: address, value: unitPrice });
            fetchCampaignData(id); // Refresh data on success
        } catch (error) {
            console.error("Commit failed:", error);
            setGb_errorMessage(error.message);
        } finally {
            setGb_isCommitting(false);
        }
    };

    // --- Display Functions ---
    const ProfileDisplay = () => ( <Profile isConnected={isConnected} address={address} networkType={network} balance={balance} /> );
    const StorageDisplay = () => ( <Storage isConnected={isConnected} storeValHandle={storedValUpdate} showValHandle={showValUpdate} showVal={showVal} storedPending={storedPending} storedDone={storedDone} /> );
    const HistoryDisplay = () => ( <History isConnected={isConnected} recordList={historyRecord} recordLen={recordLen} /> );
    const LeaderDisplay = () => ( <Leader isConnected={isConnected} commitValHandle={commitValUpdate} showLeader={showLead} commitDone={commitDone} commitPending={commitPending} revealVal={revealVal} revealPending={revealPending} revealAccepted={revealAccepted} showLeaderHandle={showLeaderUpdate} resetHandle={resetHandle} resetDone={resetDone} electionOn={electionOn} revealOn={revealOn} elected={elected} /> );

    const GroupBuyLandingDisplay = () => (
        <GroupBuyLanding
            isConnected={isConnected}
            campaigns={campaigns}
            fetchCampaigns={fetchCampaigns}
            isLoading={gb_isLoading}
        />
    );

    const GroupBuyDisplay = () => (
        <GroupBuy
            isConnected={isConnected}
            campaignData={campaignData}
            userHasCommitted={userHasCommitted}
            status={gb_status}
            isLoading={gb_isLoading}
            isCommitting={gb_isCommitting}
            errorMessage={gb_errorMessage}
            fetchData={fetchCampaignData} // Function to fetch data for specific ID
            commit={handleCommitClick} // Function to commit to specific ID
        />
    );

    return (
        <div className="App">
            <Routes>
                <Route path="/sha-7-frontend" element={<Login isHaveMetamask={haveMetamask} connectTo={connectWallet} />}></Route>
                <Route path="/InterfaceDemo/profile" element={<ProfileDisplay />}></Route>
                <Route path="/InterfaceDemo/storage" element={<StorageDisplay />}></Route>
                <Route path="/InterfaceDemo/history" element={<HistoryDisplay />}></Route>
                <Route path="/InterfaceDemo/leader" element={<LeaderDisplay />}></Route>

                <Route path="/InterfaceDemo/groupbuy-landing" element={<GroupBuyLandingDisplay />}></Route>
                <Route path="/InterfaceDemo/groupbuy/:id" element={<GroupBuy />}></Route>

                <Route path="/InterfaceDemo/producer-dashboard" element={<ProducerDashboard />}></Route>
                <Route path="*" element={<Login isHaveMetamask={haveMetamask} connectTo={connectWallet} />} />
            </Routes>
        </div>
    );
}