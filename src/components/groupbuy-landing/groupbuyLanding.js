import React from 'react';
import { Link } from 'react-router-dom'; // You'll need react-router-dom for navigation
import './groupbuyLanding.css';

// MOCK DATA: Represents the items available for group buy.
const availableGroupBuys = [
    {
        id: 1,
        name: "[GB] SHA-7 Mechanical Keyboard",
        price: 0.5,
        currentCommits: 3,
        totalRequired: 10,
        imageUrl: process.env.PUBLIC_URL + "/keyboard.png",
        isClickable: true, // This item will be a real link
        path: "/InterfaceDemo/groupbuy" // A descriptive path for this item
    },
    {
        id: 2,
        name: "Phone Case",
        price: 0.1,
        currentCommits: 25,
        totalRequired: 25,
        imageUrl: process.env.PUBLIC_URL + "/phone_case.png",
        isClickable: true
    },
    {
        id: 3,
        name: "Water Bottle",
        price: 0.05,
        currentCommits: 42,
        totalRequired: 100,
        imageUrl: process.env.PUBLIC_URL + "/water_bottle.png",
        isClickable: true
    }
];

/**
 * A reusable card component to display product information.
 */
const ProductCard = ({ product }) => {
    const progressPercent = (product.currentCommits / product.totalRequired) * 100;
    const isGoalReached = product.currentCommits >= product.totalRequired;

    return (
        <div className={`product-card-landing ${!product.isClickable ? 'disabled' : ''}`}>
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

                <p className={`status-landing ${isGoalReached ? 'status-reached' : 'status-progress'}`}>
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
                    // If the item is clickable, wrap it in a Link from react-router-dom
                    product.isClickable ? (
                        <Link to={product.path} key={product.id} className="product-link">
                            <ProductCard product={product} />
                        </Link>
                    ) : (
                        // Otherwise, render the card directly (it will be styled as disabled)
                        <ProductCard key={product.id} product={product} />
                    )
                ))}
            </div>
        </div>
    );
}