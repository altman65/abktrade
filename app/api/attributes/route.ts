import { NextResponse } from 'next/server';
import axios from 'axios';

const apiBaseURL = `${process.env.NEXT_PUBLIC_WORDPRESS_SITE_URL}/wp-json/wc/v3`;
const auth = {
  username: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  password: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
};

// GET: Liste des attributs ou des termes d'un attribut spécifique
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attributeId = searchParams.get('attributeId');
    const url = attributeId
      ? `${apiBaseURL}/products/attributes/${attributeId}/terms`
      : `${apiBaseURL}/products/attributes`;

    const response = await axios.get(url, { auth });
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('GET error:', error.response?.data || error.message);
      return NextResponse.json(
        { message: error.message || 'Erreur lors de la récupération' },
        { status: error.response?.status || 500 }
      );
    }
    console.error('GET unknown error:', error);
    return NextResponse.json({ message: 'Erreur inconnue' }, { status: 500 });
  }
}

// POST: Création d’un nouvel attribut
export async function POST(request: Request) {
  try {
    const newAttributeData = await request.json();
    const response = await axios.post(`${apiBaseURL}/products/attributes`, newAttributeData, { auth });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('POST error:', error.response?.data || error.message);
      return NextResponse.json(
        { message: error.message || 'Erreur lors de la création' },
        { status: error.response?.status || 500 }
      );
    }
    console.error('POST unknown error:', error);
    return NextResponse.json({ message: 'Erreur inconnue' }, { status: 500 });
  }
}

// PUT: Mise à jour d’un attribut
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attributeId = searchParams.get('attributeId');
    if (!attributeId) {
      return NextResponse.json({ message: 'ID requis' }, { status: 400 });
    }

    const updatedAttributeData = await request.json();
    const response = await axios.put(`${apiBaseURL}/products/attributes/${attributeId}`, updatedAttributeData, { auth });
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('PUT error:', error.response?.data || error.message);
      return NextResponse.json(
        { message: error.message || 'Erreur lors de la mise à jour' },
        { status: error.response?.status || 500 }
      );
    }
    console.error('PUT unknown error:', error);
    return NextResponse.json({ message: 'Erreur inconnue' }, { status: 500 });
  }
}

// DELETE: Suppression d’un attribut
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attributeId = searchParams.get('attributeId');
    if (!attributeId) {
      return NextResponse.json({ message: 'ID requis' }, { status: 400 });
    }

    const response = await axios.delete(`${apiBaseURL}/products/attributes/${attributeId}?force=true`, { auth });
    return NextResponse.json(response.data, { status: 200 });
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('DELETE error:', error.response?.data || error.message);
      return NextResponse.json(
        { message: error.message || 'Erreur lors de la suppression' },
        { status: error.response?.status || 500 }
      );
    }
    console.error('DELETE unknown error:', error);
    return NextResponse.json({ message: 'Erreur inconnue' }, { status: 500 });
  }
}
