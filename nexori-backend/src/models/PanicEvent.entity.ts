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

@Entity('panic_events')
@Index(['status'])
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

  @Column({
    type: 'enum',
    enum: ['active', 'attended', 'resolved'],
    default: 'active',
  })
  @IsEnum(['active', 'attended', 'resolved'], { message: 'Estado inválido' })
  status: 'active' | 'attended' | 'resolved';

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

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'attended_by_user' })
  attendedByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}