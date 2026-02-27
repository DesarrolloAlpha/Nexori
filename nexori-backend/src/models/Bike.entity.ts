// src/models/Bike.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { User } from './User.entity';

@Entity('bikes')
@Index(['serialNumber'], { unique: true })
@Index(['status'])
@Index(['ownerDocument'])
export class Bike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Número de serie es requerido' })
  serialNumber: string;

  @Column()
  @IsNotEmpty({ message: 'Marca es requerida' })
  brand: string;

  @Column()
  @IsNotEmpty({ message: 'Modelo es requerido' })
  model: string;

  @Column()
  @IsNotEmpty({ message: 'Color es requerido' })
  color: string;

  @Column()
  @IsNotEmpty({ message: 'Nombre del propietario es requerido' })
  ownerName: string;

  @Column()
  @IsNotEmpty({ message: 'Documento del propietario es requerido' })
  ownerDocument: string;

  // 🆕 CAMPO NUEVO - Teléfono del propietario para enviar WhatsApp
  @Column({ nullable: true })
  @IsOptional()
  ownerPhone: string;

  @Column({ nullable: true })
  @IsOptional()
  location: string;

  @Column({
    type: 'enum',
    enum: ['inside', 'outside', 'maintenance'],
    default: 'inside',
  })
  @IsEnum(['inside', 'outside', 'maintenance'], { message: 'Estado inválido' })
  status: 'inside' | 'outside' | 'maintenance';

  @Column({ type: 'timestamp', nullable: true })
  lastCheckIn: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckOut: Date;

  @Column({ nullable: true })
  checkInBy: string;

  @Column({ nullable: true })
  checkOutBy: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  notes: string;

  @Column({ nullable: true })
  @IsOptional()
  qrCode: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'registered_by' })
  registeredBy: User;

  @Column({ nullable: true })
  registeredById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}