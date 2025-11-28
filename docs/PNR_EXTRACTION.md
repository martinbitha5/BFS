# Système d'Extraction de PNR - Documentation

## Vue d'ensemble

Le système d'extraction de PNR est conçu pour être **robuste, flexible et extensible**. Il peut gérer de multiples patterns différents de boarding passes et s'adapter automatiquement aux nouveaux formats.

## Architecture

### Service Principal : `pnr-extractor.service.ts`

Le service utilise un système de **patterns multiples avec scoring de confiance** pour extraire le PNR le plus probable depuis les données brutes.

### Fonctionnement

1. **Détection Multi-Patterns** : Le service essaie tous les patterns connus en parallèle
2. **Validation** : Chaque candidat PNR trouvé est validé selon des critères stricts
3. **Scoring** : Chaque candidat reçoit un score de confiance (0-100)
4. **Sélection** : Le candidat avec le score le plus élevé est sélectionné

## Patterns Actuellement Supportés

### 1. Pattern 2+6 lettres avant ET (Confiance: 95%)
- Format : `EEMXTRJEET0072` → PNR = `MXTRJE`
- Description : 2 lettres de préfixe + 6 lettres PNR + ET + chiffres

### 2. Pattern 3+6 lettres avant aéroport (Confiance: 90%)
- Format : `GREOIFLBUFIHMDK` → PNR = `OIFLBU`
- Description : 3 lettres de préfixe + 6 lettres PNR + code aéroport

### 3. Pattern 2+6 lettres avant aéroport (Confiance: 90%)
- Format : `EEMXTRJEFIHGMA` → PNR = `MXTRJE`
- Description : 2 lettres de préfixe + 6 lettres PNR + code aéroport

### 4. Pattern 8 lettres avant ET (Confiance: 85%)
- Format : `EEMXTRJEET0072` → PNR = `MXTRJE` (6 dernières lettres)
- Description : 8 lettres consécutives avant ET + chiffres

### 5. PNR direct avant ET (Confiance: 80%)
- Format : `MXTRJEET0072` → PNR = `MXTRJE`
- Description : 6 lettres directement avant ET + chiffres

### 6. PNR après nom (Confiance: 75%)
- Format : `M2MULENGA/MUMBI EGPKZLX` → PNR = `EGPKZLX`
- Description : PNR de 6 lettres après le nom du passager

### 7. Pattern générique (Confiance: 30%)
- Format : Fallback pour tout pattern de 6 lettres
- Description : Dernière option si aucun autre pattern ne correspond

## Système de Scoring

Chaque candidat PNR reçoit un score de confiance basé sur :

- **Score de base du pattern** : Chaque pattern a un score de base (30-95)
- **Bonus si après M1/M2** : +10 points
- **Bonus si suivi de ET ou aéroport** : +5 points
- **Pénalité si trop proche du début** : -20 points
- **Pénalité si proche d'un code bagage** : -30 points

Le candidat avec le score le plus élevé (minimum 40) est sélectionné.

## Validation des Candidats

Chaque candidat PNR doit passer plusieurs validations :

1. ✅ **Format** : Doit être exactement 6 lettres majuscules
2. ✅ **Pas un code aéroport** : Ne doit pas contenir de code aéroport connu
3. ✅ **Contexte valide** : Doit être dans un contexte approprié (après nom, avant ET, etc.)
4. ✅ **Pas dans un code bagage** : Ne doit pas faire partie d'une séquence de chiffres longue
5. ✅ **Pas dans le nom** : Ne doit pas être une partie du nom du passager

## Ajouter un Nouveau Pattern

Pour ajouter un nouveau pattern, utilisez la méthode `addPattern()` :

```typescript
import { pnrExtractorService } from '../services/pnr-extractor.service';

// Ajouter un nouveau pattern personnalisé
pnrExtractorService.addPattern({
  name: 'Mon nouveau pattern',
  regex: /([A-Z]{2})([A-Z]{6})(MON_MARQUEUR)/g,
  extractor: (match) => {
    // Extraire le PNR depuis le match
    return match[2]; // Les 6 lettres du milieu
  },
  validator: (pnr, context, match) => {
    // Valider que c'est un PNR valide
    return /^[A-Z]{6}$/.test(pnr) &&
           !KNOWN_AIRPORT_CODES.some(apt => pnr.includes(apt)) &&
           context.after.startsWith('MON_MARQUEUR');
  },
  confidence: 85, // Score de confiance (0-100)
});
```

### Exemple Complet

```typescript
// Pattern pour un nouveau format de compagnie aérienne
pnrExtractorService.addPattern({
  name: 'Pattern Compagnie XYZ',
  regex: /XYZ([A-Z]{6})(\d{4})/g,
  extractor: (match) => {
    // Le PNR est après "XYZ"
    return match[1];
  },
  validator: (pnr, context, match) => {
    // Valider que c'est un PNR valide
    const isValidFormat = /^[A-Z]{6}$/.test(pnr);
    const isNotAirport = !KNOWN_AIRPORT_CODES.some(apt => pnr.includes(apt));
    const hasValidContext = context.before.includes('XYZ') && 
                            /^\d{4}/.test(context.after);
    
    return isValidFormat && isNotAirport && hasValidContext;
  },
  confidence: 90,
});
```

## Logs et Debugging

Le service génère des logs détaillés pour le debugging :

```
[PNR-EXTRACTOR] ✅ PNR extrait: MXTRJE {
  pattern: 'Pattern 2+6 lettres avant ET',
  confidence: 95,
  position: 45,
  totalCandidates: 3,
  uniqueCandidates: 1
}
```

## Avantages du Système

1. **Flexibilité** : Peut gérer de multiples patterns simultanément
2. **Extensibilité** : Facile d'ajouter de nouveaux patterns sans modifier le code existant
3. **Robustesse** : Validation stricte et scoring pour éviter les faux positifs
4. **Maintenabilité** : Code modulaire et bien documenté
5. **Performance** : Traitement efficace même avec de nombreux patterns

## Bonnes Pratiques

1. **Toujours valider** : Ne jamais retourner un PNR sans validation
2. **Utiliser le contexte** : Vérifier le contexte avant et après le PNR
3. **Score approprié** : Donner un score de confiance réaliste
4. **Tester** : Tester avec de vrais boarding passes avant de déployer
5. **Documenter** : Documenter chaque nouveau pattern ajouté

## Dépannage

### Le PNR extrait est incorrect

1. Vérifier les logs pour voir quel pattern a été utilisé
2. Vérifier le score de confiance (doit être > 40)
3. Ajouter un nouveau pattern spécifique si nécessaire
4. Ajuster les validations pour être plus strictes

### Aucun PNR trouvé

1. Vérifier que les données brutes contiennent bien un PNR
2. Vérifier que le format correspond à un pattern connu
3. Ajouter un nouveau pattern si c'est un format inconnu
4. Vérifier les logs pour voir pourquoi les candidats ont été rejetés

## Support

Pour toute question ou problème, consulter les logs détaillés ou ajouter un nouveau pattern personnalisé selon vos besoins.


