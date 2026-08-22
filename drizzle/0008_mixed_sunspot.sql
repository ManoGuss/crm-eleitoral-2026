CREATE TABLE `electionCandidateFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`candidateId` int NOT NULL,
	`status` enum('Novo','Abordado','Respondeu','Não respondeu','Interessado','Follow-up','Proposta enviada','Fechado','Perdido') NOT NULL DEFAULT 'Novo',
	`lastContactAt` timestamp,
	`followUpAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `electionCandidateFavorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `election_candidate_favorite_user_candidate_unique` UNIQUE(`userId`,`candidateId`)
);
--> statement-breakpoint
ALTER TABLE `electionCandidateFavorites` ADD CONSTRAINT `electionCandidateFavorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionCandidateFavorites` ADD CONSTRAINT `electionCandidateFavorites_candidateId_electionCandidates_id_fk` FOREIGN KEY (`candidateId`) REFERENCES `electionCandidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `election_candidate_favorite_user_status_idx` ON `electionCandidateFavorites` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `election_candidate_favorite_user_followup_idx` ON `electionCandidateFavorites` (`userId`,`followUpAt`);