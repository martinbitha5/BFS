# MANUEL DE FORMATION BFS - BAGGAGE FOUND SOLUTION

## TABLE DES MATIÈRES

1. [Présentation de BFS](#présentation-de-bfs)
2. [Architecture du Système](#architecture-du-système)
3. [Les Différents Rôles](#les-différents-rôles)
4. [Application Mobile](#application-mobile)
5. [Dashboard Web](#dashboard-web)
6. [Processus Opérationnels](#processus-opérationnels)
7. [Gestion des Incidents](#gestion-des-incidents)
8. [Bonnes Pratiques](#bonnes-pratiques)
9. [Dépannage](#dépannage)

---

## PRÉSENTATION DE BFS

**BFS - Baggage Found Solution** est une application mobile et web de gestion intelligente des bagages aéroportuaires. Le système permet de suivre, gérer et contrôler l'ensemble du processus de traitement des bagages depuis l'enregistrement jusqu'à la livraison.

### Objectifs Principaux
- **Traçabilité complète** des bagages
- **Optimisation** des processus opérationnels
- **Réduction** des erreurs humaines
- **Communication** en temps réel entre les services
- **Conformité** avec les normes IATA BIRS

---

## ARCHITECTURE DU SYSTÈME

### Composants Principaux

1. **Application Mobile (React Native)**
   - Interface pour les agents au sol
   - Fonctionne sur Android et iOS
   - Synchronisation automatique des données

2. **Dashboard Web (React)**
   - Interface de supervision
   - Analyses et statistiques
   - Export de données

3. **API Backend (Node.js/TypeScript)**
   - Gestion de la logique métier
   - Synchronisation avec les bases de données
   - Intégration BIRS

4. **Base de Données (PostgreSQL)**
   - Stockage des données passagers et bagages
   - Historique des opérations
   - Audit trail

---

## LES DIFFÉRENTS RÔLES

### 1. Agent Check-in
**Responsabilités :**
- Enregistrement des passagers
- Vérification des documents
- Attribution des sièges
- Émission des étiquettes bagages

**Accès :**
- Module Check-in uniquement
- Visualisation des vols du jour

### 2. Agent Bagages
**Responsabilités :**
- Scan des étiquettes bagages
- Enregistrement des bagages dans le système
- Vérification de la conformité
- Gestion des bagages spéciaux

**Accès :**
- Module Bagages
- Liste des bagages par vol
- Historique des scans

### 3. Agent d'Embarquement
**Responsabilités :**
- Validation des cartes d'embarquement
- Scan des passeports/billets
- Contrôle d'accès à l'avion
- Mise à jour du statut des passagers

**Accès :**
- Module Embarquement
- Liste des passagers par vol
- Statut en temps réel

### 4. Agent Arrivée
**Responsabilités :**
- Confirmation de l'arrivée des bagages
- Validation de la livraison
- Gestion des bagages non réclamés
- Signalement des incidents

**Accès :**
- Module Arrivée
- Suivi des bagages arrivés
- Gestion des litiges

### 5. Agent RUSH
**Responsabilités :**
- Identification des bagages urgents
- Déclaration des bagages RUSH
- Priorisation du traitement
- Communication avec les équipes concernées

**Accès :**
- Module RUSH dédié
- Scan et déclaration des bagages urgents

### 6. Superviseur
**Responsabilités :**
- Supervision globale des opérations
- Gestion des équipes
- Analyses et rapports
- Résolution des incidents complexes

**Accès :**
- Dashboard web complet
- Tous les modules mobiles
- Fonctionnalités d'export et d'analyse

---

## APPLICATION MOBILE

### Installation et Configuration

1. **Téléchargement**
   - Scanner le QR code fourni
   - Ou télécharger depuis l'App Store/Google Play

2. **Première Connexion**
   - Ouvrir l'application
   - Entrer l'email et le mot de passe fournis
   - Sélectionner l'aéroport de travail

3. **Interface Principale**
   - Écran d'accueil avec profil utilisateur
   - Menu contextuel selon le rôle
   - Statut de synchronisation

### Écrans Principaux

#### Écran de Connexion
- Champ email
- Champ mot de passe
- Bouton "Se connecter"
- Lien vers l'inscription (si autorisé)

#### Écran d'Accueil
- Informations utilisateur (nom, rôle, aéroport)
- Statut de connexion
- Menu des fonctionnalités disponibles
- Indicateur de synchronisation

#### Module Check-in
- Recherche des passagers (PNR, nom, vol)
- Formulaire d'enregistrement
- Attribution des bagages
- Impression des étiquettes

#### Module Bagages
- Scanner d'étiquettes (caméra ou PDA)
- Affichage des informations du bagage
- Validation du scan
- Historique des traitements

#### Module Embarquement
- Scanner des cartes d'embarquement
- Validation automatique
- Mise à jour du statut
- Compteurs de progression

#### Module RUSH
- Scanner des bagages urgents
- Formulaire de déclaration RUSH
- Motif de l'urgence
- Destination prioritaire

### Fonctionnalités Communes

#### Scanner
- **Mode Camera** : Utiliser la caméra du téléphone
- **Mode PDA** : Connecter un scanner laser externe
- **Scan Manuel** : Saisie manuelle du code

#### Synchronisation
- **Automatique** : En arrière-plan toutes les 30 secondes
- **Manuelle** : Bouton de synchronisation
- **Hors ligne** : Stockage local avec sync au retour

#### Notifications
- **Sonores** : Bips de confirmation/erreur
- **Visuelles** : Messages d'alerte
- **Vibrations** : Feedback tactile

---

## DASHBOARD WEB

### Accès et Navigation

1. **URL d'accès** : https://dashboard.brsats.com
2. **Connexion** : Mêmes identifiants que l'application mobile
3. **Navigation** : Menu latéral avec les différentes sections

### Sections Principales

#### Dashboard Principal
- **Statistiques globales** de l'aéroport
- **Graphiques** de progression des vols
- **Alertes** et notifications
- **Actions rapides**

#### Gestion des Vols
- Liste des vols du jour
- Statut en temps réel
- Détails des passagers et bagages
- Modification des informations

#### Passagers
- Recherche avancée
- Historique des vols
- Statut des bagages
- Export des données

#### Export BIRS
- Génération des fichiers BIRS
- Validation des formats
- Historique des exports
- Téléchargement des fichiers

#### BRS International
- Connexion avec les autres systèmes
- Synchronisation inter-aéroports
- Suivi des bagages internationaux

### Fonctionnalités Avancées

#### Recherche et Filtrage
- Recherche par nom, PNR, vol
- Filtres par date, statut, destination
- Export des résultats

#### Rapports et Statistiques
- Rapports journaliers/hebdomadaires
- Graphiques de performance
- Taux de réussite par service

#### Gestion des Utilisateurs
- Création de nouveaux comptes
- Modification des rôles
- Réinitialisation des mots de passe

---

## PROCESSUS OPÉRATIONNELS

### Flux Type d'un Bagage

#### 1. Enregistrement (Check-in)
```
Passager arrive → Enregistrement → Attribution bagages → Étiquetage → Scan entrée système
```

#### 2. Traitement Bagages
```
Dépose bagage → Scan étiquette → Validation → Enregistrement → Direction tapis
```

#### 3. Embarquement
```
Passager arrive → Scan billet → Validation → Mise à jour statut → Accès avion
```

#### 4. Arrivée
```
Vol atterrit → Déchargement bagages → Scan arrivée → Confirmation livraison
```

### Processus RUSH

#### Déclaration d'un Bagage RUSH
1. **Scanner** l'étiquette du bagage
2. **Sélectionner** le motif RUSH
3. **Indiquer** la destination prioritaire
4. **Valider** la déclaration
5. **Notifier** les équipes concernées

#### Motifs RUSH Possibles
- **Connexion manquée** : Bagage à réacheminer
- **Urgence médicale** : Matériel médical prioritaire
- **VIP** : Passager prioritaire
- **Erreur précédente** : Bagage mal traité

### Gestion des Incidents

#### Bagage Non Trouvé
1. **Vérifier** l'historique des scans
2. **Confirmer** le dernier emplacement connu
3. **Notifier** le superviseur
4. **Créer** un rapport d'incident

#### Bagage Endommagé
1. **Photographier** le dommage
2. **Remplir** le formulaire de constat
3. **Notifier** le service client
4. **Enregistrer** l'incident dans le système

#### Passager Non Embarqué
1. **Vérifier** le statut du passager
2. **Localiser** les bagages associés
3. **Retirer** les bagages de l'avion
4. **Mettre à jour** le système

---

## BONNES PRATIQUES

### Pour Tous les Agents

#### Avant le Service
- **Vérifier** la batterie de l'appareil
- **S'assurer** de la connexion internet
- **Confirmer** son rôle et son aéroport
- **Vérifier** les mises à jour de l'application

#### Pendant le Service
- **Scanner** systématiquement tous les bagages
- **Vérifier** les informations affichées
- **Confirmer** chaque action avec un son/visuel
- **Signaler** immédiatement toute anomalie

#### Après le Service
- **Synchroniser** toutes les données
- **Vérifier** les opérations en attente
- **Rapporter** les incidents rencontrés
- **Préparer** l'appareil pour le prochain service

### Spécifique par Rôle

#### Agent Check-in
- **Vérifier** toujours l'identité du passager
- **Confirmer** le nombre de bagages autorisés
- **Expliquer** le processus de suivi
- **Fournir** les étiquettes correctes

#### Agent Bagages
- **Scanner** chaque étiquette individuellement
- **Vérifier** la destination du bagage
- **Signaler** les bagages endommagés
- **Prioriser** les bagages spéciaux

#### Agent Embarquement
- **Scanner** tous les documents requis
- **Vérifier** la correspondance passager/vol
- **Confirmer** l'accès à l'avion
- **Maintenir** le flux des passagers

#### Agent RUSH
- **Identifier** rapidement les urgences
- **Communiquer** efficacement
- **Prioriser** les actions critiques
- **Documenter** toutes les décisions

---

## DÉPANNAGE

### Problèmes Communs

#### Application ne se Connecte Pas
**Causes possibles :**
- Pas de connexion internet
- Identifiants incorrects
- Serveur indisponible

**Solutions :**
1. Vérifier la connexion WiFi/4G
2. Confirmer les identifiants
3. Redémarrer l'application
4. Contacter le superviseur

#### Scanner ne Fonctionne Pas
**Causes possibles :**
- Caméra obstruée
- Mauvais éclairage
- Étiquette endommagée

**Solutions :**
1. Nettoyer la caméra/lentille
2. Améliorer l'éclairage
3. Utiliser le scan manuel
4. Essayer un autre appareil

#### Synchronisation Échoue
**Causes possibles :**
- Connexion instable
- Serveur surchargé
- Données corrompues

**Solutions :**
1. Vérifier la connexion
2. Patienter et réessayer
3. Vider le cache local
4. Redémarrer l'appareil

#### Messages d'Erreur

**"Bagage déjà scanné"**
- Vérifier si le bagage a déjà été traité
- Confirmer l'heure et le lieu du scan précédent

**"Passager non trouvé"**
- Vérifier l'orthographe du nom
- Confirmer le numéro de vol
- Rechercher par PNR si disponible

**"Vol non trouvé"**
- Vérifier la date du vol
- Confirmer le numéro de vol
- Contacter le superviseur

### Support Technique

#### Niveaux de Support
1. **Niveau 1** : Superviseur sur place
2. **Niveau 2** : Support technique régional
3. **Niveau 3** : Équipe de développement

#### Informations à Fournir
- Description du problème
- Heure de l'incident
- Messages d'erreur exacts
- Actions déjà tentées

#### Contacts d'Urgence
- **Support technique** : +33 1 234 567 890
- **Superviseur local** : Voir annuaire interne
- **Administrateur système** : tech@brsats.com

---

## CONCLUSION

BFS est un outil puissant qui optimise la gestion des bagages aéroportuaires. Une utilisation correcte et rigoureuse garantit une meilleure expérience pour les passagers et une efficacité accrue pour les équipes.

**Points clés à retenir :**
- **Scanner systématiquement** tous les bagages
- **Vérifier** chaque information affichée
- **Communiquer** rapidement toute anomalie
- **Maintenir** l'application à jour
- **Suivre** les procédures établies

Pour toute question ou problème, n'hésitez pas à contacter votre superviseur ou le support technique.

---

**Version du manuel :** 1.0
**Date de mise à jour :** Février 2026
**Prochaine révision :** Août 2026

---

*Ce manuel est la propriété de BRSATS et ne doit pas être distribué sans autorisation expresse.*
