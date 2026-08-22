ALTER TABLE `electionCandidates` ADD `manualReviewStatus` enum('pendente','aprovado','rejeitado') DEFAULT 'pendente' NOT NULL;--> statement-breakpoint
ALTER TABLE `electionCandidates` ADD `manualReviewNote` text;--> statement-breakpoint
ALTER TABLE `electionCandidates` ADD `manualReviewedBy` int;--> statement-breakpoint
ALTER TABLE `electionCandidates` ADD `manualReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `electionCandidates` ADD CONSTRAINT `electionCandidates_manualReviewedBy_users_id_fk` FOREIGN KEY (`manualReviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `election_candidates_user_review_idx` ON `electionCandidates` (`userId`,`instagramVerification`,`manualReviewStatus`);