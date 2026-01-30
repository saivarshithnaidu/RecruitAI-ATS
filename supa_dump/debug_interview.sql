-- Find the user_id and application details
SELECT id, user_id, email, status
FROM applications
WHERE
    email = 'cuvar0508@gmail.com';

-- Find all interviews for this candidate
SELECT *
FROM interviews
WHERE
    candidate_id = (
        SELECT user_id
        FROM applications
        WHERE
            email = 'cuvar0508@gmail.com'
    );