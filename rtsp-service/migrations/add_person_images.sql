-- Migration: Add person_images columns to events table
-- Run: psql -U postgres -d violencesense -f migrations/add_person_images.sql

ALTER TABLE events ADD COLUMN IF NOT EXISTS person_images TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS person_count INTEGER DEFAULT 0;
