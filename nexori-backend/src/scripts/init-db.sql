-- Script para crear la base de datos Nexori
CREATE DATABASE nexori_db;

-- Conectar a la base de datos
\c nexori_db;

-- Crear extensión para UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verificar que las tablas se creen automáticamente con TypeORM
-- TypeORM generará las tablas automáticamente cuando synchronize: true