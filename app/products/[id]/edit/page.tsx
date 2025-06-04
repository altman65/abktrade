'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';

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
    id: number;
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
    // Ajoutez d'autres champs si vous les utilisez dans votre formulaire
}

interface GlobalAttribute {
    id: number;
    name: string;
    slug: string;
    type: string; // "select", "text" etc.
    // D'autres propriétés de l'attribut global peuvent exister mais ne sont pas utilisées ici.
}

interface AttributeTerm {
    id: number;
    name: string;
    slug: string;
    // D'autres propriétés du terme peuvent exister.
}

// Interface pour les toasts (copiée de page.tsx pour la cohérence)
interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info'; // 'success', 'error' ou 'info' pour le style
}

// Nouveau composant AccordionItem
interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    panelKey: string; // Clé unique pour cet élément d'accordéon
    openAccordion: string | null; // L'accordéon actuellement ouvert (sa clé)
    setOpenAccordion: (key: string | null) => void; // Fonction pour définir l'accordéon ouvert
}

interface AcfProductFields {
  prix_achat: string;
  cout_logisitique: string;
  prix_achat_total: string;
  prix_vente_publique: string;
  marges: boolean;
  prix_cession_vp: string;
  prix_site: string;
  prix_cession_srp: string;
  prix_cession_bradery: string;
  prix_cession_zalando: string;
  cas: string;
  site_internet: boolean;
  kchain: boolean;
  taille_dust_bag: string;
  visuels: string;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, panelKey, openAccordion, setOpenAccordion }) => {
    const isCollapsed = openAccordion !== panelKey; // L'état est maintenant dérivé du parent
    const contentRef = useRef<HTMLDivElement>(null);

    const toggleCollapse = () => {
        // Si cet accordéon est déjà ouvert, le fermer (set à null)
        // Sinon, l'ouvrir (set à sa propre clé)
        setOpenAccordion(isCollapsed ? panelKey : null);
    };

    const accordionHeaderStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px', // Réduit le padding pour une hauteur plus petite
        backgroundColor: '#007bff',
        color: 'white',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.1em', // Réduit la taille de la police
        fontWeight: 'bold',
        marginBottom: '10px',
        transition: 'background-color 0.3s ease',
    };

    const accordionContentWrapperStyle: React.CSSProperties = {
        // Utilise scrollHeight pour une transition fluide, mais seulement si l'élément est monté
        // Ajout d'un buffer de 40px pour s'assurer que le contenu n'est pas coupé
        maxHeight: isCollapsed ? '0' : (contentRef.current ? `${contentRef.current.scrollHeight + 40}px` : 'auto'),
        overflow: 'hidden',
        transition: 'max-height 0.5s ease-in-out, padding 0.5s ease-in-out', // Ajout de padding à la transition
        padding: isCollapsed ? '0 20px' : '20px', // Ajuste le padding basé sur l'état
        border: isCollapsed ? 'none' : '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        boxSizing: 'border-box',
    };

    // Pour s'assurer que le scrollHeight est correctement calculé après le premier rendu
    useEffect(() => {
        if (!isCollapsed && contentRef.current) {
            // Set maxHeight to scrollHeight + a buffer once it's opened
            contentRef.current.style.maxHeight = `${contentRef.current.scrollHeight + 40}px`; // Add buffer
        }
    }, [isCollapsed]);


    const arrowStyle: React.CSSProperties = {
        fontSize: '1.2em', // Réduit la taille de la flèche
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
                <div style={{ padding: isCollapsed ? '0' : '0' }}> {/* Inner div to control padding when expanded */}
                    {children}
                </div>
            </div>
        </div>
    );
};


