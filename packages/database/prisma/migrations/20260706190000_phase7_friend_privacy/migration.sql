-- Phase 7: Friends privacy — allow a user to refuse all incoming friend requests.

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true;
