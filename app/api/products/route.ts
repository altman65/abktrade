import { NextResponse } from 'next/server';
import axios from 'axios';

const apiBaseURL = `${process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL}/wp-json/wc/v3`;
const auth = {
  username: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  password: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
};

// GET all products
export async function GET() {
  try {
    const response = await axios.get(`${apiBaseURL}/products`, { auth });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('GET products error:', error.response?.data || error.message);
    return NextResponse.json({ message: 'Erreur lors du GET des produits' }, { status: 500 });
  }
}

// POST: create new product
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const response = await axios.post(`${apiBaseURL}/products`, data, { auth });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    console.error('POST product error:', error.response?.data || error.message);
    return NextResponse.json({ message: 'Erreur lors de la création du produit' }, { status: 500 });
  }
}

// PUT: update existing product (requires productId in query string)
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ message: 'ID produit requis' }, { status: 400 });
    }

    const data = await request.json();
    const response = await axios.put(`${apiBaseURL}/products/${productId}`, data, { auth });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('PUT product error:', error.response?.data || error.message);
    return NextResponse.json({ message: 'Erreur lors de la mise à jour du produit' }, { status: 500 });
  }
}

// DELETE: delete product (requires productId in query string)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ message: 'ID produit requis' }, { status: 400 });
    }

    const response = await axios.delete(`${apiBaseURL}/products/${productId}?force=true`, { auth });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('DELETE product error:', error.response?.data || error.message);
    return NextResponse.json({ message: 'Erreur lors de la suppression du produit' }, { status: 500 });
  }
}
