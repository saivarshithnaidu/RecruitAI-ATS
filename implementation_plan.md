# Phase 2B: Secure AI-Proctored Exam System Implementation Plan

## Goal
Implement a secure, 3-section exam system (Aptitude, Verbal, Coding) with real-time AI proctoring and coding capabilities.

## User Review Required
> [!IMPORTANT]
> **Database Update**: You MUST run `scripts/phase2b-secure-exam.sql` in Supabase SQL Editor before new exams can be created.

## Proposed Changes

### Database Schema (SQL Script Provided)
- `admin_whitelist`: Table for Admin RLS.
- `exams`: Add `questions_data` (JSONB) for 3-section structure.
- `exam_violations`: Table for tracking malpractice.
- `coding_submissions`: Table for saving code attempts.
- `exam_assignments`: Add timing and violation columns.

### Backend APIs
#### [MODIFY] `app/api/admin/exams/create/route.ts`
- Use `actions/exams.ts` or direct API to save `questions_data`. (Completed)
#### [NEW] `app/api/exam/submit-code/route.ts`
- Endpoint to save coding submissions and simulate "Test Case Execution" (mock or basic judge).

### Frontend Components
#### [MODIFY] `app/candidate/exam/ExamInterface.tsx`
- **Refactor** to support 3 sections (Tabs/Sidebar).
- **Coding Question Support**: Add simple code editor.
- **Proctoring**:
  - Fullscreen enforcement.
  - Tab switch detection.
  - Camera preview (always on).

#### [NEW] `app/candidate/exam/CodingEditor.tsx`
- Component for code input and "Run Test Cases" button.

### Logic
- **Timer**: Global exam timer.
- **Nav**: Allow jumping between sections.
- **Auto-Submit**: On timer end or malpractice limit (3 violations).

## Verification Plan

### Automated Tests
- None currently set up (User environment limitation).

### Manual Verification
1.  **Admin**:
    -   Create a new Exam (e.g., "Full Stack Dev").
    -   Verify it generates 3 sections (Aptitude, Verbal, Coding).
2.  **Candidate**:
    -   Start Exam.
    -   Verify Fullscreen request.
    -   Try switching tabs -> Expect Warning.
    -   Answer MCQs in Section 1 & 2.
    -   Write Code in Section 3 -> Click "Run" -> Expect "Passed/Failed".
    -   Submit Exam.
3.  **Admin**:
    -   Check `exam_assignments` for result.
    -   Check `exam_violations` for logs.
