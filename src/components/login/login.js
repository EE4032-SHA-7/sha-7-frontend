import './login.css';
import '../../global.css';
import logo from '../../images/logo.svg';

export default function Login(props){

    const NoMetamask = () => {
        return (
            <div>
                <p>
                    No MetaMask detected.
                    <br></br>
                    Please install&nbsp;
                    <span className = "login-highlight">
                        METAMASK
                    </span>
                    &nbsp;to your browser to proceed.
                </p>
            </div>
        )
    }

    const LoginMetamask = () => {
        return (
            <div>
                <p>
                    Please log in with&nbsp;
                    <span className = "login-highlight">
                        METAMASK
                    </span>
                    &nbsp;to proceed.
                </p>
                <button className = "global-link" onClick = {props.connectTo}>
                    Click here to connect
                </button>
            </div>
        )
    }

    return (
        <div className = "login">
            <img src = {logo} className = "login-logo" alt = "logo" />
            <h2>
                25-26 Sem 1 EE4032 <br/>
                SHA-7 Group Buy Project
                <br/>
            </h2>
            {
                props.isHaveMetamask ?
                    <LoginMetamask /> :
                    <NoMetamask />
            }
        </div>
    )
}