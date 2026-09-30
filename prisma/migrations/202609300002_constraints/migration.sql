-- Database checks backstop API validation and keep workflow values valid.
ALTER TABLE "Task" ADD CONSTRAINT "Task_status_check" CHECK ("status" IN ('BACKLOG','IN_PROGRESS','IN_REVIEW','DONE'));
ALTER TABLE "Task" ADD CONSTRAINT "Task_priority_check" CHECK ("priority" IN ('LOW','MEDIUM','HIGH','URGENT'));
ALTER TABLE "Project" ADD CONSTRAINT "Project_status_check" CHECK ("status" IN ('PLANNED','ACTIVE','ON_HOLD','COMPLETED'));
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_role_check" CHECK ("role" IN ('ADMIN','MEMBER'));
