-- Semilla de Clientes Iniciales
-- Ejecutar este script para cargar los primeros clientes en la base de datos motion_erp

INSERT INTO clients (name, company_name, phone) VALUES 
('Yair', 'Cantina', '322 3179025'),
('big popita', 'la fuga', '321 5361933'),
('Valeria', 'Bio drinks', '312 2743952');

-- Verificar inserción
SELECT * FROM clients;
