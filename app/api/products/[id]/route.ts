import { NextResponse } from 'next/server';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import type { AxiosError } from 'axios';

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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const message = axiosError.message || 'Failed to fetch product';
    const status = axiosError.response?.status || 500;
    const details = axiosError.response?.data || null;

    console.error('Error fetching product:', details || message);
    return NextResponse.json({ message }, { status });
  }
}

// PUT mise à jour produit par ID
export async function PUT(request: Request, context: { params: Params }) {
  try {
    const { id } = context.params;
    const productData: Record<string, unknown> = await request.json();
    delete productData.id; // Ne pas envoyer l'id dans le corps

    const { data } = await api.put(`products/${id}`, productData);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const message = axiosError.message || 'Failed to update product';
    const status = axiosError.response?.status || 500;
    const details = axiosError.response?.data || null;

    console.error('Error updating product:', details || message);
    return NextResponse.json({ message }, { status });
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
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const message = axiosError.message || 'Failed to delete product';
    const status = axiosError.response?.status || 500;
    const details = axiosError.response?.data || null;

    console.error('Error deleting product:', details || message);
    return NextResponse.json({ message }, { status });
  }
}
