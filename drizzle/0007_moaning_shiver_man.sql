CREATE TABLE `electionCandidateInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('instagram','whatsapp') NOT NULL,
	`outcome` enum('iniciada','enviada','respondida','sem_resposta','sem_interesse','agendada','outro') NOT NULL DEFAULT 'iniciada',
	`note` text,
	`targetUrl` varchar(1200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `electionCandidateInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `electionContactPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`whatsappTemplate` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `electionContactPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `election_contact_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `electionReviewDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`userId` int NOT NULL,
	`decision` enum('aprovado','rejeitado') NOT NULL,
	`previousVerification` varchar(80) NOT NULL,
	`resultingVerification` varchar(80) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `electionReviewDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `electionCandidateInteractions` ADD CONSTRAINT `election_interaction_candidate_fk` FOREIGN KEY (`candidateId`) REFERENCES `electionCandidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionCandidateInteractions` ADD CONSTRAINT `election_interaction_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionContactPreferences` ADD CONSTRAINT `election_contact_pref_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionReviewDecisions` ADD CONSTRAINT `election_review_decision_candidate_fk` FOREIGN KEY (`candidateId`) REFERENCES `electionCandidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionReviewDecisions` ADD CONSTRAINT `election_review_decision_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `election_interactions_candidate_created_idx` ON `electionCandidateInteractions` (`candidateId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `election_interactions_user_created_idx` ON `electionCandidateInteractions` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `election_review_decisions_candidate_created_idx` ON `electionReviewDecisions` (`candidateId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `election_review_decisions_user_created_idx` ON `electionReviewDecisions` (`userId`,`createdAt`);
