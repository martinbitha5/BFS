-- Table pour les compagnies aériennes (portail airlines)
CREATE TABLE IF NOT EXISTS airlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(2) NOT NULL UNIQUE CHECK (LENGTH(code) = 2),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherches rapides
CREATE INDEX idx_airlines_code ON airlines(code);
CREATE INDEX idx_airlines_email ON airlines(email);

-- Commentaires
COMMENT ON TABLE airlines IS 'Compagnies aériennes autorisées à uploader des fichiers BIRS';
COMMENT ON COLUMN airlines.code IS 'Code IATA à 2 lettres (ex: ET, TK, AF)';
COMMENT ON COLUMN airlines.password IS 'Mot de passe hashé avec bcrypt';
