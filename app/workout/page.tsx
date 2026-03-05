'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { saveWorkout, getWorkout, getProfile, getRecentWorkouts } from '@/lib/firestore'
import { estimateCaloriesBurned } from '@/lib/calculations'
import { DailyWorkout, ExerciseLog, SetLog, ProgrammeKey } from '@/lib/types'
import { getSuggestion, formatSuggestion } from '@/lib/progressive-overload'
import { serverTimestamp } from 'firebase/firestore'
import { ExternalLink, Check, Trophy, Timer, Dumbbell, Heart, ChevronRight, Play, History } from 'lucide-react'
import Link from 'next/link'

// ─── Exercise / Programme Types ───────────────────────────────────────────────
interface ExerciseDef {
  name: string
  muscleGroup: string
  sets: number
  repRange: string   // e.g. "12-15" or "45s" for timed
  videoUrl: string
  restSeconds: number
  emoji: string
  isTime?: boolean
}

// Per-exercise tutorial video + brief how-to description.
// Overrides the generic programme videoUrl for a dedicated tutorial.
const EXERCISE_INFO: Record<string, { videoUrl: string; description: string }> = {
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

interface ProgrammeDay {
  dayOfWeek: number  // 0=Mon … 6=Sun
  dayName: string
  label: string
  focus: string
  color: string
  gradient: string
  isRest?: boolean
  exercises: ExerciseDef[]
}

// ─── Home 6-Day Transformation ────────────────────────────────────────────────
const HOME_6DAY: ProgrammeDay[] = [
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
const GYM_UPPER_LOWER: ProgrammeDay[] = [
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
const BEGINNER_3DAY: ProgrammeDay[] = [
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

const PROGRAMMES: Record<ProgrammeKey, ProgrammeDay[]> = {
  home_6day: HOME_6DAY,
  gym_upper_lower: GYM_UPPER_LOWER,
  beginner_3day: BEGINNER_3DAY,
}

const PROGRAMME_LABELS: Record<ProgrammeKey, string> = {
  home_6day: '🏠 Home 6-Day',
  gym_upper_lower: '🏋️ Gym Upper/Lower',
  beginner_3day: '🌱 Beginner 3-Day',
}

// ─── 12-Week Phases ───────────────────────────────────────────────────────────
const PHASES = [
  { num: 1, weeks: '1–4',  name: 'Fat Loss Foundation', color: '#10b981', sub: 'High frequency · Fat oxidation · Mobility' },
  { num: 2, weeks: '5–8',  name: 'Muscle Growth',        color: '#6366f1', sub: 'Progressive overload · Strength · Volume' },
  { num: 3, weeks: '9–12', name: 'Definition & Power',   color: '#f59e0b', sub: 'HIIT · Circuit · Conditioning' },
]

function getCurrentPhase(programmeWeek: number): 1 | 2 | 3 {
  if (programmeWeek <= 4) return 1
  if (programmeWeek <= 8) return 2
  return 3
}

function buildExerciseLogs(dayIdx: number, key: ProgrammeKey): ExerciseLog[] {
  return PROGRAMMES[key][dayIdx].exercises.map(e => ({
    exerciseName: e.name,
    muscleGroup: e.muscleGroup,
    videoUrl: e.videoUrl,
    sets: Array.from({ length: e.sets }, (_, i) => ({
      setNumber: i + 1,
      weightKg: 0,
      reps: 0,
      completed: false,
      restSeconds: e.restSeconds,
    } satisfies SetLog)),
  }))
}

// ─── Progressive Overload Hint ────────────────────────────────────────────────
type OverloadHint = { type: 'reps' | 'weight' | 'deload' | 'start'; message: string } | null

function getOverloadHint(
  exerciseName: string,
  def: ExerciseDef,
  lastWeek: DailyWorkout | null,
  workoutCount: number,
): OverloadHint {
  if (def.isTime) return null
  const lastEx = lastWeek?.exercises.find(e => e.exerciseName === exerciseName)
  const lastSets = lastEx?.sets ?? []
  const targetReps = parseInt(def.repRange.split('-').pop() ?? '0') || 10
  const suggestion = getSuggestion(lastSets, exerciseName, targetReps, workoutCount)
  if (suggestion.action === 'start' && lastSets.length === 0 && !lastWeek) return null
  const msg = formatSuggestion(suggestion)
  const type: OverloadHint extends null ? never : NonNullable<OverloadHint>['type'] =
    suggestion.action === 'increase' ? 'weight'
    : suggestion.action === 'deload'   ? 'deload'
    : suggestion.action === 'start'    ? 'start'
    : 'reps'
  return { type, message: msg }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [programmeKey, setProgrammeKey] = useState<ProgrammeKey>('home_6day')
  const [selectedDay, setSelectedDay] = useState(() => {
    const dow = new Date().getDay()  // 0=Sun
    const mapped = dow === 0 ? 6 : dow - 1  // 0=Mon
    return Math.min(mapped, 5)
  })
  const [exercises, setExercises] = useState<ExerciseLog[]>([])
  const [userWeightKg, setUserWeightKg] = useState(83)
  const [lastWeekWorkout, setLastWeekWorkout] = useState<DailyWorkout | null>(null)
  const [startTime] = useState(Date.now())
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [programmeWeek, setProgrammeWeek] = useState(1)
  const [cardioLogged, setCardioLogged] = useState(false)
  const [completedWorkoutDates, setCompletedWorkoutDates] = useState<Set<string>>(new Set())
  const [workoutCount, setWorkoutCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ISO date strings for Mon–Sun of the current week (index 0=Mon, 6=Sun)
  const weekDates = useMemo(() => {
    const today = new Date()
    const dow = today.getDay() // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + mondayOffset + i)
      return d.toISOString().slice(0, 10)
    })
  }, [])

  // Derived from state — reactive to programmeKey
  const PROGRAMME = PROGRAMMES[programmeKey]

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setAuthReady(true)
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      const saved = localStorage.getItem(`sbh_week_${user.uid}`)
      setProgrammeWeek(saved ? Math.min(Math.max(parseInt(saved), 1), 12) : 1)
      const profile = await getProfile(user.uid)
      if (profile?.programme) setProgrammeKey(profile.programme)
      if (profile?.weightKg) setUserWeightKg(profile.weightKg)
      // Load completed workout dates to grey out finished days in the week view
      getRecentWorkouts(user.uid, 90).then(recent => {
        setCompletedWorkoutDates(new Set(recent.map(w => w.date)))
        setWorkoutCount(recent.length)
      })
    })
    return unsub
  }, [router])

  useEffect(() => {
    const day = PROGRAMME[selectedDay]
    if (!day.isRest) {
      const base = buildExerciseLogs(selectedDay, programmeKey)
      // Restore today's draft if available
      if (uid) {
        const todayStr = new Date().toISOString().slice(0, 10)
        const draftKey = `sbh_workout_draft_${uid}_${todayStr}_${selectedDay}`
        const savedDraft = localStorage.getItem(draftKey)
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft) as ExerciseLog[]
            setExercises(draft.length === base.length ? draft : base)
          } catch {
            setExercises(base)
          }
        } else {
          setExercises(base)
        }
      } else {
        setExercises(base)
      }
    } else {
      setExercises([])
    }
    setCompleted(false)
    setLastWeekWorkout(null)

    // Fetch last week's workout for overload hints
    if (uid && !day.isRest) {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      const lastWeekDateStr = d.toISOString().slice(0, 10)
      getWorkout(uid, lastWeekDateStr).then(w => {
        if (w && w.programmeDay === day.label) setLastWeekWorkout(w)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, uid, programmeKey])

  // Auto-save draft to localStorage whenever exercises change
  useEffect(() => {
    if (!uid || exercises.length === 0 || completed) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const draftKey = `sbh_workout_draft_${uid}_${todayStr}_${selectedDay}`
    localStorage.setItem(draftKey, JSON.stringify(exercises))
  }, [exercises, uid, selectedDay, completed])

  useEffect(() => {
    if (restTimer === null) return
    if (restTimer <= 0) { setRestTimer(null); return }
    timerRef.current = setInterval(() => setRestTimer(t => (t ?? 0) - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [restTimer])

  function updateSet(exIdx: number, setIdx: number, field: keyof SetLog, value: number | boolean) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }))
  }

  function completeSet(exIdx: number, setIdx: number) {
    updateSet(exIdx, setIdx, 'completed', true)
    const rest = exercises[exIdx].sets[setIdx].restSeconds
    if (rest > 0) setRestTimer(rest)
  }

  async function finishWorkout() {
    if (!uid) return
    setSaving(true)
    const todayStr = new Date().toISOString().slice(0, 10)
    const durationMinutes = Math.round((Date.now() - startTime) / 60000)
    const totalVolumeKg = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    const prog = PROGRAMME[selectedDay]
    const workout: DailyWorkout = {
      date: todayStr,
      programmeDay: prog.label,
      exercises,
      durationMinutes,
      totalVolumeKg,
      estimatedCaloriesBurned: estimateCaloriesBurned(durationMinutes, userWeightKg),
      completedAt: serverTimestamp(),
    }
    await saveWorkout(uid, workout)
    // Clear draft after successful save
    localStorage.removeItem(`sbh_workout_draft_${uid}_${todayStr}_${selectedDay}`)
    setCompletedWorkoutDates(prev => new Set(Array.from(prev).concat(todayStr)))
    setSaving(false)
    setCompleted(true)
  }

  if (!authReady) return (
    <main className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  // ── Completion screen ────────────────────────────────────────────────────────
  if (completed) {
    const duration = Math.round((Date.now() - startTime) / 60000)
    const volume = exercises.reduce((t, ex) =>
      t + ex.sets.filter(s => s.completed).reduce((tt, s) => tt + s.weightKg * s.reps, 0), 0)
    return (
      <main className="min-h-screen mesh-bg flex items-center justify-center p-5">
        <div className="max-w-sm w-full glass-strong rounded-3xl p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto glow-violet"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
            <Trophy size={36} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-1">Workout Complete!</h2>
            <p className="text-sm font-semibold" style={{color:'#7c3aed'}}>+150 XP earned 🔥</p>
          </div>
          <div className="space-y-2 text-sm glass rounded-2xl p-4">
            {[
              ['Duration', `${duration} min`],
              ['Total Volume', `${volume.toFixed(1)} kg`],
              ['Est. Burned', `${estimateCaloriesBurned(duration, userWeightKg)} kcal`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-2">{k}</span>
                <span className="font-semibold" style={{color:'#7c3aed'}}>{v}</span>
              </div>
            ))}
          </div>
          {!cardioLogged && (
            <div className="glass rounded-2xl p-3 text-left">
              <p className="text-xs text-2 mb-2">Don&apos;t forget your daily cardio!</p>
              <button onClick={() => setCardioLogged(true)}
                className="w-full py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{background:'#7c3aed'}}>
                <Heart size={14} /> Log 30-min Cardio Done (+25 XP)
              </button>
            </div>
          )}
          {cardioLogged && <p className="text-xs font-semibold" style={{color:'#7c3aed'}}>✓ Cardio logged! +25 XP</p>}
          <button onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-2xl font-bold text-white"
            style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow:'0 0 32px -8px #7c3aed60'}}>
            Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  const prog = PROGRAMME[selectedDay]
  const phase = getCurrentPhase(programmeWeek)
  const currentPhase = PHASES[phase - 1]
  const totalSets = exercises.reduce((t, ex) => t + ex.sets.length, 0)
  const doneSets = exercises.reduce((t, ex) => t + ex.sets.filter(s => s.completed).length, 0)
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0

  return (
    <main className="min-h-screen mesh-bg page-pad">
      {/* Rest timer banner */}
      {restTimer !== null && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-3 font-bold text-sm"
          style={{background:'#f59e0b', color:'#0f172a'}}>
          <Timer size={16} /> Rest: {restTimer}s — breathe deeply
        </div>
      )}

      {/* Header */}
      <header className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{background: currentPhase.color + '20', color: currentPhase.color}}>
            Phase {phase} · Week {programmeWeek}/12
          </span>
          <span className="text-xs text-2">{currentPhase.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
            style={{background:'rgba(124,58,237,0.12)', color:'#7c3aed'}}>
            {PROGRAMME_LABELS[programmeKey]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Dumbbell size={18} style={{color: prog.color}} />
          <h1 className="text-xl font-bold text-1">{prog.label}</h1>
          <Link href="/workout/history" className="ml-auto p-2 rounded-xl glass" title="Workout history">
            <History size={16} className="text-slate-400" />
          </Link>
        </div>
        <p className="text-xs text-2 mt-0.5">{prog.focus}</p>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-4">

        {/* 7-day week view */}
        <div className="glass rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1.5">
            {PROGRAMME.map((p, i) => {
              const isSelected = i === selectedDay
              const dayDate = weekDates[i]
              const isDone = !p.isRest && completedWorkoutDates.has(dayDate)
              return (
                <button key={i} onClick={() => setSelectedDay(i)}
                  className="flex flex-col items-center gap-1.5 transition-all">
                  <p className="text-xs text-3">{p.dayName}</p>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative"
                    style={{
                      background: isSelected
                        ? p.color
                        : isDone ? p.color + '22'
                        : p.isRest ? '#0D1526' : p.color + '15',
                      color: isSelected ? '#fff' : isDone ? p.color : p.isRest ? '#475569' : p.color,
                      boxShadow: isSelected ? `0 0 16px -4px ${p.color}80` : 'none',
                      opacity: isDone && !isSelected ? 0.65 : 1,
                    }}>
                    {isDone && !isSelected ? <Check size={12} /> : p.isRest ? '—' : p.dayName.charAt(0)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Phase info card */}
        <div className="glass rounded-2xl p-3 border" style={{borderColor: currentPhase.color + '30'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold" style={{color: currentPhase.color}}>
                12-Week Programme · Phase {phase}
              </p>
              <p className="text-xs text-2 mt-0.5">{currentPhase.sub}</p>
            </div>
            <div className="flex items-center gap-1">
              {PHASES.map(ph => (
                <div key={ph.num} className="w-2 h-2 rounded-full transition-all"
                  style={{background: ph.num === phase ? ph.color : '#1a2744'}} />
              ))}
            </div>
          </div>
        </div>

        {/* Rest day */}
        {prog.isRest && (
          <div className="glass-strong rounded-3xl p-8 text-center space-y-3">
            <div className="text-5xl">😴</div>
            <h2 className="text-xl font-bold text-1">Rest Day</h2>
            <p className="text-sm text-2">Recovery is where growth happens. Sleep 7–9hrs, hit 2L water, nail your macros.</p>
            <div className="glass rounded-2xl p-4 text-left space-y-2 text-sm">
              {['💤 Sleep 7–9 hours', '💧 Drink 3L water', '🥩 Hit protein target', '🧘 Optional light stretch'].map(t => (
                <p key={t} className="text-2">{t}</p>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!prog.isRest && totalSets > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-2">Sets completed</span>
              <span className="font-semibold" style={{color: prog.color}}>{doneSets} / {totalSets}</span>
            </div>
            <div className="w-full rounded-full h-2" style={{background:'rgba(255,255,255,0.06)'}}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{width:`${pct}%`, background: prog.gradient}} />
            </div>
            {pct === 100 && (
              <p className="text-xs mt-2 text-center font-semibold" style={{color:'#10b981'}}>
                All sets done! 🔥 Finish your workout below.
              </p>
            )}
          </div>
        )}

        {/* Progressive overload banner — data-driven */}
        {!prog.isRest && lastWeekWorkout && (
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xl">📈</span>
            <div>
              <p className="text-xs font-semibold text-1">Progressive Overload Active</p>
              <p className="text-xs text-2">Per-exercise hints shown based on last week&apos;s performance</p>
            </div>
          </div>
        )}

        {/* Exercise cards */}
        {!prog.isRest && exercises.map((ex, exIdx) => {
          const def = prog.exercises[exIdx]
          const info = EXERCISE_INFO[ex.exerciseName]
          const videoUrl = info?.videoUrl ?? ex.videoUrl
          const allDone = ex.sets.every(s => s.completed)
          const hint = getOverloadHint(ex.exerciseName, def, lastWeekWorkout, workoutCount)
          return (
            <div key={ex.exerciseName} className="glass rounded-2xl p-4 transition-all"
              style={allDone ? {border: `1px solid ${prog.color}60`} : {}}>
              <div className="flex items-start gap-3 mb-3">
                <div className="ex-thumb" style={{background: prog.color + '18'}}>
                  {def?.emoji ?? '💪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {allDone && <Check size={13} style={{color: prog.color}} />}
                    <h3 className="font-semibold text-sm truncate" style={{color: allDone ? prog.color : '#f1f5f9'}}>
                      {ex.exerciseName}
                    </h3>
                  </div>
                  <p className="text-xs text-2 mt-0.5">
                    {ex.muscleGroup} · {def?.sets} sets × {def?.repRange} {def?.isTime ? '' : 'reps'}
                  </p>
                  {info?.description && (
                    <p className="text-xs mt-1 leading-relaxed" style={{color:'#64748b'}}>{info.description}</p>
                  )}
                  {hint && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
                      style={{
                        background: hint.type === 'deload' ? 'rgba(99,102,241,0.12)'
                          : hint.type === 'weight' ? 'rgba(245,158,11,0.12)'
                          : 'rgba(16,185,129,0.12)',
                        color: hint.type === 'deload' ? '#818cf8'
                          : hint.type === 'weight' ? '#f59e0b'
                          : '#10b981',
                      }}>
                      {hint.message}
                    </span>
                  )}
                </div>
                {videoUrl && (
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs shrink-0 px-2 py-1 rounded-lg glass"
                    style={{color: prog.color}}>
                    <Play size={11} fill="currentColor" /> Watch
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs text-3 text-center px-1">
                  <span>Set</span>
                  <span>{def?.isTime ? 'sec' : 'kg'}</span>
                  <span>{def?.isTime ? 'done' : 'reps'}</span>
                  <span>✓</span>
                </div>
                {ex.sets.map((set, setIdx) => {
                  const lastEx = lastWeekWorkout?.exercises.find(e => e.exerciseName === ex.exerciseName)
                  const lastSet = lastEx?.sets[setIdx]
                  const hasPrev = lastSet && lastSet.completed && !def?.isTime
                  return (
                    <div key={setIdx}>
                      <div className={`grid grid-cols-4 gap-2 items-center ${set.completed ? 'opacity-40' : ''}`}>
                        <span className="text-center text-xs text-2">#{set.setNumber}</span>
                        {def?.isTime ? (
                          <span className="text-center text-xs text-2 col-span-2">{def.repRange}</span>
                        ) : (
                          <>
                            <input type="number" step="0.5" value={set.weightKg || ''}
                              onChange={e => updateSet(exIdx, setIdx, 'weightKg', Number(e.target.value))}
                              disabled={set.completed} placeholder={hasPrev ? String(lastSet.weightKg) : '0'}
                              className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full glass"
                              style={{background:'rgba(255,255,255,0.04)'}}
                            />
                            <input type="number" value={set.reps || ''}
                              onChange={e => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                              disabled={set.completed} placeholder={hasPrev ? String(lastSet.reps) : '0'}
                              className="px-2 py-1.5 rounded-lg text-sm text-1 text-center outline-none w-full glass"
                              style={{background:'rgba(255,255,255,0.04)'}}
                            />
                          </>
                        )}
                        <button onClick={() => completeSet(exIdx, setIdx)} disabled={set.completed}
                          className="w-9 h-9 mx-auto rounded-full text-sm font-bold transition-all flex items-center justify-center"
                          style={{
                            background: set.completed ? prog.color + '25' : 'rgba(255,255,255,0.06)',
                            color: set.completed ? prog.color : '#94a3b8',
                          }}>
                          {set.completed ? <Check size={14} /> : '○'}
                        </button>
                      </div>
                      {hasPrev && (
                        <p className="text-center text-xs mt-0.5 col-span-4"
                          style={{color:'#334155', paddingLeft:'25%', paddingRight:'25%'}}>
                          prev: {lastSet.weightKg}kg × {lastSet.reps}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Video references */}
        {!prog.isRest && (
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-2 font-semibold uppercase tracking-widest mb-3">Reference Videos</p>
            <div className="space-y-2">
              {[
                { label: 'Full Body Fat Loss', url: 'https://youtu.be/hJh4ze7s3GQ' },
                { label: 'Muscle Building Bodyweight', url: 'https://youtu.be/B12MXF0bSFo' },
                { label: 'Core & Abs', url: 'https://youtu.be/W7seSnZ1k1A' },
                { label: 'HIIT Fat Burning', url: 'https://youtu.be/QyCFeB8mBz8' },
              ].map(v => (
                <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl glass hover:bg-white/10 transition-all">
                  <span className="text-xs text-1">{v.label}</span>
                  <ExternalLink size={12} className="text-2" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Week selector */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-2 font-semibold uppercase tracking-widest mb-3">Programme Week</p>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({length: 12}, (_, i) => i + 1).map(w => {
              const ph = getCurrentPhase(w)
              const phColor = PHASES[ph - 1].color
              return (
                <button key={w} onClick={() => {
                  setProgrammeWeek(w)
                  if (uid) localStorage.setItem(`sbh_week_${uid}`, String(w))
                }}
                  className="py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: programmeWeek === w ? phColor : phColor + '15',
                    color: programmeWeek === w ? '#fff' : phColor,
                  }}>
                  W{w}
                </button>
              )
            })}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-3">
            {PHASES.map(p => (
              <span key={p.num} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{background: p.color}} />
                P{p.num}: Wk{p.weeks}
              </span>
            ))}
          </div>
        </div>

        {!prog.isRest && (
          <button onClick={finishWorkout} disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white disabled:opacity-50 transition-opacity"
            style={{background: prog.gradient, boxShadow:`0 0 32px -8px ${prog.color}60`}}>
            {saving ? 'Saving...' : '🏁 Finish Workout + Log'}
          </button>
        )}

        <div className="text-center text-xs text-3 pb-4 flex items-center justify-center gap-1">
          <ChevronRight size={10} />
          SBH Training System
        </div>
      </div>
    </main>
  )
}
