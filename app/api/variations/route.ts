import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

const apiBaseURL = `${process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL}/wp-json/wc/v3`;
const auth = {
  username: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  password: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
};

// GET: list all variations for a given product
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ message: 'ID produit requis' }, { status: 400 });
    }

    const response = await axios.get(`${apiBaseURL}/products/${productId}/variations`, { auth });
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const message = axiosError.message || 'Erreur GET variations';
    const details = axiosError.response?.data || null;

    console.error('GET variations error:', details || message);
    return NextResponse.json({ message }, { status: axiosError.response?.status || 500 });
  }
}

// POST: create variation
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ message: 'ID produit requis' }, { status: 400 });
    }

    const data = await request.json();
    const response = await axios.post(`${apiBaseURL}/products/${productId}/variations`, data, { auth });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const message = axiosError.message || 'Erreur création variation';
    const details = axiosError.response?.data || null;

    console.error('POST variation error:', details || message);
    return NextResponse.json({ message }, { status: axiosError.response?.status || 500 });
  }
}
