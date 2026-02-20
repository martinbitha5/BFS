const puppeteer = require('puppeteer');

async function testDashboardBrowser() {
    console.log('🌐 Test du Dashboard dans le navigateur...\n');
    
    const browser = await puppeteer.launch({
        headless: false, // Mode visible pour voir ce qui se passe
        slowMo: 100, // Ralentir légèrement pour observer
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Activer la console pour capturer les logs
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Erreur console:', msg.text());
            } else {
                console.log('📝 Console:', msg.text());
            }
        });
        
        // Aller sur la page de connexion
        console.log('1️⃣ Navigation vers le dashboard...');
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
        
        // Attendre que la page charge
        await page.waitForTimeout(2000);
        
        // Vérifier si on est sur la page de connexion ou dashboard
        const currentUrl = page.url();
        console.log('📍 URL actuelle:', currentUrl);
        
        if (currentUrl.includes('login') || currentUrl === 'http://localhost:4173/') {
            console.log('2️⃣ Page de connexion détectée, tentative de connexion...');
            
            // Remplir le formulaire de connexion
            await page.waitForSelector('input[type="email"]', { timeout: 5000 }).catch(() => {
                console.log('⚠️  Champ email non trouvé, tentative de sélecteur alternatif...');
                return page.waitForSelector('input[name="email"]', { timeout: 5000 });
            });
            
            await page.type('input[type="email"], input[name="email"]', 'superviseur@bfs.cd');
            await page.type('input[type="password"], input[name="password"]', 'password123');
            
            // Cliquer sur le bouton de connexion
            await page.click('button[type="submit"], button:contains("Connexion"), button:contains("Login")').catch(() => {
                console.log('⚠️  Bouton standard non trouvé, tentative de clic sur le premier bouton...');
                return page.click('button');
            });
            
            // Attendre la redirection
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            await page.waitForTimeout(3000);
        }
        
        // Vérifier l'URL après connexion
        const finalUrl = page.url();
        console.log('🎯 URL finale:', finalUrl);
        
        // Capturer le contenu de la page
        const content = await page.content();
        
        // Vérifier si des données sont affichées
        console.log('3️⃣ Vérification du contenu...');
        
        // Rechercher des indicateurs de données
        const hasPassengers = content.includes('MASIKA KANEFU JEANNEE') || 
                             content.includes('passager') || 
                             content.includes('Passagers');
        
        const hasStats = content.includes('Vols Actifs') || 
                        content.includes('Passagers') || 
                        content.includes('Bagages');
        
        const hasCharts = content.includes('chart') || 
                         content.includes('graph') || 
                         content.includes('Embarquement');
        
        console.log('📊 Résultats de la vérification:');
        console.log(`   ✓ Données passagers: ${hasPassengers ? 'TROUVÉES' : 'NON TROUVÉES'}`);
        console.log(`   ✓ Statistiques: ${hasStats ? 'TROUVÉES' : 'NON TROUVÉES'}`);
        console.log(`   ✓ Graphiques: ${hasCharts ? 'TROUVÉS' : 'NON TROUVÉS'}`);
        
        // Capturer une capture d'écran
        await page.screenshot({ path: 'dashboard-test-result.png', fullPage: true });
        console.log('📸 Capture d\'écran sauvegardée: dashboard-test-result.png');
        
        // Vérifier le localStorage
        const localStorageData = await page.evaluate(() => {
            const token = localStorage.getItem('bfs_token');
            const user = localStorage.getItem('bfs_user');
            return { token: !!token, user: !!user };
        });
        
        console.log('💾 LocalStorage:');
        console.log(`   ✓ Token présent: ${localStorageData.token ? 'OUI' : 'NON'}`);
        console.log(`   ✓ User présent: ${localStorageData.user ? 'OUI' : 'NON'}`);
        
        // Attendre un peu pour voir le résultat
        await page.waitForTimeout(5000);
        
        if (hasPassengers && hasStats) {
            console.log('\n🎉 SUCCÈS: Le Dashboard fonctionne correctement et affiche les données!');
        } else {
            console.log('\n⚠️  ATTENTION: Certains éléments ne s\'affichent pas correctement');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test navigateur:', error.message);
        
        // Capturer une capture d'écran en cas d'erreur
        try {
            const page = (await browser.pages())[0];
            await page.screenshot({ path: 'dashboard-error.png', fullPage: true });
            console.log('📸 Capture d\'écran d\'erreur sauvegardée: dashboard-error.png');
        } catch (screenshotError) {
            console.log('⚠️  Impossible de capturer l\'erreur');
        }
        
    } finally {
        // Laisser le navigateur ouvert pour inspection manuelle
        console.log('\n⏸️  Le navigateur reste ouvert pour inspection manuelle');
        console.log('   Appuyez sur Ctrl+C pour fermer ce script');
        
        // Attendre indéfiniment
        await new Promise(() => {});
        // await browser.close(); // Décommenter pour fermer automatiquement
    }
}

// Vérifier si Puppeteer est installé
try {
    require.resolve('puppeteer');
    testDashboardBrowser();
} catch (error) {
    console.log('📦 Puppeteer non installé, installation en cours...');
    const { execSync } = require('child_process');
    try {
        execSync('npm install puppeteer', { stdio: 'inherit' });
        console.log('✅ Puppeteer installé, lancement du test...');
        testDashboardBrowser();
    } catch (installError) {
        console.error('❌ Impossible d\'installer Puppeteer:', installError.message);
        console.log('💡 Alternative: Ouvrez manuellement http://localhost:4173 dans votre navigateur');
    }
}