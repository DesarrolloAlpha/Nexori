// config/database.ts - ACTUALIZADO

import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../models/User.entity';
import { Bike } from '../models/Bike.entity';
import { PanicEvent } from '../models/PanicEvent.entity';
import { VirtualMinute } from '../models/VirtualMinute.entity';
import { Ticket, TicketComment } from '../models/Ticket.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'nexori_db',
  
  // Entidades - AGREGAR Ticket y TicketComment
  entities: [User, Bike, PanicEvent, VirtualMinute, Ticket, TicketComment],
  
  // Sincronización (solo en desarrollo)
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
  
  // Logging
  logging: process.env.TYPEORM_LOGGING === 'true',
  
  // SSL (para producción)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Configuraciones adicionales
  extra: {
    connectionLimit: 10,
  },
});

export const connectDB = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ PostgreSQL conectado exitosamente');

    // Migraciones de enums (agregar valores nuevos sin romper los existentes)
    await runEnumMigrations();

    // Crear usuario admin por defecto si no existe
    await createDefaultAdmin();

  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error);
    process.exit(1);
  }
};

/**
 * Agrega valores nuevos a enums existentes de forma segura.
 * ALTER TYPE ... ADD VALUE IF NOT EXISTS no puede correr dentro de una transacción,
 * pero TypeORM.query() corre en autocommit, por lo que es seguro aquí.
 */
async function runEnumMigrations(): Promise<void> {
  const migrations = [
    `ALTER TYPE virtual_minutes_type_enum ADD VALUE IF NOT EXISTS 'nueva_marca'`,
  ];

  for (const sql of migrations) {
    try {
      await AppDataSource.query(sql);
    } catch (error: any) {
      // Ignorar si el valor ya existe (error code 42710 en Postgres)
      if (!error?.message?.includes('already exists') && error?.code !== '42710') {
        console.warn('⚠️  Enum migration warning:', error?.message);
      }
    }
  }
  console.log('✅ Enum migrations OK');
}

async function createDefaultAdmin(): Promise<void> {
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;

  if (!adminPassword) {
    console.warn('⚠️  ADMIN_DEFAULT_PASSWORD no configurado — se omite la creación del admin por defecto');
    return;
  }

  try {
    const userRepository = AppDataSource.getRepository(User);
    const adminExists = await userRepository.findOne({ where: { email: 'admin@nexori.com' } });

    if (!adminExists) {
      const admin = userRepository.create({
        email: 'admin@nexori.com',
        password: adminPassword,
        name: 'Administrador Principal',
        role: 'admin',
      });

      await userRepository.save(admin);
      console.log('👑 Usuario administrador creado');
      console.log('📧 Email: admin@nexori.com');
    }
  } catch (error) {
    console.warn('⚠️  No se pudo crear el usuario admin por defecto:', error);
  }
}