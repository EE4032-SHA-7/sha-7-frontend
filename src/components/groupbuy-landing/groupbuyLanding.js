import React from 'react';
import { Link } from 'react-router-dom';
import './groupbuyLanding.css';

// MOCK DATA: Now includes a 'status' for each item.
const availableGroupBuys = [
    {
        id: 1,
        name: "[GB] SHA-7 Mechanical Keyboard",
        price: 0.5,
        currentCommits: 3,
        totalRequired: 10,
        imageUrl: process.env.PUBLIC_URL + "/keyboard.png",
        isClickable: true,
        path: "/InterfaceDemo/groupbuy",
        status: "Open" // User can still join this.
    },
    {
        id: 2,
        name: "Phone Case",
        price: 0.1,
        currentCommits: 25,
        totalRequired: 25,
        imageUrl: process.env.PUBLIC_URL + "/phone_case.png",
        isClickable: true,
        status: "Committed" // User has already joined this one.
    },
    {
        id: 3,
        name: "Water Bottle",
        price: 0.05,
        currentCommits: 100,
        totalRequired: 100,
        imageUrl: process.env.PUBLIC_URL + "/water_bottle.png",
        isClickable: true,
        status: "Order Confirmed" // Goal reached, now in production.
    },
];

/**
 * A reusable card component to display product information, now with a status badge.
 */
const ProductCard = ({ product }) => {
    const progressPercent = (product.currentCommits / product.totalRequired) * 100;
    const isGoalReached = product.currentCommits >= product.totalRequired;

    // Helper function to get the right CSS class for each status
    const getStatusClass = (status) => {
        return status.toLowerCase().replace(' ', '-'); // e.g., "Order Confirmed" -> "order-confirmed"
    };

    return (
        <div className={`product-card-landing ${!product.isClickable ? 'disabled' : ''}`}>
            {/* Status Badge */}
            <div className={`status-badge ${getStatusClass(product.status)}`}>
                {product.status}
            </div>

            <div className="product-image-landing">
                <img src={product.imageUrl} alt={product.name} />
            </div>
            <div className="product-info-landing">
                <h3>{product.name}</h3>
                <p className="price-landing">{product.price} ETC</p>

                <div className="status-tracker-landing">
                    <p>{product.currentCommits} / {product.totalRequired} committed</p>
                    <div className="progress-bar-landing">
                        <div className="progress-fill-landing" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>

                <p className={`goal-status-landing ${isGoalReached ? 'status-reached' : 'status-progress'}`}>
                    {isGoalReached ? '✓ Goal Reached' : 'In Progress'}
                </p>
            </div>
        </div>
    );
};

/**
 * The main landing page component that displays a grid of products.
 */
export default function GroupBuyLanding() {
    return (
        <div className="groupbuy-landing-page">
            <header className="landing-header">
                <h1>Active Group Buys</h1>
                <p>Join others to bring these products to life. Click on an item to participate!</p>
            </header>

            <div className="product-grid-landing">
                {availableGroupBuys.map(product => (
                    product.isClickable ? (
                        <Link to={product.path} key={product.id} className="product-link">
                            <ProductCard product={product} />
                        </Link>
                    ) : (
                        <div key={product.id}> {/* Wrap non-link in a div for a consistent structure */}
                            <ProductCard product={product} />
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}