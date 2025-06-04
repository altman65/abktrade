// app/api/attributes/route.ts
import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const wooApi = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL || '', // Votre URL WordPress/WooCommerce
    consumerKey: process.env.WOO_CONSUMER_KEY || '', // Votre clé consommateur Woo
    consumerSecret: process.env.WOO_CONSUMER_SECRET || '', // Votre secret consommateur Woo
    version: 'wc/v3',
    queryStringAuth: true, // Important pour certaines configurations
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const attributeId = searchParams.get('attributeId');

        if (attributeId) {
            // Si un ID d'attribut est fourni, récupérer ses termes
            const { data: terms } = await wooApi.get(`products/attributes/${attributeId}/terms`);
            return NextResponse.json(terms);
        } else {
            // Sinon, récupérer tous les attributs globaux
            const { data: attributes } = await wooApi.get('products/attributes');
            return NextResponse.json(attributes);
        }
    } catch (error: any) {
        console.error('API Error:', error.response?.data || error.message);
        return NextResponse.json(
            { message: 'Failed to fetch attributes or terms', error: error.response?.data || error.message },
            { status: error.response?.status || 500 }
        );
    }
}