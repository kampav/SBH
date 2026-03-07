// ─── Shared exercise/programme data ──────────────────────────────────────────
// Extracted from app/workout/page.tsx so it can be imported by the exercise
// library page (/exercises) and the workout logger without duplication.

import { ProgrammeKey } from '@/lib/types'

export interface ExerciseDef {
  name: string
  muscleGroup: string
  sets: number
  repRange: string   // e.g. "12-15" or "45s" for timed
  videoUrl: string
  restSeconds: number
  emoji: string
  isTime?: boolean
}

export interface ProgrammeDay {
  dayOfWeek: number  // 0=Mon … 6=Sun
  dayName: string
  label: string
  focus: string
  color: string
  gradient: string
  isRest?: boolean
  exercises: ExerciseDef[]
}

// ─── Per-exercise tutorial video + brief how-to description ──────────────────
export const EXERCISE_INFO: Record<string, { videoUrl: string; description: string }> = {
  // ── Bodyweight Push ──────────────────────────────────────────────────────
  'Push-ups':               { videoUrl: 'https://youtu.be/IODxDxX7oi4', description: 'Hands shoulder-width, elbows at 45°. Lower chest to floor, press back up keeping body in a straight line.' },
  'Incline Push-ups':       { videoUrl: 'https://youtu.be/cfns5KzHorc', description: 'Hands elevated on a chair or step. Same push-up form — easier angle targets upper chest.' },
  'Chair Dips':             { videoUrl: 'https://youtu.be/0326dy_-CzM', description: 'Hands on chair edge, slide off. Lower until elbows hit 90°, press back up. Keep back close to the chair.' },
  'Pike Push-ups':          { videoUrl: 'https://youtu.be/sposDXWEB0A', description: 'Form an inverted V with hips raised high. Bend elbows to lower head toward floor — mimics an overhead press.' },
  'Circuit: Push-ups ×4':   { videoUrl: 'https://youtu.be/IODxDxX7oi4', description: '4-round circuit. Minimal rest between moves, 90 s rest between rounds. Maintain form even when tired.' },
  // ── Core ────────────────────────────────────────────────────────────────
  'Plank Hold':             { videoUrl: 'https://youtu.be/pSHjTRCQxIw', description: 'Forearms down, body in a straight line. Brace abs, squeeze glutes, breathe steadily. Don\'t let hips sag or rise.' },
  'Bicycle Crunches':       { videoUrl: 'https://youtu.be/9FGilxCbdz8', description: 'Bring opposite elbow to knee while fully extending the other leg. Focus on torso rotation, not just elbow movement.' },
  'Leg Raises':             { videoUrl: 'https://youtu.be/JB2oyawG9KI', description: 'Lie flat, hands under hips. Raise straight legs to 90°, lower slowly. Don\'t let feet touch the floor. No back arch.' },
  'Russian Twists':         { videoUrl: 'https://youtu.be/wkD8rjkodUI', description: 'Sit at 45°, feet off floor. Rotate torso fully side to side. Add a weight to increase difficulty.' },
  'Flutter Kicks':          { videoUrl: 'https://youtu.be/ANVdMDaYRts', description: 'Lie on back, hands under hips. Alternate small upward kicks keeping legs low and straight. Press lower back down.' },
  'Hollow Body Hold':       { videoUrl: 'https://youtu.be/LlDNef_Ztsc', description: 'Lie on back, press lower back to floor. Extend arms overhead and lift legs. Hold the tension — don\'t arch.' },
  'Side Plank':             { videoUrl: 'https://youtu.be/wqzrb67Dwf8', description: 'Prop on forearm, lift hips to form a straight line. Don\'t let hips drop toward the floor. Build up both sides.' },
  'Ladder: Sit-ups':        { videoUrl: 'https://youtu.be/9FGilxCbdz8', description: 'Hands behind head or crossed on chest. Rise until elbows touch knees. Control the descent slowly.' },
  'Circuit: Plank ×4':      { videoUrl: 'https://youtu.be/pSHjTRCQxIw', description: '45 seconds of full tension each round. Exhale slowly to manage fatigue and hold position.' },
  'Circuit: Shoulder Taps ×4': { videoUrl: 'https://youtu.be/IODxDxX7oi4', description: 'From push-up position, alternate tapping opposite shoulder. Minimise hip rotation by bracing your core.' },
  // ── HIIT / Cardio ────────────────────────────────────────────────────────
  'Jump Squats (HIIT ×4)':  { videoUrl: 'https://youtu.be/CVaEhXotL7M', description: 'Squat down, explode upward reaching full extension. Land softly with knees bent. 20 s rest between rounds.' },
  'Mountain Climbers (HIIT)':{ videoUrl: 'https://youtu.be/nmwgirgXLYM', description: 'From plank, drive knees to chest alternately at high pace. Keep hips level — avoid letting them rise.' },
  'Mountain Climbers':      { videoUrl: 'https://youtu.be/nmwgirgXLYM', description: 'From plank, drive knees to chest alternately. Keep hips level. Build speed as you get comfortable.' },
  'High Knees (HIIT)':      { videoUrl: 'https://youtu.be/ZZZoCNMU48U', description: 'Run in place driving knees above hip height. Pump arms for rhythm. Stay on balls of feet.' },
  'Burpees':                { videoUrl: 'https://youtu.be/dZgVxmf6jkA', description: 'Squat, jump feet back to plank, do a push-up, jump feet forward, leap up with arms overhead.' },
  'Circuit: Burpees ×4':    { videoUrl: 'https://youtu.be/dZgVxmf6jkA', description: 'Squat, kick feet back, push-up, jump feet in, leap up. Maintain full range even when fatigued.' },
  'Ladder: Jumping Jacks (10→20→30)': { videoUrl: 'https://youtu.be/CVaEhXotL7M', description: 'Do 10, rest, 20, rest, 30. Full extension each rep — arms fully overhead, feet wide.' },
  'Ladder: Mountain Climbers': { videoUrl: 'https://youtu.be/nmwgirgXLYM', description: 'Same ladder format. Drive knees to chest, keep hips level. Increase speed with each round.' },
  'Brisk Walk Finisher':    { videoUrl: 'https://youtu.be/nmwgirgXLYM', description: 'Zone 2 cool-down walk after the ladder. Keeps fat-burning active. Aim for 100+ steps/min.' },
  'Brisk Walk (Zone 2)':    { videoUrl: 'https://youtu.be/nmwgirgXLYM', description: 'Comfortable pace where you can hold a conversation — roughly 100–130 bpm. Builds aerobic base.' },
  // ── Legs ────────────────────────────────────────────────────────────────
  'Bodyweight Squats':      { videoUrl: 'https://youtu.be/aclHkVaku9U', description: 'Feet shoulder-width, toes out slightly. Lower until thighs parallel, drive knees out. Weight in heels.' },
  'Reverse Lunges':         { videoUrl: 'https://youtu.be/xrjTHKjFaAI', description: 'Step backward, lower back knee toward floor. Front shin stays vertical. Push through front heel to stand.' },
  'Wall Sit':               { videoUrl: 'https://youtu.be/y-wV4Venusw', description: 'Back flat against wall, thighs parallel to floor. Weight in heels, not toes. Keep breathing steadily.' },
  'Calf Raises':            { videoUrl: 'https://youtu.be/gwLzBJYoWlI', description: 'Rise on tiptoes, hold 1 s at top, lower slowly over 3 s. Full range of motion is key for growth.' },
  'Glute Bridges':          { videoUrl: 'https://youtu.be/OUgsJ8-Vi0E', description: 'Feet flat near hips. Drive hips up squeezing glutes. Hold 2 s at top. Lower slowly. No momentum.' },
  'Step-ups':               { videoUrl: 'https://youtu.be/CVaEhXotL7M', description: 'Step up onto a sturdy platform, drive knee up tall at the top. Step down with control. Alternate legs each rep.' },
  'Circuit: Squats ×4':     { videoUrl: 'https://youtu.be/aclHkVaku9U', description: 'Keep depth and chest up across all 4 rounds. Breathe out on the way up.' },
  'Circuit: Lunges ×4':     { videoUrl: 'https://youtu.be/xrjTHKjFaAI', description: '12 reps alternating legs. Keep front knee above ankle and torso upright throughout.' },
  'Ladder: Squats':         { videoUrl: 'https://youtu.be/aclHkVaku9U', description: 'Go deeper with good form even in higher rep sets. Pause briefly at the bottom of each rep.' },
  // ── Pull / Back ──────────────────────────────────────────────────────────
  'Resistance Band Rows':   { videoUrl: 'https://youtu.be/xQNrFHEMhI4', description: 'Anchor band at waist height. Pull elbows back squeezing shoulder blades together. Control the return.' },
  'Superman Hold':          { videoUrl: 'https://youtu.be/z6PJMT2y8GQ', description: 'Lie face down, arms extended. Lift arms, chest and legs simultaneously. Squeeze glutes hard at top.' },
  'Towel Rows':             { videoUrl: 'https://youtu.be/LR4-_4exBTE', description: 'Loop a towel around a door handle at hip height. Lean back and row your chest to the door. Keep body straight.' },
  'Table Rows':             { videoUrl: 'https://youtu.be/LR4-_4exBTE', description: 'Lie under a sturdy table, grip edge. Pull chest up to table keeping body in a straight line.' },
  'Inverted Rows':          { videoUrl: 'https://youtu.be/LR4-_4exBTE', description: 'Hang under a bar with body straight — like a reverse push-up. Row chest up to bar. Full extension at bottom.' },
  'Reverse Snow Angels':    { videoUrl: 'https://youtu.be/z6PJMT2y8GQ', description: 'Face down, arms at sides. Sweep arms up overhead in a snow-angel arc while staying lifted off the floor.' },
  // ── Mobility ────────────────────────────────────────────────────────────
  'Hip Mobility Flow':      { videoUrl: 'https://youtu.be/FSSDLDhbacc', description: 'Leg swings, 90/90 hip stretch, pigeon pose. Move slowly through full range, pause at end range.' },
  'Shoulder Mobility':      { videoUrl: 'https://youtu.be/FSSDLDhbacc', description: 'Arm circles, cross-body stretch, doorway chest opener. No pain — gentle range of motion work only.' },
  'Full Body Stretch Flow':  { videoUrl: 'https://youtu.be/FSSDLDhbacc', description: 'Cat-cow, quad stretch, hamstring stretch, thoracic rotation. Hold each position 30–45 s. Breathe deeply.' },
  // ── Gym — Compound ───────────────────────────────────────────────────────
  'Barbell Bench Press':    { videoUrl: 'https://youtu.be/vcBig73ojpE', description: 'Feet flat, arch maintained, grip slightly wider than shoulder-width. Lower to mid-chest, drive up explosively.' },
  'Overhead Press':         { videoUrl: 'https://youtu.be/2yjwXTZQDDI', description: 'Bar at collar bone, elbows slightly forward. Brace core, press straight up, lock out overhead. Keep ribs down.' },
  'Barbell Rows':           { videoUrl: 'https://youtu.be/G8l_8chR5BE', description: 'Hip hinge at 45°, bar close to shins. Drive elbows back to hip pockets. Controlled descent — no jerking.' },
  'Pull-ups':               { videoUrl: 'https://youtu.be/eGo4IYlbE5g', description: 'Hang with full arm extension. Drive elbows down to ribs, chin above bar. No kipping — strict control only.' },
  'Face Pulls':             { videoUrl: 'https://youtu.be/rep-qVOkqgk', description: 'Cable at face height, palms in. Pull to forehead with elbows high. Externally rotate shoulders at end position.' },
  'Lateral Raises':         { videoUrl: 'https://youtu.be/3VcKaXpzqRo', description: 'Slight elbow bend, raise to shoulder height only. Lead with pinkies. Slow 3-sec lowering phase — no swinging.' },
  'Barbell Squats':         { videoUrl: 'https://youtu.be/ultWZbUMPL8', description: 'Bar on upper traps, brace core. Drive knees out, squat to parallel. Keep heels flat throughout.' },
  'Romanian Deadlifts':     { videoUrl: 'https://youtu.be/JCXUYuzwNrM', description: 'Slight knee bend, hinge at hips, bar close to legs. Feel hamstring stretch at bottom. Drive hips forward to stand.' },
  'Leg Press':              { videoUrl: 'https://youtu.be/IZxyjW7MPJQ', description: 'Feet shoulder-width at mid-sled. Lower until knees at 90°. Don\'t fully lock out — keep tension on quads.' },
  'Leg Curls':              { videoUrl: 'https://youtu.be/ELOCsoDSmrg', description: 'Full range of motion — don\'t cheat by shifting hips. Control the lowering phase for 3 seconds.' },
  'Standing Calf Raises':   { videoUrl: 'https://youtu.be/gwLzBJYoWlI', description: 'Deep stretch at bottom, pause and squeeze at top. Slow 3-second descent for maximum muscle growth.' },
  'Incline Bench Press':    { videoUrl: 'https://youtu.be/DbFgADa2PL8', description: '30–45° incline. Same technique as flat bench — lower bar to upper chest. Targets clavicular pec head.' },
  'Cable Rows':             { videoUrl: 'https://youtu.be/GZbfZ033f74', description: 'Sit tall, pull handle to lower sternum. Squeeze shoulder blades together. Slow 2-sec return to full extension.' },
  'Tricep Pushdowns':       { videoUrl: 'https://youtu.be/2-LAMcpzODU', description: 'Elbows pinned to sides. Push to full extension, squeeze triceps. Control return — don\'t let elbows flare out.' },
  'Barbell Curls':          { videoUrl: 'https://youtu.be/kwG2ipFRgfo', description: 'Elbows pinned at sides. Full curl, squeeze at top, slow 2-sec descent. No swinging — strict form only.' },
  'Conventional Deadlift':  { videoUrl: 'https://youtu.be/op9kVnSso6Q', description: 'Feet hip-width, bar over mid-foot. Brace hard, drive the floor away. Bar stays close to body throughout.' },
  'Front Squats':           { videoUrl: 'https://youtu.be/m4ytaCJZpl0', description: 'Bar across front delts, elbows high. More upright torso than back squat. Greater quad and core demand.' },
  'Bulgarian Split Squats': { videoUrl: 'https://youtu.be/2C-uNgKwPLE', description: 'Rear foot elevated on bench. Lower front knee to 90°. Keep torso upright. Push through front heel to stand.' },
  'Hip Thrusts':            { videoUrl: 'https://youtu.be/SEdqd1n0cvg', description: 'Upper back on bench, bar across hips. Drive through heels, squeeze glutes hard at top. Full hip extension.' },
  'Seated Calf Raises':     { videoUrl: 'https://youtu.be/gwLzBJYoWlI', description: 'Targets the soleus (lower calf). Same full-range principle — deep stretch then slow squeeze. Use the knee pad.' },
}

