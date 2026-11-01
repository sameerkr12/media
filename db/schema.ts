import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const creators=sqliteTable('creators',{
 id:text('id').primaryKey(),name:text('name').notNull(),handle:text('handle').notNull(),email:text('email'),userId:text('user_id'),bio:text('bio').notNull().default(''),createdAt:text('created_at').notNull()
},t=>[uniqueIndex('creator_email').on(t.email),uniqueIndex('creator_user').on(t.userId)]);
export const links=sqliteTable('links',{
 id:text('id').primaryKey(),slug:text('slug').notNull(),title:text('title').notNull(),brand:text('brand').notNull(),creatorId:text('creator_id').notNull().references(()=>creators.id),destination:text('destination').notNull(),active:integer('active').notNull().default(1),expiresAt:text('expires_at'),createdAt:text('created_at').notNull()
},t=>[uniqueIndex('link_slug').on(t.slug),index('link_creator').on(t.creatorId)]);
export const clicks=sqliteTable('clicks',{
 id:text('id').primaryKey(),linkId:text('link_id').notNull().references(()=>links.id),visitor:text('visitor').notNull(),country:text('country').notNull(),device:text('device').notNull(),referrer:text('referrer').notNull(),createdAt:text('created_at').notNull()
},t=>[index('click_link_date').on(t.linkId,t.createdAt),index('click_visitor').on(t.linkId,t.visitor)]);
export const admins=sqliteTable('admins',{userId:text('user_id').primaryKey(),createdAt:text('created_at').notNull()});
