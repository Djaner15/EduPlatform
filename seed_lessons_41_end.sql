BEGIN TRANSACTION;

-- Assumptions:
-- 1. The document ends with Lessons 41-44, all of which are English language lessons.
-- 2. English already exists in the previous seed file, so new subject records are created only for French, German, and Russian.
-- 3. Lessons 41-44 are mapped across Grades 9, 10, 11, and 12 respectively and linked to the existing English subject.
-- 4. Section is 'А' and CreatedByUserId = 1.

INSERT INTO "Subjects" ("Id", "CreatedByUserId", "Description", "Name", "Grade", "Section", "CreatedAt")
VALUES
  (120018, 1, 'Подготовка по френски език с акцент върху комуникация, граматика и културен контекст.', 'Френски език', 10, 'А', '2026-04-15T08:01:00Z'),
  (120019, 1, 'Подготовка по немски език с акцент върху граматични структури, четене и общуване.', 'Немски език', 11, 'А', '2026-04-15T08:02:00Z'),
  (120020, 1, 'Подготовка по руски език с акцент върху лексика, граматика и разбиране на текст.', 'Руски език', 12, 'А', '2026-04-15T08:03:00Z');

INSERT INTO "Lessons" ("Id", "AttachmentName", "AttachmentUrl", "Content", "CreatedByUserId", "Grade", "ImageUrl", "Section", "SubjectId", "Title", "YoutubeUrl", "CreatedAt")
VALUES
  (121041, NULL, NULL, '<h2>Synonyms, Antonyms, and the Magic of Idioms</h2>
<p>To reach a higher level of English, learners need to move beyond overused words and start choosing vocabulary with precision, color, and stylistic effect.</p>
<h3>1. Synonyms: Precision in Language</h3>
<p>Using synonyms avoids repetition and makes speech and writing more expressive.</p>
<ul>
  <li><b>Instead of "Good":</b> Excellent, superb, outstanding, beneficial.</li>
  <li><b>Instead of "Bad":</b> Terrible, atrocious, detrimental, poor.</li>
  <li><b>Instead of "Important":</b> Crucial, vital, essential, significant.</li>
</ul>
<h3>2. Antonyms: Expressing Contrast</h3>
<p>Antonyms help us compare ideas and highlight differences with greater clarity.</p>
<ul>
  <li><b>Optimistic</b> vs. <b>Pessimistic</b></li>
  <li><b>Generous</b> vs. <b>Stingy</b></li>
  <li><b>Ancient</b> vs. <b>Contemporary</b></li>
</ul>
<h3>3. Idioms: The Soul of Natural English</h3>
<p>Idioms are fixed expressions whose meaning cannot be understood literally. They make language sound more authentic and culturally grounded.</p>
<ul>
  <li><b>"A piece of cake":</b> Something very easy.</li>
  <li><b>"Under the weather":</b> Feeling sick.</li>
  <li><b>"Break a leg":</b> Good luck before a performance.</li>
  <li><b>"Once in a blue moon":</b> Very rarely.</li>
  <li><b>"The last straw":</b> The final problem that makes a situation unbearable.</li>
</ul>
<h3>4. Phrasal Verbs: The Tricky Everyday Layer</h3>
<p>Phrasal verbs combine a verb with a particle and are essential for fluent communication.</p>
<ul>
  <li><b>Look for:</b> To search.</li>
  <li><b>Look up to:</b> To admire someone.</li>
  <li><b>Run out of:</b> To have none left.</li>
  <li><b>Give up:</b> To stop trying.</li>
</ul>
<img src="https://source.unsplash.com/featured/?education,english-vocabulary-idioms-notebook" style="width:100%; border-radius:8px; margin: 10px 0;" />
<h3>Conclusion</h3>
<p>The best vocabulary growth happens in <b>context</b>. Instead of memorizing isolated lists, students should use one new idiom or phrasal verb every day in conversation or writing.</p>', 1, 9, NULL, 'А', 120017, 'Synonyms, Antonyms, and the Magic of Idioms', NULL, '2026-04-15T08:04:00Z'),
  (121042, NULL, NULL, '<h2>The Art of Writing: Structure and Style</h2>
<p>Good writing resembles good architecture: it needs a clear plan, strong internal logic, and a polished final form. Structure and style work together to make ideas persuasive.</p>
<h3>1. Formal Letters vs. Informal Emails</h3>
<p>The tone of writing depends on the audience and purpose.</p>
<table>
  <tr>
    <th>Feature</th>
    <th>Formal</th>
    <th>Informal</th>
  </tr>
  <tr>
    <td><b>Greeting</b></td>
    <td>Dear Mr./Ms. [Name] / Dear Sir or Madam</td>
    <td>Hi [Name] / Hey!</td>
  </tr>
  <tr>
    <td><b>Contractions</b></td>
    <td>Avoided</td>
    <td>Common</td>
  </tr>
  <tr>
    <td><b>Phrasal Verbs</b></td>
    <td>Rarely used</td>
    <td>Frequent</td>
  </tr>
  <tr>
    <td><b>Closing</b></td>
    <td>Yours sincerely / Yours faithfully</td>
    <td>Best / Take care / Love</td>
  </tr>
</table>
<h3>2. Essay Structure: The Five-Paragraph Model</h3>
<p>A standard essay follows a logical sequence that helps the reader track the argument.</p>
<ul>
  <li><b>Introduction:</b> Opens the topic and ends with a <b>thesis statement</b>.</li>
  <li><b>Body Paragraphs:</b> Develop arguments with examples and topic sentences.</li>
  <li><b>Counter-argument:</b> Shows balance and critical thinking.</li>
  <li><b>Conclusion:</b> Summarizes the main points without introducing new ideas.</li>
</ul>
<h3>3. Transition Words</h3>
<p>Linking words act like bridges between ideas and improve coherence.</p>
<ul>
  <li><b>Adding:</b> Furthermore, moreover, in addition.</li>
  <li><b>Contrast:</b> However, on the other hand, nevertheless.</li>
  <li><b>Cause and effect:</b> Consequently, therefore, as a result.</li>
  <li><b>Conclusion:</b> In summary, to conclude, all things considered.</li>
</ul>
<img src="https://source.unsplash.com/featured/?education,essay-writing-desk-english" style="width:100%; border-radius:8px; margin: 10px 0;" />
<h3>Conclusion</h3>
<p>Before submitting any text, writers should always <b>proofread</b> carefully for tone, grammar, punctuation, and word choice.</p>', 1, 10, NULL, 'А', 120017, 'The Art of Writing: Structure and Style', NULL, '2026-04-15T08:05:00Z'),
  (121043, NULL, NULL, '<h2>Reading: From Understanding to Analysis</h2>
<p>Reading is not just about translating words. Strong readers identify the <b>purpose</b> of a text, the <b>tone</b> of the author, and the difference between information and opinion.</p>
<h3>1. Core Reading Strategies</h3>
<ul>
  <li><b>Skimming:</b> Reading quickly for the main idea.</li>
  <li><b>Scanning:</b> Searching for specific information such as dates, names, or numbers.</li>
  <li><b>Close Reading:</b> Reading carefully for details, logic, and nuance.</li>
</ul>
<h3>2. Identifying Tone and Purpose</h3>
<p>Every text exists for a reason, and strong comprehension depends on recognizing that reason.</p>
<ul>
  <li><b>Informative:</b> Gives facts. Tone is usually objective.</li>
  <li><b>Persuasive:</b> Tries to convince the reader. Tone may be emotional or subjective.</li>
  <li><b>Entertaining:</b> Tells a story or creates an experience.</li>
</ul>
<h3>3. Context Clues</h3>
<p>Unknown words can often be understood through their surroundings.</p>
<ul>
  <li><b>Synonyms and antonyms:</b> Nearby comparisons help reveal meaning.</li>
  <li><b>Definitions and explanations:</b> Authors sometimes explain new words directly.</li>
</ul>
<h3>4. Critical Analysis: Facts vs. Opinions</h3>
<p>A critical reader distinguishes between statements that can be proven and personal judgments.</p>
<ul>
  <li><b>Fact:</b> "The Earth orbits the Sun."</li>
  <li><b>Opinion:</b> "Summer is the best season."</li>
</ul>
<img src="https://source.unsplash.com/featured/?education,reading-analysis-books-highlighter" style="width:100%; border-radius:8px; margin: 10px 0;" />
<h3>Conclusion</h3>
<p>Reading comprehension develops through regular practice. The more varied the texts, the stronger the analytical habits become.</p>', 1, 11, NULL, 'А', 120017, 'Reading: From Understanding to Analysis', NULL, '2026-04-15T08:06:00Z'),
  (121044, NULL, NULL, '<h2>Integrated Language Skills: Vocabulary, Writing, and Reading in Action</h2>
<p>Advanced language learning happens when vocabulary, writing, and reading work together. A student who can interpret a text, organize an argument, and choose precise words is prepared for academic and professional communication.</p>
<h3>1. Building a Strong Language Toolkit</h3>
<ul>
  <li><b>Vocabulary:</b> Rich vocabulary allows precise and flexible expression.</li>
  <li><b>Writing:</b> Clear structure and tone make ideas persuasive.</li>
  <li><b>Reading:</b> Analytical reading improves comprehension and critical thinking.</li>
</ul>
<h3>2. From Input to Output</h3>
<p>Reading supplies models of good language, while writing turns passive knowledge into active skill. Students improve fastest when they analyze what they read and then reuse the language in their own texts.</p>
<h3>3. Practical Strategy for Senior Students</h3>
<ul>
  <li><b>Read actively:</b> Underline key ideas, unfamiliar words, and argument patterns.</li>
  <li><b>Write purposefully:</b> Match tone and structure to the task.</li>
  <li><b>Reflect critically:</b> Distinguish facts, assumptions, and opinions.</li>
  <li><b>Revise carefully:</b> Edit for clarity, coherence, and accuracy.</li>
</ul>
<h3>4. Real-World Relevance</h3>
<p>These skills matter in exams, university applications, presentations, and everyday communication. Language mastery is not only about correctness, but also about effectiveness.</p>
<img src="https://source.unsplash.com/featured/?education,language-learning-study-skills" style="width:100%; border-radius:8px; margin: 10px 0;" />
<h3>Conclusion</h3>
<p>When learners connect vocabulary, writing, and reading into one system, English becomes more than a subject. It becomes a practical tool for thinking, learning, and communicating with confidence.</p>', 1, 12, NULL, 'А', 120017, 'Integrated Language Skills: Vocabulary, Writing, and Reading in Action', NULL, '2026-04-15T08:07:00Z');

INSERT INTO "Tests" ("Id", "CreatedByUserId", "LessonId", "Title", "Grade", "Section", "CreatedAt")
VALUES
  (122041, 1, 121041, 'Test: Vocabulary & Idioms', 9, 'А', '2026-04-15T08:08:00Z'),
  (122042, 1, 121042, 'Test: Writing Skills', 10, 'А', '2026-04-15T08:09:00Z'),
  (122043, 1, 121043, 'Test: Reading Comprehension Skills', 11, 'А', '2026-04-15T08:10:00Z'),
  (122044, 1, 121044, 'Test: Integrated English Skills', 12, 'А', '2026-04-15T08:11:00Z');

INSERT INTO "Questions" ("Id", "Text", "TestId", "CorrectTextAnswer", "ImageUrl", "OrderIndex", "Type")
VALUES
  (123201, 'What is a synonym for the word "Essential"?', 122041, NULL, NULL, 1, 'multiple-choice'),
  (123202, 'If a task is "a piece of cake," it is:', 122041, NULL, NULL, 2, 'multiple-choice'),
  (123203, 'What is the antonym of "Generous"?', 122041, NULL, NULL, 3, 'multiple-choice'),
  (123204, 'Complete the phrasal verb: "I need to ________ my shoes before I enter the house."', 122041, NULL, NULL, 4, 'multiple-choice'),
  (123205, 'What does "once in a blue moon" mean?', 122041, NULL, NULL, 5, 'multiple-choice'),
  (123206, 'Which closing is most appropriate for a formal letter to a person whose name you do not know?', 122042, NULL, NULL, 1, 'multiple-choice'),
  (123207, 'Where should you place the thesis statement in an essay?', 122042, NULL, NULL, 2, 'multiple-choice'),
  (123208, 'Which linking word is used to show contrast?', 122042, NULL, NULL, 3, 'multiple-choice'),
  (123209, 'In formal writing, you should usually avoid:', 122042, NULL, NULL, 4, 'multiple-choice'),
  (123210, 'A topic sentence is used to:', 122042, NULL, NULL, 5, 'multiple-choice'),
  (123211, 'Which technique would you use to find a specific phone number in a directory?', 122043, NULL, NULL, 1, 'multiple-choice'),
  (123212, 'An objective tone is most likely to be found in:', 122043, NULL, NULL, 2, 'multiple-choice'),
  (123213, 'What is the main goal of skimming?', 122043, NULL, NULL, 3, 'multiple-choice'),
  (123214, 'In the sentence "The company''s profits plummeted," what does "plummeted" mean?', 122043, NULL, NULL, 4, 'multiple-choice'),
  (123215, 'Which of these is an opinion?', 122043, NULL, NULL, 5, 'multiple-choice'),
  (123216, 'Which skill helps students choose more precise words and avoid repetition?', 122044, NULL, NULL, 1, 'multiple-choice'),
  (123217, 'What is the main purpose of a thesis statement?', 122044, NULL, NULL, 2, 'multiple-choice'),
  (123218, 'Which reading strategy is best for finding a date quickly in a long article?', 122044, NULL, NULL, 3, 'multiple-choice'),
  (123219, 'Why is proofreading important?', 122044, NULL, NULL, 4, 'multiple-choice'),
  (123220, 'What happens when vocabulary, writing, and reading are developed together?', 122044, NULL, NULL, 5, 'multiple-choice');

INSERT INTO "Answers" ("Id", "Text", "IsCorrect", "QuestionId", "OrderIndex")
VALUES
  (124801, 'Optional', 0, 123201, 1),
  (124802, 'Vital', 1, 123201, 2),
  (124803, 'Minor', 0, 123201, 3),
  (124804, 'Extra', 0, 123201, 4),
  (124805, 'Delicious', 0, 123202, 1),
  (124806, 'Very difficult', 0, 123202, 2),
  (124807, 'Very easy', 1, 123202, 3),
  (124808, 'Boring', 0, 123202, 4),
  (124809, 'Kind', 0, 123203, 1),
  (124810, 'Selfish/Stingy', 1, 123203, 2),
  (124811, 'Brave', 0, 123203, 3),
  (124812, 'Rich', 0, 123203, 4),
  (124813, 'take off', 1, 123204, 1),
  (124814, 'take in', 0, 123204, 2),
  (124815, 'take up', 0, 123204, 3),
  (124816, 'take after', 0, 123204, 4),
  (124817, 'Every night', 0, 123205, 1),
  (124818, 'Very frequently', 0, 123205, 2),
  (124819, 'Very rarely', 1, 123205, 3),
  (124820, 'Never', 0, 123205, 4),

  (124821, 'Best wishes,', 0, 123206, 1),
  (124822, 'Yours faithfully,', 1, 123206, 2),
  (124823, 'Love,', 0, 123206, 3),
  (124824, 'See you soon,', 0, 123206, 4),
  (124825, 'In the middle of the second paragraph', 0, 123207, 1),
  (124826, 'At the end of the introduction', 1, 123207, 2),
  (124827, 'At the very beginning of the conclusion', 0, 123207, 3),
  (124828, 'In a footnote', 0, 123207, 4),
  (124829, 'Furthermore', 0, 123208, 1),
  (124830, 'Consequently', 0, 123208, 2),
  (124831, 'However', 1, 123208, 3),
  (124832, 'In addition', 0, 123208, 4),
  (124833, 'Passive voice', 0, 123209, 1),
  (124834, 'Contractions', 1, 123209, 2),
  (124835, 'Complex sentences', 0, 123209, 3),
  (124836, 'Transition words', 0, 123209, 4),
  (124837, 'End the essay', 0, 123210, 1),
  (124838, 'Introduce the main idea of a paragraph', 1, 123210, 2),
  (124839, 'Greet the reader', 0, 123210, 3),
  (124840, 'List the bibliography', 0, 123210, 4),

  (124841, 'Skimming', 0, 123211, 1),
  (124842, 'Scanning', 1, 123211, 2),
  (124843, 'Critical analysis', 0, 123211, 3),
  (124844, 'Close reading', 0, 123211, 4),
  (124845, 'A personal diary', 0, 123212, 1),
  (124846, 'A political speech', 0, 123212, 2),
  (124847, 'A scientific report', 1, 123212, 3),
  (124848, 'A movie review', 0, 123212, 4),
  (124849, 'To understand every single word', 0, 123213, 1),
  (124850, 'To find hidden meanings', 0, 123213, 2),
  (124851, 'To get the general idea quickly', 1, 123213, 3),
  (124852, 'To check the spelling', 0, 123213, 4),
  (124853, 'Increased slowly', 0, 123214, 1),
  (124854, 'Stayed the same', 0, 123214, 2),
  (124855, 'Fell sharply', 1, 123214, 3),
  (124856, 'Became stable', 0, 123214, 4),
  (124857, 'Water boils at 100°C.', 0, 123215, 1),
  (124858, 'Bulgaria is located in Southeast Europe.', 0, 123215, 2),
  (124859, 'Learning English is the most exciting thing you can do.', 1, 123215, 3),
  (124860, 'William Shakespeare wrote Hamlet.', 0, 123215, 4),

  (124861, 'Grammar drills only', 0, 123216, 1),
  (124862, 'Vocabulary development', 1, 123216, 2),
  (124863, 'Memorizing dates', 0, 123216, 3),
  (124864, 'Copying a text word for word', 0, 123216, 4),
  (124865, 'To decorate the page', 0, 123217, 1),
  (124866, 'To present the main argument of the text', 1, 123217, 2),
  (124867, 'To list references', 0, 123217, 3),
  (124868, 'To replace the conclusion', 0, 123217, 4),
  (124869, 'Close reading', 0, 123218, 1),
  (124870, 'Scanning', 1, 123218, 2),
  (124871, 'Creative writing', 0, 123218, 3),
  (124872, 'Brainstorming', 0, 123218, 4),
  (124873, 'It removes all opinions from a text', 0, 123219, 1),
  (124874, 'It helps improve clarity, accuracy, and coherence', 1, 123219, 2),
  (124875, 'It makes every sentence longer', 0, 123219, 3),
  (124876, 'It replaces the need for planning', 0, 123219, 4),
  (124877, 'Students become less flexible in communication', 0, 123220, 1),
  (124878, 'English becomes a practical tool for thinking and communication', 1, 123220, 2),
  (124879, 'Reading becomes unnecessary', 0, 123220, 3),
  (124880, 'Vocabulary stops growing', 0, 123220, 4);

COMMIT;
