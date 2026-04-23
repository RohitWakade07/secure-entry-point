DO $$
DECLARE
    teacher_uuid UUID;
    subj_cs UUID := gen_random_uuid();
    subj_ec UUID := gen_random_uuid();
    subj_me UUID := gen_random_uuid();
    topic_cs UUID := gen_random_uuid();
    topic_ec UUID := gen_random_uuid();
    topic_me UUID := gen_random_uuid();
    q_uuid UUID;
    year_val INT;
    i INT;
    subj RECORD;
BEGIN
    -- Find the first user in the system to act as the "teacher" who created these questions
    SELECT id INTO teacher_uuid FROM auth.users LIMIT 1;
    
    IF teacher_uuid IS NULL THEN
        RAISE EXCEPTION 'You must create at least one user in Authentication first!';
    END IF;

    -- Insert 3 Core Subjects
    INSERT INTO public.subjects (id, subject_name) VALUES 
    (subj_cs, 'Computer Science & IT (CS)'),
    (subj_ec, 'Electronics & Communication (EC)'),
    (subj_me, 'Mechanical Engineering (ME)');

    -- Insert 1 Topic per Subject
    INSERT INTO public.topics (id, subject_id, topic_name) VALUES 
    (topic_cs, subj_cs, 'Core Engineering Concepts'),
    (topic_ec, subj_ec, 'Circuit Design & Analysis'),
    (topic_me, subj_me, 'Thermodynamics & Mechanics');

    -- Generate 30 Questions for each topic (90 total)
    FOR subj IN SELECT * FROM (VALUES (topic_cs, 'CS'), (topic_ec, 'EC'), (topic_me, 'ME')) AS t(topic_id, prefix) LOOP
        FOR i IN 1..30 LOOP
            q_uuid := gen_random_uuid();
            -- Random year between 2018 and 2024
            year_val := 2018 + floor(random() * 7)::INT;
            
            INSERT INTO public.questions 
            (id, question_text, question_type, difficulty, marks, negative_marks, year, topic_id, teacher_id, explanation)
            VALUES (
                q_uuid,
                'Sample practice ' || subj.prefix || ' question #' || i || ' from the GATE ' || year_val || ' exam syllabus. What is the correct theoretical outcome?',
                'MCQ',
                CASE WHEN random() < 0.33 THEN 'easy' WHEN random() < 0.66 THEN 'medium' ELSE 'hard' END,
                CASE WHEN random() < 0.5 THEN 1 ELSE 2 END, -- Randomly 1 or 2 marks
                0.33, 
                year_val, 
                subj.topic_id, 
                teacher_uuid,
                'This is an auto-generated explanation for the GATE ' || year_val || ' practice question.'
            );

            -- Insert 4 options (Option A is always correct for these mock questions)
            INSERT INTO public.options (question_id, option_text, is_correct) VALUES 
            (q_uuid, 'Theoretical Outcome A', true),
            (q_uuid, 'Theoretical Outcome B', false),
            (q_uuid, 'Theoretical Outcome C', false),
            (q_uuid, 'Theoretical Outcome D', false);
        END LOOP;
    END LOOP;
END $$;
