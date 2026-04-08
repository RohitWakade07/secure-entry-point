import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env variables manually in case they are not loaded
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting DB seed process...");

  // 1. Sign up Rohit (Student)
  console.log("Signing up Student Rohit...");
  const { data: studentAuth, error: studentErr } = await supabase.auth.signUp({
    email: "rohit@example.com",
    password: "password123",
    options: { data: { full_name: "Rohit Wakade" } },
  });
  if (studentErr && !studentErr.message.includes("User already registered")) console.error("Error signing up Rohit:", studentErr);

  // Since User ALREADY REGISTERED error might happen, let's login instead if auth.user is null
  let studentUser = studentAuth?.user;
  if (!studentUser) {
    const { data } = await supabase.auth.signInWithPassword({ email: "rohit@example.com", password: "password123" });
    studentUser = data?.user;
  }
  
  if (studentUser) {
      // Assign role exactly as it's done in signup
      await supabase.from("user_roles").insert({ user_id: studentUser.id, role: "student" }).select();
  }

  // 2. Sign up Isha (Admin)
  console.log("Signing up Admin Isha...");
  const { data: adminAuth, error: adminErr } = await supabase.auth.signUp({
    email: "isha@example.com",
    password: "password123",
    options: { data: { full_name: "Isha Yadav" } },
  });
  if (adminErr && !adminErr.message.includes("User already registered")) console.error("Error signing up Isha:", adminErr);

  let adminUser = adminAuth?.user;
  if (!adminUser) {
    const { data } = await supabase.auth.signInWithPassword({ email: "isha@example.com", password: "password123" });
    adminUser = data?.user;
  }
  
  if (adminUser) {
     await supabase.from("user_roles").insert({ user_id: adminUser.id, role: "admin" }).select();
  }

  if (!adminUser || !studentUser) {
      console.error("Failed to authenticate seed users");
      process.exit(1);
  }

  // To insert data as Admin, we authenticate as Isha
  await supabase.auth.signInWithPassword({ email: "isha@example.com", password: "password123" });
  console.log("Logged in as Admin to insert topics and tests.");

  // Fetch a subject
  const { data: subjects } = await supabase.from("subjects").select("*").limit(1);
  if (!subjects || subjects.length === 0) {
      console.error("No subjects found in database!");
      return;
  }
  const subjectId = subjects[0].id;

  // Insert Topics
  console.log("Creating topics...");
  const { data: topicData, error: topicErr } = await supabase.from("topics").insert([
      { subject_id: subjectId, topic_name: "Data Structures & Algorithms" },
      { subject_id: subjectId, topic_name: "Operating Systems" }
  ]).select();
  
  const dsTopicId = topicData?.[0]?.id;

  if (topicErr) {
     console.log("Topic creation error (they might already exist):", topicErr.message);
  }

  if (!dsTopicId) {
      console.log("Could not obtain topic ID to create questions.");
      return;
  }

  // Insert Questions
  console.log("Creating questions...");
  const { data: q1 } = await supabase.from("questions").insert({
      teacher_id: adminUser.id,
      topic_id: dsTopicId,
      question_type: "MCQ",
      difficulty: "medium",
      question_text: "What is the worst-case time complexity of QuickSort?",
      explanation: "In the worst case, the pivot chosen is the smallest or largest element, leading to O(n^2) complexity."
  }).select().single();

  const { data: q2 } = await supabase.from("questions").insert({
      teacher_id: adminUser.id,
      topic_id: dsTopicId,
      question_type: "MCQ",
      difficulty: "easy",
      question_text: "Which data structure is based on LIFO?",
      explanation: "Stack uses Last In First Out (LIFO) methodology."
  }).select().single();

  const { data: q3 } = await supabase.from("questions").insert({
      teacher_id: adminUser.id,
      topic_id: dsTopicId,
      question_type: "MSQ",
      difficulty: "hard",
      question_text: "Which of the following are stable sorting algorithms?",
      explanation: "Merge Sort and Insertion Sort maintain relative order of equal elements."
  }).select().single();

  // Insert Options
  if (q1) {
      await supabase.from("options").insert([
          { question_id: q1.id, option_text: "O(n log n)", is_correct: false },
          { question_id: q1.id, option_text: "O(n^2)", is_correct: true },
          { question_id: q1.id, option_text: "O(n)", is_correct: false },
          { question_id: q1.id, option_text: "O(log n)", is_correct: false },
      ]);
  }
  if (q2) {
      await supabase.from("options").insert([
          { question_id: q2.id, option_text: "Queue", is_correct: false },
          { question_id: q2.id, option_text: "Stack", is_correct: true },
          { question_id: q2.id, option_text: "Tree", is_correct: false },
          { question_id: q2.id, option_text: "Graph", is_correct: false },
      ]);
  }
  if (q3) {
       await supabase.from("options").insert([
          { question_id: q3.id, option_text: "Merge Sort", is_correct: true },
          { question_id: q3.id, option_text: "Quick Sort", is_correct: false },
          { question_id: q3.id, option_text: "Insertion Sort", is_correct: true },
          { question_id: q3.id, option_text: "Heap Sort", is_correct: false },
      ]);
  }

  console.log("Creating mock test...");
  const { data: test } = await supabase.from("tests").insert({
      title: "GATE CS Core Fundamentals Demo",
      duration: 30, // 30 minutes
      created_by: adminUser.id
  }).select().single();

  if (test && q1 && q2 && q3) {
      await supabase.from("test_questions").insert([
          { test_id: test.id, question_id: q1.id },
          { test_id: test.id, question_id: q2.id },
          { test_id: test.id, question_id: q3.id },
      ]);
  }

  // Now emulate student taking the test
  console.log("Emulating student interaction...");
  await supabase.auth.signInWithPassword({ email: "rohit@example.com", password: "password123" });
  
  if (test) {
    const { data: attempt } = await supabase.from("attempts").insert({
        user_id: studentUser.id,
        test_id: test.id,
        score: 66, // 66% mock score for analytics
        end_time: new Date().toISOString()
    }).select().single();

    if (attempt && q1 && q2 && q3) {
        console.log("Submitting test answers...");
        
        const { data: q1Opts } = await supabase.from("options").select("*").eq("question_id", q1.id);
        const correctQ1Id = q1Opts?.find(o => o.is_correct)?.id;

        const { data: q2Opts } = await supabase.from("options").select("*").eq("question_id", q2.id);
        const incorrectQ2Id = q2Opts?.find(o => !o.is_correct)?.id; // purposely wrong
        
        await supabase.from("answers").insert([
            { attempt_id: attempt.id, question_id: q1.id, selected_option_id: correctQ1Id, is_correct: true, time_taken: 45 },
            { attempt_id: attempt.id, question_id: q2.id, selected_option_id: incorrectQ2Id, is_correct: false, time_taken: 20 }
            // didn't attempt q3
        ]);
    }
  }

  if (q3) {
     console.log("Bookmarking a question for student...");
     await supabase.from("bookmarks").insert({ user_id: studentUser.id, question_id: q3.id });
  }

  console.log("Seed completed successfully!");
}

seed().catch(err => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
