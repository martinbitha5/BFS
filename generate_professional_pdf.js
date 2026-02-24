const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateProfessionalPDF() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Lire le fichier HTML professionnel
        const htmlContent = fs.readFileSync('Manuel_Utilisation_Police_Bagages_Pro.html', 'utf8');
        
        // Définir le contenu HTML
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Attendre que le contenu soit chargé
        await page.waitForSelector('.container');
        
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