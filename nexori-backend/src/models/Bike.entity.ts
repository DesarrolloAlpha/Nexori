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
@Index(['code'], { unique: true })
@Index(['status'])
@Index(['ownerId'])
export class Bike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Código es requerido' })
  code: string;

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
  @IsNotEmpty({ message: 'ID del propietario es requerido' })
  ownerId: string;

  @Column({
    type: 'enum',
    enum: ['in', 'out', 'maintenance'],
    default: 'in',
  })
  @IsEnum(['in', 'out', 'maintenance'], { message: 'Estado inválido' })
  status: 'in' | 'out' | 'maintenance';

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