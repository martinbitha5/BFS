import React, { createContext, useContext, useState } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('bfs-passenger-language');
    return (saved === 'en' ? 'en' : 'fr') as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('bfs-passenger-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Traductions complètes FR/EN
const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Header & Navigation
    'header.title': 'BFS TRACKING',
    'nav.home': 'Accueil',
    'nav.about': 'À propos',
    'nav.support': 'Support',
    'breadcrumb.home': 'Accueil',
    'breadcrumb.tracking': 'Suivi Bagages',
    'breadcrumb.results': 'Résultats',
    
    // Home Page
    'home.title': 'SUIVI BAGAGES',
    'home.pnr.label': 'PNR / Référence de réservation',
    'home.pnr.required': 'PNR / Référence de réservation *',
    'home.pnr.placeholder': 'Entrez le PNR (ex: ABC123)',
    'home.flight.label': 'Numéro de vol',
    'home.flight.placeholder': 'Entrez le numéro de vol',
    'home.date.label': 'Date de départ',
    'home.tag.label': 'Numéro d\'étiquette bagage',
    'home.tag.placeholder': 'Numéro d\'étiquette',
    'home.button': 'Suivre le bagage',
    'home.required': '* Champ obligatoire. Entrez au moins votre PNR ou numéro d\'étiquette pour suivre votre bagage.',
    'home.help.title': 'Besoin d\'aide ?',
    'home.help.text': 'Si vous avez besoin d\'assistance pour suivre votre bagage ou avez des questions, veuillez contacter notre équipe de support.',
    'home.help.contact': 'Contacter le support',
    'home.help.faq': 'Voir la FAQ',
    
    // Track Results
    'track.loading': 'Recherche de votre bagage...',
    'track.error.title': 'Bagage non trouvé',
    'track.error.button': 'Nouvelle recherche',
    'track.title': 'STATUT DU BAGAGE',
    'track.pnr': 'PNR',
    'track.flight': 'Vol',
    'track.passenger': 'Passager',
    'track.status.title': 'Statut actuel',
    'track.status.refresh': 'Actualiser',
    'track.journey.title': 'Trajet',
    'track.journey.origin': 'Origine',
    'track.journey.destination': 'Destination',
    'track.details.title': 'Détails du bagage',
    'track.details.tag': 'Numéro d\'étiquette',
    'track.details.weight': 'Poids',
    'track.details.flight': 'Numéro de vol',
    'track.details.passenger': 'Nom du passager',
    'track.help.title': 'Besoin d\'assistance ?',
    'track.help.text': 'Si vous avez des préoccupations concernant votre bagage, veuillez contacter notre équipe de support.',
    'track.help.button': 'Contacter le support',
    'track.another': 'Suivre un autre bagage',
    'track.updated': 'Dernière mise à jour',
    
    // Baggage Status
    'status.checked': 'Enregistré',
    'status.loaded': 'Chargé dans l\'avion',
    'status.in_transit': 'En transit',
    'status.arrived': 'Arrivé',
    'status.delivered': 'Livré',
    'status.rush': 'En réacheminement urgent',
    
    // Footer
    'footer.about.title': 'À PROPOS',
    'footer.about.us': 'À propos de nous',
    'footer.about.news': 'Actualités',
    'footer.about.careers': 'Carrières',
    'footer.legal.title': 'LÉGAL',
    'footer.legal.notices': 'Mentions légales',
    'footer.legal.privacy': 'Politique de confidentialité',
    'footer.legal.cookies': 'Politique cookies',
    'footer.legal.terms': 'Conditions d\'utilisation',
    'footer.support.title': 'SUPPORT',
    'footer.support.faq': 'FAQ',
    'footer.support.contact': 'Nous contacter',
    'footer.app.title': 'TÉLÉCHARGER L\'APP',
    'footer.app.appstore': 'Disponible sur App Store',
    'footer.app.playstore': 'Disponible sur Google Play',
    'footer.copyright': '© 1997-2025 BFS System - Baggage Found Solution',
    
    // About Page
    'about.title': 'À PROPOS DE BFS',
    'about.subtitle': 'Baggage Found Solution',
    'about.intro.title': 'Qui sommes-nous ?',
    'about.intro.p1': 'BFS (Baggage Found Solution) est un système de gestion intelligente des bagages développé pour optimiser le suivi et la réconciliation des bagages dans les aéroports africains.',
    'about.intro.p2': 'Notre mission est de réduire les pertes de bagages, d\'améliorer l\'expérience passager et d\'optimiser les opérations aéroportuaires grâce à la technologie RFID et l\'intelligence artificielle.',
    'about.mission.title': 'Notre Mission',
    'about.mission.p1': 'Fournir une solution fiable et efficace pour le suivi des bagages en temps réel.',
    'about.mission.p2': 'Réduire les incidents de bagages perdus ou mal acheminés.',
    'about.mission.p3': 'Améliorer la satisfaction et la confiance des passagers.',
    'about.values.title': 'Nos Valeurs',
    'about.values.innovation': 'Innovation',
    'about.values.innovation.text': 'Utilisation des technologies de pointe (RFID, IA) pour améliorer constamment nos services.',
    'about.values.reliability': 'Fiabilité',
    'about.values.reliability.text': 'Un système robuste et précis pour un suivi sans faille de vos bagages.',
    'about.values.transparency': 'Transparence',
    'about.values.transparency.text': 'Informations en temps réel accessibles aux passagers et compagnies aériennes.',
    
    // FAQ Page
    'faq.title': 'QUESTIONS FRÉQUENTES',
    'faq.q1': 'Comment suivre mon bagage ?',
    'faq.a1': 'Entrez votre PNR (référence de réservation) ou le numéro d\'étiquette de votre bagage sur la page d\'accueil. Vous verrez instantanément la localisation et le statut de votre bagage.',
    'faq.q2': 'Où trouver mon PNR ?',
    'faq.a2': 'Votre PNR est un code à 6 caractères figurant sur votre billet électronique, votre carte d\'embarquement ou dans l\'email de confirmation de réservation.',
    'faq.q3': 'Que faire si mon bagage n\'apparaît pas ?',
    'faq.a3': 'Si votre bagage n\'apparaît pas dans le système, contactez immédiatement le comptoir de votre compagnie aérienne à l\'aéroport ou notre service support.',
    'faq.q4': 'Qu\'est-ce qu\'un statut "RUSH" ?',
    'faq.a4': 'Un bagage en statut RUSH est un bagage qui n\'a pas pu embarquer sur le vol prévu (soute pleine, problème de poids) et qui sera réacheminé sur le prochain vol disponible.',
    'faq.q5': 'Les informations sont-elles mises à jour en temps réel ?',
    'faq.a5': 'Oui, le système BFS met à jour les informations en temps réel à chaque scan RFID de votre bagage (enregistrement, chargement, transit, arrivée).',
    'faq.q6': 'Mes données personnelles sont-elles sécurisées ?',
    'faq.a6': 'Absolument. Nous utilisons des protocoles de sécurité avancés et ne partageons jamais vos informations personnelles avec des tiers.',
    
    // Support Page
    'support.title': 'SUPPORT CLIENT',
    'support.subtitle': 'Nous sommes là pour vous aider',
    'support.contact.title': 'Contactez-nous',
    'support.contact.text': 'Notre équipe de support est disponible 24/7 pour répondre à vos questions et résoudre vos problèmes.',
    'support.contact.email': 'Email',
    'support.contact.phone': 'Téléphone',
    'support.contact.hours': 'Disponible 24/7',
    'support.form.title': 'Formulaire de contact',
    'support.form.name': 'Nom complet',
    'support.form.email': 'Email',
    'support.form.pnr': 'PNR (optionnel)',
    'support.form.subject': 'Objet',
    'support.form.message': 'Message',
    'support.form.submit': 'Envoyer',
    'support.emergency.title': 'Urgence ?',
    'support.emergency.text': 'Pour les situations urgentes concernant un bagage manquant ou endommagé, contactez directement le comptoir de votre compagnie aérienne à l\'aéroport.',
    
    // Contact Page
    'contact.title': 'NOUS CONTACTER',
    'contact.text': 'Une question ? Une réclamation ? Notre équipe est à votre écoute.',
    
    // Legal Page
    'legal.title': 'MENTIONS LÉGALES',
    'legal.editor.title': 'Éditeur du site',
    'legal.editor.name': 'BFS System - Baggage Found Solution',
    'legal.editor.address': 'Aéroport International de Kinshasa, République Démocratique du Congo',
    'legal.editor.email': 'legal@bfs-system.com',
    'legal.hosting.title': 'Hébergement',
    'legal.hosting.text': 'Ce site est hébergé par des services cloud sécurisés conformes aux normes internationales de protection des données.',
    'legal.property.title': 'Propriété intellectuelle',
    'legal.property.text': 'L\'ensemble du contenu de ce site (textes, images, logos, base de données) est protégé par le droit d\'auteur et appartient à BFS System ou à ses partenaires.',
    
    // Privacy Page
    'privacy.title': 'POLITIQUE DE CONFIDENTIALITÉ',
    'privacy.intro': 'BFS System s\'engage à protéger vos données personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.',
    'privacy.collect.title': 'Données collectées',
    'privacy.collect.text': 'Nous collectons uniquement les informations nécessaires au suivi de vos bagages : PNR, numéro de vol, date de voyage, numéro d\'étiquette bagage.',
    'privacy.use.title': 'Utilisation des données',
    'privacy.use.text': 'Vos données sont utilisées exclusivement pour le suivi de vos bagages et l\'amélioration de nos services. Nous ne partageons jamais vos données avec des tiers sans votre consentement.',
    'privacy.security.title': 'Sécurité',
    'privacy.security.text': 'Nous utilisons des protocoles de sécurité avancés (cryptage SSL, serveurs sécurisés) pour protéger vos informations contre tout accès non autorisé.',
    'privacy.rights.title': 'Vos droits',
    'privacy.rights.text': 'Vous avez le droit d\'accéder, modifier ou supprimer vos données personnelles. Contactez-nous à privacy@bfs-system.com pour toute demande.',
    
    // Terms Page
    'terms.title': 'CONDITIONS D\'UTILISATION',
    'terms.intro': 'En utilisant le service BFS Tracking, vous acceptez les conditions suivantes :',
    'terms.service.title': 'Description du service',
    'terms.service.text': 'BFS Tracking est un service de suivi de bagages en temps réel. Nous fournissons les informations basées sur les scans RFID effectués dans les aéroports partenaires.',
    'terms.responsibility.title': 'Responsabilité',
    'terms.responsibility.text': 'Bien que nous mettions tout en œuvre pour fournir des informations précises, BFS System ne peut être tenu responsable des retards, pertes ou dommages de bagages. Ces réclamations doivent être adressées directement à votre compagnie aérienne.',
    'terms.availability.title': 'Disponibilité',
    'terms.availability.text': 'Nous nous efforçons d\'assurer une disponibilité maximale du service, mais ne garantissons pas un accès ininterrompu.',
    
    // Cookies Page
    'cookies.title': 'POLITIQUE COOKIES',
    'cookies.intro': 'Ce site utilise des cookies pour améliorer votre expérience de navigation.',
    'cookies.what.title': 'Qu\'est-ce qu\'un cookie ?',
    'cookies.what.text': 'Un cookie est un petit fichier texte stocké sur votre appareil lors de la visite d\'un site web.',
    'cookies.types.title': 'Types de cookies utilisés',
    'cookies.types.essential': 'Cookies essentiels : nécessaires au fonctionnement du site (langue, session).',
    'cookies.types.analytics': 'Cookies analytiques : nous aident à comprendre comment vous utilisez le site.',
    'cookies.control.title': 'Contrôle des cookies',
    'cookies.control.text': 'Vous pouvez désactiver les cookies dans les paramètres de votre navigateur. Notez que certaines fonctionnalités du site pourraient ne plus fonctionner correctement.',
    
    // News Page
    'news.title': 'ACTUALITÉS',
    'news.subtitle': 'Dernières nouvelles de BFS System',
    
    // Careers Page
    'careers.title': 'CARRIÈRES',
    'careers.subtitle': 'Rejoignez notre équipe',
    'careers.intro': 'BFS System recherche des talents passionnés pour révolutionner la gestion des bagages en Afrique.',
    'careers.positions.title': 'Postes ouverts',
    'careers.positions.none': 'Aucun poste ouvert actuellement. Envoyez votre candidature spontanée à careers@bfs-system.com',
    'careers.values.title': 'Pourquoi nous rejoindre ?',
    'careers.values.innovation': 'Innovation technologique',
    'careers.values.impact': 'Impact réel sur l\'expérience passager',
    'careers.values.growth': 'Opportunités de croissance',
  },
  en: {
    // Header & Navigation
    'header.title': 'BFS TRACKING',
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.support': 'Support',
    'breadcrumb.home': 'Home',
    'breadcrumb.tracking': 'Baggage Tracking',
    'breadcrumb.results': 'Results',
    
    // Home Page
    'home.title': 'BAGGAGE TRACKING',
    'home.pnr.label': 'PNR / Booking Reference',
    'home.pnr.required': 'PNR / Booking Reference *',
    'home.pnr.placeholder': 'Enter PNR (e.g., ABC123)',
    'home.flight.label': 'Flight Number',
    'home.flight.placeholder': 'Enter flight number',
    'home.date.label': 'Departure Date',
    'home.tag.label': 'Baggage Tag Number',
    'home.tag.placeholder': 'Baggage tag digits',
    'home.button': 'Track Baggage',
    'home.required': '* Required field. Enter at least your PNR or Baggage Tag Number to track your baggage.',
    'home.help.title': 'Need Help?',
    'home.help.text': 'If you need assistance tracking your baggage or have any questions, please contact our support team.',
    'home.help.contact': 'Contact Support',
    'home.help.faq': 'View FAQ',
    
    // Track Results
    'track.loading': 'Searching for your baggage...',
    'track.error.title': 'Baggage Not Found',
    'track.error.button': 'New Search',
    'track.title': 'BAGGAGE STATUS',
    'track.pnr': 'PNR',
    'track.flight': 'Flight',
    'track.passenger': 'Passenger',
    'track.status.title': 'Current Status',
    'track.status.refresh': 'Refresh',
    'track.journey.title': 'Journey',
    'track.journey.origin': 'Origin',
    'track.journey.destination': 'Destination',
    'track.details.title': 'Baggage Details',
    'track.details.tag': 'Tag Number',
    'track.details.weight': 'Weight',
    'track.details.flight': 'Flight Number',
    'track.details.passenger': 'Passenger Name',
    'track.help.title': 'Need Assistance?',
    'track.help.text': 'If you have any concerns about your baggage, please contact our support team.',
    'track.help.button': 'Contact Support',
    'track.another': 'Track Another Baggage',
    'track.updated': 'Last updated',
    
    // Baggage Status
    'status.checked': 'Checked',
    'status.loaded': 'Loaded on aircraft',
    'status.in_transit': 'In transit',
    'status.arrived': 'Arrived',
    'status.delivered': 'Delivered',
    'status.rush': 'Rush rerouting',
    
    // Footer
    'footer.about.title': 'ABOUT',
    'footer.about.us': 'About Us',
    'footer.about.news': 'News and Updates',
    'footer.about.careers': 'Careers',
    'footer.legal.title': 'LEGAL',
    'footer.legal.notices': 'Legal Notices',
    'footer.legal.privacy': 'Privacy Policy',
    'footer.legal.cookies': 'Cookie Notice',
    'footer.legal.terms': 'Terms of Use',
    'footer.support.title': 'SUPPORT',
    'footer.support.faq': 'FAQ',
    'footer.support.contact': 'Contact Us',
    'footer.app.title': 'DOWNLOAD APP',
    'footer.app.appstore': 'Get it on App Store',
    'footer.app.playstore': 'Get it on Google Play',
    'footer.copyright': '© 1997-2025 BFS System - Baggage Found Solution',
    
    // About Page
    'about.title': 'ABOUT BFS',
    'about.subtitle': 'Baggage Found Solution',
    'about.intro.title': 'Who We Are',
    'about.intro.p1': 'BFS (Baggage Found Solution) is an intelligent baggage management system developed to optimize baggage tracking and reconciliation in African airports.',
    'about.intro.p2': 'Our mission is to reduce baggage losses, improve passenger experience, and optimize airport operations through RFID technology and artificial intelligence.',
    'about.mission.title': 'Our Mission',
    'about.mission.p1': 'Provide a reliable and efficient solution for real-time baggage tracking.',
    'about.mission.p2': 'Reduce lost or misrouted baggage incidents.',
    'about.mission.p3': 'Improve passenger satisfaction and trust.',
    'about.values.title': 'Our Values',
    'about.values.innovation': 'Innovation',
    'about.values.innovation.text': 'Using cutting-edge technologies (RFID, AI) to constantly improve our services.',
    'about.values.reliability': 'Reliability',
    'about.values.reliability.text': 'A robust and accurate system for flawless baggage tracking.',
    'about.values.transparency': 'Transparency',
    'about.values.transparency.text': 'Real-time information accessible to passengers and airlines.',
    
    // FAQ Page
    'faq.title': 'FREQUENTLY ASKED QUESTIONS',
    'faq.q1': 'How do I track my baggage?',
    'faq.a1': 'Enter your PNR (booking reference) or your baggage tag number on the home page. You will instantly see the location and status of your baggage.',
    'faq.q2': 'Where can I find my PNR?',
    'faq.a2': 'Your PNR is a 6-character code found on your e-ticket, boarding pass, or in your booking confirmation email.',
    'faq.q3': 'What if my baggage doesn\'t appear?',
    'faq.a3': 'If your baggage doesn\'t appear in the system, immediately contact your airline\'s desk at the airport or our support service.',
    'faq.q4': 'What is a "RUSH" status?',
    'faq.a4': 'A baggage with RUSH status is baggage that couldn\'t board the scheduled flight (full hold, weight issue) and will be rerouted on the next available flight.',
    'faq.q5': 'Is the information updated in real-time?',
    'faq.a5': 'Yes, the BFS system updates information in real-time with each RFID scan of your baggage (check-in, loading, transit, arrival).',
    'faq.q6': 'Are my personal data secure?',
    'faq.a6': 'Absolutely. We use advanced security protocols and never share your personal information with third parties.',
    
    // Support Page
    'support.title': 'CUSTOMER SUPPORT',
    'support.subtitle': 'We are here to help',
    'support.contact.title': 'Contact Us',
    'support.contact.text': 'Our support team is available 24/7 to answer your questions and solve your problems.',
    'support.contact.email': 'Email',
    'support.contact.phone': 'Phone',
    'support.contact.hours': 'Available 24/7',
    'support.form.title': 'Contact Form',
    'support.form.name': 'Full Name',
    'support.form.email': 'Email',
    'support.form.pnr': 'PNR (optional)',
    'support.form.subject': 'Subject',
    'support.form.message': 'Message',
    'support.form.submit': 'Send',
    'support.emergency.title': 'Emergency?',
    'support.emergency.text': 'For urgent situations regarding missing or damaged baggage, contact your airline\'s desk directly at the airport.',
    
    // Contact Page
    'contact.title': 'CONTACT US',
    'contact.text': 'A question? A complaint? Our team is listening.',
    
    // Legal Page
    'legal.title': 'LEGAL NOTICES',
    'legal.editor.title': 'Website Publisher',
    'legal.editor.name': 'BFS System - Baggage Found Solution',
    'legal.editor.address': 'Kinshasa International Airport, Democratic Republic of Congo',
    'legal.editor.email': 'legal@bfs-system.com',
    'legal.hosting.title': 'Hosting',
    'legal.hosting.text': 'This site is hosted by secure cloud services compliant with international data protection standards.',
    'legal.property.title': 'Intellectual Property',
    'legal.property.text': 'All content on this site (texts, images, logos, database) is protected by copyright and belongs to BFS System or its partners.',
    
    // Privacy Page
    'privacy.title': 'PRIVACY POLICY',
    'privacy.intro': 'BFS System is committed to protecting your personal data. This policy explains how we collect, use, and protect your information.',
    'privacy.collect.title': 'Data Collected',
    'privacy.collect.text': 'We only collect information necessary for tracking your baggage: PNR, flight number, travel date, baggage tag number.',
    'privacy.use.title': 'Data Usage',
    'privacy.use.text': 'Your data is used exclusively for tracking your baggage and improving our services. We never share your data with third parties without your consent.',
    'privacy.security.title': 'Security',
    'privacy.security.text': 'We use advanced security protocols (SSL encryption, secure servers) to protect your information against unauthorized access.',
    'privacy.rights.title': 'Your Rights',
    'privacy.rights.text': 'You have the right to access, modify, or delete your personal data. Contact us at privacy@bfs-system.com for any request.',
    
    // Terms Page
    'terms.title': 'TERMS OF USE',
    'terms.intro': 'By using the BFS Tracking service, you accept the following terms:',
    'terms.service.title': 'Service Description',
    'terms.service.text': 'BFS Tracking is a real-time baggage tracking service. We provide information based on RFID scans performed at partner airports.',
    'terms.responsibility.title': 'Responsibility',
    'terms.responsibility.text': 'While we make every effort to provide accurate information, BFS System cannot be held responsible for baggage delays, losses, or damages. These claims must be addressed directly to your airline.',
    'terms.availability.title': 'Availability',
    'terms.availability.text': 'We strive to ensure maximum service availability but do not guarantee uninterrupted access.',
    
    // Cookies Page
    'cookies.title': 'COOKIE POLICY',
    'cookies.intro': 'This site uses cookies to improve your browsing experience.',
    'cookies.what.title': 'What is a cookie?',
    'cookies.what.text': 'A cookie is a small text file stored on your device when visiting a website.',
    'cookies.types.title': 'Types of cookies used',
    'cookies.types.essential': 'Essential cookies: necessary for site functionality (language, session).',
    'cookies.types.analytics': 'Analytics cookies: help us understand how you use the site.',
    'cookies.control.title': 'Cookie control',
    'cookies.control.text': 'You can disable cookies in your browser settings. Note that some site features may no longer work properly.',
    
    // News Page
    'news.title': 'NEWS',
    'news.subtitle': 'Latest from BFS System',
    
    // Careers Page
    'careers.title': 'CAREERS',
    'careers.subtitle': 'Join our team',
    'careers.intro': 'BFS System is looking for passionate talent to revolutionize baggage management in Africa.',
    'careers.positions.title': 'Open Positions',
    'careers.positions.none': 'No open positions currently. Send your application to careers@bfs-system.com',
    'careers.values.title': 'Why join us?',
    'careers.values.innovation': 'Technological innovation',
    'careers.values.impact': 'Real impact on passenger experience',
    'careers.values.growth': 'Growth opportunities',
  }
};
