import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { Route, Routes, useNavigate } from "react-router-dom";
import Web3 from "web3";

import './App.css';
import GroupBuy from "./components/groupbuy/GroupBuy";
import History from "./components/history/history";
import Leader from "./components/leader/leader";
import Login from "./components/login/login";
import Profile from "./components/profile/profile";
import Storage from "./components/storage/storage";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contracts/config";
import { CONTRACT_ABI_2, CONTRACT_ADDRESS_2 } from "./contracts/config_2";


export default function App() {
    // State for MetaMask and connection details
    const [haveMetamask, setHaveMetamask] = useState(true);
    const [address, setAddress] = useState(null);
    const [network, setNetwork] = useState(null);
    const [balance, setBalance] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    // State for Web3 provider and contracts (initialized after connection)
    const [provider, setProvider] = useState(null);
    const [contract, setContract] = useState(null);
    const [contract2, setContract2] = useState(null);

    // State for Storage contract
    const [storedPending, setStoredPending] = useState(false);
    const [storedDone, setStoredDone] = useState(false);
    const [storedVal, setStoredVal] = useState(0);
    const [showVal, setShowVal] = useState(0);

    // State for History
    const [historyRecord, setHistoryRecord] = useState([]);
    const [recordLen, setRecordLen] = useState(0);
    const maxRecordLen = 50;

    // State for Leader Election contract
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

    // Check for MetaMask on component mount
    useEffect(() => {
        const checkMetamaskAvailability = () => {
            if (!window.ethereum) {
                setHaveMetamask(false);
            }
        };
        checkMetamaskAvailability();
    }, []);

    // connect to MetaMask.
    const connectWallet = async () => {
        try {
            const { ethereum } = window;
            if (!ethereum) {
                setHaveMetamask(false);
                return;
            }

            // **FIX**: Initialize provider and contracts here, after confirming ethereum exists.
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(web3Provider);

            const web3Instance = new Web3(window.ethereum);
            const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            setContract(contractInstance);

            const contract2Instance = new web3Instance.eth.Contract(CONTRACT_ABI_2, CONTRACT_ADDRESS_2);
            setContract2(contract2Instance);


            const accounts = await ethereum.request({
                method: 'eth_requestAccounts',
            });
            const chainId = await ethereum.request({
                method: 'eth_chainId',
            });

            let balanceVal = await web3Provider.getBalance(accounts[0]);
            let bal = ethers.utils.formatEther(balanceVal);

            if (chainId === '0x3') {
                setNetwork('Ropsten Test Network');
            } else if (chainId === '0x5') {
                setNetwork('Goerli Test Network');
            } else if (chainId === '0xaa36a7') {
                setNetwork('Sepolia Test Network');
            } else {
                setNetwork('Other Test Network');
            }

            setAddress(accounts[0]);
            setBalance(bal);
            setIsConnected(true);

            navigate("/InterfaceDemo/profile");
        } catch (error) {
            console.error("Error connecting wallet:", error);
            setIsConnected(false);
        }
    }


    // Contract Deployment.
    const storeData = async (inputVal) => {
        // Guard clause: ensure contract is initialized
        if (!contract) {
            console.error("Contract not initialized.");
            return;
        }
        const res = await contract.methods.set(inputVal).send({ from: address });
        return res;
    }

    const getData = async () => {
        if (!contract) {
            console.error("Contract not initialized.");
            return;
        }
        const res = await contract.methods.get().call();
        return res;
    }


    // history recording.
    const RecordOverFlow = () => {
        if (recordLen > maxRecordLen) {
            let outlierNum = recordLen - maxRecordLen;
            setHistoryRecord(current => current.slice(outlierNum));
            setRecordLen(maxRecordLen);
        }
    }

    const RecordPush = (opr, val, detail) => {
        let stat = 1;
        let cost = 0;
        if (val.length === 0) {
            val = 'NA';
            cost = 'NA';
            stat = 0;
        } else {
            if (opr === 'get') {
                cost = 0;
                stat = 1;
            } else {
                if (detail === 'null') {
                    setStoredPending(false);
                    setStoredDone(true);
                    console.log('Rejected');
                    cost = 'NA';
                    stat = 2;
                } else {
                    setStoredDone(true);
                    console.log('Done');
                    console.log(detail); // show the details of transaction.
                    cost = detail.gasUsed;
                    stat = 1;
                }
            }
        }

        const newRecord = {
            id: recordLen + 1,
            address: address,
            operation: opr,
            value: val,
            cost: cost,
            status: stat
        };

        setHistoryRecord(current => [...current, newRecord]);
        setRecordLen(prevLen => prevLen + 1);

        // This check can be simplified or moved into a useEffect
        if (recordLen + 1 > maxRecordLen) {
            RecordOverFlow();
        }
    }

    // Leader election
    const commitValUpdate = async () => {
        if (!contract2) return;

        const commitVal = document.getElementById("CommitVal").value;
        setCommitPending(true);
        setCommitDone(false);
        setResetDone(false);

        if (commitVal.length !== 0) {
            setElectionOn(true);
            const [bit, key] = commitVal.split(",").map(Number);
            try {
                await contract2.methods.Commit(bit, key).send({ from: address });
                setCommitDone(true);
            } catch (err) {
                setCommitDone(false);
                console.error('Error on Commit:', err);
            }
        } else {
            console.log('No entry for commit value');
        }
        setCommitPending(false);
    }

    const revealVal = async () => {
        if (!contract2) return;

        const revealVal = document.getElementById('RevealVal').value;
        setRevealAccepted(false);
        setRevealPending(true);

        if (revealVal.length !== 0) {
            let [bit, key] = revealVal.split(",").map(Number);
            try {
                await contract2.methods.Reveal(bit, key).send({ from: address });
                setRevealAccepted(true);
            } catch (err) {
                setRevealAccepted(false);
                console.error('Error on Reveal:', err);
            }
        } else {
            console.log('No entry for reveal value');
        }
        setRevealPending(false)
    }

    const resetHandle = async () => {
        if (!contract2) return;
        try {
            await contract2.methods.election_reset().send({ from: address });
            setElectionOn(false)
            setRevealOn(false)
            setElected(false)
        } catch (err) {
            console.error("Error resetting election:", err);
        }
    }
    
    // **FIX**: useEffect hooks for events now depend on the contract2 instance
    useEffect(() => {
        if (!contract2) return;
        
        const leaderElectedListener = contract2.events.leader_elected().on("data", () => setElected(true));
        const revealOnListener = contract2.events.reveal_on().on("data", () => setRevealOn(true));
        const resetDoneListener = contract2.events.reset_done().on("data", () => {
            setResetDone(true);
            setElectionOn(false);
            setRevealOn(false);
            setElected(false);
        });

        return () => {
            // Clean up listeners when component unmounts or contract2 changes
            leaderElectedListener.removeAllListeners();
            revealOnListener.removeAllListeners();
            resetDoneListener.removeAllListeners();
        };
    }, [contract2]);

    const getLeader = async () => {
        if (!contract2) return "0x0";
        let res = await contract2.methods.get_leader().call();
        return res;
    }

    // store and get value.
    const storedValUpdate = async () => {
        const inputVal = document.getElementById('inputVal').value;
        setStoredPending(false);
        setStoredDone(false);

        if (inputVal.length === 0) {
            RecordPush('store', inputVal, 'null');
        } else {
            setStoredPending(true);
            setStoredVal(inputVal);

            try {
                const detail = await storeData(inputVal);
                RecordPush('store', inputVal, detail);
            } catch (err) {
                console.error("Error storing value:", err);
                RecordPush('store', inputVal, 'null');
            }
        }
    }

    const showValUpdate = async () => {
        const ans = await getData();
        setStoredPending(false);
        setStoredDone(false);
        setShowVal(ans);
        RecordPush('get', ans, null); // Pass null for detail in 'get' operations
    }

    const showLeaderUpdate = async () => {
        let ans = await getLeader();
        setShowLead(ans);
    }


    // display functions.
    const ProfileDisplay = () => (
        <Profile
            isConnected={isConnected}
            address={address}
            networkType={network}
            balance={balance}
        />
    )

    const StorageDisplay = () => (
        <Storage
            isConnected={isConnected}
            storeValHandle={storedValUpdate}
            showValHandle={showValUpdate}
            showVal={showVal}
            storedPending={storedPending}
            storedDone={storedDone}
        />
    )

    const HistoryDisplay = () => (
        <History
            isConnected={isConnected}
            recordList={historyRecord}
            recordLen={recordLen}
        />
    )

    const LeaderDisplay = () => (
        <Leader
            isConnected={isConnected}
            commitValHandle={commitValUpdate}
            showLeader={showLead}
            commitDone={commitDone}
            commitPending={commitPending}
            revealVal={revealVal}
            revealPending={revealPending}
            revealAccepted={revealAccepted}
            showLeaderHandle={showLeaderUpdate}
            resetHandle={resetHandle}
            resetDone={resetDone}
            electionOn={electionOn}
            revealOn={revealOn}
            elected={elected}
        />
    )


    return (
        <div className="App">
            <Routes>
                <Route path="/sha-7-frontend" element={<Login isHaveMetamask={haveMetamask} connectTo={connectWallet} />}></Route>
                <Route path="/InterfaceDemo/profile" element={<ProfileDisplay />}></Route>
                <Route path="/InterfaceDemo/storage" element={<StorageDisplay />}></Route>
                <Route path="/InterfaceDemo/history" element={<HistoryDisplay />}></Route>
                <Route path="/InterfaceDemo/leader" element={<LeaderDisplay />}></Route>
                <Route path="/InterfaceDemo/groupbuy" element={<GroupBuy />}></Route>
                {/* A default route to redirect to login if no other route matches */}
                <Route path="*" element={<Login isHaveMetamask={haveMetamask} connectTo={connectWallet} />} />
            </Routes>
        </div>
    );
}