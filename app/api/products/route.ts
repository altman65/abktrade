import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Initialisation de l'API WooCommerce
// Ajout de logs pour le débogage des variables d'environnement
console.log('DEBUG (products list API): NEXT_PUBLIC_WORDPRESS_SITE_URL:', process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL);
console.log('DEBUG (products list API): WOOCOMMERCE_CONSUMER_KEY (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_KEY || '').substring(0, 5));
console.log('DEBUG (products list API): WOOCOMMERCE_CONSUMER_SECRET (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_SECRET || '').substring(0, 5));

const api = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL || '', // Assurez-vous que cette variable est définie dans .env.local
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '', // Assurez-vous que cette variable est définie dans .env.local
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '', // Assurez-vous que cette variable est définie dans .env.local
    version: 'wc/v3',
    queryStringAuth: true,
});

// Fonction GET pour récupérer la liste des produits
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') || '1';
        const per_page = searchParams.get('per_page') || '10';
        const orderby = searchParams.get('orderby') || 'id';
        const order = searchParams.get('order') || 'asc';
        const search = searchParams.get('search') || '';

        const params: { [key: string]: any } = {
            page: page,
            per_page: per_page,
            orderby: orderby,
            order: order,
        };

        if (search) {
            params.search = search;
        }

        const { data, headers } = await api.get('products', params);

        // Récupérer le nombre total de pages depuis les en-têtes WooCommerce
        const totalPages = headers['x-wp-totalpages'] || 1;

        return NextResponse.json({ products: data, totalPages: parseInt(totalPages, 10) });
    } catch (error: any) {
        console.error('Error fetching products:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to fetch products' }, { status: error.response?.status || 500 });
    }
}

// Fonction POST pour créer un nouveau produit
export async function POST(request: Request) {
    try {
        const productData = await request.json();
        const { data } = await api.post('products', productData);
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error creating product:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to create product' }, { status: error.response?.status || 500 });
    }
}
