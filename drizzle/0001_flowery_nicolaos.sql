CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`message` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255),
	`type` enum('whatsapp','telefone','email','instagram','facebook','site','outro') NOT NULL DEFAULT 'outro',
	`value` text NOT NULL,
	`note` text,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`source` enum('importado','manual') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fieldDefinitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`normalizedKey` varchar(255) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`inferredType` enum('texto','numero','data','email','telefone','whatsapp','url','instagram','facebook') NOT NULL DEFAULT 'texto',
	`columnOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`aliases` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fieldDefinitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `field_definitions_user_key_unique` UNIQUE(`userId`,`normalizedKey`)
);
--> statement-breakpoint
CREATE TABLE `importSheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`isSelected` boolean NOT NULL DEFAULT false,
	`headerRow` int NOT NULL DEFAULT 1,
	`totalRows` int NOT NULL DEFAULT 0,
	`columnNames` json NOT NULL,
	`previewRows` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importSheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(1000) NOT NULL,
	`fileUrl` varchar(1200) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`fileSize` int NOT NULL,
	`status` enum('analisando','em_processamento','concluida','incompleta','falhou') NOT NULL DEFAULT 'analisando',
	`sheetCount` int NOT NULL DEFAULT 0,
	`totalRows` int NOT NULL DEFAULT 0,
	`createdLeads` int NOT NULL DEFAULT 0,
	`updatedLeads` int NOT NULL DEFAULT 0,
	`skippedDuplicates` int NOT NULL DEFAULT 0,
	`failedRows` int NOT NULL DEFAULT 0,
	`errorReport` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('Novo','Abordado','Respondeu','Não respondeu','Interessado','Follow-up','Proposta enviada','Fechado','Perdido') NOT NULL DEFAULT 'Novo',
	`description` text,
	`followUpAt` timestamp,
	`lastContactAt` timestamp,
	`lostReason` text,
	`servicesOfInterest` json,
	`customFields` json NOT NULL,
	`sourceImportId` int,
	`sourceSheet` varchar(255),
	`originalRowNumber` int,
	`dedupeKey` varchar(600),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fieldDefinitions` ADD CONSTRAINT `fieldDefinitions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importSheets` ADD CONSTRAINT `importSheets_importId_imports_id_fk` FOREIGN KEY (`importId`) REFERENCES `imports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importSheets` ADD CONSTRAINT `importSheets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imports` ADD CONSTRAINT `imports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_sourceImportId_imports_id_fk` FOREIGN KEY (`sourceImportId`) REFERENCES `imports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activities_user_lead_created_idx` ON `activities` (`userId`,`leadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `contacts_user_lead_idx` ON `contacts` (`userId`,`leadId`);--> statement-breakpoint
CREATE INDEX `contacts_user_type_idx` ON `contacts` (`userId`,`type`);--> statement-breakpoint
CREATE INDEX `field_definitions_user_order_idx` ON `fieldDefinitions` (`userId`,`columnOrder`);--> statement-breakpoint
CREATE INDEX `import_sheets_import_idx` ON `importSheets` (`importId`);--> statement-breakpoint
CREATE INDEX `import_sheets_user_idx` ON `importSheets` (`userId`);--> statement-breakpoint
CREATE INDEX `imports_user_created_idx` ON `imports` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `leads_user_updated_idx` ON `leads` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `leads_user_status_idx` ON `leads` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `leads_user_import_idx` ON `leads` (`userId`,`sourceImportId`);--> statement-breakpoint
CREATE INDEX `leads_user_dedupe_idx` ON `leads` (`userId`,`dedupeKey`);--> statement-breakpoint
CREATE INDEX `leads_user_followup_idx` ON `leads` (`userId`,`followUpAt`);--> statement-breakpoint
CREATE INDEX `notes_user_lead_created_idx` ON `notes` (`userId`,`leadId`,`createdAt`);