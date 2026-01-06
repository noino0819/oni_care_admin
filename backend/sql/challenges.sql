-- ============================================
-- 챌린지 관리 SQL 쿼리
-- 대상 DB: oni_care (App DB)
-- ============================================

-- name: count_challenges
SELECT COUNT(*) as total
FROM challenges
WHERE is_active = true
  AND (%(title)s IS NULL OR title ILIKE '%%' || %(title)s || '%%')
  AND (%(challenge_type)s IS NULL OR challenge_type = %(challenge_type)s)
  AND (%(verification_method)s IS NULL OR verification_method = %(verification_method)s)
  AND (%(operation_from)s IS NULL OR operation_start_date >= %(operation_from)s)
  AND (%(operation_to)s IS NULL OR operation_end_date <= %(operation_to)s)
  AND (%(recruitment_from)s IS NULL OR recruitment_start_date >= %(recruitment_from)s)
  AND (%(recruitment_to)s IS NULL OR recruitment_end_date <= %(recruitment_to)s)
  AND (%(display_from)s IS NULL OR display_start_date >= %(display_from)s)
  AND (%(display_to)s IS NULL OR display_end_date <= %(display_to)s);

-- name: get_challenges_list
SELECT 
    c.id,
    c.challenge_type,
    c.verification_method,
    c.title,
    c.subtitle,
    c.description,
    c.max_participants,
    c.challenge_duration_days,
    c.display_order,
    c.recruitment_start_date,
    c.recruitment_end_date,
    c.operation_start_date,
    c.operation_end_date,
    c.display_start_date,
    c.display_end_date,
    c.visibility_scope,
    c.company_codes,
    c.store_visible,
    c.rank_display_type,
    c.is_active,
    c.is_suspended,
    c.status,
    c.current_participants,
    c.daily_verification_count,
    c.daily_verification_settings,
    c.daily_achievement_count,
    c.total_achievement_days,
    c.reward_settings,
    c.type_settings,
    c.images,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.updated_by
FROM challenges c
WHERE c.is_active = true
  AND (%(title)s IS NULL OR c.title ILIKE '%%' || %(title)s || '%%')
  AND (%(challenge_type)s IS NULL OR c.challenge_type = %(challenge_type)s)
  AND (%(verification_method)s IS NULL OR c.verification_method = %(verification_method)s)
  AND (%(operation_from)s IS NULL OR c.operation_start_date >= %(operation_from)s)
  AND (%(operation_to)s IS NULL OR c.operation_end_date <= %(operation_to)s)
  AND (%(recruitment_from)s IS NULL OR c.recruitment_start_date >= %(recruitment_from)s)
  AND (%(recruitment_to)s IS NULL OR c.recruitment_end_date <= %(recruitment_to)s)
  AND (%(display_from)s IS NULL OR c.display_start_date >= %(display_from)s)
  AND (%(display_to)s IS NULL OR c.display_end_date <= %(display_to)s)
ORDER BY c.display_order ASC, c.created_at DESC
LIMIT %(limit)s OFFSET %(offset)s;

-- name: get_challenge_by_id
SELECT 
    c.id,
    c.challenge_type,
    c.verification_method,
    c.title,
    c.subtitle,
    c.description,
    c.max_participants,
    c.challenge_duration_days,
    c.display_order,
    c.recruitment_start_date,
    c.recruitment_end_date,
    c.operation_start_date,
    c.operation_end_date,
    c.display_start_date,
    c.display_end_date,
    c.visibility_scope,
    c.company_codes,
    c.store_visible,
    c.rank_display_type,
    c.is_active,
    c.is_suspended,
    c.status,
    c.current_participants,
    c.daily_verification_count,
    c.daily_verification_settings,
    c.daily_achievement_count,
    c.total_achievement_days,
    c.reward_settings,
    c.type_settings,
    c.images,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.updated_by
FROM challenges c
WHERE c.id = %(challenge_id)s::uuid;

