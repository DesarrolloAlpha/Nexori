// models/Ticket.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';

export type TicketType = 'bug' | 'feature' | 'feedback' | 'question' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type!: TicketType;

  @Column({
    type: 'varchar',
    length: 20,
  })
  priority!: TicketPriority;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status!: TicketStatus;

  @Column({
    type: 'varchar',
    length: 200,
  })
  subject!: string;

  @Column('text')
  description!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId!: string;

  @Column({
    name: 'created_by_name',
    type: 'varchar',
    length: 100,
  })
  createdByName!: string;

  @Column({
    name: 'assigned_to_id',
    type: 'uuid',
    nullable: true,
  })
  assignedToId?: string;

  @Column({
    name: 'assigned_to_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  assignedToName?: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;

  @Column({
    name: 'resolved_at',
    type: 'timestamp',
    nullable: true,
  })
  resolvedAt?: Date;

  @Column({
    name: 'closed_at',
    type: 'timestamp',
    nullable: true,
  })
  closedAt?: Date;

  // Relaciones
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @OneToMany(() => TicketComment, comment => comment.ticket, { 
    cascade: true,
    eager: true 
  })
  comments!: TicketComment[];
}

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'ticket_id',
    type: 'uuid',
  })
  ticketId!: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId!: string;

  @Column({
    name: 'author_name',
    type: 'varchar',
    length: 100,
  })
  authorName!: string;

  @Column('text')
  message!: string;

  @Column({
    name: 'is_staff',
    type: 'boolean',
    default: false,
  })
  isStaff!: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  // Relaciones
  @ManyToOne(() => Ticket, ticket => ticket.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}