-- ============================================
-- QUICK SQL COMMANDS - Przydatne komendy
-- ============================================
-- Skopiuj i uruchom w Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SPRAWDŹ STATUS BAZY
-- ============================================

-- Liczba wszystkich tabel
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Lista wszystkich tabel
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Rozmiar każdej tabeli
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 2. UŻYTKOWNICY
-- ============================================

-- Wszyscy użytkownicy
SELECT id, email, name, plan, credits, created_at 
FROM users 
ORDER BY created_at DESC;

-- Użytkownicy premium
SELECT email, name, plan, credits 
FROM users 
WHERE plan != 'free'
ORDER BY created_at DESC;

-- Zmień plan użytkownika
UPDATE users 
SET plan = 'pro', credits = 1000 
WHERE email = 'user@example.com';

-- Dodaj credits użytkownikowi
UPDATE users 
SET credits = credits + 100 
WHERE email = 'user@example.com';

-- Usuń użytkownika (CASCADE usunie wszystkie jego dane)
DELETE FROM users WHERE email = 'user@example.com';

-- ============================================
-- 3. ZAPLANOWANE POSTY
-- ============================================

-- Wszystkie zaplanowane posty
SELECT 
    u.email,
    sp.content,
    sp.scheduled_at,
    sp.status,
    sp.created_at
FROM scheduled_posts sp
JOIN users u ON sp.user_id = u.id
WHERE sp.status = 'scheduled'
ORDER BY sp.scheduled_at;

-- Posty do publikacji w ciągu 24h
SELECT 
    u.email,
    sp.content,
    sp.scheduled_at,
    sp.status
FROM scheduled_posts sp
JOIN users u ON sp.user_id = u.id
WHERE sp.status = 'scheduled'
AND sp.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
ORDER BY sp.scheduled_at;

-- Anuluj zaplanowany post
UPDATE scheduled_posts 
SET status = 'cancelled' 
WHERE id = 'post_id_here';

-- Usuń stare cancelled posty (starsze niż 30 dni)
DELETE FROM scheduled_posts 
WHERE status = 'cancelled' 
AND created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 4. OPUBLIKOWANE POSTY
-- ============================================

-- Ostatnie opublikowane posty
SELECT 
    u.email,
    pp.platform,
    pp.content,
    pp.published_at,
    pp.status
FROM published_posts pp
JOIN users u ON pp.user_id = u.id
ORDER BY pp.published_at DESC
LIMIT 50;

-- Posty per platform
SELECT 
    platform,
    COUNT(*) as total_posts
FROM published_posts
WHERE status = 'published'
GROUP BY platform
ORDER BY total_posts DESC;

-- Statystyki użytkownika
SELECT 
    u.email,
    COUNT(pp.id) as total_posts,
    COUNT(DISTINCT pp.platform) as platforms_used
FROM users u
LEFT JOIN published_posts pp ON u.id = pp.user_id
GROUP BY u.id, u.email
ORDER BY total_posts DESC;

-- ============================================
-- 5. SOCIAL CONNECTIONS
-- ============================================

-- Aktywne połączenia
SELECT 
    u.email,
    sc.platform,
    sc.account_name,
    sc.account_handle,
    sc.connected_at,
    sc.is_active
FROM social_connections sc
JOIN users u ON sc.user_id = u.id
WHERE sc.is_active = true
ORDER BY sc.connected_at DESC;

-- Dezaktywuj połączenie
UPDATE social_connections 
SET is_active = false 
WHERE id = 'connection_id_here';

-- Usuń stare nieaktywne połączenia (starsze niż 90 dni)
DELETE FROM social_connections 
WHERE is_active = false 
AND connected_at < NOW() - INTERVAL '90 days';

-- ============================================
-- 6. GENERATION HISTORY
-- ============================================

-- Ostatnie generacje
SELECT 
    u.email,
    gh.platform,
    LEFT(gh.content, 100) as content_preview,
    gh.created_at
FROM generation_history gh
JOIN users u ON gh.user_id = u.id
ORDER BY gh.created_at DESC
LIMIT 50;

-- Generacje per użytkownik
SELECT 
    u.email,
    COUNT(*) as total_generations
FROM users u
LEFT JOIN generation_history gh ON u.id = gh.user_id
GROUP BY u.id, u.email
ORDER BY total_generations DESC;

-- Wyczyść starą historię (starsza niż 90 dni)
DELETE FROM generation_history 
WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================
-- 7. FAVORITES
-- ============================================

-- Ulubione posty użytkownika
SELECT 
    u.email,
    f.post_text,
    f.platform,
    f.created_at
FROM favorites f
JOIN users u ON f.user_id = u.id
WHERE u.email = 'user@example.com'
ORDER BY f.created_at DESC;

-- Najczęściej dodawane do ulubionych (top hashtagi)
SELECT 
    unnest(hashtags) as hashtag,
    COUNT(*) as usage_count
FROM favorites
GROUP BY hashtag
ORDER BY usage_count DESC
LIMIT 20;

-- ============================================
-- 8. BRAND VOICE PROFILES
-- ============================================

-- Profile Brand Voice użytkownika
SELECT 
    u.email,
    bv.name,
    bv.tone,
    bv.is_active,
    bv.created_at
FROM brand_voice_profiles bv
JOIN users u ON bv.user_id = u.id
ORDER BY bv.created_at DESC;

-- Aktywny profil użytkownika
SELECT 
    u.email,
    bv.name,
    bv.tone,
    bv.values
