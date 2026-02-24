const puppeteer = require('puppeteer');
const fs = require('fs');

async function generateProfessionalPDF() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Configurer un timeout plus long
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);
        
        // Lire le fichier HTML professionnel
        const htmlContent = fs.readFileSync('Manuel_Utilisation_Police_Bagages_Pro.html', 'utf8');
        
        // Définir le contenu HTML avec une attente plus courte
        await page.setContent(htmlContent, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        // Attendre un court instant pour le rendu
        await page.waitForTimeout(2000);
        
        // Générer le PDF professionnel
        await page.pdf({
            path: 'Manuel_Utilisation_Police_Bagages_Pro.pdf',
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            },
            displayHeaderFooter: false
        });
        
        console.log('✅ PDF professionnel généré avec succès : Manuel_Utilisation_Police_Bagages_Pro.pdf');
        
    } catch (error) {
        console.error('❌ Erreur lors de la génération du PDF professionnel:', error);
    } finally {
        await browser.close();
    }
}

// Exécuter la génération
generateProfessionalPDF();