// ─── Home 6-Day Transformation ────────────────────────────────────────────────
export const HOME_6DAY: ProgrammeDay[] = [
  {
    dayOfWeek: 0, dayName: 'Mon', label: 'Push + Core', focus: 'Chest · Shoulders · Triceps · Core',
    color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#047857)',
    exercises: [
      { name: 'Push-ups',          muscleGroup: 'Chest',      sets: 4, repRange: '12-15', emoji: '💪', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Incline Push-ups',  muscleGroup: 'Upper Chest',sets: 3, repRange: '15',    emoji: '📐', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Chair Dips',        muscleGroup: 'Triceps',    sets: 4, repRange: '10-12', emoji: '🪑', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Pike Push-ups',     muscleGroup: 'Shoulders',  sets: 3, repRange: '8-10',  emoji: '🔺', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Plank Hold',        muscleGroup: 'Core',       sets: 3, repRange: '45s',   emoji: '⏱️', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Bicycle Crunches',  muscleGroup: 'Core',       sets: 3, repRange: '20',    emoji: '🚴', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Leg Raises',        muscleGroup: 'Core',       sets: 3, repRange: '15',    emoji: '🦵', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
    ],
  },
  {
    dayOfWeek: 1, dayName: 'Tue', label: 'HIIT + Legs', focus: 'Cardio · Quads · Hamstrings · Calves',
    color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#b45309)',
    exercises: [
      { name: 'Jump Squats (HIIT ×4)',    muscleGroup: 'Quads',     sets: 4, repRange: '40s',     emoji: '⚡', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 20, isTime: true },
      { name: 'Mountain Climbers (HIIT)', muscleGroup: 'Full Body',  sets: 4, repRange: '40s',     emoji: '🏔️', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 20, isTime: true },
      { name: 'High Knees (HIIT)',        muscleGroup: 'Cardio',    sets: 4, repRange: '40s',     emoji: '🏃', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 20, isTime: true },
      { name: 'Bodyweight Squats',        muscleGroup: 'Quads',     sets: 4, repRange: '20',      emoji: '🦵', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 45 },
      { name: 'Reverse Lunges',           muscleGroup: 'Glutes',    sets: 3, repRange: '12/leg',  emoji: '🚶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 45 },
      { name: 'Wall Sit',                 muscleGroup: 'Quads',     sets: 3, repRange: '60s',     emoji: '🧱', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 30, isTime: true },
      { name: 'Calf Raises',              muscleGroup: 'Calves',    sets: 4, repRange: '25',      emoji: '🦶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 30 },
    ],
  },
  {
    dayOfWeek: 2, dayName: 'Wed', label: 'Pull + Abs', focus: 'Back · Biceps · Rear Delts · Abs',
    color: '#6366f1', gradient: 'linear-gradient(135deg,#4f46e5,#4338ca)',
    exercises: [
      { name: 'Resistance Band Rows', muscleGroup: 'Back',       sets: 4, repRange: '15',  emoji: '🚣', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Superman Hold',        muscleGroup: 'Lower Back',  sets: 3, repRange: '40s', emoji: '🦸', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 30, isTime: true },
      { name: 'Towel Rows',           muscleGroup: 'Biceps',     sets: 3, repRange: '12',  emoji: '🧺', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Reverse Snow Angels',  muscleGroup: 'Rear Delts', sets: 3, repRange: '15',  emoji: '😇', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 45 },
      { name: 'Russian Twists',       muscleGroup: 'Obliques',   sets: 3, repRange: '25',  emoji: '🌀', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Flutter Kicks',        muscleGroup: 'Lower Abs',  sets: 3, repRange: '30',  emoji: '🦋', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Hollow Body Hold',     muscleGroup: 'Core',       sets: 3, repRange: '30s', emoji: '⭕', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
    ],
  },
  {
    dayOfWeek: 3, dayName: 'Thu', label: 'Active Recovery', focus: 'Mobility · Flexibility · Zone 2 Cardio',
    color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    exercises: [
      { name: 'Hip Mobility Flow',      muscleGroup: 'Hips',      sets: 1, repRange: '10 min',     emoji: '🧘', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0, isTime: true },
      { name: 'Shoulder Mobility',      muscleGroup: 'Shoulders', sets: 1, repRange: '10 min',     emoji: '🔄', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0, isTime: true },
      { name: 'Full Body Stretch Flow', muscleGroup: 'Full Body', sets: 1, repRange: '15 min',     emoji: '🌿', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0, isTime: true },
      { name: 'Brisk Walk (Zone 2)',    muscleGroup: 'Cardio',    sets: 1, repRange: '8-10k steps', emoji: '🚶', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 0 },
    ],
  },
  {
    dayOfWeek: 4, dayName: 'Fri', label: 'Full Body Strength', focus: 'Circuit · Compound · Power',
    color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#be185d)',
    exercises: [
      { name: 'Circuit: Push-ups ×4',     muscleGroup: 'Chest',     sets: 4, repRange: '15',  emoji: '💪', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Squats ×4',       muscleGroup: 'Quads',     sets: 4, repRange: '20',  emoji: '🦵', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Lunges ×4',       muscleGroup: 'Glutes',    sets: 4, repRange: '12',  emoji: '🚶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Plank ×4',        muscleGroup: 'Core',      sets: 4, repRange: '45s', emoji: '⏱️', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0, isTime: true },
      { name: 'Circuit: Burpees ×4',      muscleGroup: 'Full Body', sets: 4, repRange: '10',  emoji: '⚡', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 0 },
      { name: 'Circuit: Shoulder Taps ×4',muscleGroup: 'Core',      sets: 4, repRange: '20',  emoji: '👐', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 5, dayName: 'Sat', label: 'Fat Burn Accelerator', focus: 'HIIT Ladder · Cardio Finisher',
    color: '#ef4444', gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)',
    exercises: [
      { name: 'Ladder: Jumping Jacks (10→20→30)', muscleGroup: 'Cardio',    sets: 2, repRange: 'ladder', emoji: '⭐', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30 },
      { name: 'Ladder: Mountain Climbers',         muscleGroup: 'Full Body', sets: 2, repRange: 'ladder', emoji: '🏔️', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30 },
      { name: 'Ladder: Squats',                    muscleGroup: 'Quads',     sets: 2, repRange: 'ladder', emoji: '🦵', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30 },
      { name: 'Ladder: Sit-ups',                   muscleGroup: 'Core',      sets: 2, repRange: 'ladder', emoji: '💥', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30 },
      { name: 'Brisk Walk Finisher',               muscleGroup: 'Cardio',    sets: 1, repRange: '20 min', emoji: '🚶', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 0, isTime: true },
    ],
  },
  {
    dayOfWeek: 6, dayName: 'Sun', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
]

// ─── Gym Upper / Lower Split (4-day) ──────────────────────────────────────────
export const GYM_UPPER_LOWER: ProgrammeDay[] = [
  {
    dayOfWeek: 0, dayName: 'Mon', label: 'Upper A', focus: 'Chest · Shoulders · Back · Arms',
    color: '#7c3aed', gradient: 'linear-gradient(135deg,#6d28d9,#5b21b6)',
    exercises: [
      { name: 'Barbell Bench Press', muscleGroup: 'Chest',      sets: 4, repRange: '6-8',   emoji: '🏋️', videoUrl: 'https://youtu.be/rT7DgCr-3pg', restSeconds: 120 },
      { name: 'Overhead Press',      muscleGroup: 'Shoulders',  sets: 3, repRange: '8-10',  emoji: '🔺', videoUrl: 'https://youtu.be/2yjwXTZQDDI', restSeconds: 90 },
      { name: 'Barbell Rows',        muscleGroup: 'Back',       sets: 4, repRange: '8-10',  emoji: '🚣', videoUrl: 'https://youtu.be/G8l_8chR5BE', restSeconds: 90 },
      { name: 'Pull-ups',            muscleGroup: 'Lats',       sets: 3, repRange: '6-10',  emoji: '💪', videoUrl: 'https://youtu.be/eGo4IYlbE5g', restSeconds: 90 },
      { name: 'Face Pulls',          muscleGroup: 'Rear Delts', sets: 3, repRange: '15-20', emoji: '😤', videoUrl: 'https://youtu.be/rep-qVOkqgk', restSeconds: 60 },
      { name: 'Lateral Raises',      muscleGroup: 'Shoulders',  sets: 3, repRange: '12-15', emoji: '✈️', videoUrl: 'https://youtu.be/3VcKaXpzqRo', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 1, dayName: 'Tue', label: 'Lower A', focus: 'Quads · Hamstrings · Glutes · Calves',
    color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    exercises: [
      { name: 'Barbell Squats',       muscleGroup: 'Quads',      sets: 4, repRange: '6-8',   emoji: '🦵', videoUrl: 'https://youtu.be/ultWZbUMPL8', restSeconds: 180 },
      { name: 'Romanian Deadlifts',   muscleGroup: 'Hamstrings', sets: 3, repRange: '8-10',  emoji: '🏗️', videoUrl: 'https://youtu.be/JCXUYuzwNrM', restSeconds: 120 },
      { name: 'Leg Press',            muscleGroup: 'Quads',      sets: 3, repRange: '10-12', emoji: '🖐️', videoUrl: 'https://youtu.be/IZxyjW7MPJQ', restSeconds: 90 },
      { name: 'Leg Curls',            muscleGroup: 'Hamstrings', sets: 3, repRange: '12-15', emoji: '🦿', videoUrl: 'https://youtu.be/n3unkKfBHQ4', restSeconds: 60 },
      { name: 'Standing Calf Raises', muscleGroup: 'Calves',     sets: 4, repRange: '15-20', emoji: '🦶', videoUrl: 'https://youtu.be/JbyjNymZOt0', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 2, dayName: 'Wed', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 3, dayName: 'Thu', label: 'Upper B', focus: 'Chest · Back · Arms · Shoulders',
    color: '#7c3aed', gradient: 'linear-gradient(135deg,#6d28d9,#5b21b6)',
    exercises: [
      { name: 'Incline Bench Press', muscleGroup: 'Upper Chest', sets: 4, repRange: '8-10',  emoji: '📐', videoUrl: 'https://youtu.be/jPLdzuHckI8', restSeconds: 120 },
      { name: 'Cable Rows',          muscleGroup: 'Back',        sets: 4, repRange: '10-12', emoji: '🔗', videoUrl: 'https://youtu.be/GZbfZ033f74', restSeconds: 90 },
      { name: 'Lateral Raises',      muscleGroup: 'Shoulders',   sets: 3, repRange: '12-15', emoji: '✈️', videoUrl: 'https://youtu.be/3VcKaXpzqRo', restSeconds: 60 },
      { name: 'Tricep Pushdowns',    muscleGroup: 'Triceps',     sets: 3, repRange: '12-15', emoji: '⬇️', videoUrl: 'https://youtu.be/2-LAMcpzODU', restSeconds: 60 },
      { name: 'Barbell Curls',       muscleGroup: 'Biceps',      sets: 3, repRange: '10-12', emoji: '💪', videoUrl: 'https://youtu.be/ykJmrZ5v0Oo', restSeconds: 60 },
    ],
  },
  {
    dayOfWeek: 4, dayName: 'Fri', label: 'Lower B', focus: 'Posterior Chain · Glutes · Legs',
    color: '#06b6d4', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    exercises: [
      { name: 'Conventional Deadlift',  muscleGroup: 'Back/Glutes', sets: 4, repRange: '4-6',      emoji: '⚡', videoUrl: 'https://youtu.be/op9kVnSso6Q', restSeconds: 180 },
      { name: 'Front Squats',           muscleGroup: 'Quads',       sets: 3, repRange: '8-10',     emoji: '🦵', videoUrl: 'https://youtu.be/uYumuL_G_V0', restSeconds: 120 },
      { name: 'Bulgarian Split Squats', muscleGroup: 'Glutes',      sets: 3, repRange: '8-10/leg', emoji: '🚶', videoUrl: 'https://youtu.be/2C-uNgKwPLE', restSeconds: 90 },
      { name: 'Hip Thrusts',            muscleGroup: 'Glutes',      sets: 3, repRange: '12-15',    emoji: '🍑', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 90 },
      { name: 'Seated Calf Raises',     muscleGroup: 'Calves',      sets: 4, repRange: '15-20',    emoji: '🦶', videoUrl: 'https://youtu.be/JbyjNymZOt0', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 5, dayName: 'Sat', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 6, dayName: 'Sun', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
]

// ─── Beginner Bodyweight (3-day) ──────────────────────────────────────────────
export const BEGINNER_3DAY: ProgrammeDay[] = [
  {
    dayOfWeek: 0, dayName: 'Mon', label: 'Full Body A', focus: 'Push · Hinge · Core',
    color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#047857)',
    exercises: [
      { name: 'Push-ups',          muscleGroup: 'Chest',  sets: 3, repRange: '8-12', emoji: '💪', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Bodyweight Squats', muscleGroup: 'Quads',  sets: 3, repRange: '15',   emoji: '🦵', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 60 },
      { name: 'Table Rows',        muscleGroup: 'Back',   sets: 3, repRange: '10-12',emoji: '🚣', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Plank Hold',        muscleGroup: 'Core',   sets: 3, repRange: '30s',  emoji: '⏱️', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Glute Bridges',     muscleGroup: 'Glutes', sets: 3, repRange: '15',   emoji: '🍑', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 30 },
    ],
  },
  {
    dayOfWeek: 1, dayName: 'Tue', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 2, dayName: 'Wed', label: 'Full Body B', focus: 'Push variation · Squat variation · Anti-rotation',
    color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#b45309)',
    exercises: [
      { name: 'Incline Push-ups', muscleGroup: 'Upper Chest', sets: 3, repRange: '10-15',   emoji: '📐', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Reverse Lunges',   muscleGroup: 'Glutes',      sets: 3, repRange: '10/leg',  emoji: '🚶', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Superman Hold',    muscleGroup: 'Lower Back',  sets: 3, repRange: '30s',     emoji: '🦸', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 30, isTime: true },
      { name: 'Side Plank',       muscleGroup: 'Obliques',    sets: 3, repRange: '25s/side', emoji: '↔️', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Hip Thrusts',      muscleGroup: 'Glutes',      sets: 3, repRange: '12-15',   emoji: '⬆️', videoUrl: 'https://youtu.be/SEdqd1n0cvg', restSeconds: 45 },
    ],
  },
  {
    dayOfWeek: 3, dayName: 'Thu', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 4, dayName: 'Fri', label: 'Full Body C', focus: 'Dip · Hinge · Pull · Core endurance',
    color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#be185d)',
    exercises: [
      { name: 'Chair Dips',        muscleGroup: 'Triceps',   sets: 3, repRange: '8-12',  emoji: '🪑', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 60 },
      { name: 'Step-ups',          muscleGroup: 'Quads',     sets: 3, repRange: '10/leg', emoji: '🪜', videoUrl: 'https://youtu.be/hJh4ze7s3GQ', restSeconds: 45 },
      { name: 'Inverted Rows',     muscleGroup: 'Back',      sets: 3, repRange: '8-12',  emoji: '↩️', videoUrl: 'https://youtu.be/B12MXF0bSFo', restSeconds: 60 },
      { name: 'Hollow Body Hold',  muscleGroup: 'Core',      sets: 3, repRange: '20s',   emoji: '⭕', videoUrl: 'https://youtu.be/W7seSnZ1k1A', restSeconds: 30, isTime: true },
      { name: 'Mountain Climbers', muscleGroup: 'Full Body', sets: 3, repRange: '30s',   emoji: '🏔️', videoUrl: 'https://youtu.be/QyCFeB8mBz8', restSeconds: 30, isTime: true },
    ],
  },
  {
    dayOfWeek: 5, dayName: 'Sat', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
  {
    dayOfWeek: 6, dayName: 'Sun', label: 'Rest Day', focus: 'Recovery · Sleep · Nutrition',
    color: '#64748b', gradient: 'linear-gradient(135deg,#475569,#334155)',
    isRest: true, exercises: [],
  },
]

export const PROGRAMMES: Record<ProgrammeKey, ProgrammeDay[]> = {
  home_6day: HOME_6DAY,
  gym_upper_lower: GYM_UPPER_LOWER,
  beginner_3day: BEGINNER_3DAY,
}

export const PROGRAMME_LABELS: Record<ProgrammeKey, string> = {
  home_6day: '🏠 Home 6-Day',
  gym_upper_lower: '🏋️ Gym Upper/Lower',
  beginner_3day: '🌱 Beginner 3-Day',
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Flat deduplicated list of all exercises across all programmes */
export const ALL_EXERCISES: ExerciseDef[] = (() => {
  const seen = new Set<string>()
  const result: ExerciseDef[] = []
  for (const prog of Object.values(PROGRAMMES)) {
    for (const day of prog) {
      for (const ex of day.exercises) {
        if (!seen.has(ex.name)) {
          seen.add(ex.name)
          result.push(ex)
        }
      }
    }
  }
  return result
})()

/** All unique muscle groups, sorted alphabetically */
export const MUSCLE_GROUPS: string[] = Array.from(new Set(ALL_EXERCISES.map(e => e.muscleGroup))).sort()
