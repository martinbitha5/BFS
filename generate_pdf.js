const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Lire le fichier HTML
        const htmlContent = fs.readFileSync('Manuel_Utilisation_Police_Bagages.html', 'utf8');
        
        // Définir le contenu HTML
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Attendre un peu pour que tout soit rendu
        await page.waitForTimeout(2000);
        
        // Générer le PDF
        await page.pdf({
            path: 'Manuel_Utilisation_Police_Bagages.pdf',
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });
        
        console.log('✅ PDF généré avec succès : Manuel_Utilisation_Police_Bagages.pdf');
        
    } catch (error) {
        console.error('❌ Erreur lors de la génération du PDF:', error);
    } finally {
        await browser.close();
    }
}

// Exécuter la génération
generatePDF();