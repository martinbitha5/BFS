const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration pour résoudre les problèmes avec expo-sqlite et les modules WASM
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Ignorer les imports web de expo-sqlite sur mobile
    if (
      platform !== 'web' &&
      (moduleName.includes('wa-sqlite') ||
        moduleName.includes('expo-sqlite/web'))
    ) {
      return {
        type: 'empty',
      };
    }

    // Utiliser la résolution par défaut pour tout le reste
    return context.resolveRequest(context, moduleName, platform);
  },
  
  // Extensions de fichiers supportées
  sourceExts: [
    ...config.resolver.sourceExts,
    'cjs',
  ],
  
  // Types d'assets supportés
  assetExts: [
    ...config.resolver.assetExts,
    'db',
    'sqlite',
  ],
};

module.exports = config;
