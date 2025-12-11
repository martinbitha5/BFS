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
    'dashboard.subtitle': 'Upload de rapports BIRS',
    'dashboard.connectedCompany': 'Compagnie connectée',
    'dashboard.airlineName': 'Nom',
    'dashboard.iataCode': 'Code IATA',
    'dashboard.autoInfo': 'Ces informations seront automatiquement ajoutées à tous vos uploads BIRS',
    'dashboard.flightInfo': 'Informations spécifiques du vol',
    'dashboard.flightInfo.subtitle': 'Ces informations sont requises pour chaque upload BIRS',
    'dashboard.flightNumber': 'Numéro de vol',
    'dashboard.flightNumber.placeholder': 'Ex: AC123',
    'dashboard.flightDate': 'Date du vol',
    'dashboard.origin': 'Origine (code aéroport)',
    'dashboard.origin.placeholder': 'Ex: FIH',
    'dashboard.destination': 'Destination (code aéroport)',
    'dashboard.destination.placeholder': 'Ex: GOM',
    'dashboard.airportCode': 'Aéroport destinataire du rapport BIRS',
    'dashboard.airportCode.placeholder': 'Ex: GOM (généralement la destination du vol)',
    'dashboard.airportCode.help': 'Code de l\'aéroport qui recevra et réconciliera ce rapport BIRS (souvent identique à la destination)',
    'dashboard.selectFile': 'Sélectionner un fichier',
    'dashboard.formats': 'Formats acceptés : TXT, CSV, TSV, XLSX, PDF',
    'dashboard.selectedFile': 'Fichier sélectionné',
    'dashboard.uploading': 'Upload en cours...',
    'dashboard.upload': 'Uploader',
    'dashboard.success': 'Fichier uploadé avec succès',
    'dashboard.baggages': 'bagages traités',
    'dashboard.guide.title': "Guide d'utilisation",
    'dashboard.guide.auto.title': 'Informations automatiques (de votre inscription)',
    'dashboard.guide.auto.line1': 'Nom de la compagnie',
    'dashboard.guide.auto.line2': 'Code IATA',
    'dashboard.guide.auto.line3': 'Ces infos sont ajoutées automatiquement à chaque upload',
    'dashboard.guide.manual.title': 'Informations à renseigner pour chaque vol',
    'dashboard.guide.manual.line1': 'Numéro de vol : Code unique du vol (Ex: AC123, ET456)',
    'dashboard.guide.manual.line2': 'Date du vol : Date de départ du vol',
    'dashboard.guide.manual.line3': 'Origine : Code aéroport de départ (3 lettres, Ex: FIH)',
    'dashboard.guide.manual.line4': 'Destination : Code aéroport d\'arrivée (3 lettres, Ex: GOM)',
    'dashboard.guide.manual.line5': 'Aéroport BIRS : Aéroport qui recevra le rapport (souvent = destination)',
    'dashboard.guide.files.title': 'À propos des fichiers BIRS',
    'dashboard.guide.files.line1': 'Les fichiers BIRS contiennent la liste des bagages envoyés',
    'dashboard.guide.files.line2': 'La réconciliation compare avec les bagages scannés à l\'arrivée',
    'dashboard.guide.files.line3': 'Les bagages non réconciliés peuvent être déclarés en RUSH',
    'dashboard.guide.files.line4': 'Formats acceptés : TXT, CSV, TSV, XLSX, PDF',
    'dashboard.guide.files.line5': 'Recommandé : Privilégiez les fichiers texte (.txt, .csv, .tsv) pour de meilleurs résultats',
    
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
    'dashboard.subtitle': 'BIRS Reports Upload',
    'dashboard.connectedCompany': 'Connected Company',
    'dashboard.airlineName': 'Name',
    'dashboard.iataCode': 'IATA Code',
    'dashboard.autoInfo': 'This information will be automatically added to all your BIRS uploads',
    'dashboard.flightInfo': 'Flight-specific information',
    'dashboard.flightInfo.subtitle': 'This information is required for each BIRS upload',
    'dashboard.flightNumber': 'Flight number',
    'dashboard.flightNumber.placeholder': 'Ex: AC123',
    'dashboard.flightDate': 'Flight date',
    'dashboard.origin': 'Origin (airport code)',
    'dashboard.origin.placeholder': 'Ex: FIH',
    'dashboard.destination': 'Destination (airport code)',
    'dashboard.destination.placeholder': 'Ex: GOM',
    'dashboard.airportCode': 'BIRS report receiving airport',
    'dashboard.airportCode.placeholder': 'Ex: GOM (usually the destination)',
    'dashboard.airportCode.help': 'Code of the airport that will receive and reconcile this BIRS report (often same as destination)',
    'dashboard.selectFile': 'Select a file',
    'dashboard.formats': 'Accepted formats: TXT, CSV, TSV, XLSX, PDF',
    'dashboard.selectedFile': 'Selected file',
    'dashboard.uploading': 'Uploading...',
    'dashboard.upload': 'Upload',
    'dashboard.success': 'File uploaded successfully',
    'dashboard.baggages': 'baggages processed',
    'dashboard.guide.title': 'User Guide',
    'dashboard.guide.auto.title': 'Automatic information (from your registration)',
    'dashboard.guide.auto.line1': 'Company name',
    'dashboard.guide.auto.line2': 'IATA code',
    'dashboard.guide.auto.line3': 'This info is automatically added to each upload',
    'dashboard.guide.manual.title': 'Information to fill for each flight',
    'dashboard.guide.manual.line1': 'Flight number: Unique flight code (Ex: AC123, ET456)',
    'dashboard.guide.manual.line2': 'Flight date: Departure date',
    'dashboard.guide.manual.line3': 'Origin: Departure airport code (3 letters, Ex: FIH)',
    'dashboard.guide.manual.line4': 'Destination: Arrival airport code (3 letters, Ex: GOM)',
    'dashboard.guide.manual.line5': 'BIRS Airport: Airport that will receive the report (often = destination)',
    'dashboard.guide.files.title': 'About BIRS files',
    'dashboard.guide.files.line1': 'BIRS files contain the list of sent baggages',
    'dashboard.guide.files.line2': 'Reconciliation compares with scanned baggages on arrival',
    'dashboard.guide.files.line3': 'Unreconciled baggages can be declared as RUSH',
    'dashboard.guide.files.line4': 'Accepted formats: TXT, CSV, TSV, XLSX, PDF',
    'dashboard.guide.files.line5': 'Recommended: Prefer text files (.txt, .csv, .tsv) for best results',
    
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
