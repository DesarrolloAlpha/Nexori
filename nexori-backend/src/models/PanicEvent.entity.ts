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
import { IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { User } from './User.entity';

@Entity('panic_events')
@Index(['status'])
@Index(['priority'])
@Index(['userId'])
@Index(['timestamp'])
export class PanicEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID de usuario es requerido' })
  userId: string;

  @Column()
  @IsNotEmpty({ message: 'Nombre de usuario es requerido' })
  userName: string;

  @Column('decimal', { precision: 10, scale: 8 })
  @IsNumber({}, { message: 'Latitud debe ser un número' })
  @Min(-90, { message: 'Latitud inválida' })
  @Max(90, { message: 'Latitud inválida' })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  @IsNumber({}, { message: 'Longitud debe ser un número' })
  @Min(-180, { message: 'Longitud inválida' })
  @Max(180, { message: 'Longitud inválida' })
  longitude: number;

  @Column({ nullable: true })
  @IsOptional()
  address: string;

  @Column({
    type: 'enum',
    enum: ['active', 'attended', 'resolved'],
    default: 'active',
  })
  @IsEnum(['active', 'attended', 'resolved'], { message: 'Estado inválido' })
  status: 'active' | 'attended' | 'resolved';

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsEnum(['low', 'medium', 'high'], { message: 'Prioridad inválida' })
  priority: 'low' | 'medium' | 'high';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ nullable: true })
  @IsOptional()
  attendedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  attendedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  notes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'attended_by_user' })
  attendedByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}