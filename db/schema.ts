import {pgTable,text,smallint,integer,bigint,timestamp,index,uniqueIndex,check} from 'drizzle-orm/pg-core';
import {sql} from 'drizzle-orm';
const created=()=>timestamp('created_at',{withTimezone:true,mode:'string'}).notNull().defaultNow();
export const admins=pgTable('admins',{userId:text('user_id').primaryKey(),createdAt:created()});
export const creators=pgTable('creators',{
 id:text('id').primaryKey(),name:text('name').notNull(),handle:text('handle').notNull(),email:text('email'),userId:text('user_id'),background:text('background').notNull().default('classic'),bio:text('bio').notNull().default(''),editVersion:bigint('edit_version',{mode:'number'}).notNull().default(0),theme:text('theme').notNull().default('empire'),layout:text('layout').notNull().default('rounded'),font:text('font').notNull().default('modern'),createdAt:created(),
},t=>[uniqueIndex('creator_handle').on(sql`lower(${t.handle})`),uniqueIndex('creator_email').on(sql`lower(${t.email})`),uniqueIndex('creator_user').on(t.userId),check('creators_theme_check',sql`${t.theme} in ('empire','midnight','pearl','sunset','mint','mono','ocean','rose','violet','coffee')`),check('creators_layout_check',sql`${t.layout} in ('rounded','pill','outline','glass','sharp','shadow')`),check('creators_font_check',sql`${t.font} in ('modern','editorial','mono')`)]);
export const links=pgTable('links',{
 id:text('id').primaryKey(),icon:text('icon').notNull().default('auto'),slug:text('slug').notNull().unique(),title:text('title').notNull(),brand:text('brand').notNull().default('Website'),creatorId:text('creator_id').notNull().references(()=>creators.id),destination:text('destination').notNull(),tags:text('tags').array().notNull().default(sql`'{}'::text[]`),sortOrder:integer('sort_order').notNull().default(0),active:smallint('active').notNull().default(1),expiresAt:timestamp('expires_at',{withTimezone:true,mode:'string'}),createdAt:created(),
},t=>[index('link_creator').on(t.creatorId),check('links_active_check',sql`${t.active} in (0,1)`)]);
export const clicks=pgTable('clicks',{
 id:text('id').primaryKey(),linkId:text('link_id').notNull().references(()=>links.id),visitor:text('visitor').notNull(),country:text('country').notNull(),device:text('device').notNull(),referrer:text('referrer').notNull(),createdAt:created(),
},t=>[index('click_link_date').on(t.linkId,t.createdAt),index('click_visitor').on(t.linkId,t.visitor)]);

export const adminLoginAttempts=pgTable('admin_login_attempts',{
 bucket:text('bucket').primaryKey(),attempts:integer('attempts').notNull().default(0),windowStart:timestamp('window_start',{withTimezone:true,mode:'string'}).notNull().defaultNow(),
});