-- name: insert_challenge
INSERT INTO challenges (
    challenge_type,
    verification_method,
    title,
    subtitle,
    description,
    max_participants,
    challenge_duration_days,
    display_order,
    recruitment_start_date,
    recruitment_end_date,
    operation_start_date,
    operation_end_date,
    display_start_date,
    display_end_date,
    visibility_scope,
    company_codes,
    store_visible,
    rank_display_type,
    daily_verification_count,
    daily_verification_settings,
    daily_achievement_count,
    total_achievement_days,
    reward_settings,
    type_settings,
    images,
    created_by
) VALUES (
    %(challenge_type)s,
    %(verification_method)s,
    %(title)s,
    %(subtitle)s,
    %(description)s,
    %(max_participants)s,
    %(challenge_duration_days)s,
    %(display_order)s,
    %(recruitment_start_date)s,
    %(recruitment_end_date)s,
    %(operation_start_date)s,
    %(operation_end_date)s,
    %(display_start_date)s,
    %(display_end_date)s,
    %(visibility_scope)s,
    %(company_codes)s,
    %(store_visible)s,
    %(rank_display_type)s,
    %(daily_verification_count)s,
    %(daily_verification_settings)s,
    %(daily_achievement_count)s,
    %(total_achievement_days)s,
    %(reward_settings)s,
    %(type_settings)s,
    %(images)s,
    %(created_by)s
)
RETURNING *;

-- name: update_challenge
UPDATE challenges
SET 
    title = COALESCE(%(title)s, title),
    subtitle = COALESCE(%(subtitle)s, subtitle),
    description = COALESCE(%(description)s, description),
    max_participants = COALESCE(%(max_participants)s, max_participants),
    challenge_duration_days = COALESCE(%(challenge_duration_days)s, challenge_duration_days),
    display_order = COALESCE(%(display_order)s, display_order),
    recruitment_start_date = COALESCE(%(recruitment_start_date)s, recruitment_start_date),
    recruitment_end_date = COALESCE(%(recruitment_end_date)s, recruitment_end_date),
    operation_start_date = COALESCE(%(operation_start_date)s, operation_start_date),
    operation_end_date = COALESCE(%(operation_end_date)s, operation_end_date),
    display_start_date = COALESCE(%(display_start_date)s, display_start_date),
    display_end_date = COALESCE(%(display_end_date)s, display_end_date),
    visibility_scope = COALESCE(%(visibility_scope)s, visibility_scope),
    company_codes = COALESCE(%(company_codes)s, company_codes),
    store_visible = COALESCE(%(store_visible)s, store_visible),
    rank_display_type = COALESCE(%(rank_display_type)s, rank_display_type),
    is_suspended = COALESCE(%(is_suspended)s, is_suspended),
    daily_verification_count = COALESCE(%(daily_verification_count)s, daily_verification_count),
    daily_verification_settings = COALESCE(%(daily_verification_settings)s::jsonb, daily_verification_settings),
    daily_achievement_count = COALESCE(%(daily_achievement_count)s, daily_achievement_count),
    total_achievement_days = COALESCE(%(total_achievement_days)s, total_achievement_days),
    reward_settings = COALESCE(%(reward_settings)s::jsonb, reward_settings),
    type_settings = COALESCE(%(type_settings)s::jsonb, type_settings),
    images = COALESCE(%(images)s::jsonb, images),
    updated_by = %(updated_by)s,
    updated_at = NOW()
WHERE id = %(challenge_id)s::uuid
RETURNING *;

-- name: delete_challenges_batch
UPDATE challenges
SET is_active = false, updated_by = %(updated_by)s, updated_at = NOW()
WHERE id = ANY(%(challenge_ids)s::uuid[])
RETURNING id;

-- ============================================
-- 퀴즈 관련 쿼리 (quiz_master 테이블 사용)
-- ============================================

-- name: count_quizzes
SELECT COUNT(*) as total
FROM quiz_master
WHERE is_active = true
  AND (%(quiz_name)s IS NULL OR quiz_name ILIKE '%%' || %(quiz_name)s || '%%')
  AND (%(quiz_type)s IS NULL OR quiz_type = %(quiz_type)s);

-- name: get_quizzes_list
SELECT 
    id,
    quiz_name,
    quiz_type,
    question,
    options,
    correct_answers,
    hint,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by
FROM quiz_master
WHERE is_active = true
  AND (%(quiz_name)s IS NULL OR quiz_name ILIKE '%%' || %(quiz_name)s || '%%')
  AND (%(quiz_type)s IS NULL OR quiz_type = %(quiz_type)s)