export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string; // Récupère l'ID du produit depuis l'URL

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false); // Nouvel état pour suivre les modifications
    const [showConfirmModal, setShowConfirmModal] = useState(false); // État pour afficher la modale de confirmation
    const [nextRoute, setNextRoute] = useState<string | null>(null); // Pour stocker la route de destination
    const [showScrollButton, setShowScrollButton] = useState(false); // État pour le bouton de défilement

    // État pour gérer l'accordéon actuellement ouvert
    const [openAccordion, setOpenAccordion] = useState<string | null>(null); // Initialisé à null pour tout fermer par défaut

    // États pour la gestion des attributs
    const [allGlobalAttributes, setAllGlobalAttributes] = useState<GlobalAttribute[]>([]);
    const [availableAttributeTerms, setAvailableAttributeTerms] = useState<{ [attributeId: number]: AttributeTerm[] }>({});
    const [newAttributeSelection, setNewAttributeSelection] = useState<string>(''); // Pour le select d'ajout d'attribut

    // Définition des options pour les champs radio, sans l'option "NON DEFINI" explicite
    const tailleDustBagOptions = [
        { value: 's', label: 'S' },
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
        { value: 'xl', label: 'XL' },
    ];

    // Options pour 'visuels' sans l'option "AUCUN" explicite
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


    // État pour les champs ACF
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
        taille_dust_bag: '', // Défaut à la valeur vide
        visuels: '', // Défaut à la valeur vide
        site_internet: false,
        kchain: false,
    });

    // États pour les toasts (copiés de page.tsx pour la cohérence)
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextToastId = useRef(0);

    // Nouvelle fonction pour ajouter un toast (copiée de page.tsx)
    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = nextToastId.current++;
        setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

        // Supprimer le toast après 5 secondes
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);


    // --- Fonctions de récupération des données ---

    // Récupère le produit existant et ses attributs
    useEffect(() => {
        const fetchProductAndAttributes = async () => {
            if (!productId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // 1. Récupérer le produit
                const productResponse = await fetch(`/api/products/${productId}`);
                if (!productResponse.ok) {
                    throw new Error('Failed to fetch product');
                }
                const productData: Product = await productResponse.json();
                setProduct(productData);

                // Extraction des champs ACF de meta_data
 // Utilisation de l’interface :
const extractedAcfData: AcfProductFields = {
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
  site_internet: false,
  kchain: false,
  taille_dust_bag: '',
  visuels: '',
};

	productData.meta_data.forEach(meta => {
                    if (meta.key === 'prix_achat') {
                        extractedAcfData.prix_achat = parseFloat(meta.value) || '';
                    } else if (meta.key === 'cout_logisitique') {
                        extractedAcfData.cout_logisitique = parseFloat(meta.value) || '';
                    }
                    else if (meta.key === 'prix_achat_total') {
                        extractedAcfData.prix_achat_total = parseFloat(meta.value) || '';
                    } else if (meta.key === 'prix_vente_publique') {
                        extractedAcfData.prix_vente_publique = parseFloat(meta.value) || '';
                    } else if (meta.key === 'marges') {
                        extractedAcfData.marges = (meta.value === '1' || meta.value === true);
                    } else if (meta.key === 'prix_cession_vp') {
                        extractedAcfData.prix_cession_vp = parseFloat(meta.value) || '';
                    } else if (meta.key === 'prix_site') {
                        extractedAcfData.prix_site = parseFloat(meta.value) || '';
                    } else if (meta.key === 'prix_cession_srp') {
                        extractedAcfData.prix_cession_srp = parseFloat(meta.value) || '';
                    } else if (meta.key === 'prix_cession_bradery') {
                        extractedAcfData.prix_cession_bradery = parseFloat(meta.value) || '';
                    } else if (meta.key === 'prix_cession_zalando') {
                        extractedAcfData.prix_cession_zalando = parseFloat(meta.value) || '';
                    } else if (meta.key === 'cas') {
                        // Vérifie si la valeur extraite est une option valide, sinon vide
                        extractedAcfData.cas = casOptions.some(opt => opt.value === meta.value) ? meta.value : '';
                    } else if (meta.key === 'site_internet') {
                        extractedAcfData.site_internet = (meta.value === '1' || meta.value === true);
                    } else if (meta.key === 'kchain') {
                        extractedAcfData.kchain = (meta.value === '1' || meta.value === true);
                    } else if (meta.key === 'taille_dust_bag') {
                        // Si la valeur extraite est non définie ou vide, utilisez la valeur vide
                        // La valeur 'non défini' n'est plus une option valide, donc si c'était le cas, on la vide
                        extractedAcfData.taille_dust_bag = tailleDustBagOptions.some(opt => opt.value === meta.value) ? meta.value : '';
                    } else if (meta.key === 'visuels') {
                        // Si la valeur extraite est non définie ou vide, utilisez la valeur vide
                        extractedAcfData.visuels = visuelsOptions.some(opt => opt.value === meta.value) ? meta.value : '';
                    }
                });

                // Calcul initial de prix_achat_total
                const prixAchat = parseFloat(extractedAcfData.prix_achat) || 0;
                const coutLogistique = parseFloat(extractedAcfData.cout_logisitique) || 0;
                extractedAcfData.prix_achat_total = (prixAchat + coutLogistique).toFixed(2); // Arrondi à 2 décimales

                setAcfFields(extractedAcfData);

                // 2. Récupérer tous les attributs globaux disponibles
                const globalAttributesResponse = await fetch('/api/attributes');
                if (!globalAttributesResponse.ok) {
                    throw new Error('Failed to fetch global attributes');
                }
                const globalAttributesData: GlobalAttribute[] = await globalAttributesResponse.json();
                setAllGlobalAttributes(globalAttributesData);

                // 3. Pour chaque attribut déjà attaché au produit, récupérer ses termes disponibles
                const termsPromises = productData.attributes
                    .filter(attr => attr.id) // Ne traiter que les attributs globaux (ceux avec un ID)
                    .map(async (attr) => {
                        const termsResponse = await fetch(`/api/attributes?attributeId=${attr.id}`);
                        if (!termsResponse.ok) {
                            console.warn(`Failed to fetch terms for attribute ID ${attr.id}`);
                            return { attributeId: attr.id, terms: [] };
                        }
                        const termsData: AttributeTerm[] = await termsResponse.json();
                        return { attributeId: attr.id, terms: termsData };
                    });

                const fetchedTerms = await Promise.all(termsPromises);
                const termsMap: { [attributeId: number]: AttributeTerm[] } = {};
                fetchedTerms.forEach(item => {
                    if (item.attributeId) {
                        termsMap[item.attributeId] = item.terms;
                    }
                });
                setAvailableAttributeTerms(termsMap);

                setError(null);
            } catch (err: any) {
                setError(err.message || 'Error fetching product or attributes');
                console.error(err);
                addToast(err.message || 'Erreur lors du chargement des données du produit.', 'error');
            } finally {
                setLoading(false);
                setHasChanges(false); // Réinitialiser les changements après le chargement initial
            }
        };
        fetchProductAndAttributes();
    }, [productId, addToast]);

    // Effet pour recalculer prix_achat_total lorsque prix_achat ou cout_logisitique changent
    useEffect(() => {
        const prixAchat = parseFloat(acfFields.prix_achat as string) || 0;
        const coutLogistique = parseFloat(acfFields.cout_logisitique as string) || 0;
        const newPrixAchatTotal = (prixAchat + coutLogistique).toFixed(2);

        // Mettre à jour l'état seulement si la valeur calculée est différente
        // Cela évite les boucles infinies si le calcul aboutit à la même valeur
        if (newPrixAchatTotal !== acfFields.prix_achat_total.toString()) {
            setAcfFields(prev => ({
                ...prev,
                prix_achat_total: parseFloat(newPrixAchatTotal), // Stocker comme nombre si possible, ou chaîne si WooCommerce l'attend
            }));
            setHasChanges(true); // Marquer qu'il y a des changements
        }
    }, [acfFields.prix_achat, acfFields.cout_logisitique, acfFields.prix_achat_total]); // Dépendances

    // Ref pour stocker la valeur précédente de acfFields.marges
    const prevMargesRef = useRef(acfFields.marges);

    // Effet pour recalculer les prix de cession lorsque marges ou prix_achat_total changent
    useEffect(() => {
        const prixAchatTotal = parseFloat(acfFields.prix_achat_total as string) || 0;
        const currentMarges = acfFields.marges;
        const prevMarges = prevMargesRef.current;

        setAcfFields(prev => {
            const newAcfFields = { ...prev };

            // Si marges vient de passer à Vrai, calculer les valeurs
            if (currentMarges && !prevMarges) {
                const calculatedValue = (prixAchatTotal * 2).toFixed(2);
                newAcfFields.prix_cession_vp = parseFloat(calculatedValue);
                newAcfFields.prix_site = parseFloat(calculatedValue);
                newAcfFields.prix_cession_srp = parseFloat(calculatedValue);
                newAcfFields.prix_cession_bradery = parseFloat(calculatedValue);
                newAcfFields.prix_cession_zalando = parseFloat(calculatedValue);
            }
            // Si marges vient de passer à Faux, vider les champs
            else if (!currentMarges && prevMarges) {
                newAcfFields.prix_cession_vp = '';
                newAcfFields.prix_site = '';
                newAcfFields.prix_cession_srp = '';
                newAcfFields.prix_cession_bradery = '';
                newAcfFields.prix_cession_zalando = '';
            }
            // Si marges est Vrai et prix_achat_total change, recalculer
            else if (currentMarges && prevMarges && prixAchatTotal !== (parseFloat(prev.prix_achat_total as string) || 0)) {
                 const calculatedValue = (prixAchatTotal * 2).toFixed(2);
                newAcfFields.prix_cession_vp = parseFloat(calculatedValue);
                newAcfFields.prix_site = parseFloat(calculatedValue);
                newAcfFields.prix_cession_srp = parseFloat(calculatedValue);
                newAcfFields.prix_cession_bradery = parseFloat(calculatedValue);
                newAcfFields.prix_cession_zalando = parseFloat(calculatedValue);
            }
            // Sinon, ne rien faire pour permettre la saisie manuelle quand marges est Faux
            return newAcfFields;
        });

        // Mettre à jour la ref pour le prochain rendu
        prevMargesRef.current = currentMarges;
        setHasChanges(true); // Marquer qu'il y a des changements

    }, [
        acfFields.marges,
        acfFields.prix_achat_total,
        // Removed individual price cession fields from dependencies as this effect now *sets* them
    ]);


    // --- Fonctions de gestion des attributs dans l'UI ---

    // Gère les changements des champs de base du produit
    const handleProductChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;

        setProduct(prev => {
            if (!prev) return null;

            let newValue: string | number | boolean = value;
            if (type === 'number') {
                newValue = parseFloat(value);
                if (isNaN(newValue)) newValue = ''; // Gérer le cas où l'input est vide
            }
            if (type === 'checkbox') {
                newValue = checked;
            }

            return { ...prev, [name]: newValue };
        });
        setHasChanges(true); // Marquer qu'il y a des changements
    }, []);

    // Gère le changement de l'URL de l'image principale
    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const imageUrl = e.target.value;
        setProduct(prev => {
            if (!prev) return null;
            return { ...prev, images: imageUrl ? [{ src: imageUrl }] : [] };
        });
        setHasChanges(true); // Marquer qu'il y a des changements
    }, []);

    // Gère les changements des champs ACF (pour les inputs standards et toggles)
    const handleAcfChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target;
        setAcfFields(prev => {
            if (type === 'number') {
                return { ...prev, [name]: parseFloat(value) || '' };
            }
            if (type === 'checkbox') { // Pour les toggles, c'est toujours un checkbox en arrière-plan
                return { ...prev, [name]: checked };
            }
            return { ...prev, [name]: value };
        });
        setHasChanges(true); // Marquer qu'il y a des changements
    }, []);

    // Fonction pour gérer le basculement du champ 'taille_dust_bag'
    const handleTailleDustBagToggle = useCallback((selectedValue: string) => {
        setAcfFields(prev => {
            // Si la valeur cliquée est déjà sélectionnée, la désélectionner (mettre à vide)
            if (prev.taille_dust_bag === selectedValue) {
                return { ...prev, taille_dust_bag: '' };
            }
            // Sinon, sélectionner la nouvelle valeur
            return { ...prev, taille_dust_bag: selectedValue };
        });
        setHasChanges(true); // Marquer qu'il y a des changements
    }, []);

    // Fonction pour gérer le basculement du champ 'visuels'
    const handleVisuelsToggle = useCallback((selectedValue: string) => {
        setAcfFields(prev => {
            // Si la valeur cliquée est déjà sélectionnée, la désélectionner (mettre à vide)
            if (prev.visuels === selectedValue) {
                return { ...prev, visuels: '' };
            }
            // Sinon, sélectionner la nouvelle valeur
            return { ...prev, visuels: selectedValue };
        });
        setHasChanges(true); // Marquer qu'il y a des changements
    }, []);


    // Fonction pour ajouter un attribut au produit
    const handleAddAttribute = async () => {
        if (newAttributeSelection && product) {
            const selectedAttrId = parseInt(newAttributeSelection, 10);
            const selectedAttr = allGlobalAttributes.find(attr => attr.id === selectedAttrId);

            // Vérifier si l'attribut n'est pas déjà ajouté
            if (selectedAttr && !product.attributes.some(attr => attr.id === selectedAttrId)) {
                try {
                    // Récupérer les termes pour l'attribut nouvellement ajouté
                    const termsResponse = await fetch(`/api/attributes?attributeId=${selectedAttrId}`);
                    if (!termsResponse.ok) {
                        throw new Error('Failed to fetch attribute terms');
                    }
                    const terms: AttributeTerm[] = await termsResponse.json();
                    setAvailableAttributeTerms(prev => ({
                        ...prev,
                        [selectedAttrId]: terms // Stocke tous les termes disponibles pour cet attribut
                    }));

                    const newProductAttribute: ProductAttribute = {
                        id: selectedAttr.id,
                        name: selectedAttr.name,
                        position: product.attributes.length, // Nouvelle position à la fin
                        visible: true, // Visible par défaut
                        variation: false, // Non utilisé pour les variations par défaut
                        options: [], // Aucune option sélectionnée au début
                    };

                    setProduct(prev => ({
                        ...(prev as Product),
                        attributes: [...(prev?.attributes || []), newProductAttribute],
                    }));
                    setNewAttributeSelection(''); // Réinitialiser le select
                    addToast(`Attribut "${selectedAttr.name}" ajouté.`, 'success');
                    setHasChanges(true); // Marquer qu'il y a des changements
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

    // Fonction pour supprimer un attribut du produit
    const handleRemoveAttribute = useCallback((attributeId: number, attributeName: string) => {
        if (product) {
            setProduct(prev => ({
                ...(prev as Product),
                attributes: prev?.attributes.filter(attr => attr.id !== attributeId) || [],
            }));
            // Optionnel: Nettoyer les termes disponibles si l'attribut n'est plus utilisé
            setAvailableAttributeTerms(prev => {
                const newTerms = { ...prev };
                delete newTerms[attributeId];
                return newTerms;
            });
            addToast(`Attribut "${attributeName}" supprimé.`, 'success');
            setHasChanges(true); // Marquer qu'il y a des changements
        }
    }, [product, addToast]);

    // Fonction pour ajouter un terme sélectionné à un attribut (pour la nouvelle UI de sélection)
    const handleAddSelectedTerm = useCallback((attributeId: number, termName: string) => {
        if (product && termName) {
            setProduct(prev => ({
                ...(prev as Product),
                attributes: prev?.attributes.map(attr =>
                    attr.id === attributeId && !attr.options.includes(termName)
                        ? { ...attr, options: [...attr.options, termName] }
                        : attr
                ) || [],
            }));
            setHasChanges(true); // Marquer qu'il y a des changements
        }
    }, [product]);

    // Fonction pour supprimer un terme sélectionné d'un attribut (pour la nouvelle UI de sélection)
    const handleRemoveSelectedTerm = useCallback((attributeId: number, termName: string) => {
        if (product) {
            setProduct(prev => ({
                ...(prev as Product),
                attributes: prev?.attributes.map(attr =>
                    attr.id === attributeId
                        ? { ...attr, options: attr.options.filter(option => option !== termName) }
                        : attr
                ) || [],
            }));
            setHasChanges(true); // Marquer qu'il y a des changements
        }
    }, [product]);


    // Fonction pour gérer la case à cocher "Visible sur la page produit"
    const handleAttributeVisibleChange = useCallback((attributeId: number, isVisible: boolean) => {
        if (product) {
            setProduct(prev => ({
                ...(prev as Product),
                attributes: prev?.attributes.map(attr =>
                    attr.id === attributeId ? { ...attr, visible: isVisible } : attr
                ) || [],
            }));
            setHasChanges(true); // Marquer qu'il y a des changements
        }
    }, [product]);

    // Fonction pour gérer la case à coocher "Utilisé pour les variations"
    const handleAttributeVariationChange = useCallback((attributeId: number, isVariation: boolean) => {
        if (product) {
            setProduct(prev => ({
                ...(prev as Product),
                attributes: prev?.attributes.map(attr =>
                    attr.id === attributeId ? { ...attr, variation: isVariation } : attr
                ) || [],
            }));
            setHasChanges(true); // Marquer qu'il y a des changements
        }
    }, [product]);


    // --- Fonction de soumission du formulaire ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setIsSaving(true);
        setError(null);
        addToast('Sauvegarde du produit en cours...', 'info');

        // Préparation des données à envoyer à l'API WooCommerce
        const productToSave = {
            ...product,
            // Assurez-vous que les prix sont des chaînes comme attendu par WooCommerce
            regular_price: product.regular_price.toString(),
            sale_price: product.sale_price?.toString() || '',
            // L'ID ne doit pas être envoyé dans le corps pour une requête PUT
            id: undefined,
        };

        // Mise à jour de meta_data avec les champs ACF
        // Commencez par filtrer toutes les meta_data qui sont des champs ACF que nous gérons
        const updatedMetaData = product.meta_data.filter(meta =>
            meta.key !== 'prix_achat' &&
            meta.key !== 'cout_logisitique' &&
            meta.key !== 'prix_achat_total' &&
            meta.key !== 'prix_vente_publique' &&
            meta.key !== 'marges' &&
            meta.key !== 'prix_cession_vp' &&
            meta.key !== 'prix_site' &&
            meta.key !== 'prix_cession_srp' &&
            meta.key !== 'prix_cession_bradery' &&
            meta.key !== 'prix_cession_zalando' &&
            meta.key !== 'cas' &&
            meta.key !== 'site_internet' &&
            meta.key !== 'kchain' &&
            meta.key !== 'taille_dust_bag' &&
            meta.key !== 'visuels'
        );

        // Ajoute les champs ACF mis à jour
        updatedMetaData.push({ key: 'prix_achat', value: acfFields.prix_achat || '' });
        updatedMetaData.push({ key: 'cout_logisitique', value: acfFields.cout_logisitique || '' });
        updatedMetaData.push({ key: 'prix_achat_total', value: acfFields.prix_achat_total || '' });
        updatedMetaData.push({ key: 'prix_vente_publique', value: acfFields.prix_vente_publique || '' });
        updatedMetaData.push({ key: 'marges', value: acfFields.marges ? '1' : '0' }); // Boolean to '1' or '0'
        updatedMetaData.push({ key: 'prix_cession_vp', value: acfFields.prix_cession_vp || '' });
        updatedMetaData.push({ key: 'prix_site', value: acfFields.prix_site || '' });
        updatedMetaData.push({ key: 'prix_cession_srp', value: acfFields.prix_cession_srp || '' });
        updatedMetaData.push({ key: 'prix_cession_bradery', value: acfFields.prix_cession_bradery || '' });
        updatedMetaData.push({ key: 'prix_cession_zalando', value: acfFields.prix_cession_zalando || '' });
        updatedMetaData.push({ key: 'cas', value: acfFields.cas || '' });
        updatedMetaData.push({ key: 'site_internet', value: acfFields.site_internet ? '1' : '0' }); // Boolean to '1' or '0'
        updatedMetaData.push({ key: 'kchain', value: acfFields.kchain ? '1' : '0' }); // Boolean to '1' or '0'
        updatedMetaData.push({ key: 'taille_dust_bag', value: acfFields.taille_dust_bag || '' });
        updatedMetaData.push({ key: 'visuels', value: acfFields.visuels || '' });

        productToSave.meta_data = updatedMetaData;


        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productToSave),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la sauvegarde du produit.');
            }

            addToast('Produit mis à jour avec succès !', 'success');
            setHasChanges(false); // Réinitialiser les changements après la sauvegarde
            router.push('/products'); // Rediriger vers la liste des produits
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la sauvegarde du produit.', 'error');
            console.error('Save error:', err);
            addToast(err.message || 'Erreur lors de la sauvegarde du produit.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Fonctions de gestion de la navigation avec avertissement ---
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
            setHasChanges(false); // Réinitialiser les changements avant de quitter
            router.push(nextRoute);
        }
    };

    const handleCancelLeave = () => {
        setShowConfirmModal(false);
        setNextRoute(null);
    };

    // Effet pour gérer l'avertissement avant de quitter la page (rechargement, fermeture d'onglet)
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (hasChanges) {
                event.preventDefault();
                event.returnValue = ''; // Message personnalisé (non affiché par la plupart des navigateurs modernes)
                return ''; // Pour certains navigateurs plus anciens
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Nettoyage de l'écouteur d'événement
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


    if (loading) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '1.2em', color: '#007bff' }}>Chargement du produit...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: '20px', color: '#dc3545', fontSize: '1.2em', fontWeight: 'bold' }}>Erreur: {error}</div>;
    if (!product) return <div style={{ textAlign: 'center', padding: '20px', fontSize: '1.2em', color: '#666' }}>Produit non trouvé.</div>;

    // Styles en ligne pour les éléments du formulaire
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
        width: 'calc(100% - 85px)', // Ajustement pour le bouton "Ajouter"
        marginRight: '10px',
        minHeight: '40px', // Pour les selects simples
    };

    // --- Styles pour la sélection d'attributs multi-lignes (tags) ---
    const multiSelectContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap', // Permet aux tags de passer à la ligne
        gap: '8px', // Espace entre les tags
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
        minHeight: '40px', // Hauteur minimale
        alignItems: 'center',
        cursor: 'text', // Indique que c'est une zone de sélection
        boxSizing: 'border-box',
    };

    const selectedTagStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#e0f2fe', // Un bleu clair pour le tag
        color: '#007bff',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '0.9em',
        fontWeight: 'bold',
        whiteSpace: 'nowrap', // Empêche le texte du tag de se briser
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
        flexGrow: 1, // Prend l'espace restant
        minWidth: '150px', // Largeur minimale pour le select d'ajout
        padding: '6px 10px',
        border: '1px dashed #ccc', // Bordure en pointillés pour indiquer l'ajout
        borderRadius: '6px',
        fontSize: '0.9em',
        color: '#555',
        backgroundColor: '#f0f0f0',
        cursor: 'pointer',
    };

    // Styles pour les toasts (copiés de page.tsx)
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

    // Styles spécifiques pour les groupes de radio/boutons
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

    // NOUVEAUX STYLES POUR LE TOGGLE
    const toggleContainerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none', // Empêche la sélection du texte
        marginLeft: '10px', // Pour l'espacement avec le label
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
        borderRadius: '24px', // Pour un slider arrondi
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
        borderRadius: '50%', // Pour un cercle
    };

    const toggleSliderCheckedStyle: React.CSSProperties = {
        backgroundColor: '#007bff', // Couleur quand activé
    };

    const toggleSliderCheckedBeforeStyle: React.CSSProperties = {
        transform: 'translateX(20px)', // Déplace le cercle
    };

    // Styles pour la modale de confirmation
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
        flex: 1, // Pour que les boutons prennent la même largeur
    };

    const modalCancelButtonStyle: React.CSSProperties = {
        ...modalButtonStyle,
        backgroundColor: '#6c757d', // Gris
        color: 'white',
    };

    const modalLeaveButtonStyle: React.CSSProperties = {
        ...modalButtonStyle,
        backgroundColor: '#dc3545', // Rouge
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
                        backgroundColor: '#6c757d', // Gris pour le bouton retour
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
                <h1 style={{ ...sectionTitleStyle, fontSize: '2.2em', margin: '0' }}>Éditer le produit : {product.name}</h1>
                <div>{/* Placeholder pour alignement */}</div>
            </div>


            <form onSubmit={handleSubmit}>
                {/* Section Champs ACF - Déplacée en tête */}
                <div style={sectionStyle}>
                    <h2 style={sectionTitleStyle}>DONNÉES FINANCIERES</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        {/* Champs numériques */}
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
                                readOnly // Rendu en lecture seule
                                style={{ ...inputStyle, backgroundColor: '#e9ecef', cursor: 'not-allowed' }} // Grisé et curseur non autorisé
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
                                readOnly // Rendu en lecture seule
                                style={{ ...inputStyle, backgroundColor: '#e9ecef', cursor: 'not-allowed' }} // Grisé et curseur non autorisé
                                placeholder="Prix de vente public"
                            />
                        </div>
                        <div>
                            <label htmlFor="prix_cession_vp" style={labelStyle}>PRIX DE CESSION VP (€):</label>
                            <input
                                type="number"
                                id="prix_cession_vp"
                                name="prix_cession_vp"
                                value={acfFields.prix_cession_vp} // Toujours lié à l'état directement
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges} // Readonly si marges est true
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    // Condition pour la couleur rouge
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
                                value={acfFields.prix_site} // Toujours lié à l'état directement
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges} // Readonly si marges est true
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    // Condition pour la couleur rouge
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
                                value={acfFields.prix_cession_srp} // Toujours lié à l'état directement
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges} // Readonly si marges est true
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    // Condition pour la couleur rouge
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
                                value={acfFields.prix_cession_bradery} // Toujours lié à l'état directement
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges} // Readonly si marges est true
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    // Condition pour la couleur rouge
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
                                value={acfFields.prix_cession_zalando} // Toujours lié à l'état directement
                                onChange={handleAcfChange}
                                step="0.01"
                                readOnly={acfFields.marges} // Readonly si marges est true
                                style={{
                                    ...inputStyle,
                                    ...(acfFields.marges ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}),
                                    // Condition pour la couleur rouge
                                    color: ((parseFloat(acfFields.prix_cession_zalando as string) || 0) < ((parseFloat(acfFields.prix_achat_total as string) || 0) - 0.005) && !acfFields.marges) ? '#dc3545' : inputStyle.color
                                }}
                                placeholder="Prix cession Zalando"
                            />
                        </div>

                        {/* Champs Vrai/Faux (Toggles) */}
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

                        {/* Champ Liste Déroulante (CAS) */}
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

                        {/* Champ Groupe de Boutons (TAILLE DUST BAG) - Comportement de bascule personnalisé */}
                        <div style={{ gridColumn: 'span 2' }}> {/* Prend toute la largeur si nécessaire */}
                            <label style={labelStyle}>TAILLE DUST BAG:</label>
                            <div style={radioGroupStyle}>
                                {tailleDustBagOptions.map(option => (
                                    <label
                                        key={option.value}
                                        // Applique les styles de sélection/désélection
                                        style={{
                                            ...radioOptionStyle,
                                            ...(acfFields.taille_dust_bag === option.value ? radioOptionSelectedStyle : {}),
                                        }}
                                        onClick={() => handleTailleDustBagToggle(option.value)} // Utilise la nouvelle fonction de bascule
                                    >
                                        {/* Input caché pour que la valeur soit soumise avec le formulaire */}
                                        <input
                                            type="hidden"
                                            name="taille_dust_bag"
                                            value={acfFields.taille_dust_bag} // La valeur soumise est celle de l'état acfFields.taille_dust_bag
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Champ Groupe de Boutons (VISUELS) - Comportement de bascule personnalisé */}
                        <div style={{ gridColumn: 'span 2' }}> {/* Prend toute la largeur si nécessaire */}
                            <label style={labelStyle}>VISUELS:</label>
                            <div style={radioGroupStyle}>
                                {visuelsOptions.map(option => (
                                    <label
                                        key={option.value}
                                        // Applique les styles de sélection/désélection
                                        style={{
                                            ...radioOptionStyle,
                                            ...(acfFields.visuels === option.value ? radioOptionSelectedStyle : {}),
                                        }}
                                        onClick={() => handleVisuelsToggle(option.value)} // Utilise la nouvelle fonction de bascule
                                    >
                                        {/* Input caché pour que la valeur soit soumise avec le formulaire */}
                                        <input
                                            type="hidden"
                                            name="visuels"
                                            value={acfFields.visuels} // La valeur soumise est celle de l'état acfFields.visuels
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Sections avec Accordion --- */}
                {/* Passer la clé de l'accordéon ouvert et la fonction de mise à jour */}
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
                                    .filter(attr => !product.attributes.some(prodAttr => prodAttr.id === attr.id)) // N'afficher que les attributs non encore ajoutés
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

                                {attr.id ? ( // Si c'est un attribut global, on offre les termes globaux
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
                                                value="" // Toujours réinitialiser la valeur pour permettre la sélection répétée
                                                onChange={(e) => handleAddSelectedTerm(attr.id!, e.target.value)}
                                                style={addTermSelectStyle}
                                            >
                                                <option value="">Ajouter un terme...</option>
                                                {availableAttributeTerms[attr.id] && availableAttributeTerms[attr.id]
                                                    .filter(term => !attr.options.includes(term.name)) // N'afficher que les termes non déjà sélectionnés
                                                    .map(term => (
                                                        <option key={term.id} value={term.name}>
                                                            {term.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>Cliquez sur "Ajouter un terme..." pour sélectionner des valeurs. Cliquez sur 'x' pour supprimer un tag.</small>
                                    </div>
                                ) : ( // Si c'est un attribut personnalisé (sans ID global), on permet d'entrer les valeurs
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Valeurs personnalisées (séparées par une virgule):</label>
                                        <input
                                            type="text"
                                            value={attr.options.join(', ')}
                                            onChange={(e) => setProduct(prev => ({
                                                ...(prev as Product),
                                                attributes: prev?.attributes.map(pa => pa.name === attr.name ? { ...pa, options: e.target.value.split(',').map(s => s.trim()) } : pa) || []
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
                    {isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
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