FROM brand_voice_profiles bv
JOIN users u ON bv.user_id = u.id
WHERE bv.is_active = true
AND u.email = 'user@example.com';

-- ============================================
-- 9. TEAMS
-- ============================================

-- Wszystkie teamy
SELECT 
    t.name as team_name,
    u.email as owner_email,
    COUNT(tm.id) as member_count,
    t.created_at
FROM teams t
JOIN users u ON t.owner_id = u.id
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.name, u.email
ORDER BY member_count DESC;

-- Członkowie teamu
SELECT 
    t.name as team_name,
    u.email as member_email,
    tm.role,
    tm.joined_at
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
JOIN users u ON tm.user_id = u.id
WHERE t.name = 'Your Team Name'
ORDER BY tm.role, tm.joined_at;

-- ============================================
-- 10. ANALYTICS
-- ============================================

-- Top performing posts
SELECT 
    u.email,
    pp.platform,
    LEFT(pp.content, 50) as content_preview,
    ad.impressions,
    ad.engagements,
    ad.engagement_rate,
    pp.published_at
FROM analytics_data ad
JOIN published_posts pp ON ad.post_id = pp.id
JOIN users u ON pp.user_id = u.id
WHERE ad.engagement_rate > 0
ORDER BY ad.engagement_rate DESC
LIMIT 20;

-- Statystyki platformy
SELECT 
    platform,
    COUNT(*) as total_posts,
    AVG(impressions) as avg_impressions,
    AVG(engagements) as avg_engagements,
    AVG(engagement_rate) as avg_engagement_rate
FROM analytics_data ad
JOIN published_posts pp ON ad.post_id = pp.id
WHERE ad.impressions > 0
GROUP BY platform
ORDER BY avg_engagement_rate DESC;

-- ============================================
-- 11. API USAGE
-- ============================================

-- API usage per użytkownik
SELECT 
    u.email,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN au.status_code = 200 THEN 1 END) as successful_requests,
    AVG(au.response_time_ms) as avg_response_time
FROM api_usage au
JOIN users u ON au.user_id = u.id
WHERE au.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email
ORDER BY total_requests DESC;

-- Najczęściej używane endpointy
SELECT 
    endpoint,
    COUNT(*) as total_calls,
    AVG(response_time_ms) as avg_response_time
FROM api_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY total_calls DESC
LIMIT 20;

-- ============================================
-- 12. NOTIFICATIONS
-- ============================================

-- Nieprzeczytane powiadomienia
SELECT 
    u.email,
    n.type,
    n.message,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.is_read = false
ORDER BY n.created_at DESC;

-- Oznacz wszystkie jako przeczytane dla użytkownika
UPDATE notifications 
SET is_read = true 
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');

-- Usuń stare przeczytane powiadomienia (starsze niż 30 dni)
DELETE FROM notifications 
WHERE is_read = true 
AND created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 13. PŁATNOŚCI (jeśli wgrałeś PAYMENTS schema)
-- ============================================

-- Aktywne subskrypcje
SELECT 
    u.email,
    s.plan,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
ORDER BY s.current_period_end;

-- Historia płatności użytkownika
SELECT 
    p.amount / 100.0 as amount_in_dollars,
    p.currency,
    p.status,
    p.created_at
FROM payments p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'user@example.com'
ORDER BY p.created_at DESC;

-- Total revenue
SELECT 
    SUM(amount) / 100.0 as total_revenue_in_dollars,
    currency,
    COUNT(*) as total_transactions
FROM payments
WHERE status = 'succeeded'
GROUP BY currency;

-- ============================================
-- 14. MAINTENANCE
-- ============================================

-- Wyczyść stare sesje (expired)
DELETE FROM sessions WHERE expires_at < NOW();

-- Wyczyść stare password resets (expired)
DELETE FROM password_resets WHERE expires_at < NOW();

-- Vacuum analyze (optymalizacja)
VACUUM ANALYZE;

-- Rebuild indexes
REINDEX DATABASE postgres;

-- ============================================
-- 15. BACKUP
-- ============================================

-- Eksportuj użytkowników (przykład)
COPY (
    SELECT email, name, plan, credits, created_at 
    FROM users
) TO '/tmp/users_backup.csv' WITH CSV HEADER;

-- Eksportuj posty (przykład)
COPY (
    SELECT 
        u.email,
        pp.platform,
        pp.content,
        pp.published_at
    FROM published_posts pp
    JOIN users u ON pp.user_id = u.id
) TO '/tmp/posts_backup.csv' WITH CSV HEADER;

-- ============================================
-- 16. STATISTICS
-- ============================================

-- Ogólne statystyki
SELECT 
    'Total Users' as metric, COUNT(*) as value FROM users
UNION ALL
SELECT 
    'Active Users (logged in last 30 days)', COUNT(*) FROM users 
    WHERE last_login_at > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'Total Posts', COUNT(*) FROM published_posts
UNION ALL
SELECT 
    'Scheduled Posts', COUNT(*) FROM scheduled_posts WHERE status = 'scheduled'
UNION ALL
SELECT 
    'Active Connections', COUNT(*) FROM social_connections WHERE is_active = true
UNION ALL
SELECT 
    'Total Teams', COUNT(*) FROM teams;

-- ============================================
-- KONIEC
-- ============================================

-- Tip: Zapisz te komendy jako snippety w Supabase SQL Editor
-- dla szybkiego dostępu!
