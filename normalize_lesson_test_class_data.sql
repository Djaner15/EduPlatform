BEGIN TRANSACTION;

-- Normalize section values in Users, Lessons, Tests, and Subjects.
-- This trims hidden spaces and converts common Latin/Cyrillic variants to the
-- exact uppercase Cyrillic letters expected by the app.

UPDATE Users
SET Section = CASE TRIM(COALESCE(Section, ''))
    WHEN '' THEN NULL
    WHEN 'a' THEN 'А'
    WHEN 'A' THEN 'А'
    WHEN 'а' THEN 'А'
    WHEN 'А' THEN 'А'
    WHEN 'b' THEN 'Б'
    WHEN 'B' THEN 'Б'
    WHEN 'б' THEN 'Б'
    WHEN 'Б' THEN 'Б'
    WHEN 'v' THEN 'В'
    WHEN 'V' THEN 'В'
    WHEN 'в' THEN 'В'
    WHEN 'В' THEN 'В'
    WHEN 'g' THEN 'Г'
    WHEN 'G' THEN 'Г'
    WHEN 'г' THEN 'Г'
    WHEN 'Г' THEN 'Г'
    WHEN 'd' THEN 'Д'
    WHEN 'D' THEN 'Д'
    WHEN 'д' THEN 'Д'
    WHEN 'Д' THEN 'Д'
    WHEN 'e' THEN 'Е'
    WHEN 'E' THEN 'Е'
    WHEN 'е' THEN 'Е'
    WHEN 'Е' THEN 'Е'
    WHEN 'ж' THEN 'Ж'
    WHEN 'Ж' THEN 'Ж'
    WHEN 'з' THEN 'З'
    WHEN 'З' THEN 'З'
    ELSE TRIM(Section)
END
WHERE Section IS NULL OR Section <> TRIM(Section) OR LENGTH(Section) > 0;

UPDATE Lessons
SET Section = CASE TRIM(COALESCE(Section, ''))
    WHEN '' THEN NULL
    WHEN 'a' THEN 'А'
    WHEN 'A' THEN 'А'
    WHEN 'а' THEN 'А'
    WHEN 'А' THEN 'А'
    WHEN 'b' THEN 'Б'
    WHEN 'B' THEN 'Б'
    WHEN 'б' THEN 'Б'
    WHEN 'Б' THEN 'Б'
    WHEN 'v' THEN 'В'
    WHEN 'V' THEN 'В'
    WHEN 'в' THEN 'В'
    WHEN 'В' THEN 'В'
    WHEN 'g' THEN 'Г'
    WHEN 'G' THEN 'Г'
    WHEN 'г' THEN 'Г'
    WHEN 'Г' THEN 'Г'
    WHEN 'd' THEN 'Д'
    WHEN 'D' THEN 'Д'
    WHEN 'д' THEN 'Д'
    WHEN 'Д' THEN 'Д'
    WHEN 'e' THEN 'Е'
    WHEN 'E' THEN 'Е'
    WHEN 'е' THEN 'Е'
    WHEN 'Е' THEN 'Е'
    WHEN 'ж' THEN 'Ж'
    WHEN 'Ж' THEN 'Ж'
    WHEN 'з' THEN 'З'
    WHEN 'З' THEN 'З'
    ELSE TRIM(Section)
END
WHERE Section IS NULL OR Section <> TRIM(Section) OR LENGTH(Section) > 0;

UPDATE Tests
SET Section = CASE TRIM(COALESCE(Section, ''))
    WHEN '' THEN NULL
    WHEN 'a' THEN 'А'
    WHEN 'A' THEN 'А'
    WHEN 'а' THEN 'А'
    WHEN 'А' THEN 'А'
    WHEN 'b' THEN 'Б'
    WHEN 'B' THEN 'Б'
    WHEN 'б' THEN 'Б'
    WHEN 'Б' THEN 'Б'
    WHEN 'v' THEN 'В'
    WHEN 'V' THEN 'В'
    WHEN 'в' THEN 'В'
    WHEN 'В' THEN 'В'
    WHEN 'g' THEN 'Г'
    WHEN 'G' THEN 'Г'
    WHEN 'г' THEN 'Г'
    WHEN 'Г' THEN 'Г'
    WHEN 'd' THEN 'Д'
    WHEN 'D' THEN 'Д'
    WHEN 'д' THEN 'Д'
    WHEN 'Д' THEN 'Д'
    WHEN 'e' THEN 'Е'
    WHEN 'E' THEN 'Е'
    WHEN 'е' THEN 'Е'
    WHEN 'Е' THEN 'Е'
    WHEN 'ж' THEN 'Ж'
    WHEN 'Ж' THEN 'Ж'
    WHEN 'з' THEN 'З'
    WHEN 'З' THEN 'З'
    ELSE TRIM(Section)
