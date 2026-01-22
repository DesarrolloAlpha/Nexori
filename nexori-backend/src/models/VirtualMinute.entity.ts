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
import { IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { User } from './User.entity';

@Entity('virtual_minutes')
@Index(['status'])
@Index(['priority'])
@Index(['type'])
@Index(['reportedBy'])
@Index(['createdAt'])
export class VirtualMinute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Título es requerido' })
  title: string;

  @Column({ type: 'text' })
  @IsNotEmpty({ message: 'Descripción es requerida' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['incident', 'novelty', 'observation'],
    default: 'incident',
  })
  @IsEnum(['incident', 'novelty', 'observation'], { message: 'Tipo inválido' })
  type: 'incident' | 'novelty' | 'observation';

  @Column()
  @IsNotEmpty({ message: 'Reportado por es requerido' })
  reportedBy: string;

  @Column()
  @IsNotEmpty({ message: 'Nombre del reportante es requerido' })
  reportedByName: string;

  @Column({ nullable: true })
  @IsOptional()
  location: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending',
  })
  @IsEnum(['pending', 'in_progress', 'resolved', 'closed'], {
    message: 'Estado inválido',
  })
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsEnum(['low', 'medium', 'high'], { message: 'Prioridad inválida' })
  priority: 'low' | 'medium' | 'high';

  @Column({ nullable: true })
  @IsOptional()
  assignedTo: string;

  @Column({ nullable: true })
  @IsOptional()
  assignedToName: string;

  @Column('simple-array', { nullable: true })
  @IsOptional()
  @IsArray()
  attachments: string[];

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by_user' })
  reportedByUser: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user' })
  assignedToUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true })
  resolvedByName: string;

  @Column({ nullable: true })
  closedBy: string;

  @Column({ nullable: true })
  closedByName: string;
}