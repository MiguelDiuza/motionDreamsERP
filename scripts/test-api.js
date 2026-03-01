#!/usr/bin/env node

/**
 * Test del endpoint /api/stats/finances
 */

const http = require('http');

async function testFinancesAPI() {
    console.log('\n=== TEST DEL ENDPOINT /api/stats/finances ===\n');
    
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/stats/finances',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('Status Code:', res.statusCode);
                console.log('Headers:', res.headers);
                console.log('\nRespuesta JSON:');
                try {
                    const parsed = JSON.parse(data);
                    console.table(parsed);
                    console.log('\n✅ ENDPOINT FUNCIONANDO CORRECTAMENTE\n');
                } catch (e) {
                    console.log('❌ ERROR parsing JSON:');
                    console.log(data);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error('❌ ERROR:', error.message);
            resolve();
        });

        req.end();
    });
}

// Esperar a que el servidor esté listo
setTimeout(testFinancesAPI, 3000);
