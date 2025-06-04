import { NextResponse } from 'next/server';
import axios from 'axios';

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
    if (!productId) return NextResponse.json({ message: 'ID produit requis' }, { status: 400 });

    const response = await axios.get(`${apiBaseURL}/products/${productId}/variations`, { auth });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Erreur GET variations' }, { status: 500 });
  }
}

// POST: create variation
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) return NextResponse.json({ message: 'ID produit requis' }, { status: 400 });

    const data = await request.json();
    const response = await axios.post(`${apiBaseURL}/products/${productId}/variations`, data, { auth });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erreur création variation' }, { status: 500 });
  }
}