END
WHERE Section IS NULL OR Section <> TRIM(Section) OR LENGTH(Section) > 0;

UPDATE Subjects
SET Section = CASE TRIM(COALESCE(Section, ''))
    WHEN '' THEN NULL
    WHEN 'a' THEN 'А'
    WHEN 'A' THEN 'А'
    WHEN 'а' THEN 'А'
    WHEN 'А' THEN 'А'
    WHEN 'b' THEN 'Б'
    WHEN 'B' THEN 'Б'
    WHEN 'б' THEN 'Б'
    WHEN 'Б' THEN 'Б'
    WHEN 'v' THEN 'В'
    WHEN 'V' THEN 'В'
    WHEN 'в' THEN 'В'
    WHEN 'В' THEN 'В'
    WHEN 'g' THEN 'Г'
    WHEN 'G' THEN 'Г'
    WHEN 'г' THEN 'Г'
    WHEN 'Г' THEN 'Г'
    WHEN 'd' THEN 'Д'
    WHEN 'D' THEN 'Д'
    WHEN 'д' THEN 'Д'
    WHEN 'Д' THEN 'Д'
    WHEN 'e' THEN 'Е'
    WHEN 'E' THEN 'Е'
    WHEN 'е' THEN 'Е'
    WHEN 'Е' THEN 'Е'
    WHEN 'ж' THEN 'Ж'
    WHEN 'Ж' THEN 'Ж'
    WHEN 'з' THEN 'З'
    WHEN 'З' THEN 'З'
    ELSE TRIM(Section)
END
WHERE Section IS NULL OR Section <> TRIM(Section) OR LENGTH(Section) > 0;

-- If a lesson section is missing or does not exist among student accounts for that grade,
-- assign the preferred section for that grade from Users, preferring djaner's class when relevant.
WITH preferred_sections AS (
    SELECT
        Grade,
        COALESCE(MAX(CASE WHEN Username = 'djaner' THEN Section END), MIN(Section)) AS PreferredSection
    FROM Users
    WHERE RoleId = 1
      AND Grade IS NOT NULL
      AND Section IS NOT NULL
      AND TRIM(Section) <> ''
    GROUP BY Grade
)
UPDATE Lessons
SET Section = (
    SELECT ps.PreferredSection
    FROM preferred_sections ps
    WHERE ps.Grade = Lessons.Grade
)
WHERE EXISTS (
    SELECT 1
    FROM preferred_sections ps
    WHERE ps.Grade = Lessons.Grade
)
AND (
    Lessons.Section IS NULL
    OR TRIM(Lessons.Section) = ''
    OR NOT EXISTS (
        SELECT 1
        FROM Users u
        WHERE u.RoleId = 1
          AND u.Grade = Lessons.Grade
          AND u.Section = Lessons.Section
    )
);

-- Keep tests aligned with their lesson class assignment.
UPDATE Tests
SET
    Grade = (
        SELECT l.Grade
        FROM Lessons l
        WHERE l.Id = Tests.LessonId
    ),
    Section = (
        SELECT l.Section
        FROM Lessons l
        WHERE l.Id = Tests.LessonId
    )
WHERE EXISTS (
    SELECT 1
    FROM Lessons l
    WHERE l.Id = Tests.LessonId
);

-- Keep subjects aligned with the first lesson assigned to each subject.
UPDATE Subjects
SET
    Grade = COALESCE((
        SELECT l.Grade
        FROM Lessons l
        WHERE l.SubjectId = Subjects.Id
        ORDER BY l.Id
        LIMIT 1
    ), Grade),
    Section = COALESCE((
        SELECT l.Section
        FROM Lessons l
        WHERE l.SubjectId = Subjects.Id
        ORDER BY l.Id
        LIMIT 1
    ), Section)
WHERE EXISTS (
    SELECT 1
    FROM Lessons l
    WHERE l.SubjectId = Subjects.Id
);

COMMIT;

-- Verification queries you can run afterward:
-- SELECT Id, Username, Grade, quote(Section) FROM Users WHERE Username = 'djaner';
-- SELECT Grade, quote(Section), COUNT(*) FROM Lessons GROUP BY Grade, Section ORDER BY Grade, Section;
-- SELECT Grade, quote(Section), COUNT(*) FROM Tests GROUP BY Grade, Section ORDER BY Grade, Section;
