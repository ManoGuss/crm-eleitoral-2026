CREATE TABLE `electionCandidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`userId` int NOT NULL,
	`officialCandidateId` varchar(128) NOT NULL,
	`state` varchar(2) NOT NULL,
	`cargo` varchar(120) NOT NULL,
	`candidateName` varchar(500) NOT NULL,
	`ballotName` varchar(500),
	`candidateNumber` varchar(32),
	`party` varchar(120),
	`federation` varchar(255),
	`candidateStatus` varchar(180),
	`ballotAvailability` enum('Sim','Não','Em análise') NOT NULL DEFAULT 'Em análise',
	`city` varchar(255),
	`declaredProfiles` json,
	`primaryInstagram` varchar(1200),
	`secondaryInstagrams` json,
	`instagramVerification` enum('Verificado','Provável — requer revisão','Não localizado') NOT NULL DEFAULT 'Não localizado',
	`verificationSignals` json,
	`sourceRecord` json NOT NULL,
	`lastVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `electionCandidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `election_candidate_collection_official_unique` UNIQUE(`collectionId`,`officialCandidateId`)
);
--> statement-breakpoint
CREATE TABLE `electionCollections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`sourceUrl` varchar(1200) NOT NULL,
	`sourceStatus` enum('disponivel','indisponivel','processado','falhou') NOT NULL DEFAULT 'disponivel',
	`processStatus` enum('pendente','em_processamento','concluida','incompleta','falhou') NOT NULL DEFAULT 'pendente',
	`dataCutoffAt` timestamp,
	`processedAt` timestamp,
	`totalCandidates` int NOT NULL DEFAULT 0,
	`verifiedInstagramCount` int NOT NULL DEFAULT 0,
	`probableInstagramCount` int NOT NULL DEFAULT 0,
	`notFoundInstagramCount` int NOT NULL DEFAULT 0,
	`officialTotals` json,
	`summary` json,
	`errorReport` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `electionCollections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `electionCandidates` ADD CONSTRAINT `electionCandidates_collectionId_electionCollections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `electionCollections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionCandidates` ADD CONSTRAINT `electionCandidates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionCollections` ADD CONSTRAINT `electionCollections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `election_candidates_user_filter_idx` ON `electionCandidates` (`userId`,`state`,`cargo`);--> statement-breakpoint
CREATE INDEX `election_candidates_user_party_idx` ON `electionCandidates` (`userId`,`party`);--> statement-breakpoint
CREATE INDEX `election_candidates_user_instagram_idx` ON `electionCandidates` (`userId`,`instagramVerification`);--> statement-breakpoint
CREATE INDEX `election_collections_user_created_idx` ON `electionCollections` (`userId`,`createdAt`);