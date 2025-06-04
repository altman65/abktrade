'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Interface pour un produit (simplifiée pour cet exemple)
interface Product {
    id: number;
    name: string;
    regular_price: string;
    sale_price: string;
    images: { src: string }[];
    status: string;
    stock_quantity: number | null;
    sku: string;
}

// Interface pour les toasts
interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // États pour les toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextToastId = useRef(0);

    // États pour le modal de confirmation de suppression
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [productToDeleteId, setProductToDeleteId] = useState<number | null>(null);
    const [productToDeleteName, setProductToDeleteName] = useState<string | null>(null);

    // Fonction pour ajouter un toast
    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = nextToastId.current++;
        setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

        // Supprimer le toast après 5 secondes
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);

    // Fonction pour récupérer les produits
    const fetchProducts = useCallback(async (page: number, search: string) => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                per_page: '10', // Nombre de produits par page
                orderby: 'id',
                order: 'asc',
            });

            if (search) {
                queryParams.append('search', search);
            }

            const response = await fetch(`/api/products?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            const data = await response.json();

            setProducts(data.products);
            setTotalPages(data.totalPages);

        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching products:', err);
            addToast(err.message || 'Erreur lors du chargement des produits.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Effet pour charger les produits au montage et lors des changements de page/recherche
    useEffect(() => {
        fetchProducts(currentPage, searchTerm);
    }, [currentPage, searchTerm, fetchProducts]);

    // Gérer le changement de page
    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Gérer la recherche
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Réinitialiser à la première page lors d'une nouvelle recherche
    };

    // Ouvre le modal de confirmation de suppression
    const confirmDelete = useCallback((id: number, name: string) => {
        setProductToDeleteId(id);
        setProductToDeleteName(name);
        setShowDeleteConfirmModal(true);
    }, []);

    // Gérer la suppression d'un produit (après confirmation)
    const executeDeleteProduct = useCallback(async () => {
        if (productToDeleteId === null || productToDeleteName === null) return;

        setIsDeleting(true);
        setShowDeleteConfirmModal(false); // Ferme le modal
        addToast(`Suppression de "${productToDeleteName}" en cours...`, 'info');

        try {
            const response = await fetch(`/api/products/${productToDeleteId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la suppression du produit.');
            }

            addToast(`Produit "${productToDeleteName}" supprimé avec succès !`, 'success');
            // Recharger la liste des produits après suppression
            fetchProducts(currentPage, searchTerm);
        } catch (err: any) {
            setError(err.message);
            console.error('Error deleting product:', err);
            addToast(err.message || 'Erreur lors de la suppression du produit.', 'error');
        } finally {
            setIsDeleting(false);
            setProductToDeleteId(null);
            setProductToDeleteName(null);
        }
    }, [productToDeleteId, productToDeleteName, currentPage, searchTerm, fetchProducts, addToast]);

    // Logique pour générer les numéros de page visibles
    const getVisiblePageNumbers = useCallback(() => {
        const pages: (number | string)[] = [];
        const numPagesToShow = 5; // Nombre maximum de boutons de page à afficher (ex: 1 ... 4 5 6 ... 10)

        if (totalPages <= numPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            let startPage = Math.max(1, currentPage - Math.floor((numPagesToShow - 1) / 2));
            let endPage = Math.min(totalPages, currentPage + Math.floor(numPagesToShow / 2));

            // Ajuster start/end si les limites sont atteintes pour toujours afficher `numPagesToShow` pages si possible
            if (endPage - startPage + 1 < numPagesToShow) {
                if (startPage === 1) {
                    endPage = Math.min(totalPages, startPage + numPagesToShow - 1);
                } else if (endPage === totalPages) {
                    startPage = Math.max(1, totalPages - numPagesToShow + 1);
                }
            }

            // Ajouter la première page et les ellipses si nécessaire
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) { // Si le début est au-delà de la page 2, ajouter '...'
                    pages.push('...');
                }
            }

            // Ajouter les pages dans la plage calculée
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            // Ajouter les ellipses et la dernière page si nécessaire
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) { // Si la fin est avant l'avant-dernière page, ajouter '...'
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }
        return pages;
    }, [currentPage, totalPages]);


    if (loading && products.length === 0) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '1.2em', color: '#007bff' }}>Chargement des produits...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545', fontSize: '1.2em', fontWeight: 'bold' }}>Erreur: {error}</div>;

    // Styles en ligne pour les éléments du formulaire
    const containerStyle: React.CSSProperties = {
        maxWidth: '1200px',
        margin: '40px auto',
        padding: '30px',
        fontFamily: 'Inter, Arial, sans-serif',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        borderRadius: '15px',
        backgroundColor: '#f5f7fa',
    };

    const headerStyle: React.CSSProperties = {
        textAlign: 'center',
        color: '#333',
        marginBottom: '30px',
        fontSize: '2.2em',
        borderBottom: '2px solid #007bff',
        paddingBottom: '10px',
    };

    const tableContainerStyle: React.CSSProperties = {
        overflowX: 'auto', // Permet le défilement horizontal sur les petits écrans
        marginTop: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        backgroundColor: '#ffffff',
    };

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0',
        minWidth: '800px', // Largeur minimale pour éviter un tableau trop compressé
    };

    const thStyle: React.CSSProperties = {
        padding: '15px 20px',
        textAlign: 'left',
        backgroundColor: '#007bff',
        color: 'white',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '0.9em',
        borderBottom: '2px solid #0056b3',
    };

    const tdStyle: React.CSSProperties = {
        padding: '15px 20px',
        borderBottom: '1px solid #e0e0e0',
        verticalAlign: 'middle',
        fontSize: '0.95em',
        color: '#333',
    };

    const trEvenStyle: React.CSSProperties = {
        backgroundColor: '#f9f9f9',
    };

    const trHoverStyle: React.CSSProperties = {
        backgroundColor: '#e0f2fe',
    };

    const productImageStyle: React.CSSProperties = {
        borderRadius: '5px',
        objectFit: 'contain',
        border: '1px solid #eee',
    };

    const productPriceStyle: React.CSSProperties = {
        fontWeight: 'bold',
        color: '#007bff',
    };

    const productSalePriceStyle: React.CSSProperties = {
        color: '#dc3545',
        marginLeft: '5px',
    };

    const productRegularPriceStrikethroughStyle: React.CSSProperties = {
        textDecoration: 'line-through',
        color: '#6c757d',
        fontSize: '0.9em',
    };

    const buttonGroupStyle: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        whiteSpace: 'nowrap', // Empêche les boutons de passer à la ligne
    };

    const buttonBaseStyle: React.CSSProperties = {
        padding: '8px 12px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.85em',
        fontWeight: 'bold',
        transition: 'background-color 0.2s ease, transform 0.1s ease',
    };

    const editButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: '#007bff',
        color: 'white',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const deleteButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: '#dc3545',
        color: 'white',
        opacity: isDeleting ? 0.7 : 1,
        cursor: isDeleting ? 'not-allowed' : 'pointer',
    };

    const createProductButtonStyle: React.CSSProperties = {
        display: 'block',
        width: 'fit-content',
        margin: '20px auto 30px auto',
        padding: '15px 30px',
        backgroundColor: '#28a745',
        color: 'white',
        borderRadius: '10px',
        textDecoration: 'none',
        fontSize: '1.1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    };

    const paginationContainerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        marginTop: '40px',
        padding: '15px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    };

    const paginationButtonStyle: React.CSSProperties = {
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #007bff',
        backgroundColor: 'white',
        color: '#007bff',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.2s ease, color 0.2s ease',
    };

    const paginationButtonActiveStyle: React.CSSProperties = {
        backgroundColor: '#007bff',
        color: 'white',
    };

    const searchInputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxSizing: 'border-box',
        fontSize: '1em',
        marginBottom: '20px',
    };

    // Styles pour les toasts
    const toastContainerStyle: React.CSSProperties = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    };

    const toastBaseStyle: React.CSSProperties = {
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.95em',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'toastFadeInOut 5s forwards',
        opacity: 0,
    };

    const toastSuccessStyle: React.CSSProperties = {
        backgroundColor: '#28a745',
    };

    const toastErrorStyle: React.CSSProperties = {
        backgroundColor: '#dc3545',
    };

    const toastInfoStyle: React.CSSProperties = {
        backgroundColor: '#007bff',
    };

    // Styles pour le modal de confirmation
    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1001,
    };

    const modalContentStyle: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '90%',
        animation: 'modalFadeIn 0.3s ease-out forwards',
    };

    const modalTitleStyle: React.CSSProperties = {
        fontSize: '1.8em',
        color: '#333',
        marginBottom: '20px',
    };

    const modalMessageStyle: React.CSSProperties = {
        fontSize: '1.1em',
        color: '#555',
        marginBottom: '25px',
    };

    const modalButtonGroupStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
    };

    const modalButtonBaseStyle: React.CSSProperties = {
        padding: '12px 25px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.2s ease, transform 0.1s ease',
    };

    const modalConfirmButtonStyle: React.CSSProperties = {
        ...modalButtonBaseStyle,
        backgroundColor: '#dc3545',
        color: 'white',
    };

    const modalCancelButtonStyle: React.CSSProperties = {
        ...modalButtonBaseStyle,
        backgroundColor: '#e0e0e0',
        color: '#333',
    };


    return (
        <div style={containerStyle}>
            {/* Conteneur pour les toasts */}
            <div style={toastContainerStyle}>
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        style={{
                            ...toastBaseStyle,
                            ...(toast.type === 'success' ? toastSuccessStyle : toast.type === 'error' ? toastErrorStyle : toastInfoStyle),
                        }}
                    >
                        {toast.type === 'success' && <span style={{ marginRight: '5px' }}>✔</span>}
                        {toast.type === 'error' && <span style={{ marginRight: '5px' }}>✖</span>}
                        {toast.type === 'info' && <span style={{ marginRight: '5px' }}>ℹ</span>}
                        {toast.message}
                    </div>
                ))}
            </div>

            <h1 style={headerStyle}>Liste des Produits</h1>

            <Link href="/products/new" style={createProductButtonStyle}>
                + Créer un nouveau produit
            </Link>

            <input
                type="text"
                placeholder="Rechercher des produits..."
                value={searchTerm}
                onChange={handleSearchChange}
                style={searchInputStyle}
            />

            {loading && products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: '1.2em', color: '#007bff' }}>Chargement des produits...</div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545', fontSize: '1.2em', fontWeight: 'bold' }}>Erreur: {error}</div>
            ) : products.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '1.1em', color: '#888', padding: '30px', border: '1px dashed #ccc', borderRadius: '10px' }}>
                    Aucun produit trouvé.
                </p>
            ) : (
                <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, borderTopLeftRadius: '10px' }}>Image</th>
                                <th style={thStyle}>Nom</th>
                                <th style={thStyle}>Prix Régulier</th>
                                <th style={thStyle}>Prix Solde</th>
                                <th style={thStyle}>SKU</th>
                                <th style={thStyle}>Stock</th>
                                <th style={thStyle}>Statut</th>
                                <th style={{ ...thStyle, borderTopRightRadius: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr key={product.id} style={index % 2 === 0 ? trEvenStyle : {}}>
                                    <td style={tdStyle}>
                                        <Image
                                            src={product.images[0]?.src || 'https://placehold.co/70x70/cccccc/333333?text=No+Image'}
                                            alt={product.name || 'Product Image'}
                                            width={70}
                                            height={70}
                                            style={productImageStyle}
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://placehold.co/70x70/cccccc/333333?text=No+Image';
                                            }}
                                        />
                                    </td>
                                    <td style={tdStyle}>{product.name}</td>
                                    <td style={tdStyle}>
                                        <span style={productPriceStyle}>
                                            {parseFloat(product.regular_price).toFixed(2)}€
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        {product.sale_price ? (
                                            <span style={productSalePriceStyle}>
                                                {parseFloat(product.sale_price).toFixed(2)}€
                                            </span>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td style={tdStyle}>{product.sku || 'N/A'}</td>
                                    <td style={tdStyle}>{product.stock_quantity !== null ? product.stock_quantity : 'N/A'}</td>
                                    <td style={tdStyle}>{product.status}</td>
                                    <td style={tdStyle}>
                                        <div style={buttonGroupStyle}>
                                            <Link href={`/products/${product.id}/edit`} style={editButtonStyle}>
                                                Éditer
                                            </Link>
                                            <button
                                                onClick={() => confirmDelete(product.id, product.name)}
                                                disabled={isDeleting}
                                                style={deleteButtonStyle}
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={paginationContainerStyle}>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        style={paginationButtonStyle}
                    >
                        Précédent
                    </button>
                    {getVisiblePageNumbers().map((page, index) => (
                        <React.Fragment key={index}>
                            {typeof page === 'string' ? (
                                <span style={{ padding: '10px 5px', color: '#666' }}>{page}</span>
                            ) : (
                                <button
                                    onClick={() => handlePageChange(page)}
                                    disabled={loading}
                                    style={{
                                        ...paginationButtonStyle,
                                        ...(currentPage === page ? paginationButtonActiveStyle : {}),
                                    }}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        style={paginationButtonStyle}
                    >
                        Suivant
                    </button>
                </div>
            )}

            {/* Modal de confirmation de suppression */}
            {showDeleteConfirmModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={modalTitleStyle}>Confirmer la suppression</h2>
                        <p style={modalMessageStyle}>
                            Êtes-vous sûr de vouloir supprimer le produit "<strong>{productToDeleteName}</strong>" (ID: {productToDeleteId}) ? Cette action est irréversible.
                        </p>
                        <div style={modalButtonGroupStyle}>
                            <button
                                onClick={executeDeleteProduct}
                                disabled={isDeleting}
                                style={modalConfirmButtonStyle}
                            >
                                {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirmModal(false)}
                                disabled={isDeleting}
                                style={modalCancelButtonStyle}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