ORDER BY created_at DESC
LIMIT %(limit)s OFFSET %(offset)s;

-- name: get_quiz_by_id
SELECT 
    id,
    quiz_name,
    quiz_type,
    question,
    options,
    correct_answers,
    hint,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by
FROM quiz_master
WHERE id = %(quiz_id)s::uuid;

-- name: insert_quiz
INSERT INTO quiz_master (
    quiz_name,
    quiz_type,
    question,
    options,
    correct_answers,
    hint,
    created_by
) VALUES (
    %(quiz_name)s,
    %(quiz_type)s,
    %(question)s,
    %(options)s,
    %(correct_answers)s,
    %(hint)s,
    %(created_by)s
)
RETURNING *;

-- name: update_quiz
UPDATE quiz_master
SET 
    quiz_name = COALESCE(%(quiz_name)s, quiz_name),
    question = COALESCE(%(question)s, question),
    options = COALESCE(%(options)s::jsonb, options),
    correct_answers = COALESCE(%(correct_answers)s::jsonb, correct_answers),
    hint = COALESCE(%(hint)s, hint),
    updated_by = %(updated_by)s,
    updated_at = NOW()
WHERE id = %(quiz_id)s::uuid
RETURNING *;

-- name: delete_quizzes_batch
UPDATE quiz_master
SET is_active = false, updated_by = %(updated_by)s, updated_at = NOW()
WHERE id = ANY(%(quiz_ids)s::uuid[])
RETURNING id;

-- ============================================
-- 챌린지-퀴즈 연결 쿼리 (challenge_quiz_mapping 테이블 사용)
-- ============================================

-- name: get_challenge_quizzes
SELECT 
    qm.id,
    qm.quiz_name,
    qm.quiz_type,
    qm.question,
    qm.options,
    qm.correct_answers,
    qm.hint,
    qm.is_active,
    qm.created_at,
    qm.updated_at,
    qm.created_by,
    qm.updated_by,
    cqm.display_order
FROM challenge_quiz_mapping cqm
JOIN quiz_master qm ON cqm.quiz_id = qm.id
WHERE cqm.challenge_id = %(challenge_id)s::uuid
  AND qm.is_active = true
ORDER BY cqm.display_order ASC;

-- name: add_quiz_to_challenge
INSERT INTO challenge_quiz_mapping (challenge_id, quiz_id, display_order)
VALUES (%(challenge_id)s::uuid, %(quiz_id)s::uuid, COALESCE(%(display_order)s, 0))
ON CONFLICT (challenge_id, quiz_id) DO UPDATE SET display_order = EXCLUDED.display_order
RETURNING *;

-- name: remove_quiz_from_challenge
DELETE FROM challenge_quiz_mapping
WHERE challenge_id = %(challenge_id)s::uuid
  AND quiz_id = %(quiz_id)s::uuid
RETURNING *;

-- name: get_quiz_challenges_list
SELECT 
    c.id,
    c.challenge_type,
    c.verification_method,
    c.title,
    c.subtitle,
    c.operation_start_date,
    c.operation_end_date,
    c.recruitment_start_date,
    c.recruitment_end_date,
    c.display_start_date,
    c.display_end_date,
    c.visibility_scope,
    c.status as challenge_status,
    (SELECT COUNT(*) FROM challenge_quiz_mapping WHERE challenge_id = c.id) as quiz_count
FROM challenges c
WHERE c.is_active = true
  AND c.challenge_type = 'quiz'
  AND (%(title)s IS NULL OR c.title ILIKE '%%' || %(title)s || '%%')
  AND (%(operation_from)s IS NULL OR c.operation_start_date >= %(operation_from)s)
  AND (%(operation_to)s IS NULL OR c.operation_end_date <= %(operation_to)s)
  AND (%(recruitment_from)s IS NULL OR c.recruitment_start_date >= %(recruitment_from)s)
  AND (%(recruitment_to)s IS NULL OR c.recruitment_end_date <= %(recruitment_to)s)
  AND (%(display_from)s IS NULL OR c.display_start_date >= %(display_from)s)
  AND (%(display_to)s IS NULL OR c.display_end_date <= %(display_to)s)
ORDER BY c.display_order ASC, c.created_at DESC;
