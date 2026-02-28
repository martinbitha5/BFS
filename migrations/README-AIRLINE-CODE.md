# Migration airline_code pour les agents baggage

## Contexte
Les agents avec le rôle **baggage** peuvent désormais s'inscrire avec un **code compagnie** (ex: ET, KQ, 9U). Ce code filtre les données qu'ils voient dans l'application.

## Migration requise

**Exécuter la migration suivante sur Supabase** (SQL Editor) :

```sql
-- Fichier: add-airline-code-to-users.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS airline_code TEXT DEFAULT 'ALL';
CREATE INDEX IF NOT EXISTS idx_users_airline_code ON users(airline_code);
CREATE INDEX IF NOT EXISTS idx_users_airport_airline ON users(airport_code, airline_code);
COMMENT ON COLUMN users.airline_code IS 'Code IATA de la compagnie (ex: ET, KQ). Support/baggage_dispute ont "ALL"';
```

## Vérification
Après migration, vérifier que la colonne existe :
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'airline_code';
```

## Comportement
- **Agents baggage** : `airline_code` = code saisi à l'inscription (ET, KQ, 9U...)
- **Autres rôles** : `airline_code` = NULL ou 'ALL' (voient toutes les compagnies)
