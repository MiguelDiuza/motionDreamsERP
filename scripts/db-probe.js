const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/motion_erp',
});

async function seed() {
    try {
        console.log('Probando conexión a PostgreSQL...');
        const now = await pool.query('SELECT NOW()');
        console.log('Conexión exitosa:', now.rows[0].now);

        console.log('Insertando clientes...');
        const clients = [
            { name: 'Yair', company: 'Cantina', phone: '322 3179025' },
            { name: 'big popita', company: 'la fuga', phone: '321 5361933' },
            { name: 'Valeria', company: 'Bio drinks', phone: '312 2743952' }
        ];

        for (const c of clients) {
            await pool.query(
                'INSERT INTO clients (name, company_name, phone) VALUES ($1, $2, $3)',
                [c.name, c.company, c.phone]
            );
            console.log(`Cliente ${c.name} insertado.`);
        }

        console.log('Seeding completado con éxito.');
    } catch (err) {
        console.error('ERROR FATAL EN DB:', err.message);
        if (err.code === '3D000') {
            console.error('Sugerencia: La base de datos "motion_erp" no existe. Debes crearla primero.');
        } else if (err.code === '28P01') {
            console.error('Sugerencia: Contraseña incorrecta para el usuario "postgres".');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('Sugerencia: PostgreSQL no parece estar corriendo en localhost:5432.');
        }
    } finally {
        await pool.end();
    }
}

seed();
