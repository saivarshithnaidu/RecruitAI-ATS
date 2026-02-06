alter table exam_assignments
add column if not exists reschedule_count integer default 0;