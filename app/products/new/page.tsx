'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Interfaces pour les données du produit et des attributs
// Idéalement, ces interfaces seraient dans un fichier partagé (ex: types/index.ts)
// mais pour la commodité du copier-coller, elles sont incluses ici.

interface ProductAttribute {
    id?: number; // L'ID de l'attribut global (si c'est un attribut global)
    name: string; // Nom de l'attribut (ex: "Couleur", "Taille")
    position?: number; // Position de l'attribut
    visible: boolean; // Si l'attribut est visible sur la page produit
    variation: boolean; // Si l'attribut est utilisé pour les variations
    options: string[]; // Un tableau des termes (valeurs) sélectionnés pour ce produit (ex: ["Rouge", "Bleu"])
}

interface Product {
    id?: number; // L'ID est optionnel pour la création
    name: string;
    type: string; // 'simple', 'variable', etc.
    status: string; // 'publish', 'draft', etc.
    regular_price: string;
    sale_price: string; // Peut être vide
    description: string;
    short_description: string;
    sku: string;
    stock_quantity: number | null;
    manage_stock: boolean; // Indique si le stock est géré
    images: { id?: number; src: string; name?: string }[];
    attributes: ProductAttribute[]; // Tableau des attributs du produit
    meta_data: { key: string; value: any }[]; // Pour les meta_data, incluant les champs ACF
}

interface GlobalAttribute {
    id: number;
    name: string;
    slug: string;
    type: string; // "select", "text" etc.
}

interface AttributeTerm {
    id: number;
    name: string;
    slug: string;
}

// Interface pour les toasts
interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

