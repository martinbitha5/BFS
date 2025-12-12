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
    const saved = localStorage.getItem('airline-language');
    return (saved === 'en' ? 'en' : 'fr') as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('airline-language', lang);
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

// Traductions
const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.upload': 'Upload BIRS',
    'nav.history': 'Historique',
    'nav.logout': 'Déconnexion',
    
    // Login
    'login.title': 'Connexion Compagnie Aérienne',
    'login.subtitle': 'Connectez-vous pour uploader vos rapports BIRS',
    'login.email': 'Email',
    'login.password': 'Mot de passe',
    'login.button': 'Se connecter',
    'login.noAccount': "Pas encore de compte ?",
    'login.signup': "S'inscrire",
    'login.error': 'Email ou mot de passe incorrect',
    
    // Signup
    'signup.title': 'Inscription Compagnie Aérienne',
    'signup.subtitle': 'Renseignez les informations de votre compagnie. Ces données seront utilisées pour tous vos uploads BIRS.',
    'signup.airlineName': 'Nom de la compagnie aérienne',
    'signup.airlineName.placeholder': 'Ex: Ethiopian Airlines',
    'signup.airlineName.help': 'Nom complet officiel de votre compagnie aérienne',
    'signup.iataCode': 'Code IATA de la compagnie',
    'signup.iataCode.placeholder': 'Ex: ET',
    'signup.iataCode.help': 'Code IATA à 2 lettres (doit être officiel et reconnu)',
    'signup.contactEmail': 'Email de contact',
    'signup.contactEmail.placeholder': 'contact@airline.com',
    'signup.contactEmail.help': 'Email principal pour les notifications et la connexion',
    'signup.password': 'Mot de passe',
    'signup.password.placeholder': 'Minimum 6 caractères',
    'signup.password.help': 'Choisissez un mot de passe sécurisé',
    'signup.confirmPassword': 'Confirmer le mot de passe',
    'signup.confirmPassword.placeholder': 'Retapez votre mot de passe',
    'signup.button': "S'inscrire",
    'signup.hasAccount': 'Déjà un compte ?',
    'signup.login': 'Se connecter',
    'signup.info.title': 'À propos de votre compte',
    'signup.info.line1': 'Les informations de la compagnie (nom et code) sont enregistrées une seule fois',
    'signup.info.line2': 'Lors des uploads BIRS, vous renseignerez : numéro vol, date, origine, destination, aéroport destinataire',
    'signup.info.line3': 'Votre code IATA doit être officiel et reconnu internationalement',
    
    // Dashboard
    'dashboard.title': 'Portail Compagnies',
    'dashboard.subtitle': 'Envoi de rapports BIRS',
    'dashboard.connectedCompany': 'Compagnie connectée',
    'dashboard.airlineName': 'Nom',
    'dashboard.iataCode': 'Code IATA',
    'dashboard.autoInfo': 'Ces informations sont ajoutées automatiquement à chaque envoi',
    'dashboard.flightInfo': 'Informations du vol',
    'dashboard.flightInfo.subtitle': 'À remplir pour chaque envoi de rapport',
    'dashboard.flightNumber': 'Numéro de vol',
    'dashboard.flightNumber.placeholder': 'Ex: AC123',
    'dashboard.flightDate': 'Date du vol',
    'dashboard.origin': 'Origine (code aéroport)',
    'dashboard.origin.placeholder': 'Ex: FIH',
    'dashboard.destination': 'Destination (code aéroport)',
    'dashboard.destination.placeholder': 'Ex: GOM',
    'dashboard.airportCode': 'Aéroport destinataire',
    'dashboard.airportCode.placeholder': 'Ex: GOM',
    'dashboard.airportCode.help': 'Aéroport qui recevra le rapport (souvent la destination)',
    'dashboard.selectFile': 'Sélectionner un fichier',
    'dashboard.formats': 'Formats acceptés : TXT, CSV, TSV, XLSX, PDF',
    'dashboard.selectedFile': 'Fichier sélectionné',
    'dashboard.uploading': 'Upload en cours...',
    'dashboard.upload': 'Uploader',
    'dashboard.success': 'Fichier uploadé avec succès',
    'dashboard.baggages': 'bagages traités',
    'dashboard.guide.title': "Guide",
    'dashboard.guide.auto.title': 'Informations enregistrées',
    'dashboard.guide.auto.line1': 'Nom de la compagnie',
    'dashboard.guide.auto.line2': 'Code IATA',
    'dashboard.guide.auto.line3': 'Ajout automatique à chaque envoi',
    'dashboard.guide.manual.title': 'Informations à renseigner',
    'dashboard.guide.manual.line1': 'Numéro de vol (Ex: AC123)',
    'dashboard.guide.manual.line2': 'Date de départ',
    'dashboard.guide.manual.line3': 'Origine (3 lettres, Ex: FIH)',
    'dashboard.guide.manual.line4': 'Destination (3 lettres, Ex: GOM)',
    'dashboard.guide.manual.line5': 'Aéroport destinataire (souvent la destination)',
    'dashboard.guide.files.title': 'Fichiers BIRS',
    'dashboard.guide.files.line1': 'Liste des bagages envoyés',
    'dashboard.guide.files.line2': 'Comparé aux scans à l\'arrivée',
    'dashboard.guide.files.line3': 'Les manquants peuvent être déclarés RUSH',
    'dashboard.guide.files.line4': 'Formats : TXT, CSV, TSV, XLSX, PDF',
    'dashboard.guide.files.line5': 'Fichiers texte recommandés (.txt, .csv, .tsv)',
    
    // History
    'history.title': 'Historique des uploads',
    'history.flight': 'Vol',
    'history.date': 'Date',
    'history.route': 'Route',
    'history.baggages': 'Bagages',
    'history.status': 'Statut',
    'history.actions': 'Actions',
    'history.view': 'Voir',
    'history.noData': 'Aucun upload trouvé',
    'history.pending': 'En attente',
    'history.verified': 'Vérifié',
  },
  en: {
    // Navigation
    'nav.upload': 'Upload BIRS',
    'nav.history': 'History',
    'nav.logout': 'Logout',
    
    // Login
    'login.title': 'Airline Login',
    'login.subtitle': 'Sign in to upload your BIRS reports',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.button': 'Sign in',
    'login.noAccount': "Don't have an account?",
    'login.signup': 'Sign up',
    'login.error': 'Incorrect email or password',
    
    // Signup
    'signup.title': 'Airline Registration',
    'signup.subtitle': 'Enter your airline information. This data will be used for all your BIRS uploads.',
    'signup.airlineName': 'Airline name',
    'signup.airlineName.placeholder': 'Ex: Ethiopian Airlines',
    'signup.airlineName.help': 'Official full name of your airline',
    'signup.iataCode': 'IATA code',
    'signup.iataCode.placeholder': 'Ex: ET',
    'signup.iataCode.help': '2-letter IATA code (must be official and recognized)',
    'signup.contactEmail': 'Contact email',
    'signup.contactEmail.placeholder': 'contact@airline.com',
    'signup.contactEmail.help': 'Primary email for notifications and login',
    'signup.password': 'Password',
    'signup.password.placeholder': 'Minimum 6 characters',
    'signup.password.help': 'Choose a secure password',
    'signup.confirmPassword': 'Confirm password',
    'signup.confirmPassword.placeholder': 'Retype your password',
    'signup.button': 'Sign up',
    'signup.hasAccount': 'Already have an account?',
    'signup.login': 'Sign in',
    'signup.info.title': 'About your account',
    'signup.info.line1': 'Company information (name and code) is registered once',
    'signup.info.line2': 'For BIRS uploads, you will enter: flight number, date, origin, destination, receiving airport',
    'signup.info.line3': 'Your IATA code must be official and internationally recognized',
    
    // Dashboard
    'dashboard.title': 'Airlines Portal',
    'dashboard.subtitle': 'BIRS Reports',
    'dashboard.connectedCompany': 'Airline',
    'dashboard.airlineName': 'Name',
    'dashboard.iataCode': 'IATA Code',
    'dashboard.autoInfo': 'Added automatically to each report',
    'dashboard.flightInfo': 'Flight Information',
    'dashboard.flightInfo.subtitle': 'Required for each report',
    'dashboard.flightNumber': 'Flight number',
    'dashboard.flightNumber.placeholder': 'Ex: AC123',
    'dashboard.flightDate': 'Flight date',
    'dashboard.origin': 'Origin (airport code)',
    'dashboard.origin.placeholder': 'Ex: FIH',
    'dashboard.destination': 'Destination (airport code)',
    'dashboard.destination.placeholder': 'Ex: GOM',
    'dashboard.airportCode': 'Receiving airport',
    'dashboard.airportCode.placeholder': 'Ex: GOM',
    'dashboard.airportCode.help': 'Airport that will receive the report (usually the destination)',
    'dashboard.selectFile': 'Select a file',
    'dashboard.formats': 'Accepted formats: TXT, CSV, TSV, XLSX, PDF',
    'dashboard.selectedFile': 'Selected file',
    'dashboard.uploading': 'Uploading...',
    'dashboard.upload': 'Upload',
    'dashboard.success': 'File uploaded successfully',
    'dashboard.baggages': 'baggages processed',
    'dashboard.guide.title': 'Guide',
    'dashboard.guide.auto.title': 'Saved information',
    'dashboard.guide.auto.line1': 'Company name',
    'dashboard.guide.auto.line2': 'IATA code',
    'dashboard.guide.auto.line3': 'Added automatically',
    'dashboard.guide.manual.title': 'Required information',
    'dashboard.guide.manual.line1': 'Flight number (Ex: AC123)',
    'dashboard.guide.manual.line2': 'Departure date',
    'dashboard.guide.manual.line3': 'Origin (3 letters, Ex: FIH)',
    'dashboard.guide.manual.line4': 'Destination (3 letters, Ex: GOM)',
    'dashboard.guide.manual.line5': 'Receiving airport (usually destination)',
    'dashboard.guide.files.title': 'BIRS Files',
    'dashboard.guide.files.line1': 'List of sent baggage',
    'dashboard.guide.files.line2': 'Compared with arrival scans',
    'dashboard.guide.files.line3': 'Missing items can be declared RUSH',
    'dashboard.guide.files.line4': 'Formats: TXT, CSV, TSV, XLSX, PDF',
    'dashboard.guide.files.line5': 'Text files recommended (.txt, .csv, .tsv)',
    
    // History
    'history.title': 'Upload History',
    'history.flight': 'Flight',
    'history.date': 'Date',
    'history.route': 'Route',
    'history.baggages': 'Baggages',
    'history.status': 'Status',
    'history.actions': 'Actions',
    'history.view': 'View',
    'history.noData': 'No uploads found',
    'history.pending': 'Pending',
    'history.verified': 'Verified',
  }
};
