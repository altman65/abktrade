import { NextResponse } from 'next/server';
import axios from 'axios';

const apiBaseURL = `${process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL}/wp-json/wc/v3`;
const auth = {
  username: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  password: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
};

// GET all product categories
export async function GET() {
  try {
    const response = await axios.get(`${apiBaseURL}/products/categories`, { auth });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Erreur lors du GET des catégories' }, { status: 500 });
  }
}

// POST: create new category
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const response = await axios.post(`${apiBaseURL}/products/categories`, data, { auth });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Erreur lors de la création' }, { status: 500 });
  }
}
