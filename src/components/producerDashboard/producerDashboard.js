import { useState } from 'react';
import Modal from '../modal/modal'; // Assuming the modal is in a shared location
import './producerDashboard.css';

// MOCK DATA: In a real application, this would come from a database or API.
const initialProducts = [
    {
        id: 1,
        name: "[GB] SHA-7 Mechanical Keyboard",
        price: 0.5,
        currentCommits: 3,
        totalRequired: 10,
        imageUrl: "/keyboard.png"
    },
    {
        id: 2,
        name: "Phone Case",
        price: 0.1,
        currentCommits: 25,
        totalRequired: 25,
        imageUrl: "/phone_case.png"
    },
    {
        id: 3,
        name: "Water Bottle",
        price: 0.05,
        currentCommits: 42,
        totalRequired: 100,
        imageUrl: "/water_bottle.png"
    }
];

export default function ProducerDashboard() {
    const [products, setProducts] = useState(initialProducts);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State for the new product form
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newTotalRequired, setNewTotalRequired] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const handleAddProduct = (e) => {
        e.preventDefault();
        const newProduct = {
            id: products.length + 1, // Simple ID generation
            name: newItemName,
            price: parseFloat(newItemPrice),
            currentCommits: 0,
            totalRequired: parseInt(newTotalRequired, 10),
            imageUrl: newImageUrl || "/placeholder.png" // Default image
        };
        
        setProducts(prevProducts => [...prevProducts, newProduct]);
        
        // Reset form and close modal
        setNewItemName('');
        setNewItemPrice('');
        setNewTotalRequired('');
        setNewImageUrl('');
        closeModal();
    };

    return (
        <div className="producer-dashboard">
            <div className="dashboard-header">
                <h1>Producer Dashboard</h1>
                <button className="add-product-btn" onClick={openModal}>+ Add New Group Buy</button>
            </div>

            <div className="product-list">
                {products.map(product => {
                    const progressPercent = (product.currentCommits / product.totalRequired) * 100;
                    const isGoalReached = product.currentCommits >= product.totalRequired;

                    return (
                        <div key={product.id} className="product-card-producer">
                            <div className="product-image-producer">
                                <img src={product.imageUrl} alt={product.name} />
                            </div>
                            <div className="product-info-producer">
                                <h3>{product.name}</h3>
                                <p className="price">{product.price} ETC</p>
                                
                                <div className="status-tracker">
                                    <p>{product.currentCommits} / {product.totalRequired} committed</p>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                </div>
                                
                                <p className={`status ${isGoalReached ? 'status-reached' : 'status-progress'}`}>
                                    {isGoalReached ? '✓ Goal Reached' : 'In Progress'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <Modal onClose={closeModal}>
                    <h2>Add New Group Buy</h2>
                    <form onSubmit={handleAddProduct} className="add-product-form">
                        <label>
                            Product Name
                            <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required />
                        </label>
                        <label>
                            Price (ETC)
                            <input type="number" step="0.01" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} required />
                        </label>
                        <label>
                            Total Units Required
                            <input type="number" value={newTotalRequired} onChange={(e) => setNewTotalRequired(e.target.value)} required />
                        </label>
                        <label>
                            Image URL
                            <input type="text" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="e.g., /product.png" />
                        </label>
                        <button type="submit">Create Group Buy</button>
                    </form>
                </Modal>
            )}
        </div>
    );
}