// ROLA ACCESSORIES - Product Catalog
// All prices under $10 USDC for testing

export interface Product {
    id: string;
    name: string;
    category: 'shoes' | 'clothing';
    price: number;
    image: string;
    description: string;
}

export const products: Product[] = [
    // Shoes (6 items)
    {
        id: 'shoe_winter_boots',
        name: 'Winter Boots',
        category: 'shoes',
        price: 9.99,
        image: '/products/winter-boots.jpg',
        description: 'Warm and stylish winter boots perfect for the holiday season',
    },
    {
        id: 'shoe_holiday_sneakers',
        name: 'Holiday Sneakers',
        category: 'shoes',
        price: 7.99,
        image: '/products/holiday-sneakers.jpg',
        description: 'Festive sneakers with subtle Christmas patterns',
    },
    {
        id: 'shoe_dress_shoes',
        name: 'Leather Dress Shoes',
        category: 'shoes',
        price: 9.49,
        image: '/products/dress-shoes.jpg',
        description: 'Classic leather shoes for holiday parties',
    },
    {
        id: 'shoe_snow_boots',
        name: 'Snow Ankle Boots',
        category: 'shoes',
        price: 8.99,
        image: '/products/snow-boots.jpg',
        description: 'Waterproof ankle boots for snowy days',
    },
    {
        id: 'shoe_slippers',
        name: 'Christmas Slippers',
        category: 'shoes',
        price: 3.99,
        image: '/products/slippers.jpg',
        description: 'Cozy slippers with festive designs',
    },
    {
        id: 'shoe_party_heels',
        name: 'Party Heels',
        category: 'shoes',
        price: 9.99,
        image: '/products/party-heels.jpg',
        description: 'Elegant heels for New Year celebrations',
    },

    // Clothing (6 items)
    {
        id: 'clothing_sweater',
        name: 'Cozy Sweater',
        category: 'clothing',
        price: 5.99,
        image: '/products/sweater.jpg',
        description: 'Warm knit sweater perfect for winter',
    },
    {
        id: 'clothing_jacket',
        name: 'Winter Jacket',
        category: 'clothing',
        price: 9.99,
        image: '/products/jacket.jpg',
        description: 'Insulated jacket for cold weather',
    },
    {
        id: 'clothing_dress',
        name: 'Holiday Dress',
        category: 'clothing',
        price: 8.49,
        image: '/products/holiday-dress.jpg',
        description: 'Elegant dress for holiday gatherings',
    },
    {
        id: 'clothing_scarf',
        name: 'Festive Scarf',
        category: 'clothing',
        price: 2.99,
        image: '/products/scarf.jpg',
        description: 'Soft scarf with holiday colors',
    },
    {
        id: 'clothing_beanie',
        name: 'Wool Beanie',
        category: 'clothing',
        price: 2.49,
        image: '/products/beanie.jpg',
        description: 'Warm beanie to keep you cozy',
    },
    {
        id: 'clothing_cardigan',
        name: 'Christmas Cardigan',
        category: 'clothing',
        price: 6.99,
        image: '/products/cardigan.jpg',
        description: 'Festive cardigan with button details',
    },
];