// Composant AccordionItem (réutilisé)
interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    panelKey: string;
    openAccordion: string | null;
    setOpenAccordion: (key: string | null) => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, panelKey, openAccordion, setOpenAccordion }) => {
    const isCollapsed = openAccordion !== panelKey;
    const contentRef = useRef<HTMLDivElement>(null);

    const toggleCollapse = () => {
        setOpenAccordion(isCollapsed ? panelKey : null);
    };

    const accordionHeaderStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        marginBottom: '10px',
        transition: 'background-color 0.3s ease',
    };

    const accordionContentWrapperStyle: React.CSSProperties = {
        maxHeight: isCollapsed ? '0' : (contentRef.current ? `${contentRef.current.scrollHeight + 40}px` : 'auto'), // +40px buffer
        overflow: 'hidden',
        transition: 'max-height 0.5s ease-in-out, padding 0.5s ease-in-out',
        padding: isCollapsed ? '0 20px' : '20px',
        border: isCollapsed ? 'none' : '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        boxSizing: 'border-box',
    };

    useEffect(() => {
        if (!isCollapsed && contentRef.current) {
            contentRef.current.style.maxHeight = `${contentRef.current.scrollHeight + 40}px`;
        }
    }, [isCollapsed]);

    const arrowStyle: React.CSSProperties = {
        fontSize: '1.2em',
        transition: 'transform 0.3s ease',
        transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={accordionHeaderStyle} onClick={toggleCollapse}>
                {title}
                <span style={arrowStyle}>{'>'}</span>
            </div>
            <div ref={contentRef} style={accordionContentWrapperStyle}>
                <div style={{ padding: isCollapsed ? '0' : '0' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};


export default function NewProductPage() {
    const router = useRouter();

    const [product, setProduct] = useState<Product>({
        name: '',
        type: 'simple', // Valeur par défaut
        status: 'draft', // Valeur par défaut
        regular_price: '',
        sale_price: '',
        description: '',
        short_description: '',
        sku: '',
        stock_quantity: null,
        manage_stock: false,
        images: [],
        attributes: [],
        meta_data: [],
    });

    const [loading, setLoading] = useState(true); // Pour le chargement initial des attributs globaux
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [nextRoute, setNextRoute] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false); // État pour le bouton de défilement

    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const [allGlobalAttributes, setAllGlobalAttributes] = useState<GlobalAttribute[]>([]);
    const [availableAttributeTerms, setAvailableAttributeTerms] = useState<{ [attributeId: number]: AttributeTerm[] }>({});
    const [newAttributeSelection, setNewAttributeSelection] = useState<string>('');

    const tailleDustBagOptions = [
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
        { value: 'xl', label: 'XL' },
    ];

    const visuelsOptions = [
        { value: 'fond-blanc', label: 'FOND BLANC' },
        { value: 'lifestyle', label: 'LIFESTYLE' },
        { value: 'fb-lifestyle', label: 'FOND BLANC ET LIFESTYLE' },
    ];

    // Options pour le champ CAS
    const casOptions = [
        { value: 'BEST', label: 'BEST' },
        { value: 'OK', label: 'OK' },
        { value: 'SUPER BEST', label: 'SUPER BEST' },
        { value: 'CAS', label: 'CAS' },
        { value: 'BEST WW', label: 'BEST WW' },
        { value: 'STAND BY X AVRIL', label: 'STAND BY X AVRIL' },
        { value: 'NEW NO SALES', label: 'NEW NO SALES' },
        { value: 'TEST', label: 'TEST' },
        { value: 'NEW', label: 'NEW' },
        { value: 'BAISSE PRIX X NOV', label: 'BAISSE PRIX X NOV' },
        { value: 'STOP', label: 'STOP' },
    ];

    const [acfFields, setAcfFields] = useState<{
        prix_achat: number | '';
        cout_logisitique: number | '';
        prix_achat_total: number | '';
        prix_vente_publique: number | '';
        marges: boolean;
        prix_cession_vp: number | '';
        prix_site: number | '';
        prix_cession_srp: number | '';
        prix_cession_bradery: number | '';
        prix_cession_zalando: number | '';
        cas: string;
        site_internet: boolean;
        kchain: boolean;
        taille_dust_bag: string;
        visuels: string;
    }>({
        prix_achat: '',
        cout_logisitique: '',
        prix_achat_total: '',
        prix_vente_publique: '',
        marges: false,
        prix_cession_vp: '',
        prix_site: '',
        prix_cession_srp: '',
        prix_cession_bradery: '',
        prix_cession_zalando: '',
        cas: '',
        taille_dust_bag: '',
        visuels: '',
        site_internet: false,
        kchain: false,
    });

    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextToastId = useRef(0);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = nextToastId.current++;
        setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);

    // Charger les attributs globaux disponibles au montage
    useEffect(() => {
        const fetchGlobalAttributes = async () => {
            setLoading(true);
            try {
                const globalAttributesResponse = await fetch('/api/attributes');
                if (!globalAttributesResponse.ok) {
                    throw new Error('Failed to fetch global attributes');
                }
                const globalAttributesData: GlobalAttribute[] = await globalAttributesResponse.json();
                setAllGlobalAttributes(globalAttributesData);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Error fetching global attributes');
                console.error(err);
                addToast(err.message || 'Erreur lors du chargement des attributs globaux.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchGlobalAttributes();
    }, [addToast]);

    // Effet pour recalculer prix_achat_total
    useEffect(() => {
        const prixAchat = parseFloat(acfFields.prix_achat as string) || 0;
        const coutLogistique = parseFloat(acfFields.cout_logisitique as string) || 0;
        const newPrixAchatTotal = (prixAchat + coutLogistique).toFixed(2);

        if (newPrixAchatTotal !== acfFields.prix_achat_total.toString()) {
            setAcfFields(prev => ({
                ...prev,
                prix_achat_total: parseFloat(newPrixAchatTotal),
            }));
            setHasChanges(true);
        }
    }, [acfFields.prix_achat, acfFields.cout_logisitique, acfFields.prix_achat_total]);

    // Ref pour stocker la valeur précédente de acfFields.marges
    const prevMargesRef = useRef(acfFields.marges);

    // Effet pour recalculer les prix de cession
    useEffect(() => {
        const prixAchatTotal = parseFloat(acfFields.prix_achat_total as string) || 0;
        const currentMarges = acfFields.marges;
        const prevMarges = prevMargesRef.current;

        setAcfFields(prev => {
            const newAcfFields = { ...prev };

            if (currentMarges && !prevMarges) {
                const calculatedValue = (prixAchatTotal * 2).toFixed(2);
                newAcfFields.prix_cession_vp = parseFloat(calculatedValue);
                newAcfFields.prix_site = parseFloat(calculatedValue);
                newAcfFields.prix_cession_srp = parseFloat(calculatedValue);
                newAcfFields.prix_cession_bradery = parseFloat(calculatedValue);
                newAcfFields.prix_cession_zalando = parseFloat(calculatedValue);
            } else if (!currentMarges && prevMarges) {
                newAcfFields.prix_cession_vp = '';
                newAcfFields.prix_site = '';
                newAcfFields.prix_cession_srp = '';
                newAcfFields.prix_cession_bradery = '';
                newAcfFields.prix_cession_zalando = '';
            } else if (currentMarges && prevMarges && prixAchatTotal !== (parseFloat(prev.prix_achat_total as string) || 0)) {
                const calculatedValue = (prixAchatTotal * 2).toFixed(2);
                newAcfFields.prix_cession_vp = parseFloat(calculatedValue);
                newAcfFields.prix_site = parseFloat(calculatedValue);
                newAcfFields.prix_cession_srp = parseFloat(calculatedValue);
                newAcfFields.prix_cession_bradery = parseFloat(calculatedValue);
                newAcfFields.prix_cession_zalando = parseFloat(calculatedValue);
            }
            return newAcfFields;
        });
        prevMargesRef.current = currentMarges;
        setHasChanges(true);
    }, [acfFields.marges, acfFields.prix_achat_total]);


    const handleProductChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setProduct(prev => {
            let newValue: string | number | boolean = value;
            if (type === 'number') {
                newValue = parseFloat(value);
                if (isNaN(newValue)) newValue = '';
            }
            if (type === 'checkbox') {
                newValue = checked;
            }
            return { ...prev, [name]: newValue };
        });
        setHasChanges(true);
    }, []);

    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const imageUrl = e.target.value;
        setProduct(prev => {
            return { ...prev, images: imageUrl ? [{ src: imageUrl }] : [] };
        });
        setHasChanges(true);
    }, []);

    const handleAcfChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target;
        setAcfFields(prev => {
            if (type === 'number') {
                return { ...prev, [name]: parseFloat(value) || '' };
            }
            if (type === 'checkbox') {
                return { ...prev, [name]: checked };
            }
            return { ...prev, [name]: value };
        });
        setHasChanges(true);
    }, []);

    const handleTailleDustBagToggle = useCallback((selectedValue: string) => {
        setAcfFields(prev => {
            if (prev.taille_dust_bag === selectedValue) {
                return { ...prev, taille_dust_bag: '' };
            }
            return { ...prev, taille_dust_bag: selectedValue };
        });
        setHasChanges(true);
    }, []);

    const handleVisuelsToggle = useCallback((selectedValue: string) => {
        setAcfFields(prev => {
            if (prev.visuels === selectedValue) {
                return { ...prev, visuels: '' };
            }
            return { ...prev, visuels: selectedValue };
        });
        setHasChanges(true);
    }, []);

    const handleAddAttribute = async () => {
        if (newAttributeSelection) {
            const selectedAttrId = parseInt(newAttributeSelection, 10);
            const selectedAttr = allGlobalAttributes.find(attr => attr.id === selectedAttrId);

            if (selectedAttr && !product.attributes.some(attr => attr.id === selectedAttrId)) {
                try {
                    const termsResponse = await fetch(`/api/attributes?attributeId=${selectedAttrId}`);
                    if (!termsResponse.ok) {
                        throw new Error('Failed to fetch attribute terms');
                    }
                    const terms: AttributeTerm[] = await termsResponse.json();
                    setAvailableAttributeTerms(prev => ({
                        ...prev,
                        [selectedAttrId]: terms
                    }));

                    const newProductAttribute: ProductAttribute = {
                        id: selectedAttr.id,
                        name: selectedAttr.name,
                        position: product.attributes.length,
                        visible: true,
                        variation: false,
                        options: [],
                    };

                    setProduct(prev => ({
                        ...prev,
                        attributes: [...prev.attributes, newProductAttribute],
                    }));
                    setNewAttributeSelection('');
                    addToast(`Attribut "${selectedAttr.name}" ajouté.`, 'success');
                    setHasChanges(true);
                } catch (err: any) {
                    console.error('Error fetching attribute terms:', err);
                    setError(err.message || 'Erreur lors du chargement des termes pour l\'attribut.');
                    addToast(err.message || 'Erreur lors de l\'ajout de l\'attribut.', 'error');
                }
            } else if (selectedAttr) {
                addToast(`L'attribut "${selectedAttr.name}" est déjà ajouté.`, 'info');
            }
        }
    };

    const handleRemoveAttribute = useCallback((attributeId: number, attributeName: string) => {
        setProduct(prev => ({
            ...prev,
            attributes: prev.attributes.filter(attr => attr.id !== attributeId),
        }));
        setAvailableAttributeTerms(prev => {
            const newTerms = { ...prev };
            delete newTerms[attributeId];
            return newTerms;
        });
        addToast(`Attribut "${attributeName}" supprimé.`, 'success');
        setHasChanges(true);
    }, []);

    const handleAddSelectedTerm = useCallback((attributeId: number, termName: string) => {
        if (termName) {
            setProduct(prev => ({
                ...prev,
                attributes: prev.attributes.map(attr =>
                    attr.id === attributeId && !attr.options.includes(termName)
                        ? { ...attr, options: [...attr.options, termName] }
                        : attr
                ),
            }));
            setHasChanges(true);
        }
    }, []);

    const handleRemoveSelectedTerm = useCallback((attributeId: number, termName: string) => {
        setProduct(prev => ({
            ...prev,
            attributes: prev.attributes.map(attr =>
                attr.id === attributeId
                    ? { ...attr, options: attr.options.filter(option => option !== termName) }
                    : attr
            ),
        }));
        setHasChanges(true);
    }, []);

    const handleAttributeVisibleChange = useCallback((attributeId: number, isVisible: boolean) => {
        setProduct(prev => ({
            ...prev,
            attributes: prev.attributes.map(attr =>
                attr.id === attributeId ? { ...attr, visible: isVisible } : attr
            ),
        }));
        setHasChanges(true);
    }, []);

    const handleAttributeVariationChange = useCallback((attributeId: number, isVariation: boolean) => {
        setProduct(prev => ({
            ...prev,
            attributes: prev.attributes.map(attr =>
                attr.id === attributeId ? { ...attr, variation: isVariation } : attr
            ),
        }));
        setHasChanges(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        addToast('Création du produit en cours...', 'info');

        const productToSave = {
            ...product,
            regular_price: product.regular_price.toString(),
            sale_price: product.sale_price?.toString() || '',
        };

        const updatedMetaData = product.meta_data.filter(meta =>
            meta.key !== 'prix_achat' && meta.key !== 'cout_logisitique' &&
            meta.key !== 'prix_achat_total' && meta.key !== 'prix_vente_publique' &&
            meta.key !== 'marges' && meta.key !== 'prix_cession_vp' &&
            meta.key !== 'prix_site' && meta.key !== 'prix_cession_srp' &&
            meta.key !== 'prix_cession_bradery' && meta.key !== 'prix_cession_zalando' &&
            meta.key !== 'cas' && meta.key !== 'site_internet' && meta.key !== 'kchain' &&
            meta.key !== 'taille_dust_bag' && meta.key !== 'visuels'
        );

        updatedMetaData.push({ key: 'prix_achat', value: acfFields.prix_achat || '' });
        updatedMetaData.push({ key: 'cout_logisitique', value: acfFields.cout_logisitique || '' });
        updatedMetaData.push({ key: 'prix_achat_total', value: acfFields.prix_achat_total || '' });
        updatedMetaData.push({ key: 'prix_vente_publique', value: acfFields.prix_vente_publique || '' });
        updatedMetaData.push({ key: 'marges', value: acfFields.marges ? '1' : '0' });
        updatedMetaData.push({ key: 'prix_cession_vp', value: acfFields.prix_cession_vp || '' });
        updatedMetaData.push({ key: 'prix_site', value: acfFields.prix_site || '' });
        updatedMetaData.push({ key: 'prix_cession_srp', value: acfFields.prix_cession_srp || '' });
        updatedMetaData.push({ key: 'prix_cession_bradery', value: acfFields.prix_cession_bradery || '' });
        updatedMetaData.push({ key: 'prix_cession_zalando', value: acfFields.prix_cession_zalando || '' });
        updatedMetaData.push({ key: 'cas', value: acfFields.cas || '' });
        updatedMetaData.push({ key: 'site_internet', value: acfFields.site_internet ? '1' : '0' });
        updatedMetaData.push({ key: 'kchain', value: acfFields.kchain ? '1' : '0' });
        updatedMetaData.push({ key: 'taille_dust_bag', value: acfFields.taille_dust_bag || '' });
        updatedMetaData.push({ key: 'visuels', value: acfFields.visuels || '' });

        productToSave.meta_data = updatedMetaData;

        try {
            const response = await fetch(`/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productToSave),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la création du produit.');
            }

            addToast('Produit créé avec succès !', 'success');
            setHasChanges(false);
            router.push('/products');
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la création du produit.', 'error');
            console.error('Save error:', err);
            addToast(err.message || 'Erreur lors de la création du produit.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackClick = () => {
        if (hasChanges) {
            setNextRoute('/products');
            setShowConfirmModal(true);
        } else {
            router.push('/products');
        }
    };

    const handleConfirmLeave = () => {
        setShowConfirmModal(false);
        if (nextRoute) {
            setHasChanges(false);
            router.push(nextRoute);
        }
    };

    const handleCancelLeave = () => {
        setShowConfirmModal(false);
        setNextRoute(null);
    };

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasChanges) {
                event.preventDefault();
                event.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasChanges]);

    // Effet pour gérer l'affichage du bouton de défilement
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 200) { // Affiche le bouton après 200px de défilement
                setShowScrollButton(true);
            } else {
                setShowScrollButton(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };


    // Styles en ligne
    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxSizing: 'border-box',
        fontSize: '1em',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        outline: 'none',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
        color: '#555',
        fontSize: '0.95em',
    };

    const sectionStyle: React.CSSProperties = {
        marginBottom: '40px',
        padding: '25px',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    };

    const sectionTitleStyle: React.CSSProperties = {
        textAlign: 'center',
        color: '#333',
        marginBottom: '25px',
        fontSize: '1.8em',
        borderBottom: '2px solid #007bff',
        paddingBottom: '10px',
        display: 'inline-block',
        width: 'auto',
        margin: '0 auto 25px auto',
    };

    const subSectionStyle: React.CSSProperties = {
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #d0d0d0',
        borderRadius: '10px',
        backgroundColor: '#f8f8f8',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    };

    const removeButtonStyle: React.CSSProperties = {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    };

    const primaryButtonStyle: React.CSSProperties = {
        padding: '12px 25px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        marginTop: '30px',
        width: '100%',
        opacity: isSaving ? 0.7 : 1,
        transition: 'opacity 0.3s ease, background-color 0.3s ease',
    };

    const secondaryButtonStyle: React.CSSProperties = {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        width: 'calc(100% - 85px)',
        marginRight: '10px',
        minHeight: '40px',
    };

    const multiSelectContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
        minHeight: '40px',
        alignItems: 'center',
        cursor: 'text',
        boxSizing: 'border-box',
    };

    const selectedTagStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#e0f2fe',
        color: '#007bff',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '0.9em',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        border: '1px solid #a0d8ff',
    };

    const removeTagButtonStyle: React.CSSProperties = {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#007bff',
        fontSize: '1.1em',
        marginLeft: '8px',
        cursor: 'pointer',
        padding: '0 4px',
        lineHeight: '1',
        transition: 'color 0.2s ease',
    };

    const addTermSelectStyle: React.CSSProperties = {
        flexGrow: 1,
        minWidth: '150px',
        padding: '6px 10px',
        border: '1px dashed #ccc',
        borderRadius: '6px',
        fontSize: '0.9em',
        color: '#555',
        backgroundColor: '#f0f0f0',
        cursor: 'pointer',
    };

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

    const radioGroupStyle: React.CSSProperties = {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        marginTop: '5px',
    };

    const radioOptionStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#ccc',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: '#f0f0f0',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
    };

    const radioOptionSelectedStyle: React.CSSProperties = {
        backgroundColor: '#e0f2fe',
        borderColor: '#007bff',
        color: '#007bff',
        fontWeight: 'bold',
    };

    const toggleContainerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        marginLeft: '10px',
    };

    const toggleSwitchStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-block',
        width: '44px',
        height: '24px',
        margin: '0 10px',
    };

    const toggleInputStyle: React.CSSProperties = {
        opacity: 0,
        width: 0,
        height: 0,
    };

    const toggleSliderBaseStyle: React.CSSProperties = {
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ccc',
        transition: '.4s',
        borderRadius: '24px',
    };

    const toggleSliderBeforeStyle: React.CSSProperties = {
        position: 'absolute',
        content: '""',
        height: '16px',
        width: '16px',
        left: '4px',
        bottom: '4px',
        backgroundColor: 'white',
        transition: '.4s',
        borderRadius: '50%',
    };

    const toggleSliderCheckedStyle: React.CSSProperties = {
        backgroundColor: '#007bff',
    };

    const toggleSliderCheckedBeforeStyle: React.CSSProperties = {
        transform: 'translateX(20px)',
    };

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
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%',
        transform: 'scale(1)',
        transition: 'transform 0.3s ease-out',
    };

    const modalTitleStyle: React.CSSProperties = {
        fontSize: '1.6em',
        marginBottom: '20px',
        color: '#333',
        fontWeight: 'bold',
    };

    const modalMessageStyle: React.CSSProperties = {
        fontSize: '1.1em',
        marginBottom: '30px',
        color: '#555',
    };

    const modalButtonContainerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-around',
        gap: '15px',
    };

    const modalButtonStyle: React.CSSProperties = {
        padding: '12px 25px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
        flex: 1,
    };

    const modalCancelButtonStyle: React.CSSProperties = {
        ...modalButtonStyle,
        backgroundColor: '#6c757d',
        color: 'white',
    };

    const modalLeaveButtonStyle: React.CSSProperties = {
        ...modalButtonStyle,
        backgroundColor: '#dc3545',
        color: 'white',
    };

    const scrollToTopButtonStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '50%', // Bouton rond
        width: '50px',
        height: '50px',
        fontSize: '1.5em',
        display: showScrollButton ? 'flex' : 'none', // Afficher/cacher
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        transition: 'background-color 0.3s ease, opacity 0.3s ease, transform 0.3s ease',
        opacity: showScrollButton ? 1 : 0,
        transform: showScrollButton ? 'scale(1)' : 'scale(0.8)',
        zIndex: 999,
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '1.2em', color: '#007bff' }}>Chargement des données...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545', fontSize: '1.2em', fontWeight: 'bold' }}>Erreur: {error}</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '30px', fontFamily: 'Outfit, sans-serif', boxShadow: '0 0 20px rgba(0,0,0,0.1)', borderRadius: '15px', backgroundColor: '#f5f7fa' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <button
                    type="button"
                    onClick={handleBackClick}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1em',
                        fontWeight: 'bold',
                        transition: 'background-color 0.3s ease',
                    }}
                >
                    &larr; Retour aux produits
                </button>
                <h1 style={{ ...sectionTitleStyle, fontSize: '2.2em', margin: '0' }}>Créer un nouveau produit</h1>
                <div>{/* Placeholder pour alignement */}</div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Section Champs ACF */}
                <div style={sectionStyle}>
                    <h2 style={sectionTitleStyle}>DONNÉES FINANCIERES</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div>
                            <label htmlFor="prix_achat" style={labelStyle}>Prix d'achat (€):</label>
                            <input
                                type="number"
                                id="prix_achat"
                                name="prix_achat"
                                value={acfFields.prix_achat}
                                onChange={handleAcfChange}
                                step="0.01"
                                style={inputStyle}
                                placeholder="Entrez le prix d'achat"
                            />
                        </div>
                        <div>
                            <label htmlFor="cout_logisitique" style={labelStyle}>Coût logistique (€):</label>
                            <input
                                type="number"
                                id="cout_logisitique"
                                name="cout_logisitique"
                                value={acfFields.cout_logisitique}
                                onChange={handleAcfChange}
                                step="0.01"
                                style={inputStyle}
                                placeholder="Entrez le coût logistique"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_achat_total" style={labelStyle}>PRIX ACHAT TOTAL (€):</label>
                            <input
                                type="number"
                                id="prix_achat_total"
                                name="prix_achat_total"
                                value={acfFields.prix_achat_total}
                                readOnly
                                style={{ ...inputStyle, backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                                placeholder="Prix d'achat total"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_vente_publique" style={labelStyle}>PVP (€):</label>
                            <input
                                type="number"
                                id="prix_vente_publique"
                                name="prix_vente_publique"
                                value={acfFields.prix_vente_publique}
                                readOnly
                                style={{ ...inputStyle, backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                                placeholder="Prix de vente public"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_cession_vp" style={labelStyle}>PRIX DE CESSION VP (€):</label>
                            <input
                                type="number"
                                id="prix_cession_vp"
                                name="prix_cession_vp"
                                value={acfFields.prix_cession_vp}
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges}
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    color: ((parseFloat(acfFields.prix_cession_vp as string) || 0) < ((parseFloat(acfFields.prix_achat_total as string) || 0) - 0.005) && !acfFields.marges) ? '#dc3545' : inputStyle.color
                                }}
                                placeholder="Prix de cession VP"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_site" style={labelStyle}>PRIX SITE (€):</label>
                            <input
                                type="number"
                                id="prix_site"
                                name="prix_site"
                                value={acfFields.prix_site}
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges}
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    color: ((parseFloat(acfFields.prix_site as string) || 0) < ((parseFloat(acfFields.prix_achat_total as string) || 0) - 0.005) && !acfFields.marges) ? '#dc3545' : inputStyle.color
                                }}
                                placeholder="Prix site internet"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_cession_srp" style={labelStyle}>PRIX CESSION SRP (€):</label>
                            <input
                                type="number"
                                id="prix_cession_srp"
                                name="prix_cession_srp"
                                value={acfFields.prix_cession_srp}
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges}
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    color: ((parseFloat(acfFields.prix_cession_srp as string) || 0) < ((parseFloat(acfFields.prix_achat_total as string) || 0) - 0.005) && !acfFields.marges) ? '#dc3545' : inputStyle.color
                                }}
                                placeholder="Prix cession SRP"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_cession_bradery" style={labelStyle}>PRIX CESSION BRADERY (€):</label>
                            <input
                                type="number"
                                id="prix_cession_bradery"
                                name="prix_cession_bradery"
                                value={acfFields.prix_cession_bradery}
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges}
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    color: ((parseFloat(acfFields.prix_cession_bradery as string) || 0) < ((parseFloat(acfFields.prix_achat_total as string) || 0) - 0.005) && !acfFields.marges) ? '#dc3545' : inputStyle.color
                                }}
                                placeholder="Prix cession Bradery"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_cession_zalando" style={labelStyle}>PRIX CESSION ZALANDO (€):</label>
                            <input
                                type="number"
                                id="prix_cession_zalando"
                                name="prix_cession_zalando"
                                value={acfFields.prix_cession_zalando}
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges}
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    color: ((parseFloat(acfFields.prix_cession_zalando as string) || 0) < ((parseFloat(acfFields.prix_achat_total as string) || 0) - 0.005) && !acfFields.marges) ? '#dc3545' : inputStyle.color
                                }}
                                placeholder="Prix cession Zalando"
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={labelStyle}>MARGE AUTOMATIQUE:</label>
                            <label htmlFor="marges" style={toggleContainerStyle}>
                                <div style={toggleSwitchStyle}>
                                    <input
                                        type="checkbox"
                                        id="marges"
                                        name="marges"
                                        checked={acfFields.marges}
                                        onChange={handleAcfChange}
                                        style={toggleInputStyle}
                                    />
                                    <span style={{
                                        ...toggleSliderBaseStyle,
                                        ...(acfFields.marges ? toggleSliderCheckedStyle : {}),
                                    }}>
                                        <span style={{
                                            ...toggleSliderBeforeStyle,
                                            ...(acfFields.marges ? toggleSliderCheckedBeforeStyle : {}),
                                        }}></span>
                                    </span>
                                </div>
                            </label>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={labelStyle}>SITE INTERNET:</label>
                            <label htmlFor="site_internet" style={toggleContainerStyle}>
                                <div style={toggleSwitchStyle}>
                                    <input
                                        type="checkbox"
                                        id="site_internet"
                                        name="site_internet"
                                        checked={acfFields.site_internet}
                                        onChange={handleAcfChange}
                                        style={toggleInputStyle}
                                    />
                                    <span style={{
                                        ...toggleSliderBaseStyle,
                                        ...(acfFields.site_internet ? toggleSliderCheckedStyle : {}),
                                    }}>
                                        <span style={{
                                            ...toggleSliderBeforeStyle,
                                            ...(acfFields.site_internet ? toggleSliderCheckedBeforeStyle : {}),
                                        }}></span>
                                    </span>
                                </div>
                            </label>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={labelStyle}>KCHAIN:</label>
                            <label htmlFor="kchain" style={toggleContainerStyle}>
                                <div style={toggleSwitchStyle}>
                                    <input
                                        type="checkbox"
                                        id="kchain"
                                        name="kchain"
                                        checked={acfFields.kchain}
                                        onChange={handleAcfChange}
                                        style={toggleInputStyle}
                                    />
                                    <span style={{
                                        ...toggleSliderBaseStyle,
                                        ...(acfFields.kchain ? toggleSliderCheckedStyle : {}),
                                    }}>
                                        <span style={{
                                            ...toggleSliderBeforeStyle,
                                            ...(acfFields.kchain ? toggleSliderCheckedBeforeStyle : {}),
                                        }}></span>
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label htmlFor="cas" style={labelStyle}>CAS:</label>
                            <select
                                id="cas"
                                name="cas"
                                value={acfFields.cas}
                                onChange={handleAcfChange}
                                style={inputStyle}
                            >
                                <option value="">Choisir...</option>
                                {casOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>TAILLE DUST BAG:</label>
                            <div style={radioGroupStyle}>
                                {tailleDustBagOptions.map(option => (
                                    <label
                                        key={option.value}
                                        style={{
                                            ...radioOptionStyle,
                                            ...(acfFields.taille_dust_bag === option.value ? radioOptionSelectedStyle : {}),
                                        }}
                                        onClick={() => handleTailleDustBagToggle(option.value)}
                                    >
                                        <input type="hidden" name="taille_dust_bag" value={acfFields.taille_dust_bag} />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>VISUELS:</label>
                            <div style={radioGroupStyle}>
                                {visuelsOptions.map(option => (
                                    <label
                                        key={option.value}
                                        style={{
                                            ...radioOptionStyle,
                                            ...(acfFields.visuels === option.value ? radioOptionSelectedStyle : {}),
                                        }}
                                        onClick={() => handleVisuelsToggle(option.value)}
                                    >
                                        <input type="hidden" name="visuels" value={acfFields.visuels} />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sections avec Accordion */}
                <AccordionItem title="Informations Générales" panelKey="Informations Générales" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="name" style={labelStyle}>Nom du produit:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={product.name}
                            onChange={handleProductChange}
                            style={inputStyle}
                            required
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label htmlFor="regular_price" style={labelStyle}>Prix régulier (€):</label>
                            <input
                                type="number"
                                id="regular_price"
                                name="regular_price"
                                value={product.regular_price}
                                onChange={handleProductChange}
                                step="0.01"
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="sale_price" style={labelStyle}>Prix de solde (€):</label>
                            <input
                                type="number"
                                id="sale_price"
                                name="sale_price"
                                value={product.sale_price || ''}
                                onChange={handleProductChange}
                                step="0.01"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label htmlFor="stock_quantity" style={labelStyle}>Quantité en stock:</label>
                            <input
                                type="number"
                                id="stock_quantity"
                                name="stock_quantity"
                                value={product.stock_quantity !== null ? product.stock_quantity : ''}
                                onChange={handleProductChange}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label htmlFor="sku" style={labelStyle}>SKU:</label>
                            <input
                                type="text"
                                id="sku"
                                name="sku"
                                value={product.sku || ''}
                                onChange={handleProductChange}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="status" style={labelStyle}>Statut:</label>
                        <select
                            id="status"
                            name="status"
                            value={product.status}
                            onChange={handleProductChange}
                            style={inputStyle}
                        >
                            <option value="publish">Publié</option>
                            <option value="draft">Brouillon</option>
                            <option value="pending">En attente</option>
                        </select>
                    </div>
                </AccordionItem>

                <AccordionItem title="Description" panelKey="Description" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="description" style={labelStyle}>Description complète:</label>
                        <textarea
                            id="description"
                            name="description"
                            value={product.description}
                            onChange={handleProductChange}
                            rows={8}
                            style={inputStyle}
                        ></textarea>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="short_description" style={labelStyle}>Description courte:</label>
                        <textarea
                            id="short_description"
                            name="short_description"
                            value={product.short_description}
                            onChange={handleProductChange}
                            rows={4}
                            style={inputStyle}
                        ></textarea>
                    </div>
                </AccordionItem>

                <AccordionItem title="Image du Produit" panelKey="Image du Produit" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="imageUrl" style={labelStyle}>URL de l'image principale:</label>
                        <input
                            type="text"
                            id="imageUrl"
                            name="imageUrl"
                            value={product.images && product.images.length > 0 ? product.images[0].src : ''}
                            onChange={handleImageChange}
                            placeholder="Ex: https://example.com/image.jpg"
                            style={inputStyle}
                        />
                        {product.images && product.images.length > 0 && product.images[0].src && (
                            <div style={{ marginTop: '20px', textAlign: 'center', padding: '15px', border: '1px dashed #ccc', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                <Image
                                    src={product.images[0].src}
                                    alt={product.images[0].name || product.name}
                                    width={200}
                                    height={200}
                                    style={{ objectFit: 'contain', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                    priority={false}
                                />
                            </div>
                        )}
                    </div>
                </AccordionItem>

                <AccordionItem title="Attributs du Produit" panelKey="Attributs du Produit" openAccordion={openAccordion} setOpenAccordion={setOpenAccordion}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', alignItems: 'flex-end' }}>
                        <div style={{ flexGrow: 1 }}>
                            <label htmlFor="addAttributeSelect" style={labelStyle}>Ajouter un attribut global:</label>
                            <select
                                id="addAttributeSelect"
                                value={newAttributeSelection}
                                onChange={(e) => setNewAttributeSelection(e.target.value)}
                                style={selectStyle}
                                disabled={allGlobalAttributes.length === 0}
                            >
                                <option value="">Sélectionner un attribut...</option>
                                {allGlobalAttributes
                                    .filter(attr => !product.attributes.some(prodAttr => prodAttr.id === attr.id))
                                    .map(attr => (
                                        <option key={attr.id} value={attr.id}>{attr.name}</option>
                                    ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddAttribute}
                            disabled={!newAttributeSelection || isSaving}
                            style={secondaryButtonStyle}
                        >
                            Ajouter
                        </button>
                    </div>

                    {product.attributes.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '20px', border: '1px dashed #e0e0e0', borderRadius: '8px' }}>Aucun attribut ajouté à ce produit.</p>
                    ) : (
                        product.attributes.map(attr => (
                            <div key={attr.id || attr.name} style={subSectionStyle}>
                                <h3 style={{ marginTop: '0', marginBottom: '15px', fontSize: '1.3em', color: '#007bff' }}>{attr.name}</h3>
                                <button type="button" onClick={() => handleRemoveAttribute(attr.id!, attr.name)} style={removeButtonStyle}>Supprimer</button>

                                {attr.id ? (
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Termes (valeurs) sélectionnés:</label>
                                        <div style={multiSelectContainerStyle}>
                                            {attr.options.map((option, idx) => (
                                                <div key={idx} style={selectedTagStyle}>
                                                    {option}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSelectedTerm(attr.id!, option)}
                                                        style={removeTagButtonStyle}
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                            <select
                                                value=""
                                                onChange={(e) => handleAddSelectedTerm(attr.id!, e.target.value)}
                                                style={addTermSelectStyle}
                                            >
                                                <option value="">Ajouter un terme...</option>
                                                {availableAttributeTerms[attr.id] && availableAttributeTerms[attr.id]
                                                    .filter(term => !attr.options.includes(term.name))
                                                    .map(term => (
                                                        <option key={term.id} value={term.name}>
                                                            {term.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>Cliquez sur "Ajouter un terme..." pour sélectionner des valeurs. Cliquez sur 'x' pour supprimer un tag.</small>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Valeurs personnalisées (séparées par une virgule):</label>
                                        <input
                                            type="text"
                                            value={attr.options.join(', ')}
                                            onChange={(e) => setProduct(prev => ({
                                                ...prev,
                                                attributes: prev.attributes.map(pa => pa.name === attr.name ? { ...pa, options: e.target.value.split(',').map(s => s.trim()) } : pa)
                                            }))}
                                            style={inputStyle}
                                            placeholder="Ex: Rouge, Bleu, Vert"
                                        />
                                        <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>Entrez les valeurs séparées par des virgules.</small>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', color: '#555' }}>
                                        <input
                                            type="checkbox"
                                            checked={attr.visible}
                                            onChange={(e) => handleAttributeVisibleChange(attr.id!, e.target.checked)}
                                            style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                                        />
                                        Visible sur la page produit
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', color: '#555' }}>
                                        <input
                                            type="checkbox"
                                            checked={attr.variation}
                                            onChange={(e) => handleAttributeVariationChange(attr.id!, e.target.checked)}
                                            style={{ marginRight: '8px', transform: 'scale(1.2)' }}
                                        />
                                        Utilisé pour les variations
                                    </label>
                                </div>
                            </div>
                        ))
                    )}
                </AccordionItem>

                {/* Bouton de sauvegarde */}
                <button
                    type="submit"
                    disabled={isSaving}
                    style={primaryButtonStyle}
                >
                    {isSaving ? 'Création en cours...' : 'Créer le produit'}
                </button>
            </form>

            {/* Bouton de défilement vers le haut */}
            <button
                onClick={scrollToTop}
                style={scrollToTopButtonStyle}
            >
                ↑
            </button>

            {/* Modale de confirmation (conditionnellement rendue) */}
            {showConfirmModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={modalTitleStyle}>Changements non sauvegardés</h3>
                        <p style={modalMessageStyle}>Vous avez des modifications non sauvegardées. Voulez-vous quitter sans sauvegarder ?</p>
                        <div style={modalButtonContainerStyle}>
                            <button onClick={handleCancelLeave} style={modalCancelButtonStyle}>
                                Rester
                            </button>
                            <button onClick={handleConfirmLeave} style={modalLeaveButtonStyle}>
                                Quitter sans sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
