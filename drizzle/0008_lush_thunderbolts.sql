CREATE TABLE `electionInteractionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interactionId` int NOT NULL,
	`userId` int NOT NULL,
	`outcome` enum('iniciada','enviada','respondida','sem_resposta','sem_interesse','agendada','outro') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `electionInteractionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `electionInteractionEvents` ADD CONSTRAINT `election_interaction_event_interaction_fk` FOREIGN KEY (`interactionId`) REFERENCES `electionCandidateInteractions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `electionInteractionEvents` ADD CONSTRAINT `election_interaction_event_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `election_interaction_events_interaction_created_idx` ON `electionInteractionEvents` (`interactionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `election_interaction_events_user_created_idx` ON `electionInteractionEvents` (`userId`,`createdAt`);
