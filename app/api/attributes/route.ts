import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Initialisation de l'API WooCommerce
// Ajout de logs pour le débogage des variables d'environnement
console.log('DEBUG (attributes API): NEXT_PUBLIC_WORDPRESS_SITE_URL:', process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL);
console.log('DEBUG (attributes API): WOOCOMMERCE_CONSUMER_KEY (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_KEY || '').substring(0, 5));
console.log('DEBUG (attributes API): WOOCOMMERCE_CONSUMER_SECRET (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_SECRET || '').substring(0, 5));

const api = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL || '', // Assurez-vous que cette variable est définie dans .env.local
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '', // Assurez-vous que cette variable est définie dans .env.local
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '', // Assurez-vous que cette variable est définie dans .env.local
    version: 'wc/v3',
    queryStringAuth: true,
});

// Fonction GET pour récupérer tous les attributs globaux ou les termes d'un attribut spécifique
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const attributeId = searchParams.get('attributeId');

        let data;
        if (attributeId) {
            // Récupérer les termes pour un attribut spécifique
            const response = await api.get(`products/attributes/${attributeId}/terms`);
            data = response.data;
        } else {
            // Récupérer tous les attributs globaux
            const response = await api.get('products/attributes');
            data = response.data;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching attributes or terms:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to fetch attributes or terms' }, { status: error.response?.status || 500 });
    }
}

// Fonction POST pour créer un nouvel attribut global (si nécessaire)
export async function POST(request: Request) {
    try {
        const newAttributeData = await request.json();
        const { data } = await api.post('products/attributes', newAttributeData);
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('Error creating attribute:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to create attribute' }, { status: error.response?.status || 500 });
    }
}

// Fonction PUT pour mettre à jour un attribut global (si nécessaire)
export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const attributeId = searchParams.get('attributeId');
        if (!attributeId) {
            return NextResponse.json({ message: 'Attribute ID is required for PUT request' }, { status: 400 });
        }
        const updatedAttributeData = await request.json();
        const { data } = await api.put(`products/attributes/${attributeId}`, updatedAttributeData);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating attribute:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to update attribute' }, { status: error.response?.status || 500 });
    }
}

// Fonction DELETE pour supprimer un attribut global (si nécessaire)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const attributeId = searchParams.get('attributeId');
        if (!attributeId) {
            return NextResponse.json({ message: 'Attribute ID is required for DELETE request' }, { status: 400 });
        }
        const { data } = await api.delete(`products/attributes/${attributeId}`, { force: true });
        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        console.error('Error deleting attribute:', error.response?.data || error.message);
        return NextResponse.json({ message: error.message || 'Failed to delete attribute' }, { status: error.response?.status || 500 });
    }
}
