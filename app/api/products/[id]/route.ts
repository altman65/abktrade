import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// DEBUG variables d'environnement
console.log('DEBUG (products API): NEXT_PUBLIC_WORDPRESS_SITE_URL:', process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL);
console.log('DEBUG (products API): WOOCOMMERCE_CONSUMER_KEY (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_KEY || '').substring(0, 5));
console.log('DEBUG (products API): WOOCOMMERCE_CONSUMER_SECRET (first 5 chars):', (process.env.WOOCOMMERCE_CONSUMER_SECRET || '').substring(0, 5));

const api = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL || '',
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
  version: 'wc/v3',
  queryStringAuth: true,
});

interface Params {
  id: string;
}

// GET produit par ID
export async function GET(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const { data } = await api.get(`products/${id}`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching product:', error.response?.data || error.message);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch product' },
      { status: error.response?.status || 500 }
    );
  }
}

// PUT mise à jour produit par ID
export async function PUT(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const productData = await request.json();
    delete (productData as any).id; // Ne pas envoyer l'id dans le corps

    const { data } = await api.put(`products/${id}`, productData);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating product:', error.response?.data || error.message);
    return NextResponse.json(
      { message: error.message || 'Failed to update product' },
      { status: error.response?.status || 500 }
    );
  }
}

// DELETE produit par ID
export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const { data } = await api.delete(`products/${id}`, {
      force: true, // Suppression définitive
    });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error deleting product:', error.response?.data || error.message);
    return NextResponse.json(
      { message: error.message || 'Failed to delete product' },
      { status: error.response?.status || 500 }
    );
  }
}
