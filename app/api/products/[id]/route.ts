import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Assurez-vous que ces variables d'environnement sont définies
// Ajout de logs pour le débogage des variables d'environnement
console.log('DEBUG (products API): NEXT_PUBLIC_WORDPRESS_SITE_URL:', process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL);
console.log('DEBUG (products API): WOOCOMMERCE_CONSUMER_KEY (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_KEY || '').substring(0, 5));
console.log('DEBUG (products API): WOOCOMMERCE_CONSUMER_SECRET (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_SECRET || '').substring(0, 5));


const api = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL || '',
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
    version: 'wc/v3',
    queryStringAuth: true // Important pour les requêtes GET avec authentification dans l'URL
});

interface Params {
    id: string;
}

// Fonction GET pour récupérer un produit par ID
export async function GET(request: Request, context: { params: Params }) {
    try {
        // CORRECTION: Await context.params before destructuring
        const { id } = await context.params;
        const { data } = await api.get(`products/${id}`);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching product:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to fetch product' }, { status: error.response?.status || 500 });
    }
}

// Fonction PUT pour mettre à jour un produit par ID
export async function PUT(request: Request, context: { params: Params }) {
    try {
        // CORRECTION: Await context.params before destructuring
        const { id } = await context.params;
        const productData = await request.json();
        delete (productData as any).id; // Exclure l'ID si présent dans le corps de la requête

        const { data } = await api.put(`products/${id}`, productData);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating product:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to update product' }, { status: error.response?.status || 500 });
    }
}

// Fonction DELETE pour supprimer un produit par ID (si nécessaire)
export async function DELETE(request: Request, context: { params: Params }) {
    try {
        // CORRECTION: Await context.params before destructuring
        const { id } = await context.params;
        const { data } = await api.delete(`products/${id}`, {
            force: true, // Définit à true pour supprimer définitivement
        });
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error deleting product:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to delete product' }, { status: error.response?.status || 500 });
    }
}
