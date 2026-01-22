import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../models/User.entity';
import { Bike } from '../models/Bike.entity';
import { PanicEvent } from '../models/PanicEvent.entity';
import { VirtualMinute } from '../models/VirtualMinute.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_DATABASE || 'nexori_db',
  
  // Entidades
  entities: [User, Bike, PanicEvent, VirtualMinute],
  
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
    
    // Crear usuario admin por defecto si no existe
    await createDefaultAdmin();
    
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error);
    process.exit(1);
  }
};

async function createDefaultAdmin(): Promise<void> {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const adminExists = await userRepository.findOne({ where: { email: 'admin@nexori.com' } });
    
    if (!adminExists) {
      const admin = userRepository.create({
        email: 'admin@nexori.com',
        password: 'admin123',
        name: 'Administrador Principal',
        role: 'admin',
      });
      
      await userRepository.save(admin);
      console.log('👑 Usuario administrador creado por defecto');
      console.log('📧 Email: admin@nexori.com');
      console.log('🔑 Password: admin123');
    }
  } catch (error) {
    console.warn('⚠️  No se pudo crear el usuario admin por defecto:', error);
  }
}