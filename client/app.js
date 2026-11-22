/* Power Plant — client app for Power Plant Gym. Workouts come from the coach's program or the client's own routines.
   Data lives on the phone and syncs to the client's account in the gym's Supabase project (see "Account + sync"). */
(() => {
"use strict";
const APP_VERSION = "0.8.5";
const PP = window.PPProgram;
const APP_NAME = "Power Plant";

/* ================= Exercise library ================= */
// track: "wr" weight+reps · "time" seconds · "dt" distance+time · "wd" weight+distance
// better: for time tracks, whether a higher or lower time is better. dist: "long" (mi/km) or "short" (yd/m).
// [id, name, kind, muscle, sets, repsMin, repsMax, extra]
const LIB_ROWS = [
  ["squat", "Barbell Back Squat", "barbell", "Legs", 3, 5, 5],
  ["front_squat", "Front Squat", "barbell", "Legs", 3, 5, 8],
  ["deadlift", "Deadlift", "barbell", "Back", 1, 5, 5],
  ["trap_dl", "Trap Bar Deadlift", "barbell", "Back", 3, 3, 5, { barW: true }],
  ["rdl", "Romanian Deadlift", "barbell", "Hamstrings", 3, 8, 10],
  ["hip_thrust", "Barbell Hip Thrust", "barbell", "Glutes", 3, 8, 12],
  ["leg_press", "Leg Press", "machine", "Legs", 3, 10, 12],
  ["hack_squat", "Hack Squat", "machine", "Legs", 3, 8, 12],
  ["leg_ext", "Leg Extension", "machine", "Quads", 3, 10, 15],
  ["leg_curl", "Lying Leg Curl", "machine", "Hamstrings", 3, 10, 12],
  ["seated_leg_curl", "Seated Leg Curl", "machine", "Hamstrings", 3, 10, 12],
  ["goblet", "Goblet Squat", "dumbbell", "Legs", 3, 10, 12],
  ["bulgarian", "Bulgarian Split Squat", "dumbbell", "Legs", 3, 8, 12],
  ["lunge", "Walking Lunge", "dumbbell", "Legs", 3, 10, 12],
  ["hip_abd", "Hip Abduction", "machine", "Glutes", 3, 12, 15],
  ["calf_raise", "Standing Calf Raise", "machine", "Calves", 4, 10, 15],
  ["seated_calf", "Seated Calf Raise", "machine", "Calves", 3, 12, 15],
  ["bench", "Barbell Bench Press", "barbell", "Chest", 3, 5, 5],
  ["incline_bench", "Incline Barbell Bench", "barbell", "Chest", 3, 6, 10],
  ["db_bench", "Dumbbell Bench Press", "dumbbell", "Chest", 3, 8, 12],
  ["incline_db", "Incline Dumbbell Press", "dumbbell", "Chest", 3, 8, 12],
  ["chest_press", "Machine Chest Press", "machine", "Chest", 3, 8, 12],
  ["pec_deck", "Pec Deck Fly", "machine", "Chest", 3, 12, 15],
  ["cable_fly", "Cable Fly", "cable", "Chest", 3, 12, 15],
  ["dip", "Dip", "bodyweight", "Chest", 3, 6, 12],
  ["pushup", "Push-up", "bodyweight", "Chest", 3, 10, 20],
  ["hrpu", "Hand-Release Push-up", "bodyweight", "Chest", 1, 20, 60],
  ["row", "Barbell Row", "barbell", "Back", 3, 5, 8],
  ["pullup", "Pull-up", "bodyweight", "Back", 3, 5, 10],
  ["chinup", "Chin-up", "bodyweight", "Back", 3, 5, 10],
  ["lat_pulldown", "Lat Pulldown", "cable", "Back", 3, 8, 12],
  ["seated_row", "Seated Cable Row", "cable", "Back", 3, 8, 12],
  ["db_row", "One-Arm Dumbbell Row", "dumbbell", "Back", 3, 8, 12],
  ["tbar_row", "T-Bar Row", "machine", "Back", 3, 8, 12],
  ["machine_row", "Chest-Supported Machine Row", "machine", "Back", 3, 8, 12],
  ["straight_arm", "Straight-Arm Pulldown", "cable", "Back", 3, 12, 15],
  ["back_ext", "Back Extension", "bodyweight", "Lower back", 3, 10, 15],
  ["ohp", "Overhead Press", "barbell", "Shoulders", 3, 5, 5],
  ["db_shoulder", "Seated Dumbbell Shoulder Press", "dumbbell", "Shoulders", 3, 8, 12],
  ["machine_shoulder", "Machine Shoulder Press", "machine", "Shoulders", 3, 8, 12],
  ["lateral", "Dumbbell Lateral Raise", "dumbbell", "Shoulders", 3, 12, 15],
  ["cable_lateral", "Cable Lateral Raise", "cable", "Shoulders", 3, 12, 15],
  ["rear_delt", "Reverse Pec Deck", "machine", "Rear delts", 3, 12, 15],
  ["face_pull", "Face Pull", "cable", "Rear delts", 3, 12, 15],
  ["shrug", "Dumbbell Shrug", "dumbbell", "Traps", 3, 10, 15],
  ["bb_curl", "Barbell Curl", "barbell", "Biceps", 3, 8, 12],
  ["db_curl", "Dumbbell Curl", "dumbbell", "Biceps", 3, 8, 12],
  ["hammer", "Hammer Curl", "dumbbell", "Biceps", 3, 10, 12],
  ["cable_curl", "Cable Curl", "cable", "Biceps", 3, 10, 15],
  ["preacher", "Machine Preacher Curl", "machine", "Biceps", 3, 10, 12],
  ["pushdown", "Triceps Pushdown", "cable", "Triceps", 3, 10, 15],
  ["oh_ext", "Overhead Cable Triceps Extension", "cable", "Triceps", 3, 10, 15],
  ["skull", "EZ-Bar Skull Crusher", "barbell", "Triceps", 3, 8, 12],
  ["close_bench", "Close-Grip Bench Press", "barbell", "Triceps", 3, 6, 10],
  ["hang_leg", "Hanging Leg Raise", "bodyweight", "Core", 3, 10, 15],
  ["cable_crunch", "Cable Crunch", "cable", "Core", 3, 12, 15],
  ["ab_wheel", "Ab Wheel Rollout", "bodyweight", "Core", 3, 8, 12],
  ["plank", "Plank", "bodyweight", "Core", 3, 0, 0, { track: "time", better: "higher", defS: 60 }],
  ["dead_hang", "Dead Hang", "bodyweight", "Grip", 3, 0, 0, { track: "time", better: "higher", defS: 45 }],
  ["farmer", "Farmer Carry", "dumbbell", "Grip", 3, 0, 0, { track: "wd", dist: "short", defD: 40 }],
  ["sled_push", "Sled Push", "machine", "Legs", 4, 0, 0, { track: "wd", dist: "short", defD: 25 }],
  ["sdc", "Sprint-Drag-Carry", "cardio", "Conditioning", 1, 0, 0, { track: "time", better: "lower", defS: 150 }],
  ["run2mi", "2-Mile Run", "cardio", "Conditioning", 1, 0, 0, { track: "time", better: "lower", defS: 1080 }],
  ["run", "Run", "cardio", "Conditioning", 1, 0, 0, { track: "dt", dist: "long", defD: 2, defS: 1080 }],
  ["sprints", "Sprint Intervals", "cardio", "Conditioning", 6, 0, 0, { track: "dt", dist: "short", defD: 100, defS: 18 }],
  ["row_erg", "Rowing Machine", "cardio", "Conditioning", 1, 0, 0, { track: "dt", dist: "short", defD: 2000, defS: 480 }],
  ["bike", "Stationary Bike", "cardio", "Conditioning", 1, 0, 0, { track: "dt", dist: "long", defD: 5, defS: 900 }],
  ["stairs", "Stair Climber", "cardio", "Conditioning", 1, 0, 0, { track: "time", better: "higher", defS: 900 }],
  // Exercises from the gym's YouTube channel (youtube.com/@powerplantgym). Each has its video in GYM_VIDEOS.
  // Legs
  ["belt_squat", "Belt Squat", "machine", "Legs", 3, 8, 12],
  ["pin_squat", "High Pin Squat", "barbell", "Legs", 3, 3, 5],
  ["tempo_squat", "Tempo Squat", "barbell", "Quads", 3, 5, 5],
  ["goblet_1510", "1:5:10 Goblet Squat", "dumbbell", "Legs", 3, 5, 5],
  ["goblet_pressout", "Goblet Squat with Press-Out", "dumbbell", "Legs", 3, 8, 10],
  ["split_squat", "Split Squat", "dumbbell", "Legs", 3, 8, 12],
  ["lunge_1half", "1½ Lunge", "dumbbell", "Legs", 3, 8, 10],
  ["db_reverse_lunge", "Dumbbell Reverse Lunge", "dumbbell", "Legs", 3, 8, 12],
  ["kb_reverse_lunge", "Kettlebell Reverse Lunge", "kettlebell", "Legs", 3, 8, 12],
  ["dkb_reverse_lunge", "Double-Kettlebell Reverse Lunge", "kettlebell", "Legs", 3, 8, 10],
  ["oh_lunge", "Overhead Walking Lunge", "other", "Legs", 3, 8, 10],
  ["pistol_box", "Single-Leg Squat to Box", "bodyweight", "Legs", 3, 5, 8],
  ["skier_squat", "Downhill Skier Squat", "bodyweight", "Quads", 3, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["jump_squat", "Jump Squat", "bodyweight", "Legs", 3, 5, 8],
  ["box_jump", "Box Jump", "bodyweight", "Legs", 3, 3, 5],
  ["mb_broad_jump", "Med Ball Broad Jump", "other", "Legs", 3, 3, 5],
  ["lateral_hops", "Lateral Hops Over Plate", "bodyweight", "Conditioning", 3, 0, 0, { track: "time", better: "higher", defS: 30 }],
  // Hinges and posterior chain
  ["strongman_dl", "Strongman Deadlift (13-inch)", "barbell", "Back", 3, 3, 5],
  ["staggered_dl", "Staggered-Stance Deadlift", "dumbbell", "Hamstrings", 3, 8, 10],
  ["rfe_sldl", "Rear-Foot-Elevated Single-Leg Deadlift", "dumbbell", "Hamstrings", 3, 8, 10],
  ["glute_bridge", "Glute Bridge", "bodyweight", "Glutes", 3, 10, 15],
  ["ghr", "Glute-Ham Raise", "machine", "Hamstrings", 3, 5, 8],
  ["rower_ham_curl", "Rower Hamstring Curl", "bodyweight", "Hamstrings", 3, 8, 12],
  ["fr_ham_curl", "Foam Roller Hamstring Curl", "bodyweight", "Hamstrings", 3, 8, 12],
  ["band_pull_through", "Band Pull-Through", "band", "Glutes", 3, 12, 15],
  ["pvc_gm", "PVC Good Morning", "other", "Hamstrings", 2, 10, 10],
  ["kb_swing", "Kettlebell Swing", "kettlebell", "Glutes", 3, 10, 15],
  ["kb_start_stop_swing", "Start-Stop Kettlebell Swing", "kettlebell", "Glutes", 3, 5, 10],
  ["kb_hike_pass", "Kettlebell Hike Pass", "kettlebell", "Glutes", 2, 8, 10],
  ["kb_pendulum", "Kettlebell Lateral Pendulum Swing", "kettlebell", "Glutes", 3, 10, 12],
  // Olympic-style lifts
  ["hang_clean", "Hang Clean", "barbell", "Legs", 3, 2, 3],
  ["clean_high_pull", "Clean High Pull", "barbell", "Traps", 3, 3, 5],
  ["sg_high_pull", "Snatch-Grip High Pull", "barbell", "Traps", 3, 3, 5],
  ["tall_jerk", "Tall Power Jerk", "barbell", "Shoulders", 3, 3, 3],
  ["bb_complex", "Barbell Complex", "barbell", "Conditioning", 3, 5, 6],
  // Chest and triceps
  ["deficit_pushup", "Deficit Push-up", "bodyweight", "Chest", 3, 8, 15],
  ["cg_pushup", "Close-Grip Push-up", "bodyweight", "Triceps", 3, 8, 15],
  ["db_fly", "Dumbbell Chest Fly", "dumbbell", "Chest", 3, 10, 12],
  // Back
  ["standing_cable_row", "Standing Cable Row", "cable", "Back", 3, 10, 12],
  ["segmented_row", "Segmented Row", "barbell", "Back", 3, 6, 8],
  ["band_row", "Seated Band Row", "band", "Back", 3, 12, 15],
  ["band_pulldown", "Band Pull-down (Bench Prep)", "band", "Back", 2, 15, 20],
  ["band_lat_pullin", "Band Lat Pull-in", "band", "Back", 2, 12, 15],
  ["band_pullover", "Band Pullover / Lat Pushdown", "band", "Back", 3, 12, 15],
  // Shoulders and upper back
  ["sahk_db_press", "Half-Kneeling One-Arm Dumbbell Press", "dumbbell", "Shoulders", 3, 8, 10],
  ["kb_bottom_up", "Kettlebell Bottoms-Up Press", "kettlebell", "Shoulders", 3, 5, 8],
  ["kb_armbar", "Kettlebell Arm Bar", "kettlebell", "Shoulders", 2, 3, 5],
  ["db_face_pull", "Dumbbell Face Pull", "dumbbell", "Rear delts", 3, 12, 15],
  ["band_pull_apart", "Band Pull-Apart", "band", "Rear delts", 3, 15, 20],
  ["band_rear_fly", "Banded Rear Delt Fly", "band", "Rear delts", 3, 12, 15],
  ["band_underhand_pa", "Underhand Band Pull-Apart and Dislocate", "band", "Rear delts", 2, 10, 12],
  ["band_yw", "Band Y's and W's", "band", "Rear delts", 2, 10, 12],
  ["yti", "Y-T-I Raise", "dumbbell", "Rear delts", 2, 8, 10],
  ["band_ir_er", "Band Shoulder Internal/External Rotation", "band", "Shoulders", 2, 12, 15],
  ["shoulder_9090_band", "Shoulder 90-90 (Band)", "band", "Shoulders", 2, 10, 12],
  ["shoulder_9090_plate", "Shoulder 90-90 (Plate)", "other", "Shoulders", 2, 10, 12],
  ["band_scap", "Band Scapular Retraction/Protraction", "band", "Back", 2, 12, 15],
  // Arms
  ["spider_curl", "Spider Curl", "dumbbell", "Biceps", 3, 10, 12],
  // Core
  ["fr_rollout", "Foam Roller Rollout", "bodyweight", "Core", 3, 6, 10],
  ["bird_dog", "Floating Bird Dog", "bodyweight", "Core", 3, 6, 10],
  ["dead_bug", "Dead Bug", "bodyweight", "Core", 3, 6, 10],
  ["hollow_hold", "Hollow Hold", "bodyweight", "Core", 3, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["reverse_plank", "Reverse Plank", "bodyweight", "Core", 3, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["contra_plank", "Contralateral Plank", "bodyweight", "Core", 3, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["lrc_plank", "Left-Right-Center Plank", "bodyweight", "Core", 2, 0, 0, { track: "time", better: "higher", defS: 90 }],
  ["shoulder_tap", "Shoulder Tap Plank", "bodyweight", "Core", 3, 10, 20],
  ["high_low_plank", "High-Low Plank", "bodyweight", "Core", 3, 6, 10],
  ["russian_twist", "Russian Twist", "bodyweight", "Core", 3, 10, 20],
  ["mb_toe_touch", "Med Ball Toe Touch", "other", "Core", 3, 10, 15],
  ["pallof_rot", "Standing Pallof Press with Rotation", "band", "Core", 3, 8, 10],
  ["hk_pallof", "Half-Kneeling Pallof Press", "band", "Core", 3, 8, 10],
  ["kb_pull_through", "Kettlebell Plank Pull-Through", "kettlebell", "Core", 3, 6, 10],
  // Carries and strongman
  ["bb_suitcase", "Barbell Suitcase Carry", "barbell", "Grip", 3, 0, 0, { track: "wd", dist: "short", defD: 40 }],
  ["kb_suitcase", "Kettlebell Suitcase Carry", "kettlebell", "Core", 3, 0, 0, { track: "wd", dist: "short", defD: 40 }],
  ["yoke_carry", "Yoke Carry", "strongman", "Legs", 3, 0, 0, { track: "wd", dist: "short", defD: 20 }],
  ["keg_carry", "Keg Carry", "strongman", "Core", 3, 0, 0, { track: "wd", dist: "short", defD: 40 }],
  ["hbt_march", "HBT March", "barbell", "Core", 3, 0, 0, { track: "time", better: "higher", defS: 20 }],
  ["keg_load", "Keg Load", "strongman", "Back", 3, 3, 5],
  ["keg_clean_press", "Keg Clean and Press", "strongman", "Shoulders", 3, 3, 5],
  ["circus_db", "Circus Dumbbell Press", "strongman", "Shoulders", 3, 3, 6],
  ["basket_dl", "Basket Deadlift", "strongman", "Back", 3, 3, 5],
  // Mobility, warm-ups and stretches
  ["wrist_mob", "Wrist Mobility", "bodyweight", "Other", 1, 0, 0, { track: "time", better: "higher", defS: 90 }],
  ["cat_cow", "Cat/Cow", "bodyweight", "Lower back", 2, 8, 10],
  ["cow_grazer", "Cow Grazer", "bodyweight", "Other", 2, 6, 8],
  ["leg_swings", "Leg Swings", "bodyweight", "Other", 2, 10, 10],
  ["hip_drop", "Hip Drop with Resisted Hold", "bodyweight", "Glutes", 2, 5, 5],
  ["hip_9090", "90-90 Hip Mobility", "bodyweight", "Glutes", 2, 6, 8],
  ["hip_9090_popup", "90-90 Hip Mobility with Pop-up", "bodyweight", "Glutes", 2, 5, 6],
  ["seated_hip_ir", "Seated Hip Internal Rotation", "bodyweight", "Glutes", 2, 8, 10],
  ["couch_stretch", "Couch Stretch", "bodyweight", "Quads", 2, 0, 0, { track: "time", better: "higher", defS: 60 }],
  ["couch_pigeon", "Couch and Pigeon Stretch on Bench", "bodyweight", "Glutes", 2, 0, 0, { track: "time", better: "higher", defS: 60 }],
  ["goblet_ham_stretch", "Goblet Squat to Hamstring Stretch", "dumbbell", "Hamstrings", 2, 6, 8],
  ["band_ham_stretch", "Lying Band Hamstring Stretch", "band", "Hamstrings", 2, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["seated_ham_stretch", "Seated Hamstring Stretch", "bodyweight", "Hamstrings", 2, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["band_lat_stretch", "Band Lat Stretch", "band", "Back", 2, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["child_side", "Child's Pose with Side Reach", "bodyweight", "Back", 2, 0, 0, { track: "time", better: "higher", defS: 30 }],
  ["child_rot", "Child's Pose with Torso Rotation", "bodyweight", "Back", 2, 6, 8],
  ["sphinx", "Sphinx with Side Looks and Protraction", "bodyweight", "Back", 2, 6, 8],
  ["tspine_atw", "T-Spine Around the World", "other", "Back", 2, 5, 5],
  ["oh_reach", "Standing Overhead Reach with Lift-off", "bodyweight", "Shoulders", 2, 8, 10],
  ["wall_slide_band", "Scapular Wall Slide with Band", "band", "Shoulders", 2, 10, 12],
  ["wall_slide_fr", "Scapular Wall Slide with Foam Roller", "other", "Shoulders", 2, 10, 12],
  ["prone_dowel_press", "Prone Dowel Press Behind the Neck", "other", "Shoulders", 2, 8, 10],
  ["band_dislocate_prone", "Prone Band Dislocate", "band", "Shoulders", 2, 8, 10],
];
const KINDS = ["barbell", "dumbbell", "kettlebell", "machine", "cable", "bodyweight", "band", "strongman", "other", "cardio"];
const isBW = (k) => k === "bodyweight" || k === "band"; // logged as reps, with optional added weight
const TRACKS = { wr: "Weight × reps", time: "Time", dt: "Distance + time", wd: "Weight + distance" };
const MUSCLES = ["Chest", "Back", "Shoulders", "Rear delts", "Traps", "Legs", "Quads", "Hamstrings", "Glutes", "Calves", "Lower back", "Biceps", "Triceps", "Core", "Grip", "Conditioning", "Other"];
const LIB = {};
for (const [id, name, kind, muscle, sets, repsMin, repsMax, extra] of LIB_ROWS) LIB[id] = { id, name, kind, muscle, sets, repsMin, repsMax, track: "wr", ...(extra || {}) };

const KIND_DEFAULTS = {
  lb: { barbell: { w: 45, inc: 5 }, dumbbell: { w: 20, inc: 5 }, kettlebell: { w: 35, inc: 5 }, machine: { w: 50, inc: 10 }, cable: { w: 30, inc: 5 }, bodyweight: { w: 0, inc: 5 }, band: { w: 0, inc: 0 }, strongman: { w: 100, inc: 10 }, other: { w: 10, inc: 5 }, cardio: { w: 0, inc: 0 } },
  kg: { barbell: { w: 20, inc: 2.5 }, dumbbell: { w: 8, inc: 2 }, kettlebell: { w: 16, inc: 4 }, machine: { w: 25, inc: 5 }, cable: { w: 15, inc: 2.5 }, bodyweight: { w: 0, inc: 2.5 }, band: { w: 0, inc: 0 }, strongman: { w: 45, inc: 5 }, other: { w: 5, inc: 2.5 }, cardio: { w: 0, inc: 0 } },
};
const LOWER_BARBELL = new Set(["squat", "front_squat", "deadlift", "trap_dl", "rdl", "hip_thrust", "strongman_dl", "pin_squat", "tempo_squat"]);
const PLATES = {
  lb: [[45, "--plate-blue", 30], [25, "--plate-green", 24], [10, "--plate-white", 18], [5, "--plate-black", 15], [2.5, "--plate-black", 12]],
  kg: [[25, "--plate-red", 30], [20, "--plate-blue", 30], [15, "--plate-yellow", 27], [10, "--plate-green", 24], [5, "--plate-white", 18], [2.5, "--plate-black", 14], [1.25, "--plate-black", 11]],
};
// The gym's bars. Weights are editable in Profile; exercises pick one in the workout.
// The bars at Power Plant. Clients can rename, reweigh, add or remove bars in Profile.
const DEFAULT_BARS = {
  lb: [["olympic", "Power bar", 45], ["eleiko", "Eleiko weightlifting bar", 45], ["womens", "15 kg bar (Eleiko / Rogue Bella)", 35], ["squat", "Squat bar", 55], ["ssb", "Safety squat bar", 65], ["trap", "Trap bar", 45], ["axle", "Axle", 25], ["tech", "Training bar", 15], ["ez", "EZ curl bar", 25]],
  kg: [["olympic", "Power bar", 20], ["eleiko", "Eleiko weightlifting bar", 20], ["womens", "15 kg bar (Eleiko / Rogue Bella)", 15], ["squat", "Squat bar", 25], ["ssb", "Safety squat bar", 30], ["trap", "Trap bar", 20], ["axle", "Axle", 11], ["tech", "Training bar", 7], ["ez", "EZ curl bar", 11]],
};
// The generic bars earlier versions started with. Any a client never changed are swapped for the gym's.
const OLD_BARS = {
  lb: { olympic: ["Olympic bar", 45], womens: ["Women’s bar", 35], trap: ["Trap bar", 60], ssb: ["Safety squat bar", 65], axle: ["Axle", 35], cambered: ["Cambered bar", 60], swiss: ["Swiss / football bar", 45], ez: ["EZ curl bar", 25], tech: ["Technique bar", 15] },
  kg: { olympic: ["Olympic bar", 20], womens: ["Women’s bar", 15], trap: ["Trap bar", 27], ssb: ["Safety squat bar", 30], axle: ["Axle", 15], cambered: ["Cambered bar", 27], swiss: ["Swiss / football bar", 20], ez: ["EZ curl bar", 10], tech: ["Technique bar", 7] },
};
function gymBars(bars, units) {
  const old = OLD_BARS[units], kept = bars.filter((b) => !(old[b.id] && old[b.id][0] === b.name && old[b.id][1] === b.w));
  const have = new Set(kept.map((b) => b.id));
  return [...defaultBars(units).filter((b) => !have.has(b.id)), ...kept].sort((a, b) => order(a) - order(b));
  function order(b) { const i = DEFAULT_BARS[units].findIndex((x) => x[0] === b.id); return i < 0 ? 99 : i; }
}
const defaultBars = (u) => DEFAULT_BARS[u].map(([id, name, w]) => ({ id, name, w }));
const DEFAULT_BAR_FOR = { trap_dl: "trap", skull: "ez", bb_curl: "ez" };
const SEED_ROUTINES = [
  { id: "push", name: "Push", items: ["bench", "incline_db", "db_shoulder", "cable_lateral", "pushdown", "oh_ext"] },
  { id: "pull", name: "Pull", items: ["deadlift", "lat_pulldown", "seated_row", "face_pull", "db_curl", "hammer"] },
  { id: "legs", name: "Legs", items: ["squat", "rdl", "leg_press", "leg_curl", "calf_raise", "plank"] },
];
const SET_TYPES = ["n", "w", "d", "f"]; // normal (working), warm-up, drop, failure
const SET_LABEL = { w: "W", d: "D", f: "F" };

/* ================= Helpers ================= */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (Math.round((+n || 0) * 100) / 100).toString();
const roundTo = (w, st) => (st > 0 ? Math.round(w / st) * st : w);
const mmss = (sec) => { sec = Math.max(0, Math.round(+sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`; };
function parseTime(v) {
  const s = String(v ?? "").trim(); if (!s) return 0;
  if (s.includes(":")) return s.split(":").map((x) => +x || 0).reduce((a, b) => a * 60 + b, 0);
  const n = Math.round(+s.replace(/[^0-9]/g, "")) || 0; // "130" -> 1:30, "90" -> 90s
  return n >= 100 ? Math.floor(n / 100) * 60 + (n % 100) : n;
}
const dateLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const uid = (p = "w") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "x";
const clone = (o) => JSON.parse(JSON.stringify(o));
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
// ?preview=1: a coach looking at a client's app from the dashboard. Nothing is saved or sent.
const PREVIEW = /[?&]preview=1\b/.test(location.search);
const lsSet = (k, v) => { if (PREVIEW) return true; try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const e1rm = (w, r) => (w > 0 && r > 0 && r <= 12 ? w * (1 + r / 30) : 0);

/* ================= State ================= */
function defaults(units = "lb") {
  return { v: 3, units, bar: units === "lb" ? 45 : 20, trapBar: units === "lb" ? 60 : 25, bars: defaultBars(units), barsV: 2, ex: {}, custom: {}, routines: [], next: null, maxes: {}, rm5: {}, exNotes: {}, restOk: 90, restFail: 180, restHeavy: 180, active: null };
}
function normalize(s) {
  const units = s && s.units === "kg" ? "kg" : "lb";
  const d = defaults(units);
  if (!s || typeof s !== "object") return d;
  s = clone(s);
  if (s.lifts && !s.ex) { // first 5×5-only version
    const out = { ...d, bar: s.bar ?? d.bar };
    for (const k of ["squat", "bench", "row", "ohp", "deadlift"]) if (s.lifts[k]) out.ex[k] = { weight: s.lifts[k].weight, fails: s.lifts[k].fails || 0 };
    return out;
  }
  const out = { ...d, ...s, v: 3 };
  out.ex = s.ex && typeof s.ex === "object" ? s.ex : {};
  out.custom = s.custom && typeof s.custom === "object" ? s.custom : {};
  out.routines = Array.isArray(s.routines) ? s.routines.filter((r) => r && r.id && Array.isArray(r.items)) : d.routines;
  out.maxes = s.maxes && typeof s.maxes === "object" ? s.maxes : {};
  out.rm5 = s.rm5 && typeof s.rm5 === "object" ? s.rm5 : {};
  out.exNotes = s.exNotes && typeof s.exNotes === "object" ? s.exNotes : {};
  if (!Array.isArray(s.bars) || !s.bars.length) { // older versions only had the Olympic bar and the trap bar
    out.bars = defaultBars(units);
    if (s.bar > 0) out.bars[0].w = s.bar;
    if (s.trapBar > 0) out.bars[2].w = s.trapBar;
  }
  if (s.barsV !== 2) { out.bars = gymBars(out.bars, units); out.barsV = 2; }
  if (!out.routines.find((r) => r.id === out.next)) out.next = out.routines[0]?.id || null;
  if (out.active && !Array.isArray(out.active.items)) out.active = null;
  if (out.active) for (const it of out.active.items) { // older versions stored sets as rep counts with one weight per exercise
    if (it.sets.some((x) => typeof x !== "object" || x === null)) {
      const target = (out.ex[it.ex] && out.ex[it.ex].repsMax) || (LIB[it.ex] && LIB[it.ex].repsMax) || 5;
      it.sets = it.sets.map((r) => ({ t: "n", w: it.weight ?? 0, r: typeof r === "number" ? r : target, done: typeof r === "number" }));
    }
    it.note = it.note || "";
  }
  return out;
}
const S = {
  state: null,
  workouts: [],
  days: {},
  ui: { view: "workout", confirm: null, summary: null, chartEx: null, openRoutine: null, openItem: null, picker: null, newEx: null, note: null, msg: "", openDay: null },
};

function load() {
  if (PREVIEW) { // what the dashboard handed over: the client's program (with maxes) and their logged workouts
    let pv = null; try { pv = JSON.parse(localStorage.getItem("ppc1.preview")); } catch {}
    S.state = normalize({ units: (pv && pv.units) || "lb", rm5: (pv && pv.rm5) || {} });
    S.workouts = (pv && pv.workouts) || []; S.days = {}; S.program = (pv && pv.program) || PPSample.program();
    S.previewName = (pv && pv.name) || "this client";
    document.body.insertAdjacentHTML("afterbegin", `<div class="preview-bar">Preview of <b>${esc(S.previewName)}</b>’s app. Try anything; nothing here is saved or sent. <button class="btn small" onclick="window.close()">Close</button></div>`);
    return;
  }
  S.state = normalize(lsGet("pp1.state"));
  S.workouts = lsGet("pp1.workouts") || [];
  S.days = lsGet("pp1.days") || {};
  S.program = lsGet("pp1.program") || PPSample.program(); // replaced by the coach's program after sign-in (pull)
}
let saveTimer = null, storageWarned = false;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { if (!lsSet("pp1.state", S.state)) warnStorage(); }, 150);
  stateChanged();
}
function saveWorkouts() { if (!lsSet("pp1.workouts", S.workouts)) warnStorage(); cloudSoon(); }
function saveDays() { if (!lsSet("pp1.days", S.days)) warnStorage(); stateChanged(); }
function warnStorage() { if (!storageWarned) { storageWarned = true; toast("Couldn’t save to this device. Make a backup in Setup and free some space."); } }
window.addEventListener("pagehide", () => { if (CL.leaving) return; clearTimeout(saveTimer); lsSet("pp1.state", S.state); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && S.state && !CL.leaving) { clearTimeout(saveTimer); lsSet("pp1.state", S.state); } });

/* ================= Exercises ================= */
function meta(id) { const px = S.program && S.program.exercises && S.program.exercises[id];
  if (LIB[id] && px) { const o = { ...LIB[id] }; for (const k of ["name", "muscle", "kind", "video", "guide"]) if (px[k]) o[k] = px[k]; return o; } // the gym's edits to one of its exercises
  return LIB[id] || (S.state.custom[id] ? { track: "wr", ...S.state.custom[id], id } : px ? { track: "wr", sets: 3, repsMin: 5, repsMax: 5, kind: "other", muscle: "Other", ...px, id } : null); }
function getEx(id) {
  const m = meta(id) || { id, name: id, kind: "machine", muscle: "Other", sets: 3, repsMin: 8, repsMax: 12, track: "wr" };
  const kd = KIND_DEFAULTS[S.state.units][m.kind] || KIND_DEFAULTS[S.state.units].machine;
  let inc = kd.inc;
  if (m.kind === "barbell" && LOWER_BARBELL.has(id)) inc = S.state.units === "lb" ? 10 : 5;
  const bar = barFor(id, m);
  const base = { weight: m.kind === "barbell" ? bar.w : kd.w, inc, sets: m.sets, repsMin: m.repsMin, repsMax: m.repsMax, fails: 0 };
  return { ...m, id, custom: !LIB[id], ...base, ...(S.state.ex[id] || {}), barWeight: bar.w, barId: bar.id, barName: bar.name };
}
function barFor(id, m) {
  const bars = S.state.bars, want = (S.state.ex[id] && S.state.ex[id].bar) || DEFAULT_BAR_FOR[id] || (m && m.barW ? "trap" : "olympic");
  return bars.find((b) => b.id === want) || bars[0] || { id: "olympic", name: "Bar", w: S.state.units === "lb" ? 45 : 20 };
}
function setEx(id, patch) { S.state.ex[id] = { ...(S.state.ex[id] || {}), ...patch }; }
function smallStep(kind) { const u = S.state.units; return kind === "dumbbell" ? (u === "lb" ? 5 : 2) : u === "lb" ? 5 : 2.5; }
function distUnit(e) { const lb = S.state.units === "lb"; return e.dist === "short" ? (lb ? "yd" : "m") : (lb ? "mi" : "km"); }
function schemeLabel(e) {
  if (e.track === "time") return `${e.sets}× time${e.better === "lower" ? " (faster is better)" : ""}`;
  if (e.track === "dt") return `${e.sets}× distance + time`;
  if (e.track === "wd") return `${e.sets}× carry`;
  return e.repsMin === e.repsMax ? `${e.sets}×${e.repsMax}` : `${e.sets}×${e.repsMin}–${e.repsMax}`;
}
function weightLabel(e, w) {
  const u = S.state.units;
  if (e.track !== "wr" && e.track !== "wd") return "";
  if (isBW(e.kind)) return w > 0 ? `${e.kind === "band" ? "Band" : "BW"} +${fmt(w)} ${u}` : e.kind === "band" ? "Band" : "Bodyweight";
  if (e.kind === "dumbbell") return `${fmt(w)} ${u} each`;
  return `${fmt(w)} ${u}`;
}
function allMetas() { return [...Object.values(LIB), ...Object.entries(S.state.custom).map(([id, m]) => ({ track: "wr", ...m, id }))]; }
function findEx(q) {
  if (!q) return null;
  const s = String(q).trim(), lo = s.toLowerCase();
  if (meta(s)) return s;
  const all = allMetas();
  return (all.find((m) => m.name.toLowerCase() === lo) || all.find((m) => m.name.toLowerCase().includes(lo)) || all.find((m) => lo.includes(m.name.toLowerCase())))?.id || null;
}
function addCustom(name, kind, muscle, track) {
  name = String(name).trim(); name = name.charAt(0).toUpperCase() + name.slice(1);
  let id = "c_" + slug(name), n = 2;
  while (meta(id)) id = "c_" + slug(name) + "_" + n++;
  const tr = TRACKS[track] ? track : (kind === "cardio" ? "dt" : "wr");
  S.state.custom[id] = { name: name.slice(0, 60), kind: KINDS.includes(kind) ? kind : "machine", muscle: MUSCLES.includes(muscle) ? muscle : "Other", sets: tr === "wr" || tr === "wd" ? 3 : 1, repsMin: tr === "wr" ? 8 : 0, repsMax: tr === "wr" ? 12 : 0, track: tr, ...(tr === "dt" ? { dist: "long", defD: 1, defS: 600 } : tr === "wd" ? { dist: "short", defD: 40 } : tr === "time" ? { better: "higher", defS: 60 } : {}) };
  return id;
}
const routine = (id) => S.state.routines.find((r) => r.id === id) || null;
const findRoutine = (q) => { const k = String(q || "").toLowerCase(); return S.state.routines.find((r) => r.id.toLowerCase() === k || r.name.toLowerCase() === k) || null; };
function nextRoutineAfter(id) { const rs = S.state.routines; const i = rs.findIndex((r) => r.id === id); return rs.length ? rs[(i + 1) % rs.length].id : null; }

/* ================= History helpers ================= */
// Normalizes logged exercises from all versions to { id, name, kind, muscle, track, repsMin, repsMax, note, sets:[{t,w,r,s,d}] }
function wEx(e) {
  const id = e.ex || e.lift; const m = meta(id) || {};
  const base = { id, name: e.name || m.name || id, kind: e.kind || m.kind || "machine", muscle: e.muscle || m.muscle || "Other", track: e.track || m.track || "wr", fields: e.fields || null, better: m.better, repsMin: e.repsMin ?? e.reps ?? 5, repsMax: e.repsMax ?? e.reps ?? 5, note: e.note || "" };
  const sets = (e.sets || []).map((x) => (typeof x === "number" ? { t: "n", w: e.weight || 0, r: x } : x)).filter(Boolean);
  return { ...base, sets };
}
const wName = (w) => w.name || (w.type ? `5×5 ${w.type}` : "Workout");
function lastSession(exId, before) {
  for (const w of S.workouts) { if (before && w.date >= before) continue; for (const raw of w.exercises || []) { const e = wEx(raw); if (e.id === exId) return { date: w.date, ...e }; } }
  return null;
}
function setText(e, x) {
  if (!x) return "–";
  if (e.fields) return e.fields.map((f) => f === "w" ? (x.w ? fmt(x.w) + " " + S.state.units : "") : f === "r" ? (x.r !== "" && x.r != null ? x.r + " reps" : "") : f === "s" ? (x.s ? mmss(x.s) : "") : f === "d" ? (x.d ? fmt(x.d) + " " + distUnit(e) : "") : f === "h" ? (x.h ? fmt(x.h) + " in" : "") : "").filter(Boolean).join(" · ") || "–";
  if (e.track === "time") return mmss(x.s);
  if (e.track === "dt") return `${fmt(x.d)} ${distUnit(e)} · ${mmss(x.s)}`;
  if (e.track === "wd") return `${fmt(x.w)}×${fmt(x.d)}${distUnit(e)}`;
  return isBW(e.kind) && !(x.w > 0) ? `${x.r} reps` : `${fmt(x.w)}×${x.r}`;
}
function bestOf(e, sets) { // a single comparable score per session, higher is better
  if (e.track === "wr") return Math.max(0, ...sets.filter((x) => x.t !== "w").map((x) => e1rm(x.w, x.r) || (isBW(e.kind) ? x.r : 0)));
  if (e.track === "time") return e.better === "lower" ? -Math.min(...sets.map((x) => x.s || 1e9)) : Math.max(0, ...sets.map((x) => x.s || 0));
  if (e.track === "dt") return Math.max(0, ...sets.map((x) => (x.s > 0 ? x.d / x.s : 0))); // speed
  if (e.track === "wd") return Math.max(0, ...sets.map((x) => (x.w || 0) * (x.d || 0)));
  return 0;
}
function records() {
  const out = {};
  const chron = [...S.workouts].reverse();
  for (const w of chron) for (const raw of w.exercises || []) {
    const e = wEx(raw); if (!e.sets.length) continue;
    const r = out[e.id] || (out[e.id] = { id: e.id, name: e.name, track: e.track, kind: e.kind, better: e.better, dist: (meta(e.id) || {}).dist });
    if (e.track === "wr") {
      for (const x of e.sets) { if (x.t === "w") continue; const v = e1rm(x.w, x.r); if (v > (r.e1 || 0)) { r.e1 = v; r.e1Set = x; r.e1Date = w.date; } if ((x.w || 0) > (r.heavy?.w || 0) || ((x.w || 0) === (r.heavy?.w || 0) && x.r > (r.heavy?.r || 0))) { r.heavy = x; r.heavyDate = w.date; } if (isBW(e.kind) && x.r > (r.reps || 0)) { r.reps = x.r; r.repsDate = w.date; } }
    } else {
      const b = bestOf(e, e.sets);
      if (r.score == null || b > r.score) { r.score = b; r.bestSets = e.sets; r.bestDate = w.date; }
    }
  }
  return out;
}
function recordText(r) {
  const u = S.state.units, e = { track: r.track, kind: r.kind, dist: r.dist };
  if (r.track === "wr") return r.e1 ? `${fmt(Math.round(r.e1))} ${u} est. 1RM · best set ${setText(e, r.e1Set)}` : r.reps ? `${r.reps} reps` : "–";
  if (r.track === "time") return mmss(Math.abs(r.score));
  if (r.track === "dt") { const best = r.bestSets.reduce((a, x) => (x.s > 0 && x.d / x.s > (a ? a.d / a.s : 0) ? x : a), null); return best ? setText(e, best) : "–"; }
  if (r.track === "wd") { const best = r.bestSets.reduce((a, x) => ((x.w || 0) * (x.d || 0) > (a ? a.w * a.d : 0) ? x : a), null); return best ? setText(e, best) : "–"; }
  return "–";
}

/* ================= Workout logic ================= */
function newSet(exId, t, from) {
  const e = getEx(exId), last = from || null;
  const tr = e.track;
  if (tr === "time") return { t, s: last?.s || e.defS || 60, done: false };
  if (tr === "dt") return { t, d: last?.d ?? e.defD ?? 1, s: last?.s || e.defS || 600, done: false };
  if (tr === "wd") return { t, w: last?.w ?? e.weight, d: last?.d ?? e.defD ?? 40, done: false };
  return { t, w: last?.w ?? e.weight, r: last?.r ?? e.repsMax, done: false };
}
function activeEntry(id) {
  const e = getEx(id), prev = lastSession(id);
  const prevWork = prev ? prev.sets.filter((x) => x.t !== "w") : [];
  const sets = [];
  for (let i = 0; i < e.sets; i++) {
    if (e.track === "wr") sets.push(newSet(id, "n"));
    else sets.push(newSet(id, "n", prevWork[i] || prevWork[prevWork.length - 1]));
  }
  return { ex: id, note: "", sets };
}
function startWorkout(rid) {
  const r = rid ? routine(rid) : null;
  S.state.active = { routine: r ? r.id : null, name: r ? r.name : "Freestyle", startedAt: new Date().toISOString(), note: "", restEndsAt: null, items: r ? r.items.filter((id) => meta(id)).map(activeEntry) : [] };
  S.ui.summary = null;
  saveState(); render(); window.scrollTo(0, 0);
}
// Warm-up sets for one lift, from the coach's plan for it (or the gym default) up to the heaviest working weight.
function warmupSets(it) {
  const e = getEx(it.ex), ws = it.sets.filter((x) => x.t === "n" && +x.w > 0).map((x) => +x.w);
  const W = ws.length ? Math.max(...ws) : +e.weight || 0, pr = program();
  return PP.warmupPlan({ work: W, bar: e.barWeight || 0, max: maxFor(it.ex), step: smallStep(e.kind), def: pr && pr.warmupDefault, custom: it.rx && it.rx.warmup })
    .map(({ w, r }) => ({ t: "w", w, r, done: false }));
}
function finishWorkout() {
  const a = S.state.active; if (!a) return;
  const recBefore = records();
  const results = [];
  for (const it of a.items) {
    const e = getEx(it.ex);
    const done = it.sets.filter((x) => x.done);
    if (!done.length) { results.push({ ex: it.ex, name: e.name, skipped: true }); continue; }
    if (e.track !== "wr" || a.prog) { results.push({ ex: it.ex, name: e.name, track: e.track, sets: done, rx: it.rx }); continue; }
    const working = it.sets.filter((x) => x.t === "n" || x.t === "f");
    const doneWork = working.filter((x) => x.done);
    if (!doneWork.length) { results.push({ ex: it.ex, name: e.name, track: "wr", sets: done, outcome: "warmup" }); continue; }
    const topW = Math.max(...doneWork.map((x) => x.w || 0));
    const allTop = working.every((x) => x.done && x.r >= e.repsMax && (x.w || 0) >= topW);
    const anyMiss = working.some((x) => !x.done || x.r < e.repsMin);
    let outcome, next = topW, fails = e.fails || 0;
    if (allTop) { next = e.inc > 0 ? topW + e.inc : topW; fails = 0; outcome = e.inc > 0 ? "up" : "top"; }
    else if (anyMiss) {
      fails += 1;
      if (fails >= 3 && topW > 0) { next = Math.max(e.kind === "barbell" ? e.barWeight : 0, roundTo(topW * 0.9, smallStep(e.kind))); fails = 0; outcome = "deload"; }
      else outcome = "repeat";
    } else { fails = 0; outcome = "build"; }
    setEx(it.ex, { weight: next, fails });
    results.push({ ex: it.ex, name: e.name, kind: e.kind, track: "wr", sets: done, outcome, next, repsMax: e.repsMax });
  }
  const minutes = Math.round((Date.now() - Date.parse(a.startedAt)) / 60000);
  const w = {
    id: uid(), v: 3, date: a.startedAt, name: a.name, routine: a.routine, prog: a.prog || null, minutes, units: S.state.units, note: a.note || "",
    exercises: a.items.filter((it) => it.sets.some((x) => x.done)).map((it) => {
      const e = getEx(it.ex);
      return { ex: it.ex, name: e.name, kind: e.kind, muscle: e.muscle, track: e.track, repsMin: e.repsMin, repsMax: e.repsMax, rx: it.rx || null, group: it.group || null, fields: it.fields || null, note: it.note || "", sets: it.sets.filter((x) => x.done).map(({ done, ...x }) => x) };
    }),
  };
  // A new 5-rep max is saved straight away. The target max it suggests (5RM ÷ 0.83, rounded up) waits for the coach.
  const u = S.state.units, newMaxes = [];
  for (const ex of w.exercises) {
    if (ex.track !== "wr") continue;
    const fives = ex.sets.filter((x) => x.t !== "w" && +x.r === 5 && x.w > 0); if (!fives.length) continue;
    const top = Math.max(...fives.map((x) => +x.w)), prev = known5RM(ex.ex), cur = maxFor(ex.ex);
    if (!(prev || coachMax(ex.ex) || S.state.maxes[ex.ex])) continue; // only lifts that have a max on file
    const est = PP.est1RM(top, u);
    if (top > prev && (prev || est > cur)) { S.state.rm5[ex.ex] = top; newMaxes.push({ ex: ex.ex, name: ex.name, rm5: top, prev, suggested: est, current: cur, coach: !!coachMax(ex.ex) }); }
  }
  w.maxes = newMaxes;
  w.volume = Math.round(w.exercises.reduce((n, ex) => n + ex.sets.filter((x) => x.t !== "w").reduce((m, x) => m + (+x.w || 0) * (+x.r || 0), 0), 0));
  if (w.exercises.length) { S.workouts = [w, ...S.workouts].sort((x, y) => (x.date < y.date ? 1 : -1)); saveWorkouts(); }
  const recAfter = records(); const prs = [];
  for (const ex of w.exercises) {
    const b = recBefore[ex.ex], af = recAfter[ex.ex]; if (!af || !b) continue; // first session isn't a "record"
    if (af.track === "wr" ? (af.e1 || 0) > (b.e1 || 0) + 0.01 || (af.reps || 0) > (b.reps || 0) : (af.score ?? -1e12) > (b.score ?? -1e12) + 1e-9) prs.push(`${ex.name}: ${recordText(af)}`);
  }
  if (prs.length && w.exercises.length) { w.prs = prs; saveWorkouts(); }
  if (a.routine) S.state.next = nextRoutineAfter(a.routine);
  S.state.active = null;
  S.ui.summary = { wid: w.exercises.length ? w.id : null, name: a.name, minutes, results, prs, coach: !!a.prog, volume: w.volume, sets: w.exercises.reduce((n, ex) => n + ex.sets.filter((x) => x.t !== "w").length, 0), maxes: newMaxes, confetti: true };
  S.ui.confirm = null;
  releaseWake(); saveState(); render(); window.scrollTo(0, 0);
}

/* ================= Demo videos ================= */
// The gym's YouTube tutorials (youtube.com/@powerplantgym), by exercise. A program item can also carry its own `video` link, which wins.
const GYM_VIDEOS = window.PPVideos || {}; // shared/videos.js
function ytId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function videoLinkFor(id) {
  const pr = program();
  if (pr && Array.isArray(pr.weeks)) for (const w of pr.weeks) for (const d of w.days) for (const it of d.items) if (it.ex === id && ytId(it.video)) return it.video;
  const px = S.program && S.program.exercises && S.program.exercises[id];
  return (px && px.video) || GYM_VIDEOS[id] || null;
}
function videoFor(id) { return ytId(videoLinkFor(id)); }
const isShort = (url) => /youtube\.com\/shorts\//.test(String(url || ""));

/* ================= Coach program ================= */
// A program as the coach writes it:
// { id, name, coach, sample?, weeks: [{ note, days: [{ name, note, items: [{ ex, sets, reps, repsMax, time, dist, load: { t: "lb"|"pct"|"rpe"|"none", v }, rest, note, group }] }] }] }
// Consecutive items with the same `group` letter are a superset (2) or circuit (3+): no rest between them, `rest` on the last one runs after each round.
function sampleProgram() {
  const W = [[75, 7], [77.5, 7.5], [80, 8], [70, 6]];
  return { id: "sample-1", sample: true, name: "Strength Foundations", coach: "your coach", weeks: W.map(([p, r], wi) => ({
    note: wi === 0 ? "Learn the movements and find your working weights. Leave 2–3 reps in the tank." : wi === 3 ? "Deload week: lighter weights, crisp reps." : wi === 2 ? "Heaviest week. Rest fully between sets." : "",
    days: [
      { name: "Lower", note: "Brace hard before every squat rep.", items: [
        { ex: "squat", sets: 4, reps: 6, load: { t: "pct", v: p }, rest: 150, note: "Pause 1 second at the bottom of the last set." },
        { ex: "rdl", sets: 3, reps: 8, load: { t: "rpe", v: r }, rest: 120 },
        { ex: "lunge", sets: 3, reps: 10, load: { t: "rpe", v: r }, rest: 90, note: "10 steps per leg." },
        { ex: "plank", sets: 3, time: 45, load: { t: "none" }, rest: 60 } ] },
      { name: "Upper", note: "", items: [
        { ex: "bench", sets: 4, reps: 6, load: { t: "pct", v: p }, rest: 150 },
        { ex: "row", sets: 4, reps: 8, load: { t: "rpe", v: r }, rest: 120, note: "Flat back, pull to your belly button." },
        { ex: "db_shoulder", sets: 3, reps: 10, load: { t: "rpe", v: r }, group: "A" },
        { ex: "face_pull", sets: 3, reps: 15, load: { t: "rpe", v: 7 }, rest: 90, group: "A" } ] },
      { name: "Full body", note: "Keep the pace up: shorter rests today.", items: [
        { ex: "trap_dl", sets: 4, reps: 5, load: { t: "rpe", v: r }, rest: 120 },
        { ex: "incline_db", sets: 3, reps: 10, load: { t: "rpe", v: r }, group: "C" },
        { ex: "lat_pulldown", sets: 3, reps: 10, load: { t: "rpe", v: r }, group: "C" },
        { ex: "farmer", sets: 3, dist: 40, load: { t: "lb", v: 50 }, rest: 90, group: "C", note: "50 lb per hand." } ] },
    ] })) };
}
let _rawProg = null, _compiled = null;
function program() { // the program as the client runs it, week by week
  if (S.program !== _rawProg) { _rawProg = S.program; _compiled = S.program && S.program.v === 2 ? window.PPProgram.compile(S.program) : S.program; }
  return _compiled;
}
const TRACKF = { wr: ["w", "r"], time: ["s"], dt: ["d", "s"], wd: ["w", "d"] };
const gkey = (x) => x && (x.group || (x.rx && x.rx.group)) || null;
function groupInfo(items, i) {
  const gid = gkey(items[i]); if (!gid) return null;
  let a0 = i; while (a0 > 0 && gkey(items[a0 - 1]) === gid) a0--;
  let a1 = i; while (a1 < items.length - 1 && gkey(items[a1 + 1]) === gid) a1++;
  if (a0 === a1) return null; // one exercise on its own isn't a group
  return { letter: gid, idx: i - a0 + 1, size: a1 - a0 + 1, last: i === a1, start: a0, end: a1 };
}
function groupRest(items, g) { for (let j = g.end; j >= g.start; j--) { const x = items[j]; const r = x.rx ? x.rx.rest : x.rest; if (r) return r; } return 0; }
function groupHeader(items, g) {
  const r = groupRest(items, g);
  return `<div class="group-hd">${g.size >= 3 ? "Circuit" : "Superset"} ${esc(g.letter)} · ${g.size} exercises back to back${r ? ` · rest ${mmss(r)} after each round` : ""}</div>`;
}
function rxListHTML(items, withInfo) {
  return items.map((it, i) => {
    const g = groupInfo(items, i), name = esc(getEx(it.ex).name);
    const nm = withInfo ? `<button class="ex-name-btn" data-act="info" data-id="${esc(it.ex)}"><span class="n">${name}</span><span class="info-btn" aria-hidden="true">i</span></button>` : `<span class="n">${name}</span>`;
    return (g && g.idx === 1 ? groupHeader(items, g) : "") + `<div class="rx${g ? " grouped" : ""}">${g ? `<span class="glabel">${esc(g.letter)}${g.idx}</span>` : ""}${nm}<span class="s num">${PP.richText(rxText(it, !!g))}</span>${it.note ? `<span class="rx-note">${PP.richText(it.note)}</span>` : ""}</div>`;
  }).join("");
}
const dayKey = (w, d) => `${w}-${d}`;
function programDone(pr) {
  const out = {};
  for (const w of S.workouts) if (w.prog && pr && w.prog.id === pr.id) {
    let d = w.prog.d; if (w.prog.did && pr.weeks[w.prog.w]) { const i = pr.weeks[w.prog.w].days.findIndex((x) => x.id === w.prog.did); if (i >= 0) d = i; else continue; }
    const k = dayKey(w.prog.w, d); if (!out[k] || out[k] < w.date) out[k] = w.date; }
  return out;
}
// Next workout: for a dated program, today's or the next upcoming one (missed days are listed separately); otherwise the first not done.
function nextDay(pr) {
  if (!pr) return null; const done = programDone(pr), today = todayISO();
  let first = null;
  for (let w = 0; w < pr.weeks.length; w++) for (let d = 0; d < pr.weeks[w].days.length; d++) {
    if (done[dayKey(w, d)]) continue;
    const dt = pr.weeks[w].days[d].date;
    if (!first) first = { w, d };
    if (!dt || dt >= today) return { w, d };
  }
  return first;
}
function missedDays(pr) {
  if (!pr) return []; const done = programDone(pr), today = todayISO(), out = [];
  pr.weeks.forEach((wk, w) => wk.days.forEach((day, d) => { if (day.date && day.date < today && !done[dayKey(w, d)]) out.push({ w, d, day }); }));
  return out;
}
// The max that percentages use: the coach's target max for this lift, then the client's own, then their 5RM ÷ 0.83, then logged history.
const coachMax = (id) => (S.program && S.program.maxes && S.program.maxes[id]) || null;
function maxFor(id) {
  const u = S.state.units, c = PP.targetOf(coachMax(id), u); if (c > 0) return c;
  const m = S.state.maxes[id]; if (m > 0) return m;
  const e = PP.est1RM(S.state.rm5[id], u); if (e > 0) return e;
  const r = records()[id]; return r && r.e1 ? PP.ceilTo(r.e1, PP.roundStep(u)) : 0;
}
const known5RM = (id) => S.state.rm5[id] || (coachMax(id) && coachMax(id).rm5) || 0;
function rxLoadWeight(it) {
  const e = getEx(it.ex), L = it.load || { t: "none" };
  if (L.t === "lb") return L.v;
  if (L.t === "pct") { const m = maxFor(it.ex); if (m) return Math.max(e.kind === "barbell" ? e.barWeight : 0, PP.pctOf(m, L.v, S.state.units)); }
  const prev = lastSession(it.ex); const top = prev ? Math.max(0, ...prev.sets.filter((x) => x.t !== "w").map((x) => x.w || 0)) : 0;
  return top || e.weight;
}
function pctWeight(id, pct) { const e = getEx(id), m = maxFor(id); return m ? Math.max(e.kind === "barbell" ? e.barWeight : 0, PP.pctOf(m, pct, S.state.units)) : 0; }
function lastTopWeight(id) { const prev = lastSession(id); return prev ? Math.max(0, ...prev.sets.filter((x) => x.t !== "w").map((x) => x.w || 0)) : 0; }
function groupWeight(id, load) {
  if (!load) return lastTopWeight(id) || getEx(id).weight;
  if (load.t === "lb" || load.t === "kg") return load.v;
  if (load.t === "pct") return pctWeight(id, load.v) || lastTopWeight(id) || getEx(id).weight;
  if (load.t === "bw" || load.t === "top") return 0; // back-offs fill in once today's top set is logged
  return lastTopWeight(id) || getEx(id).weight;
}
function rxText(it, grouped) {
  if (it.groups) {
    const u = S.state.units;
    if (it.text) { // the coach's own words, plus the weights worked out from any percentages in them
      const hints = it.groups.filter((g) => g.load && g.load.t === "pct").map((g) => { const w = pctWeight(it.ex, g.load.v), w2 = g.load.vMax ? pctWeight(it.ex, g.load.vMax) : 0; return w ? `${g.load.v}${g.load.vMax ? "–" + g.load.vMax : ""}% ≈ ${fmt(w)}${w2 ? "–" + fmt(w2) : ""} ${u}` : ""; }).filter(Boolean);
      return [it.text, hints.length ? `(${hints.join(", ")})` : "", it.format ? PP.formatText(it.format) : "", it.rest && !grouped ? `rest ${mmss(it.rest)}` : ""].filter(Boolean).join(" · ");
    }
    const parts = it.groups.map((g) => { let t = window.PPProgram.groupText(g); if (g.load && g.load.t === "pct") { const w = pctWeight(it.ex, g.load.v), w2 = g.load.vMax ? pctWeight(it.ex, g.load.vMax) : 0; if (w) t += ` ≈ ${fmt(w)}${w2 ? "–" + fmt(w2) : ""} ${u}`; } return t; });
    if (it.tempo) parts.push(`tempo ${it.tempo}`); if (it.pause) parts.push(`pause ${it.pause}`);
    if (it.format) parts.push(window.PPProgram.formatText(it.format));
    if (it.rest && !grouped) parts.push(`rest ${mmss(it.rest)}`);
    return parts.join(" · ");
  }
  const e = getEx(it.ex), u = S.state.units, L = it.load || { t: "none" };
  let base = it.time ? `${it.sets} × ${mmss(it.time)}` : it.dist ? `${it.sets} × ${fmt(it.dist)} ${distUnit(e)}` : `${it.sets} × ${it.reps}${it.repsMax && it.repsMax !== it.reps ? "–" + it.repsMax : ""}`;
  let load = "";
  const hi = L.vMax ? "–" + fmt(L.vMax) : "";
  if (L.t === "lb") load = `${fmt(L.v)}${hi} ${u}${e.kind === "dumbbell" ? " each" : ""}`;
  else if (L.t === "pct") { const m = maxFor(it.ex), w2 = L.vMax && m ? pctWeight(it.ex, L.vMax) : 0; load = `${fmt(L.v)}${hi}% of max${m ? ` ≈ ${fmt(rxLoadWeight(it))}${w2 ? "–" + fmt(w2) : ""} ${u}` : ""}`; }
  else if (L.t === "rpe") load = `RPE ${fmt(L.v)}${hi}`;
  return [base, load, it.rest && !grouped ? `rest ${mmss(it.rest)}` : ""].filter(Boolean).join(" · ");
}
function rxEntry(it) {
  if (it.groups) {
    const e = getEx(it.ex), fields = it.fields || TRACKF[e.track] || ["w", "r"], sets = [];
    const groups = it.groups.length ? it.groups : [{ sets: +((it.text || "").match(/^\s*(\d+)\s*[x×]/i) || [])[1] || 1 }]; // written-out cells: one row per set we can count, else one
    for (const g of groups) for (let i = 0; i < g.sets; i++) {
      const x = { t: g.amrap ? "f" : "n", done: false };
      if (g.load && g.load.t === "top") x.top = g.load.v;
      if (fields.includes("w")) x.w = g.build ? (lastTopWeight(it.ex) || "") : groupWeight(it.ex, g.load);
      if (fields.includes("r")) { if (g.reps && g.repsMax) { x.r = ""; x.rr = `${g.reps}–${g.repsMax}`; } else x.r = g.reps || (g.amrap ? "" : g.repsMax || e.repsMax); }
      if (fields.includes("s")) x.s = g.time || 0;
      if (fields.includes("d")) x.d = g.dist ?? 0;
      if (fields.includes("h")) x.h = 0;
      sets.push(x);
    }
    const entry = { ex: it.ex, note: "", rx: it, group: it.group || null, fields, sets };
    if (entry.sets.some((x) => x.top)) for (const x of entry.sets) if (x.top) x.w = "";
    if ((it.warmupSets || (it.warmup && !/^\s*(none|no|off|skip)\s*$/i.test(it.warmup))) && fields.includes("w")) entry.sets.unshift(...warmupSets(entry));
    return entry;
  }
  const e = getEx(it.ex), w = rxLoadWeight(it), sets = [];
  for (let i = 0; i < (it.sets || 1); i++) {
    if (e.track === "time") sets.push({ t: "n", s: it.time || e.defS || 60, done: false });
    else if (e.track === "dt") sets.push({ t: "n", d: it.dist ?? e.defD ?? 1, s: e.defS || 600, done: false });
    else if (e.track === "wd") sets.push({ t: "n", w, d: it.dist ?? e.defD ?? 40, done: false });
    else sets.push({ t: "n", w, r: it.reps || e.repsMax, done: false });
  }
  return { ex: it.ex, note: "", rx: it, group: it.group || null, sets };
}
// Back-off sets written as "% of today's top" follow the heaviest working set logged so far in that exercise.
function fillBackoffs(it) {
  if (!it || !it.sets.some((x) => x.top)) return [];
  const top = Math.max(0, ...it.sets.filter((x) => !x.top && x.t !== "w" && x.w > 0).map((x) => +x.w));
  const changed = [];
  it.sets.forEach((x, j) => { if (!x.top || x.done || x.own) return; const w = top ? PP.pctOf(top, x.top, S.state.units) : ""; if (w !== x.w) { x.w = w; changed.push(j); } });
  return changed;
}
const daySig = (day) => JSON.stringify([day.items, day.note || "", day.warmup || "", day.cooldown || ""]);
// The program day an in-progress workout came from, as the coach has it now (null if it's gone).
function activeDayNow(a) {
  const pr = program(); if (!a || !a.prog || !pr || pr.id !== a.prog.id || !pr.weeks[a.prog.w]) return null;
  const days = pr.weeks[a.prog.w].days; return (a.prog.did ? days.find((x) => x.id === a.prog.did) : days[a.prog.d]) || null;
}
// Bring a started workout up to the coach's latest version. Exercises with sets already ticked keep what was logged.
function refreshActive() {
  const a = S.state.active, day = activeDayNow(a); if (!day) return false;
  const used = new Set();
  a.items = day.items.map((it) => { const k = a.items.findIndex((o, j) => !used.has(j) && o.ex === it.ex && o.sets.some((x) => x.done)); if (k >= 0) { used.add(k); return a.items[k]; } return rxEntry(it); });
  a.coachNote = day.note || ""; a.warmup = day.warmup || ""; a.cooldown = day.cooldown || ""; a.sig = daySig(day);
  saveState(); return true;
}
function startCoachDay(w, d) {
  const pr = program(); const day = pr && pr.weeks[w] && pr.weeks[w].days[d]; if (!day) return;
  S.state.active = { sig: daySig(day), routine: null, prog: { id: pr.id, w, d, did: day.id || null }, name: `Week ${w + 1} · ${day.name}`, coachNote: day.note || "", warmup: day.warmup || "", cooldown: day.cooldown || "", startedAt: new Date().toISOString(), note: "", restEndsAt: null, items: day.items.map(rxEntry) };
  S.ui.summary = null; saveState(); location.hash = "#workout"; render(); window.scrollTo(0, 0);
}
function missingMaxes(day) { return [...new Set(day.items.filter((it) => ((it.load && it.load.t === "pct") || (it.groups || []).some((g) => g.load && g.load.t === "pct")) && !maxFor(it.ex)).map((it) => it.ex))]; }

/* ================= Rest timer ================= */
let beeped = false, wake = null, audioCtx = null;
async function requestWake() { try { if (!wake && navigator.wakeLock) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); } } catch {} }
function releaseWake() { try { wake?.release(); } catch {} wake = null; }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.state.active) requestWake(); });
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.18);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch {}
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
}
function startRest(kind, e, rxRest) {
  const a = S.state.active; if (!a) return;
  const heavy = e && e.kind === "barbell" && e.repsMax <= 6;
  const secs = kind === "warm" ? 60 : rxRest ? rxRest : kind === "fail" ? S.state.restFail : heavy ? S.state.restHeavy : S.state.restOk;
  a.restEndsAt = new Date(Date.now() + secs * 1000).toISOString(); a.restFailed = kind === "fail"; beeped = false;
  requestWake();
}
function syncRest() {
  const el = $("#rest"); const a = S.state.active;
  if (!a || !a.restEndsAt) { el.hidden = true; return; }
  const left = (Date.parse(a.restEndsAt) - Date.now()) / 1000, over = left <= 0;
  if (over && !beeped) { beeped = true; beep(); }
  const msg = over ? "Rest is up. Next set." : a.restFailed ? "Below your rep range. Take a longer rest." : "Rest, then go again.";
  el.hidden = false;
  el.innerHTML = `<div class="rest-card${over ? " over" : ""}" role="timer"><span class="t num">${over ? "+" + mmss(-left) : mmss(left)}</span><span class="msg">${msg}</span><button data-act="rest-sub" aria-label="15 seconds less">−15s</button><button data-act="rest-add" aria-label="30 seconds more">+30s</button><button data-act="rest-skip">Dismiss</button></div>`;
}
setInterval(() => { syncRest(); const el = $("#elapsed"); if (el && S.state.active) el.textContent = mmss((Date.now() - Date.parse(S.state.active.startedAt)) / 1000); }, 1000);

/* ================= Rendering: shared ================= */
function header(eyebrow, title, right = "") { return `<div class="topline"><div style="min-width:0"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div>${right}</div>`; }
let toastTimer = null;
function toast(text, action) {
  const el = $("#toast"); clearTimeout(toastTimer);
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button data-act="${action.act}">${esc(action.label)}</button>` : ""}`;
  el.hidden = false;
  if (!action || !action.sticky) toastTimer = setTimeout(() => (el.hidden = true), action ? 8000 : 3500);
}
function platesHTML(e, weight) {
  const u = S.state.units, bar = e.barWeight;
  if (weight < bar) return `<div class="plates">Lighter than the ${fmt(bar)} ${u} bar.</div>`;
  let rem = (weight - bar) / 2; const out = [];
  for (const [w, color, h] of PLATES[u]) while (rem + 1e-6 >= w) { out.push({ w, color, h }); rem -= w; }
  rem = Math.round(rem * 100) / 100;
  const viz = out.map((p) => `<span class="p" style="width:${Math.max(6, Math.round(p.h / 3.2))}px;height:${p.h}px;background:var(${p.color})"></span>`).join("");
  return `<div class="plates"><span class="bar-viz" aria-hidden="true"><span class="sleeve"></span>${viz}</span><span>${out.length ? out.map((p) => fmt(p.w)).join(" + ") + " per side" : "Empty bar"}${rem > 0 ? ` (+${fmt(rem)} ${u} unmatched)` : ""}</span></div>`;
}
function routinePreview(r) {
  const rows = r.items.filter((id) => meta(id)).map((id) => { const e = getEx(id); return `<span class="n">${esc(e.name)}</span><span class="s">${esc(schemeLabel(e).replace(" (faster is better)", ""))}</span><span class="w num">${esc(weightLabel(e, e.weight))}</span>`; }).join("");
  return rows ? `<div class="preview">${rows}</div>` : `<div class="empty">This routine has no exercises yet. Add some in Plan.</div>`;
}

/* ================= Train tab ================= */
function setRowHTML(ei, si, it, e, x, prev, workIdx, fields, lab) {
  const tyLabel = lab ? lab + (x.t === "n" ? "" : SET_LABEL[x.t]) : x.t === "n" ? workIdx : SET_LABEL[x.t];
  const cols = fields ? fields.length : e.track === "time" ? 1 : 2;
  const miss = x.done && e.track === "wr" && x.t !== "w" && x.r < e.repsMin;
  const inp = (f, val, attrs) => `<input data-f="${f}" data-e="${ei}" data-s="${si}" value="${esc(val)}" ${attrs}>`;
  let cells = "";
  if (fields) cells = fields.map((f) => f === "w" ? (isBW(e.kind) ? inp("w", x.w > 0 ? fmt(x.w) : "", `inputmode="decimal" placeholder="+0" aria-label="Added weight"`) : inp("w", x.w ? fmt(x.w) : "", `inputmode="decimal" placeholder="${x.top ? x.top + "%" : S.state.units}" aria-label="Weight"`))
      : f === "r" ? inp("r", x.r ?? "", `inputmode="numeric" placeholder="${x.rr ? x.rr : x.t === "f" ? "max" : "reps"}" aria-label="Reps${x.rr ? ", target " + x.rr : ""}"`)
      : f === "s" ? inp("s", x.s ? mmss(x.s) : "", `inputmode="numeric" placeholder="m:ss" aria-label="Time, minutes:seconds"`)
      : f === "d" ? inp("d", x.d ? fmt(x.d) : "", `inputmode="decimal" placeholder="dist" aria-label="Distance"`)
      : inp("h", x.h ? fmt(x.h) : "", `inputmode="decimal" placeholder="in" aria-label="Height in inches"`)).join("");
  else if (e.track === "wr") cells = (isBW(e.kind) ? inp("w", x.w > 0 ? fmt(x.w) : "", `inputmode="decimal" placeholder="+0" aria-label="Added weight"`) : inp("w", fmt(x.w), `inputmode="decimal" aria-label="Weight"`)) + inp("r", x.r ?? "", `inputmode="numeric" aria-label="Reps"`);
  else if (e.track === "time") cells = inp("s", mmss(x.s), `inputmode="numeric" aria-label="Time, minutes:seconds"`);
  else if (e.track === "dt") cells = inp("d", fmt(x.d), `inputmode="decimal" aria-label="Distance in ${distUnit(e)}"`) + inp("s", mmss(x.s), `inputmode="numeric" aria-label="Time"`);
  else if (e.track === "wd") cells = inp("w", fmt(x.w), `inputmode="decimal" aria-label="Weight"`) + inp("d", fmt(x.d), `inputmode="decimal" aria-label="Distance in ${distUnit(e)}"`);
  return `<div class="setrow${x.done ? " done" : ""}${miss ? " miss" : ""}${x.top ? " backoff" : ""}" style="--cols:${cols}">
    <button class="ty ${x.t}" data-act="set-type" data-e="${ei}" data-s="${si}" aria-label="Set type: ${{ n: "working", w: "warm-up", d: "drop set", f: "to failure" }[x.t]}. Tap to change.">${tyLabel}</button>
    <span class="prev" title="${lab ? esc(e.name) + " · last time" : "Last time"}">${lab ? `<b class="rn">${esc(e.name)}</b>` : ""}${esc(prev ? setText(fields ? { ...e, fields } : e, prev) : lab ? "" : "–")}</span>
    ${cells}
    <button class="ck" data-act="set-done" data-e="${ei}" data-s="${si}" aria-label="${x.done ? "Mark not done" : "Mark done"}" aria-pressed="${!!x.done}">✓</button>
  </div>`;
}
function renderWorkout() {
  const st = S.state;
  if (S.ui.summary) return renderSummary();
  const a = st.active;
  // The coach changed this day after it was started: update it if nothing's logged yet, otherwise offer to.
  let coachChanged = false;
  if (a && a.prog) { const day = activeDayNow(a); if (day && a.sig && daySig(day) !== a.sig) { if (a.items.some((it) => it.sets.some((x) => x.done))) coachChanged = true; else refreshActive(); } else if (day && !a.sig) { a.sig = daySig(day); } }
  if (!a) {
    const pr = program(), nd = nextDay(pr);
    let coachPanel = "";
    const missed = missedDays(pr).filter((m) => !(nd && m.w === nd.w && m.d === nd.d));
    const missedPanel = missed.length ? `<section class="panel missed"><div class="row"><h2 class="grow">Missed workouts</h2><span class="pill bad">${missed.length}</span></div><span class="sub">Still here whenever you can fit them in. Do them in any order.</span>
      ${missed.slice(-6).reverse().map((m) => `<div class="mrow"><span class="grow"><b>${esc(m.day.name)}</b><br><span class="sub">Week ${m.w + 1} · ${dateLabel(m.day.date + "T12:00:00")}</span></span><button class="btn small" data-act="start-day" data-w="${m.w}" data-d="${m.d}">Start</button></div>`).join("")}
      ${missed.length > 6 ? `<a href="#program" class="sub">See all ${missed.length} in Program</a>` : ""}</section>` : "";
    if (pr && nd) {
      const day = pr.weeks[nd.w].days[nd.d], wk = pr.weeks[nd.w], miss = missingMaxes(day);
      coachPanel = `<section class="panel coach-day">
        <div class="row"><div class="grow"><div class="eyebrow">From ${esc(pr.coach)} · Week ${nd.w + 1} of ${pr.weeks.length}</div><h2>${esc(day.name)}</h2></div>${pr.sample ? '<span class="pill">Sample</span>' : ""}</div>
        ${wk.note && nd.d === 0 ? `<div class="coach-note">${PP.richText(wk.note)}</div>` : ""}
        ${day.date ? `<span class="pill">${day.date === todayISO() ? "Scheduled today" : "Scheduled " + dateLabel(day.date + "T12:00:00")}</span>` : ""}
        ${day.note ? `<div class="coach-note">${PP.richText(day.note)}</div>` : ""}${day.warmup ? `<div class="coach-note"><b>Warm-up:</b> ${PP.richText(day.warmup)}</div>` : ""}
        <div class="rx-list">${rxListHTML(day.items, false)}</div>${day.cooldown ? `<div class="coach-note"><b>Cool-down:</b> ${PP.richText(day.cooldown)}</div>` : ""}
        ${miss.length ? `<div class="msg action" style="align-self:stretch"><span>Some loads are a % of your max. Add your max for ${miss.map((id) => esc(getEx(id).name)).join(", ")} in <a href="#setup">Profile</a>, or pick a weight as you go.</span></div>` : ""}
        <button class="btn primary" data-act="start-day" data-w="${nd.w}" data-d="${nd.d}">Start ${esc(day.name)}</button>
        <a class="btn ghost" href="#program" style="text-decoration:none">See the full program</a>
      </section>`;
    } else if (pr && missed.length) coachPanel = "";
    else if (pr) coachPanel = `<section class="panel"><h2>Program complete</h2><span class="sub">You finished ${esc(pr.name)}. Your coach will send your next program.</span></section>`;
    else coachPanel = `<section class="panel"><h2>No program yet</h2><span class="sub">When your coach assigns you a program, your next workout shows up here.</span></section>`;
    const sel = routine(S.ui.pickRoutine) || routine(st.next) || st.routines[0];
    const chips = st.routines.map((r) => `<button class="chip" data-act="pick" data-r="${esc(r.id)}" aria-pressed="${!!sel && r.id === sel.id}">${esc(r.name)}${r.id === st.next ? '<span class="nx">• next</span>' : ""}</button>`).join("");
    const last = S.workouts[0];
    return `${header(last ? `Last session: ${esc(wName(last))}, ${dateLabel(last.date)}` : "Ready when you are", "Today")}
      ${missedPanel}${coachPanel}
      <h2>Your own workouts</h2>
      <section class="panel">
        ${chips ? `<div class="chips" role="group" aria-label="Routine">${chips}</div>` : ""}
        ${sel ? routinePreview(sel) : `<div class="empty">You haven’t made any routines. Build one in <a href="#plan">Routines</a>, or start an empty workout and add exercises as you go.</div>`}
        ${sel ? `<button class="btn primary" data-act="start" data-r="${esc(sel.id)}">Start ${esc(sel.name)}</button>` : ""}
        <button class="btn ghost" data-act="start-free">Start an empty workout</button>
      </section>
      <p class="note">Each row is one set. The “Last” column shows what you did last time. Adjust the numbers if needed and tap ✓ when the set is done. Tap the set number to mark it as a warm-up (W), drop set (D) or set to failure (F). In your own routines, hit the top of the rep range on every working set and the weight goes up next time. In your coach’s program, your coach sets the weights.</p>`;
  }
  const blocks = [];
  for (let ei = 0; ei < a.items.length; ei++) { const g = groupInfo(a.items, ei); if (g) { blocks.push(groupCardHTML(a, g)); ei = g.end; } else blocks.push(exCardHTML(a, ei)); }
  const confirm = S.ui.confirm === "cancel"
    ? `<div class="panel"><b>Discard this workout?</b><span class="sub">Nothing from this session will be saved and your weights stay as they were.</span><div class="row end"><button class="btn ghost" data-act="confirm-no">Keep going</button><button class="btn danger" data-act="cancel-yes">Discard</button></div></div>`
    : S.ui.confirm === "finish"
    ? `<div class="panel"><b>Finish with unchecked sets?</b><span class="sub">Unchecked working sets on exercises you started count as missed. Exercises with no checked sets are skipped.</span><div class="row end"><button class="btn ghost" data-act="confirm-no">Back</button><button class="btn primary" data-act="finish-yes">Finish</button></div></div>`
    : "";
  return `${header(`In progress · <span id="elapsed" class="num">${mmss((Date.now() - Date.parse(a.startedAt)) / 1000)}</span>`, esc(a.name), `${PREVIEW ? `<span class="sync cloud">Preview · not saved</span>` : `<span class="sync cloud" title="Every number you type is saved right away"><i></i>Saved on this phone</span>`}`)}
    ${coachChanged ? `<div class="msg action" style="align-self:stretch"><span class="grow">Your coach changed this workout after you started it.</span><button class="btn small primary" data-act="wk-refresh">Use the new version</button></div><p class="note">Exercises you’ve already ticked sets on keep what you logged.</p>` : ""}
    ${a.coachNote ? `<div class="coach-note">${PP.richText(a.coachNote)}</div>` : ""}${a.warmup ? `<div class="coach-note"><b>Warm-up:</b> ${PP.richText(a.warmup)}</div>` : ""}
    ${blocks.join("") || `<div class="empty">No exercises yet. Add your first one below.</div>`}
    ${a.cooldown ? `<div class="coach-note"><b>Cool-down:</b> ${PP.richText(a.cooldown)}</div>` : ""}
    <button class="btn wide" data-act="add-ex" data-target="active">+ Add exercise</button>
    <textarea class="ex-note" data-wnote="1" rows="2" placeholder="${a.prog ? "Note for your coach: how it felt, anything that hurt, questions…" : "Workout note: sleep, energy, anything worth remembering…"}" aria-label="Workout note">${esc(a.note)}</textarea>
    ${confirm}
    <div class="row"><button class="btn ghost" data-act="cancel">Discard</button><span class="grow"></span><button class="btn primary" data-act="finish">Finish workout</button></div>`;
}

/* ---- Workout cards ---- */
function prevFor(it) { const prev = lastSession(it.ex); return { work: prev ? prev.sets.filter((x) => x.t !== "w") : [], warm: prev ? prev.sets.filter((x) => x.t === "w") : [] }; }
function heads(it, e) {
  const du = it.rx && it.rx.groups && it.rx.groups[0] && it.rx.groups[0].distUnit;
  return it.fields ? it.fields.map((f) => ({ w: isBW(e.kind) ? "+" + S.state.units : S.state.units, r: "Reps", s: "Time", d: du || distUnit(e), h: "Height" }[f])) : e.track === "wr" ? [isBW(e.kind) ? "+" + S.state.units : S.state.units, "Reps"] : e.track === "time" ? ["Time"] : e.track === "dt" ? [distUnit(e), "Time"] : [S.state.units, distUnit(e)];
}
function barPicker(it, e, topW) {
  if (e.kind !== "barbell" || !(it.fields ? it.fields.includes("w") : e.track === "wr")) return "";
  const opts = S.state.bars.map((b) => `<option value="${esc(b.id)}" ${b.id === e.barId ? "selected" : ""}>${esc(b.name)} · ${fmt(b.w)} ${S.state.units}</option>`).join("");
  return `<div class="barline"><select class="barsel" data-barsel="${esc(it.ex)}" aria-label="Bar for ${esc(e.name)}">${opts}</select>${topW ? platesHTML(e, topW) : ""}</div>`;
}
function exHeadHTML(it, ei, e, lab) {
  const pin = S.state.exNotes[it.ex];
  return `<div class="kind">${lab ? `<span class="glabel">${esc(lab)}</span> ` : ""}${esc(e.muscle)} · ${esc(e.kind)}</div><button class="ex-name-btn" data-act="info" data-id="${esc(it.ex)}" aria-label="How to do ${esc(e.name)}, history and notes"><span class="ex-name">${esc(e.name)}</span><span class="info-btn" aria-hidden="true">i</span></button>
    ${it.rx ? `<div class="ex-scheme rx-line">Coach: ${PP.richText(rxText(it.rx, !!lab))}</div>${it.rx.note ? `<div class="rx-note">${PP.richText(it.rx.note)}</div>` : ""}` : `<div class="ex-scheme">${esc(schemeLabel(e))}${e.track === "wr" ? " reps" : ""}${e.fails ? ` · <span style="color:var(--warn)">${e.fails} prior miss${e.fails > 1 ? "es" : ""}</span>` : ""}</div>`}
    ${pin ? `<button class="pin" data-act="info" data-id="${esc(it.ex)}" data-tab="notes"><b>My note:</b> ${esc(pin)}</button>` : ""}`;
}
function exToolsHTML(a, ei, it, e, lab) {
  if (S.ui.confirm === "rm:" + ei) return `<div class="ex-tools"><span class="sub grow">Remove ${lab ? esc(lab) + " " : ""}from this workout?</span><button class="btn small ghost" data-act="confirm-no">Keep</button><button class="btn small danger" data-act="rm-yes" data-i="${ei}">Remove</button></div>`;
  const linked = !!(a.items[ei + 1] && it.group && a.items[ei + 1].group === it.group), noteOpen = S.ui.note === ei || it.note;
  return `<div class="ex-tools">${lab ? `<span class="glabel">${esc(lab)}</span>` : ""}<button class="btn small ghost" data-act="set-add" data-i="${ei}">+ Set</button><button class="btn small ghost" data-act="set-rm" data-i="${ei}" ${it.sets.length <= 1 ? "disabled" : ""}>− Set</button>${e.kind === "barbell" && e.track === "wr" && !it.sets.some((x) => x.t === "w") ? `<button class="btn small ghost" data-act="warmups" data-i="${ei}">Warm-ups</button>` : ""}${noteOpen ? "" : `<button class="btn small ghost" data-act="note" data-i="${ei}">Note</button>`}${!it.rx && a.items[ei + 1] && !a.items[ei + 1].rx ? `<button class="btn small ghost" data-act="link" data-i="${ei}">${linked ? "Unlink" : "Superset ↓"}</button>` : ""}${ei > 0 && !lab ? `<button class="icon-btn" data-act="a-up" data-i="${ei}" aria-label="Move up">▲</button>` : ""}<span class="grow"></span><button class="btn small ghost" data-act="rm" data-i="${ei}">Remove</button></div>
    ${noteOpen ? `<textarea class="ex-note" data-note="${ei}" rows="1" placeholder="Note for this workout: how it felt, form, pain…" aria-label="Note for ${esc(e.name)}">${esc(it.note)}</textarea>` : ""}`;
}
function exCardHTML(a, ei) {
  const it = a.items[ei], e = getEx(it.ex), pv = prevFor(it);
  let wi = 0, wu = 0, ni = 0;
  const rows = it.sets.map((x, si) => { const p = x.t === "w" ? pv.warm[wu++] : pv.work[ni++]; if (x.t === "n") wi++; return setRowHTML(ei, si, it, e, x, p, wi, it.fields); }).join("");
  const hs = heads(it, e), topW = Math.max(0, ...it.sets.filter((x) => x.t === "n" || x.t === "f").map((x) => +x.w || 0));
  return `<section class="ex"><div class="ex-head"><div>${exHeadHTML(it, ei, e)}</div>
      ${e.track === "wr" && !isBW(e.kind) ? `<span class="weight-btn num" style="border:0">${fmt(topW)}<small>${S.state.units}${e.kind === "dumbbell" ? " ea" : ""}</small></span>` : ""}</div>
    <div class="setrows" style="--cols:${hs.length}"><div class="sethead"><span>Set</span><span>Last</span>${hs.map((h) => `<span style="text-align:center">${esc(h)}</span>`).join("")}<span>Done</span></div>${rows}</div>
    ${barPicker(it, e, topW)}
    ${exToolsHTML(a, ei, it, e)}
  </section>`;
}
// A superset or circuit as one card, round by round: A1, A2, (A3…), rest, next round.
function groupCardHTML(a, g) {
  const idx = []; for (let j = g.start; j <= g.end; j++) idx.push(j);
  const mem = idx.map((ei, k) => { const it = a.items[ei]; return { ei, it, e: getEx(it.ex), pv: prevFor(it), lab: g.letter + (k + 1) }; });
  let warm = "";
  for (const m of mem) { let wu = 0; m.it.sets.forEach((x, si) => { if (x.t === "w") warm += setRowHTML(m.ei, si, m.it, m.e, x, m.pv.warm[wu++], 0, m.it.fields, m.lab); }); }
  const rounds = Math.max(0, ...mem.map((m) => m.it.sets.filter((x) => x.t !== "w").length));
  let body = "";
  for (let r = 0; r < rounds; r++) {
    const rr = mem.map((m) => { const work = m.it.sets.map((x, si) => ({ x, si })).filter((o) => o.x.t !== "w"); const o = work[r]; return o ? setRowHTML(m.ei, o.si, m.it, m.e, o.x, m.pv.work[r], r + 1, m.it.fields, m.lab) : ""; }).join("");
    const done = mem.every((m) => { const w = m.it.sets.filter((x) => x.t !== "w")[r]; return !w || w.done; });
    body += `<div class="round${done ? " done" : ""}"><div class="round-hd">Round ${r + 1}${done ? " · done" : ""}</div>${rr}</div>`;
  }
  return `${groupHeader(a.items, g)}<section class="ex grouped gcard">
    ${mem.map((m) => `<div class="gmember"><div class="ex-head"><div>${exHeadHTML(m.it, m.ei, m.e, m.lab)}<div class="legend">Records: ${heads(m.it, m.e).map(esc).join(" · ")}</div></div></div>${barPicker(m.it, m.e, Math.max(0, ...m.it.sets.filter((x) => x.t !== "w").map((x) => +x.w || 0)))}</div>`).join("")}
    ${warm ? `<div class="round"><div class="round-hd">Warm-up sets</div>${warm}</div>` : ""}
    ${body}
    ${mem.map((m) => exToolsHTML(a, m.ei, m.it, m.e, m.lab)).join("")}
  </section>`;
}
function renderSummary() {
  const sm = S.ui.summary;
  const lines = sm.results.map((r) => {
    if (r.skipped) return `<div class="line"><span>${esc(r.name)}</span><span class="pill">Skipped</span></div>`;
    const e = getEx(r.ex);
    const sets = r.sets.map((x) => setText(e, x)).join(", ");
    let pill = "";
    if (r.rx) pill = `<span class="pill">Coach: ${esc(rxText(r.rx))}</span>`;
    else if (r.track === "wr") pill = r.outcome === "up" ? `<span class="pill good">Next: ${esc(weightLabel(e, r.next))}</span>`
      : r.outcome === "top" ? `<span class="pill good">Top of range. Add reps or load</span>`
      : r.outcome === "build" ? `<span class="pill">Same weight, chase ${r.repsMax}s</span>`
      : r.outcome === "deload" ? `<span class="pill warn">Deload to ${esc(weightLabel(e, r.next))}</span>`
      : r.outcome === "repeat" ? `<span class="pill warn">Repeat ${esc(weightLabel(e, r.next))}</span>` : `<span class="pill">Warm-ups only</span>`;
    return `<div class="line"><span><b>${esc(r.name)}</b><br><span class="sub num">${esc(sets)}</span>${CL.user && sm.wid ? `<br><button class="btn small ghost" data-act="fc" data-ex="${esc(r.ex)}" data-w="${esc(sm.wid)}">🎥 Send a form check</button>` : ""}</span>${pill}</div>`;
  }).join("");
  const u = S.state.units;
  const prs = sm.prs.length ? `<section class="panel"><h2>New records</h2>${sm.prs.map((p) => `<div class="row"><span class="pr">PR</span><span>${esc(p)}</span></div>`).join("")}</section>` : "";
  const maxes = (sm.maxes || []).length ? `<section class="panel"><h2>New 5-rep max${sm.maxes.length > 1 ? "es" : ""}</h2>${sm.maxes.map((m) => `<div class="row"><span class="pr">5RM</span><span><b>${esc(m.name)}: ${fmt(m.rm5)} ${u}</b>${m.prev ? ` <span class="sub">(was ${fmt(m.prev)})</span>` : ""}<br><span class="sub">${m.coach ? `Saved. Your coach will look at raising your target max to ${fmt(m.suggested)} ${u}.` : `Your estimated max is now ${fmt(m.suggested)} ${u}.`}</span></span></div>`).join("")}</section>` : "";
  const stats = `<section class="panel"><div class="stats"><div><span class="k">Total lifted</span><b class="num">${(sm.volume || 0).toLocaleString()} ${u}</b></div><div><span class="k">Working sets</span><b class="num">${sm.sets || 0}</b></div><div><span class="k">Time</span><b class="num">${sm.minutes} min</b></div><div><span class="k">New PRs</span><b class="num">${sm.prs.length + (sm.maxes || []).length}</b></div></div></section>`;
  return `${header(`Nice work`, `${esc(sm.name)} done`)}
    ${stats}${maxes}${prs}
    <section class="panel summary"><h2>Results</h2>${lines}</section>
    ${sm.coach ? `<p class="note">${CL.user ? "Saved to your program. Your coach sees this workout and your notes." : "Saved to your program on this phone. Sign in so your coach sees your workouts."}</p>` : ""}
    <div class="row end"><button class="btn primary" data-act="summary-done">Done</button></div>`;
}

/* ================= Program tab ================= */
function renderProgram() {
  const pr = program();
  if (!pr) return `${header("From your coach", "Program")}<div class="empty">No program yet. When your coach assigns you one, it shows up here.</div>`;
  const done = programDone(pr), nd = nextDay(pr);
  const total = pr.weeks.reduce((n, w) => n + w.days.length, 0), finished = Object.keys(done).length;
  const weeks = pr.weeks.map((wk, w) => !wk.days.length ? "" : `<section class="panel"><div class="row"><h2 class="grow">Week ${w + 1}</h2><span class="sub num">${wk.days.filter((_, d) => done[dayKey(w, d)]).length}/${wk.days.length} done</span></div>
    ${wk.note ? `<div class="coach-note">${PP.richText(wk.note)}</div>` : ""}
    ${wk.days.map((day, d) => {
      const k = dayKey(w, d), isNext = nd && nd.w === w && nd.d === d, open = S.ui.openDay === k;
      const status = done[k] ? `<span class="pill good">Done ${dateLabel(done[k]).replace(/^\w+, /, "")}</span>` : isNext ? `<span class="pill good">Next</span>` : day.date && day.date < todayISO() ? `<span class="pill bad">Missed</span>` : "";
      return `<div class="pday"><button class="pday-hd" data-act="open-day" data-k="${k}" aria-expanded="${open}"><b class="grow">${day.date ? `<span class="sub">${dateLabel(day.date + "T12:00:00").replace(/,.*$/, "")} · </span>` : ""}${esc(day.name)}</b>${status}<span class="sub">${day.items.length} exercises</span><span class="sub" aria-hidden="true">${open ? "▴" : "▾"}</span></button>
        ${open ? `<div class="pday-body">${day.note ? `<div class="coach-note">${PP.richText(day.note)}</div>` : ""}${day.warmup ? `<div class="coach-note"><b>Warm-up:</b> ${PP.richText(day.warmup)}</div>` : ""}<div class="rx-list">${rxListHTML(day.items, true)}</div>${day.cooldown ? `<div class="coach-note"><b>Cool-down:</b> ${PP.richText(day.cooldown)}</div>` : ""}
          ${S.state.active ? `<span class="note">Finish your current workout before starting another.</span>` : `<button class="btn ${done[k] ? "" : "primary"}" data-act="start-day" data-w="${w}" data-d="${d}">${done[k] ? "Do it again" : "Start this workout"}</button>`}</div>` : ""}
      </div>`;
    }).join("")}</section>`).join("");
  return `${header(`From ${esc(pr.coach)} · ${finished} of ${total} workouts done`, esc(pr.name))}
    ${pr.sample ? `<div class="msg action" style="align-self:stretch"><span>This is a sample program so you can try the app. Your coach’s program replaces it as soon as they assign one to you.</span></div>` : ""}
    <div class="bars" style="grid-template-columns:minmax(0,1fr)"><span class="track"><span class="fill" style="display:block;width:${(finished / total) * 100}%"></span></span></div>
    ${weeks}
    <p class="note"><b>How to read it:</b> “4 × 6” means 4 sets of 6 reps. “75% of max” is a percentage of your one-rep max (set yours in Profile). “RPE 8” means pick a weight that leaves about 2 reps in the tank (10 = nothing left).</p>`;
}

/* ================= Routines tab ================= */
function renderPlan() {
  const st = S.state, u = st.units;
  const cards = st.routines.map((r, ri) => {
    const open = S.ui.openRoutine === r.id;
    let body = "";
    if (open) {
      const items = r.items.map((id, ii) => {
        const e = getEx(id), key = r.id + ":" + ii, ed = S.ui.openItem === key;
        const f = (lbl, fld, val, attrs = 'inputmode="numeric"') => `<label>${lbl}<input type="text" ${attrs} id="f-${fld}-${key}" value="${esc(val)}" data-exf="${fld}" data-id="${esc(id)}"></label>`;
        const fields = !ed ? "" : `<div class="grid-fields">
          ${f("Sets", "sets", e.sets)}
          ${e.track === "wr" ? f("Min reps", "repsMin", e.repsMin) + f("Max reps", "repsMax", e.repsMax) : ""}
          ${e.track === "wr" || e.track === "wd" ? f(`${isBW(e.kind) ? "Added" : "Weight"} (${u}${e.kind === "dumbbell" ? " each" : ""})`, "weight", fmt(e.weight), 'inputmode="decimal"') : ""}
          ${e.track === "wr" ? f(`Add after success (${u})`, "inc", fmt(e.inc), 'inputmode="decimal"') : ""}
        </div><span class="note">These settings apply to ${esc(e.name)} in every routine.</span>`;
        return `<div class="item"><div class="top">
          <button class="name" data-act="item-open" data-key="${esc(key)}" aria-expanded="${ed}"><b>${esc(e.name)}</b><span class="sub">${esc(schemeLabel(e))}${weightLabel(e, e.weight) ? " · " + esc(weightLabel(e, e.weight)) : ""}</span></button>
          <button class="info-btn" data-act="info" data-id="${esc(id)}" aria-label="How to do ${esc(e.name)}">i</button>
          <button class="icon-btn" data-act="item-up" data-r="${esc(r.id)}" data-i="${ii}" aria-label="Move up" ${ii === 0 ? "disabled" : ""}>▲</button>
          <button class="icon-btn" data-act="item-down" data-r="${esc(r.id)}" data-i="${ii}" aria-label="Move down" ${ii === r.items.length - 1 ? "disabled" : ""}>▼</button>
          <button class="icon-btn" data-act="item-rm" data-r="${esc(r.id)}" data-i="${ii}" aria-label="Remove ${esc(e.name)}">✕</button>
        </div>${fields}</div>`;
      }).join("");
      const confirmDel = S.ui.confirm === "rdel:" + r.id;
      body = `<div class="body">
        <label class="sub" for="rn-${esc(r.id)}">Routine name</label>
        <input class="text-in" id="rn-${esc(r.id)}" value="${esc(r.name)}" data-rname="${esc(r.id)}">
        ${items || `<div class="empty">No exercises yet.</div>`}
        <button class="btn" data-act="add-ex" data-target="routine:${esc(r.id)}">+ Add exercise</button>
        <div class="row">${confirmDel
          ? `<span class="sub grow">Delete “${esc(r.name)}”? Your logged workouts are kept.</span><button class="btn small ghost" data-act="confirm-no">Keep</button><button class="btn small danger" data-act="rdel-yes" data-r="${esc(r.id)}">Delete</button>`
          : `<button class="btn small ghost" data-act="r-up" data-i="${ri}" ${ri === 0 ? "disabled" : ""}>Move earlier</button><span class="grow"></span><button class="btn small ghost danger" data-act="rdel" data-r="${esc(r.id)}">Delete routine</button>`}</div>
      </div>`;
    }
    return `<section class="routine"><button class="hd" data-act="r-open" data-r="${esc(r.id)}" aria-expanded="${open}"><b class="grow">${esc(r.name)}</b>${r.id === st.next ? '<span class="pill good">Next</span>' : ""}<span class="sub">${r.items.length} exercise${r.items.length === 1 ? "" : "s"}</span><span class="sub" aria-hidden="true">${open ? "▴" : "▾"}</span></button>${body}</section>`;
  }).join("");
  return `${header("Workouts you build yourself", "Routines")}
    ${cards || `<div class="empty">No routines yet.</div>`}
    <div class="row"><button class="btn" data-act="r-new">+ New routine</button><span class="grow"></span></div>
    <p class="note">For weight-and-reps exercises, the first number of the rep range is the floor and the second is the target. Hit the target on every working set and the weight goes up by the amount you set.</p>`;
}

/* ================= Exercise picker ================= */
function openPicker(target) { S.ui.picker = { target, q: "" }; S.ui.newEx = null; renderSheet(); setTimeout(() => $("#pick-q")?.focus(), 30); }
function closePicker() { S.ui.picker = null; S.ui.newEx = null; renderSheet(); }
function openInfo(id) { S.ui.info = id; renderSheet(); }
function closeInfo() { S.ui.info = null; renderSheet(); }
// The coaches' written guide for an exercise (edited on the dashboard), if there is one.
function guideOf(e) {
  const g = e && e.guide; if (!g || typeof g !== "object") return null;
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);
  const out = { m: Array.isArray(g.m) ? [String(g.m[0] || ""), String(g.m[1] || "")] : null, s: arr(g.s), c: arr(g.c), x: arr(g.x), n: typeof g.n === "string" ? g.n : "" };
  if (out.m && !out.m[0]) out.m = null;
  return out.m || out.s.length || out.c.length || out.x.length || out.n ? out : null;
}
function renderInfo(id) {
  const e = getEx(id), g = e.guide ? guideOf(e) : window.LiftGuide ? window.LiftGuide.info(id) : null, builtIn = !e.custom, tab = S.ui.infoTab || "how";
  const list = (tag, xs) => `<${tag}>${xs.map((x) => `<li>${PP.richText(x)}</li>`).join("")}</${tag}>`;
  const body = g ? `
      ${g.m ? `<div class="muscles"><span class="pill good">Works: ${esc(g.m[0])}</span>${g.m[1] ? `<span class="pill">Also: ${esc(g.m[1])}</span>` : ""}</div>` : ""}
      ${g.n ? `<div class="msg action" style="align-self:stretch">${PP.richText(g.n)}</div>` : ""}
      ${(g.s || []).length ? `<section><h3>How to do it</h3>${list("ol", g.s)}</section>` : ""}
      ${(g.c || []).length ? `<section><h3>Form cues</h3>${list("ul", g.c)}</section>` : ""}
      ${(g.x || []).length ? `<section><h3>Common mistakes</h3>${list("ul", g.x)}</section>` : ""}
      <p class="note">General guidance, not medical advice. Stop if something hurts sharply, and get a coach or physical therapist to check your form if you’re unsure.</p>`
    : builtIn && videoFor(id) ? `<div class="empty">There’s no written guide for this one yet. Follow the coach in the gym’s video above.</div>`
    : `<div class="empty">There’s no written guide for this exercise yet. Keep your own cues under Notes.</div>`;
  const howHTML = (videoFor(id) ? `<div class="guide-video yt${isShort(videoLinkFor(id)) ? " vertical" : ""}"><iframe src="https://www.youtube-nocookie.com/embed/${videoFor(id)}?rel=0&playsinline=1&modestbranding=1&loop=0" title="${esc(e.name)} video from Power Plant Gym" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>` : builtIn ? `<div class="guide-video"><video id="guide-video" src="videos/${esc(id)}.mp4" autoplay muted playsinline controls preload="metadata" aria-label="${esc(e.name)} demonstration video"></video><div class="video-soon" id="video-soon" hidden><b>Video demo coming soon</b><span>A coach-recorded video of this exercise is on the way. Follow the steps below until then.</span></div></div>` : "") + body;
  return `<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(e.name)} guide">
    <div class="row"><div class="grow"><div class="kind">${esc(e.muscle)} · ${esc(e.kind)}</div><h2>${esc(e.name)}</h2></div><button class="btn small ghost" data-act="info-close">${S.ui.picker ? "Back" : "Close"}</button></div>
    <div class="tabs3" role="tablist">${[["how", "How to"], ["history", "History"], ["notes", "Notes"]].map(([k, n]) => `<button role="tab" data-act="info-tab" data-tab="${k}" aria-selected="${tab === k}">${n}</button>`).join("")}</div>
    <div class="guide">${tab === "history" ? exHistoryHTML(id) : tab === "notes" ? exNotesHTML(id) : howHTML}</div>
  </div></div>`;
}
// Every logged session of one exercise: the numbers.
function exHistoryHTML(id) {
  const rows = [];
  for (const w of S.workouts) for (const raw of w.exercises || []) { const e = wEx(raw); if (e.id === id && e.sets.length) rows.push({ w, e }); }
  if (!rows.length) return `<div class="empty">No sessions logged for this exercise yet.</div>`;
  const best = records()[id];
  return `${best ? `<div class="msg action" style="align-self:stretch"><span><b>Best:</b> ${esc(recordText(best))}</span></div>` : ""}<div class="hist">${rows.slice(0, 80).map(({ w, e }) => `<div class="hrow"><span class="sub">${dateLabel(w.date)}</span><span class="num">${e.sets.map((x) => x.t === "w" ? `<span class="sub">${esc(setText(e, x))}</span>` : esc(setText(e, x))).join(", ")}</span></div>`).join("")}</div>`;
}
// The client's own notes: a pinned one shown in every workout, plus every note they wrote on this exercise.
function exNotesHTML(id) {
  const past = [];
  for (const w of S.workouts) for (const raw of w.exercises || []) { const e = wEx(raw); if (e.id === id && e.note) past.push({ d: w.date, n: e.note }); }
  return `<label class="sub" for="pin-note"><b>Pinned note</b>: shows on this exercise in every workout (e.g. “Use the big orange handle”).</label>
    <textarea class="ex-note" id="pin-note" data-pin="${esc(id)}" rows="2" placeholder="Seat height, grip, which handle, cues…">${esc(S.state.exNotes[id] || "")}</textarea>
    <h3>Past notes</h3>${past.length ? `<div class="hist">${past.slice(0, 80).map((x) => `<div class="hrow"><span class="sub">${dateLabel(x.d)}</span><span>${esc(x.n)}</span></div>`).join("")}</div>` : `<div class="empty">Notes you add to this exercise during a workout show up here.</div>`}`;
}
function renderSheet() {
  const host = $("#sheet"); const p = S.ui.picker;
  if (S.ui.info) {
    host.innerHTML = renderInfo(S.ui.info);
    const v = $("#guide-video");
    if (v) {
      v.addEventListener("error", () => { v.hidden = true; const s = $("#video-soon"); if (s) s.hidden = false; }, { once: true });
      v.addEventListener("loadeddata", () => v.play().catch(() => {}), { once: true });
      v.addEventListener("click", () => (v.paused ? v.play().catch(() => {}) : v.pause()));
    }
    return;
  }
  if (!p) { host.innerHTML = ""; return; }
  if (!$("#pick-q")) host.innerHTML = `<div class="sheet-wrap" data-act="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Add exercise">
      <div class="row"><h2 class="grow">Add exercise</h2><button class="btn small ghost" data-act="sheet-close">Close</button></div>
      <input type="search" id="pick-q" placeholder="Search, or type a new exercise name" autocomplete="off" aria-label="Search exercises">
      <div class="list" id="pick-list"></div></div></div>`;
  const q = $("#pick-q"); if (q && q.value !== p.q) q.value = p.q;
  renderPickList();
}
function renderPickList() {
  const p = S.ui.picker; if (!p) return;
  const q = p.q.trim().toLowerCase(); const all = allMetas();
  const hits = all.filter((m) => !q || m.name.toLowerCase().includes(q) || m.muscle.toLowerCase().includes(q) || m.kind.includes(q));
  const groups = {}; for (const m of hits) (groups[m.muscle] = groups[m.muscle] || []).push(m);
  let html = "";
  for (const mu of MUSCLES) if (groups[mu]) html += `<div class="grp">${esc(mu)}</div>` + groups[mu].map((m) => `<div class="pickrow"><button class="pick" data-act="pick-ex" data-id="${esc(m.id)}"><span>${esc(m.name)}</span><span class="kind">${esc(m.track === "wr" ? m.kind : TRACKS[m.track])}</span></button><button class="info-btn" data-act="info" data-id="${esc(m.id)}" aria-label="How to do ${esc(m.name)}">i</button></div>`).join("");
  if (q && !all.some((m) => m.name.toLowerCase() === q)) {
    const ne = S.ui.newEx || { kind: "machine", muscle: "Other", track: "wr" };
    html += `<div class="grp">Create “${esc(p.q.trim())}”</div><div class="grid-fields">
      <label>Equipment<select id="ne-kind">${KINDS.map((k) => `<option ${k === ne.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Muscle<select id="ne-muscle">${MUSCLES.map((k) => `<option ${k === ne.muscle ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Track<select id="ne-track">${Object.entries(TRACKS).map(([k, v]) => `<option value="${k}" ${k === ne.track ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>&nbsp;<button class="btn small" data-act="pick-new">Create and add</button></label></div>`;
  }
  $("#pick-list").innerHTML = html || `<div class="empty">Type a name to create a new exercise.</div>`;
}
function addExerciseTo(target, id) {
  if (target === "active" && S.state.active) S.state.active.items.push(activeEntry(id));
  else if (target.startsWith("routine:")) { const r = routine(target.slice(8)); if (r) r.items.push(id); }
  saveState();
}

/* ================= Progress tab ================= */
function sessionPoints(exId) {
  const pts = [];
  for (const w of S.workouts) for (const raw of w.exercises || []) {
    const e = wEx(raw); if (e.id !== exId || !e.sets.length) continue;
    const v = e.track === "wr" ? (isBW(e.kind) && !e.sets.some((x) => x.w > 0) ? Math.max(...e.sets.map((x) => x.r || 0)) : Math.max(0, ...e.sets.filter((x) => x.t !== "w").map((x) => e1rm(x.w, x.r))))
      : e.track === "time" ? (e.better === "lower" ? Math.min(...e.sets.map((x) => x.s || 1e9)) : Math.max(...e.sets.map((x) => x.s || 0)))
      : e.track === "dt" ? Math.max(...e.sets.map((x) => x.d || 0)) : Math.max(...e.sets.map((x) => x.w || 0));
    if (v > 0 && v < 1e9) pts.push({ t: Date.parse(w.date), v });
  }
  return pts.sort((a, b) => a.t - b.t);
}
function lineChart(pts, opts) {
  const W = 600, H = 230, L = 70, R = 16, T = 14, B = 34;
  let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v));
  const pad = (hi - lo) * 0.1 || Math.max(1, hi * 0.05); lo = Math.max(0, lo - pad); hi = hi + pad;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const x = (t) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const lab = opts.time ? (v) => mmss(v) : (v) => fmt(Math.round(v));
  const grid = ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 7}" text-anchor="end" font-size="20" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${lab(v)}</text>`).join("");
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const d = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}">${grid}
    <path d="${path}L${x(t1)},${H - B}L${x(t0)},${H - B}Z" fill="var(--accent)" opacity="0.1"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
    ${pts.map((p, i) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === pts.length - 1 ? 6 : 4}" fill="var(--accent)"><title>${d(p.t)}: ${lab(p.v)}</title></circle>`).join("")}
    <text x="${L}" y="${H - 8}" font-size="20" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">${d(t0)}</text>
    <text x="${W - R}" y="${H - 8}" font-size="20" text-anchor="end" fill="var(--muted)" font-family="IBM Plex Sans, sans-serif">${d(t1)}</text></svg>`;
}
function weeklySets() {
  const since = Date.now() - 7 * 864e5, m = {};
  for (const w of S.workouts) { if (Date.parse(w.date) < since) continue; for (const raw of w.exercises || []) { const e = wEx(raw); if (e.track !== "wr") continue; m[e.muscle] = (m[e.muscle] || 0) + e.sets.filter((x) => x.t !== "w" && x.r > 0).length; } }
  return m;
}
function renderHistory() {
  const u = S.state.units;
  const logged = new Map();
  for (const w of S.workouts) for (const raw of w.exercises || []) { const e = wEx(raw); if (!logged.has(e.id)) logged.set(e.id, e.name); }
  if (!S.ui.chartEx || !logged.has(S.ui.chartEx)) S.ui.chartEx = logged.keys().next().value || null;
  const opts = [...logged.entries()].map(([id, n]) => `<option value="${esc(id)}" ${id === S.ui.chartEx ? "selected" : ""}>${esc(n)}</option>`).join("");
  const ce = S.ui.chartEx ? (meta(S.ui.chartEx) ? getEx(S.ui.chartEx) : wEx({ ex: S.ui.chartEx })) : null;
  const pts = S.ui.chartEx ? sessionPoints(S.ui.chartEx) : [];
  const chartLabel = !ce ? "" : ce.track === "wr" ? (isBW(ce.kind) ? "Best set (reps)" : `Estimated 1-rep max (${u})`) : ce.track === "time" ? "Best time" : ce.track === "dt" ? `Distance (${distUnit(ce)})` : `Heaviest carry (${u})`;
  const ws = weeklySets(), wsMax = Math.max(10, ...Object.values(ws));
  const bars = Object.entries(ws).sort((a, b) => b[1] - a[1]).map(([mu, n]) => `<span>${esc(mu)}</span><span class="track"><span class="fill" style="display:block;width:${(n / wsMax) * 100}%"></span></span><b class="num">${n}</b>`).join("");
  const rec = Object.values(records()).sort((a, b) => a.name.localeCompare(b.name));
  const recHTML = rec.map((r) => `<div class="rec"><span class="nm">${esc(r.name)}</span><span class="sub">${dateLabel(r.e1Date || r.repsDate || r.bestDate || Date.now()).replace(/^\w+, /, "")}</span><b class="num">${esc(recordText(r))}</b></div>`).join("");
  const items = S.workouts.slice(0, 60).map((w) => {
    const lines = (w.exercises || []).map((raw) => {
      const e = wEx(raw);
      const sets = e.sets.map((x) => { const t = setText(e, x); return x.t === "w" ? `<span class="sub">${esc(t)}</span>` : e.track === "wr" && x.r < e.repsMin ? `<span class="x">${esc(t)}</span>` : esc(t); }).join(", ");
      return `<div class="log-line" style="grid-template-columns:minmax(0,1fr)"><span><b>${esc(e.name)}</b> <span class="reps">${sets}</span>${e.note ? `<br><span class="sub">“${esc(e.note)}”</span>` : ""}</span></div>`;
    }).join("");
    const confirming = S.ui.confirm === "del:" + w.id;
    return `<div class="log-item"><div class="hd"><b>${esc(wName(w))}</b><span class="sub">${dateLabel(w.date)}${w.minutes ? ` · ${w.minutes} min` : ""}</span></div>${lines}${w.note ? `<span class="sub">Note: ${esc(w.note)}</span>` : ""}
      <div class="row end">${confirming ? `<span class="sub grow">Delete this entry? Weights won’t change.</span><button class="btn small ghost" data-act="confirm-no">Keep</button><button class="btn small danger" data-act="del-yes" data-id="${esc(w.id)}">Delete</button>` : `${CL.user ? `<button class="btn small ghost" data-act="fc" data-w="${esc(w.id)}">🎥 Form check</button>` : ""}<button class="btn small ghost" data-act="del" data-id="${esc(w.id)}">Delete</button>`}</div></div>`;
  }).join("");
  return `${header(`${S.workouts.length} workout${S.workouts.length === 1 ? "" : "s"} logged`, "Progress")}
    <section class="panel"><h2>Last 7 days</h2>
      ${bars ? `<div class="bars">${bars}</div><span class="note">Working sets per muscle group. Many lifters aim for about 10–20 a week for each muscle they want to grow.</span>` : `<div class="empty">No sets in the last 7 days.</div>`}</section>
    <section class="panel"><div class="row"><h2 class="grow">By exercise</h2>${opts ? `<select class="select" id="chart-ex" aria-label="Exercise">${opts}</select>` : ""}</div>
      ${ce ? `<span class="sub">${esc(chartLabel)}</span>` : ""}
      ${pts.length >= 2 ? lineChart(pts, { time: ce.track === "time", label: chartLabel }) : `<div class="empty">${pts.length ? "One session logged. The chart appears after your second." : "Finish a workout to start charting."}</div>`}</section>
    <section class="panel"><h2>Records</h2>${recHTML ? `<div class="records">${recHTML}</div><span class="note">Estimated 1-rep max uses the Epley formula on your best working set of 12 reps or fewer.</span>` : `<div class="empty">Your best lifts show up here.</div>`}</section>
    ${renderBodyPanel()}
    <h2>Log</h2>
    <div class="log">${items || `<div class="empty">Finish your first workout and it shows up here.</div>`}</div>`;
}

/* ================= Food (Lose It file import) and bodyweight ================= */
const NUM = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
function toISODate(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) { let y = m[3]; if (y.length === 2) y = "20" + y; return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`; }
  const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10);
}
function colIdx(headers, ...names) {
  const h = headers.map((x) => x.toLowerCase().replace(/^﻿/, "").trim());
  for (const n of names) { const i = h.findIndex((x) => x === n || x.startsWith(n + " ") || x.startsWith(n + "(")); if (i >= 0) return i; }
  return -1;
}
function ingestCSV(name, text, out) {
  const rows = parseCSV(text); if (rows.length < 2) return false;
  const H = rows[0]; const iDate = colIdx(H, "date"); if (iDate < 0) return false;
  if (/exercise/i.test(name) || colIdx(H, "minutes", "duration") >= 0) return false;
  const iCal = colIdx(H, "calories", "energy"), iW = colIdx(H, "weight"), iDel = colIdx(H, "deleted");
  const kind = iCal >= 0 ? "food" : iW >= 0 ? "weight" : null; if (!kind) return false;
  const iP = colIdx(H, "protein"), iC = colIdx(H, "carbohydrates", "carbs", "carbohydrate"), iF = colIdx(H, "fat", "total fat"), iFib = colIdx(H, "fiber", "fibre"), iNa = colIdx(H, "sodium");
  let used = 0;
  for (const r of rows.slice(1)) {
    if (iDel >= 0 && /^(true|1|yes)$/i.test(String(r[iDel]).trim())) continue;
    const d = toISODate(r[iDate]); if (!d) continue; used++;
    if (kind === "weight") { const w = NUM(r[iW]); if (w > 0) out.weights[d] = w; continue; }
    const t = out.food[d] || (out.food[d] = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });
    t.kcal += NUM(r[iCal]); if (iP >= 0) t.protein += NUM(r[iP]); if (iC >= 0) t.carbs += NUM(r[iC]); if (iF >= 0) t.fat += NUM(r[iF]); if (iFib >= 0) t.fiber += NUM(r[iFib]); if (iNa >= 0) t.sodium += NUM(r[iNa]);
  }
  return used > 0;
}
async function importFood(files) {
  const out = { food: {}, weights: {} };
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || /zip/.test(f.type)) {
      if (!window.JSZip) throw new Error("The zip reader isn’t loaded yet (it needs internet the first time). Unzip the file and upload the CSV files instead.");
      const z = await window.JSZip.loadAsync(f);
      for (const name of Object.keys(z.files)) if (/\.csv$/i.test(name) && !z.files[name].dir) ingestCSV(name, await z.files[name].async("string"), out);
    } else ingestCSV(f.name, await f.text(), out);
  }
  for (const [d, t] of Object.entries(out.food)) { const r = Math.round; S.days[d] = { ...(S.days[d] || {}), kcal: r(t.kcal), protein: r(t.protein), carbs: r(t.carbs), fat: r(t.fat), fiber: r(t.fiber), sodium: r(t.sodium) }; }
  for (const [d, w] of Object.entries(out.weights)) S.days[d] = { ...(S.days[d] || {}), weight: Math.round(w * 10) / 10 };
  saveDays();
  return { foodDays: Object.keys(out.food).length, weightDays: Object.keys(out.weights).length };
}
function recentDays(n) { const cutoff = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10); return Object.keys(S.days).filter((d) => d >= cutoff).sort(); }
function foodStats(n = 7) { const ds = recentDays(n).filter((d) => S.days[d].kcal > 0); if (!ds.length) return null; const avg = (k) => Math.round(ds.reduce((s, d) => s + (S.days[d][k] || 0), 0) / ds.length); return { days: ds.length, kcal: avg("kcal"), protein: avg("protein") }; }
function weightSeries(n = 90) { return recentDays(n).filter((d) => S.days[d].weight > 0).map((d) => ({ t: Date.parse(d), v: S.days[d].weight, d })); }
function renderBodyPanel() {
  const u = S.state.units, fs = foodStats(7), ws = weightSeries(90), lastW = ws[ws.length - 1];
  const w30 = weightSeries(30), delta = w30.length >= 2 ? w30[w30.length - 1].v - w30[0].v : null;
  return `<section class="panel"><h2>Food and bodyweight</h2>
    <div class="stats">
      <div><span class="k">Calories / day</span><b class="num">${fs ? fs.kcal.toLocaleString() : "–"}</b></div>
      <div><span class="k">Protein / day</span><b class="num">${fs ? fs.protein + " g" : "–"}</b></div>
      <div><span class="k">Bodyweight</span><b class="num">${lastW ? fmt(lastW.v) + " " + u : "–"}</b></div>
      <div><span class="k">30-day change</span><b class="num">${delta == null ? "–" : (delta > 0 ? "+" : "") + fmt(Math.round(delta * 10) / 10) + " " + u}</b></div>
    </div>
    <span class="note">${fs ? `7-day averages from ${fs.days} logged day${fs.days === 1 ? "" : "s"}. Days with no entries are left out.` : "No food logged yet. Import your Lose It export to fill this in."}</span>
    ${ws.length >= 2 ? lineChart(ws, { label: "Bodyweight" }) : ""}
    <div class="row">
      <label class="btn small" for="imp" role="button" tabindex="0">Import Lose It export</label>
      <input type="file" id="imp" accept=".csv,.zip,text/csv,application/zip" multiple hidden>
      <span class="grow"></span>
      <input id="bw" class="text-in" style="width:96px" type="text" inputmode="decimal" placeholder="${u}" aria-label="Today's bodyweight in ${u}">
      <button class="btn small" data-act="bw-save">Log weight</button>
    </div>
    <span class="note">In Lose It, use Export or Download data (in the app’s settings, or at loseit.com) and upload the zip or the CSV files inside it. Importing again refreshes those days.</span>
  </section>`;
}

/* ================= Setup ================= */
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; if (S.ui.view === "setup") render(); });
function renderSetup() {
  const st = S.state, u = st.units;
  const standalone = matchMedia("(display-mode: standalone)").matches;
  const pr = program(); const pctIds = pr ? [...new Set(pr.weeks.flatMap((w) => w.days.flatMap((d) => d.items.filter((it) => (it.load && it.load.t === "pct") || (it.groups || []).some((g) => g.load && g.load.t === "pct")).map((it) => it.ex))))] : [];
  const maxIds = [...new Set([...pctIds, ...Object.keys((S.program && S.program.maxes) || {}), ...Object.keys(st.rm5), ...Object.keys(st.maxes)])].filter((id) => meta(id));
  return `${header(`${APP_NAME} · version ${APP_VERSION}`, "Profile")}
    ${CL.user ? `<section class="panel"><h2>Account</h2><span class="sub">Signed in as <b>${esc(CL.user.email || "")}</b>. Your workouts, settings and maxes save to your account, and your coaches see your workouts and notes.</span>
      ${CL.failed ? `<span class="note">Some changes haven’t reached your account yet. They’ll go up when you’re back online.</span>` : ""}
      <div class="row"><button class="btn small ghost" data-act="signout">Sign out</button></div></section>
    <section class="panel"><h2>Coach program</h2><span class="sub">${S.program && S.program.cloud ? `Your coach’s program: <b>${esc((program() || {}).name || "")}</b>. Changes your coach makes show up here on their own.` : "Your coach hasn’t assigned you a program yet, so the sample program is showing. Your coach’s program appears here as soon as they assign it."}</span></section>`
    : `<section class="panel"><h2>Coach program</h2><span class="sub">${S.program && S.program.sample ? "You’re using the sample program." : `Using “${esc((program() || {}).name || "")}”.`}</span>
      <div class="row"><label class="btn small" for="progfile" role="button" tabindex="0">Load a program file</label><button class="btn small" data-act="send-coach">Send my workouts to my coach</button><input type="file" id="progfile" accept=".json,application/json" hidden>${S.program && !S.program.sample ? `<button class="btn small ghost" data-act="prog-sample">Go back to the sample</button>` : ""}</div></section>`}
    ${maxIds.length ? `<section class="panel"><h2>Your maxes (${u})</h2><span class="sub">Percentages in your program are of your <b>target max</b>. A 5-rep max converts to an estimated max with 5RM ÷ 0.83, rounded up to the nearest ${PP.roundStep(u)}. When you log a new 5RM it’s saved here and your coach decides on a new target.</span>
      <div class="maxes"><span class="mh">Lift</span><span class="mh">5RM</span><span class="mh">Target max</span>
      ${maxIds.map((id) => { const c = coachMax(id), cm = PP.targetOf(c, u), r5 = known5RM(id); return `<span class="mn">${esc(getEx(id).name)}</span>
        <input id="rm5-${id}" type="text" inputmode="decimal" value="${st.rm5[id] ? fmt(st.rm5[id]) : ""}" placeholder="${r5 ? fmt(r5) : "–"}" data-rm5="${id}" aria-label="${esc(getEx(id).name)} 5-rep max">
        ${cm ? `<span class="mv"><b class="num">${fmt(cm)}</b><br><span class="sub">set by your coach</span></span>` : `<input id="max-${id}" type="text" inputmode="decimal" value="${st.maxes[id] ? fmt(st.maxes[id]) : ""}" placeholder="${maxFor(id) ? "~" + fmt(maxFor(id)) : "–"}" data-max="${id}" aria-label="${esc(getEx(id).name)} max">`}`; }).join("")}</div></section>` : ""}
    ${!standalone ? `<section class="panel"><h2>Install</h2>${installEvt ? `<span class="sub">Add Power Plant to your app drawer so it opens like any other app and works offline.</span><button class="btn primary" data-act="install">Install Power Plant</button>` : `<span class="sub">In Chrome, open the ⋮ menu and choose <b>Install app</b> (or Add to Home screen). Power Plant then shows up in your app drawer and works offline.</span>`}</section>` : ""}
    <section class="panel"><h2>Units and bars</h2>
      <div class="field"><label>Units</label><div class="toggle" role="group" aria-label="Units"><button data-act="units" data-u="lb" aria-pressed="${u === "lb"}">lb</button><button data-act="units" data-u="kg" aria-pressed="${u === "kg"}">kg</button></div></div>
      <span class="sub">The gym’s bars and what each weighs (${u}). Pick the bar on any barbell exercise during a workout.</span>
      <div class="barlist">${st.bars.map((b, i) => `<input class="text-in" value="${esc(b.name)}" data-barname="${i}" aria-label="Bar name"><input class="text-in num" type="text" inputmode="decimal" value="${fmt(b.w)}" data-barw="${i}" aria-label="${esc(b.name)} weight in ${u}"><button class="icon-btn" data-act="bar-rm" data-i="${i}" aria-label="Remove ${esc(b.name)}" ${st.bars.length <= 1 ? "disabled" : ""}>✕</button>`).join("")}</div>
      <button class="btn small" data-act="bar-add">+ Add a bar</button>
    </section>
    <section class="panel"><h2>Rest timer (seconds)</h2>
      <div class="field"><label for="rheavy">Heavy barbell sets (6 reps or fewer)</label><input id="rheavy" type="text" inputmode="numeric" value="${st.restHeavy}" data-field="restHeavy"></div>
      <div class="field"><label for="rok">Other working sets</label><input id="rok" type="text" inputmode="numeric" value="${st.restOk}" data-field="restOk"></div>
      <div class="field"><label for="rfail">After falling short of the range</label><input id="rfail" type="text" inputmode="numeric" value="${st.restFail}" data-field="restFail"></div>
    </section>
    <section class="panel"><h2>Backup</h2>
      <span class="sub">${CL.user ? "Your data is saved to your account. A backup file is an extra copy you can keep." : "Your data is stored only on this device. Save a backup now and then, and before switching phones."}</span>
      <div class="row"><button class="btn" data-act="backup">Save backup file</button><label class="btn ghost" for="restore" role="button" tabindex="0">Restore from backup</label><input type="file" id="restore" accept=".json,application/json" hidden></div>
      ${S.ui.confirm === "restore" ? `<div class="msg action" style="align-self:stretch"><span>Replace everything on this device with the backup from ${esc(S.ui.pendingRestore?.label || "that file")}?</span><button class="btn small ghost" data-act="confirm-no">Cancel</button><button class="btn small danger" data-act="restore-yes">Replace</button></div>` : ""}
      ${S.ui.msg ? `<span class="note">${esc(S.ui.msg)}</span>` : ""}
    </section>
    <section class="panel"><h2>Start over</h2>
      ${S.ui.confirm === "reset" ? `<span class="sub">This clears your own routines, weights and settings. Your workout log, food data and coach program are kept.</span><div class="row end"><button class="btn ghost" data-act="confirm-no">Cancel</button><button class="btn danger" data-act="reset-yes">Reset</button></div>` : `<div class="row"><span class="sub grow">Clear your own routines, weights and settings.</span><button class="btn small" data-act="reset">Reset…</button></div>`}
    </section>`;
}
function backupBlob() { return new Blob([JSON.stringify({ app: "powerplant", v: 1, exportedAt: new Date().toISOString(), state: S.state, workouts: S.workouts, days: S.days }, null, 1)], { type: "application/json" }); }
function readBackup(obj) {
  if (!obj || obj.app !== "powerplant" || !obj.state) throw new Error("That file isn’t a Power Plant backup.");
  return { program: obj.program || null, state: normalize(obj.state), workouts: Array.isArray(obj.workouts) ? obj.workouts : [], days: obj.days && typeof obj.days === "object" ? obj.days : {}, label: obj.exportedAt ? dateLabel(obj.exportedAt) : "that file" };
}

/* ================= Render + routing ================= */
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1);
  c.className = "confetti"; c.width = innerWidth * dpr; c.height = innerHeight * dpr; document.body.appendChild(c);
  const g = c.getContext("2d"), cs = getComputedStyle(document.documentElement), cols = [cs.getPropertyValue("--accent"), "#f7a35c", "#8a8d91", "#c3c5c8", "#1d1e20"].map((x) => x.trim() || "#f07521");
  const bits = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height * 0.5, vx: (Math.random() - 0.5) * 6 * dpr, vy: (2 + Math.random() * 4) * dpr, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr, col: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  (function frame(t) {
    g.clearRect(0, 0, c.width, c.height);
    for (const b of bits) { b.x += b.vx; b.y += b.vy; b.vy += 0.06 * dpr; b.r += b.vr; g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.col; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore(); }
    if (t - t0 < 3200) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
function render() {
  const v = S.ui.view;
  document.querySelectorAll("nav.tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === v ? "page" : "false"));
  const focusedId = document.activeElement && document.activeElement.id;
  $("#app").innerHTML = v === "history" ? renderHistory() : v === "program" ? renderProgram() : v === "setup" ? renderSetup() : v === "plan" ? renderPlan() : v === "coach" ? renderCoach() : renderWorkout();
  if (v === "coach") afterCoachRender();
  msgBadge();
  if (focusedId && focusedId !== "pick-q") { const el = document.getElementById(focusedId); if (el && el.closest("#app")) el.focus(); }
  if (S.ui.summary && S.ui.summary.confetti && v === "workout") { S.ui.summary.confetti = false; confetti(); }
  syncRest();
}
const VIEWS = ["workout", "program", "plan", "history", "coach", "setup"];
function route() {
  const h = location.hash.replace("#", "");
  S.ui.view = VIEWS.includes(h) ? h : "workout";
  S.ui.confirm = null; S.ui.msg = "";
  render(); window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ================= Events ================= */
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, st = S.state, a = st.active, i = +b.dataset.i;
  if (act === "sheet-bg" && ev.target !== b) return;
  switch (act) {
    case "pick": S.ui.pickRoutine = b.dataset.r; render(); break;
    case "start": startWorkout(b.dataset.r); break;
    case "start-free": startWorkout(null); break;
    case "start-day": startCoachDay(+b.dataset.w, +b.dataset.d); break;
    case "prog-sample": S.program = PPSample.program(); try { localStorage.removeItem("pp1.program"); } catch {} toast("Back to the sample program."); render(); break;
    case "open-day": S.ui.openDay = S.ui.openDay === b.dataset.k ? null : b.dataset.k; render(); break;
    case "wk-refresh": if (refreshActive()) { render(); toast("Updated to your coach’s latest version."); } break;
    case "set-done": {
      const it = a.items[+b.dataset.e], x = it.sets[+b.dataset.s], e = getEx(it.ex);
      x.done = !x.done;
      if (x.done && x.rr && (x.r === "" || x.r == null)) x.r = parseInt(x.rr, 10) || ""; // a rep range left blank logs its low end
      fillBackoffs(it);
      const g = groupInfo(a.items, +b.dataset.e);
      if (x.done && g && !g.last && x.t !== "w") { a.restEndsAt = null; toast(`No rest. Next: ${g.letter}${g.idx + 1} ${getEx(a.items[g.start + g.idx].ex).name}`); }
      else if (x.done) { const fm = it.rx && it.rx.format; startRest(x.t === "w" ? "warm" : !it.rx && e.track === "wr" && x.r < e.repsMin ? "fail" : "ok", e, fm ? (fm.t === "emom" ? fm.every : fm.rest) : g ? groupRest(a.items, g) : it.rx && it.rx.rest); }
      else a.restEndsAt = null;
      saveState(); render(); break;
    }
    case "set-type": { const x = a.items[+b.dataset.e].sets[+b.dataset.s]; x.t = SET_TYPES[(SET_TYPES.indexOf(x.t) + 1) % SET_TYPES.length]; saveState(); render(); break; }
    case "set-add": { const it = a.items[i]; const last = it.sets[it.sets.length - 1]; it.sets.push({ ...newSet(it.ex, last && last.t !== "w" ? last.t : "n", last), done: false }); saveState(); render(); break; }
    case "set-rm": { const it = a.items[i]; if (it.sets.length > 1) { it.sets.pop(); saveState(); render(); } break; }
    case "warmups": { const it = a.items[i]; const ws = warmupSets(it); if (ws.length) { it.sets.unshift(...ws); saveState(); render(); } else toast("No warm-ups needed at this weight."); break; }
    case "note": S.ui.note = i; render(); setTimeout(() => $(`[data-note="${i}"]`)?.focus(), 0); break;
    case "a-up": if (i > 0) { [a.items[i - 1], a.items[i]] = [a.items[i], a.items[i - 1]]; saveState(); render(); } break;
    case "rm": S.ui.confirm = "rm:" + i; render(); break;
    case "rm-yes": a.items.splice(i, 1); S.ui.confirm = null; saveState(); render(); break;
    case "finish": {
      const started = a.items.filter((it) => it.sets.some((x) => x.done));
      if (!started.length || started.some((it) => it.sets.some((x) => !x.done && x.t !== "w"))) { S.ui.confirm = "finish"; render(); } else finishWorkout();
      break;
    }
    case "finish-yes": finishWorkout(); break;
    case "cancel": S.ui.confirm = "cancel"; render(); break;
    case "cancel-yes": st.active = null; S.ui.confirm = null; releaseWake(); saveState(); render(); break;
    case "confirm-no": S.ui.confirm = null; render(); break;
    case "rest-sub": if (a?.restEndsAt) { a.restEndsAt = new Date(Math.max(Date.now(), Date.parse(a.restEndsAt) - 15000)).toISOString(); saveState(); syncRest(); } break;
    case "link": {
      const A = a.items[i], B = a.items[i + 1]; if (!B) break;
      if (A.group && B.group === A.group) B.group = null;
      else { const used = new Set(a.items.map((x) => x.group).filter(Boolean)); const L = A.group || "ABCDEFGHIJKLMNOP".split("").find((c) => !used.has(c)); A.group = L; B.group = L; }
      a.items.forEach((x, j) => { if (x.group && !groupInfo(a.items, j)) x.group = null; });
      saveState(); render(); break;
    }
    case "rest-add": if (a?.restEndsAt) { a.restEndsAt = new Date(Math.max(Date.now(), Date.parse(a.restEndsAt)) + 30000).toISOString(); beeped = false; saveState(); syncRest(); } break;
    case "rest-skip": if (a) { a.restEndsAt = null; saveState(); syncRest(); } break;
    case "summary-done": S.ui.summary = null; render(); break;
    case "add-ex": openPicker(b.dataset.target); break;
    case "sheet-bg": case "sheet-close": if (S.ui.info) closeInfo(); else closePicker(); break;
    case "info": ev.stopPropagation(); S.ui.infoTab = b.dataset.tab || "how"; openInfo(b.dataset.id); break;
    case "info-tab": S.ui.infoTab = b.dataset.tab; renderSheet(); break;
    case "bar-add": st.bars.push({ id: uid("bar"), name: "New bar", w: st.units === "lb" ? 45 : 20 }); saveState(); render(); setTimeout(() => document.querySelector(`[data-barname="${st.bars.length - 1}"]`)?.select(), 0); break;
    case "bar-rm": { const bar = st.bars[i]; if (bar && st.bars.length > 1) { st.bars.splice(i, 1); for (const k of Object.keys(st.ex)) if (st.ex[k].bar === bar.id) delete st.ex[k].bar; saveState(); render(); } break; }
    case "send-coach": {
      const blob = new Blob([JSON.stringify({ app: "powerplant-log", v: 1, exportedAt: new Date().toISOString(), units: st.units, program: S.program ? { id: S.program.id, name: S.program.name } : null, rm5: st.rm5, workouts: S.workouts }, null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob), aEl = document.createElement("a"); aEl.href = url; aEl.download = `powerplant-workouts-${todayISO()}.json`; document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast("Saved. Send that file to your coach (text, email or Telegram)."); break;
    }
    case "info-close": closeInfo(); break;
    case "pick-ex": { const t = S.ui.picker.target; closePicker(); addExerciseTo(t, b.dataset.id); render(); break; }
    case "pick-new": { const t = S.ui.picker.target; const id = addCustom(S.ui.picker.q.trim(), $("#ne-kind")?.value, $("#ne-muscle")?.value, $("#ne-track")?.value); closePicker(); addExerciseTo(t, id); render(); break; }
    case "r-open": S.ui.openRoutine = S.ui.openRoutine === b.dataset.r ? null : b.dataset.r; S.ui.openItem = null; S.ui.confirm = null; render(); break;
    case "r-new": { const r = { id: uid("r"), name: `Routine ${st.routines.length + 1}`, items: [] }; st.routines.push(r); if (!st.next) st.next = r.id; S.ui.openRoutine = r.id; saveState(); render(); setTimeout(() => $("#rn-" + r.id)?.select(), 0); break; }
    case "r-up": if (i > 0) { [st.routines[i - 1], st.routines[i]] = [st.routines[i], st.routines[i - 1]]; saveState(); render(); } break;
    case "rdel": S.ui.confirm = "rdel:" + b.dataset.r; render(); break;
    case "rdel-yes": { const id = b.dataset.r; st.routines = st.routines.filter((r) => r.id !== id); if (st.next === id) st.next = st.routines[0]?.id || null; S.ui.confirm = null; saveState(); render(); break; }
    case "item-open": S.ui.openItem = S.ui.openItem === b.dataset.key ? null : b.dataset.key; render(); break;
    case "item-up": case "item-down": { const r = routine(b.dataset.r); const j = act === "item-up" ? i - 1 : i + 1; if (r && j >= 0 && j < r.items.length) { [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; S.ui.openItem = null; saveState(); render(); } break; }
    case "item-rm": { const r = routine(b.dataset.r); if (r) { r.items.splice(i, 1); S.ui.openItem = null; saveState(); render(); } break; }
    case "chart": S.ui.chartEx = b.dataset.l; render(); break;
    case "del": S.ui.confirm = "del:" + b.dataset.id; render(); break;
    case "del-yes": S.workouts = S.workouts.filter((w) => w.id !== b.dataset.id); saveWorkouts(); S.ui.confirm = null; render(); break;
    case "bw-save": {
      const v = parseFloat($("#bw")?.value);
      if (!isFinite(v) || v <= 0 || v > 1500) { toast("Enter your weight as a number first."); break; }
      const d = todayISO(); S.days[d] = { ...(S.days[d] || {}), weight: Math.round(v * 10) / 10 }; saveDays(); toast(`Logged ${fmt(v)} ${st.units} for today.`); render(); break;
    }
    case "units": changeUnits(b.dataset.u); break;
    case "install": if (installEvt) { installEvt.prompt(); installEvt = null; } break;
    case "backup": {
      const blob = backupBlob(), url = URL.createObjectURL(blob);
      const aEl = document.createElement("a"); aEl.href = url; aEl.download = `powerplant-backup-${todayISO()}.json`; document.body.appendChild(aEl); aEl.click(); aEl.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000); S.ui.msg = "Backup saved to your Downloads."; render(); break;
    }
    case "restore-yes": { const r = S.ui.pendingRestore; if (r) { S.state = r.state; S.workouts = r.workouts; S.days = r.days; if (r.program) { S.program = r.program; lsSet("pp1.program", S.program); } lsSet("pp1.state", S.state); saveWorkouts(); saveDays(); S.ui.pendingRestore = null; S.ui.confirm = null; S.ui.msg = "Backup restored."; render(); } break; }
    case "reset": S.ui.confirm = "reset"; render(); break;
    case "reset-yes": S.state = { ...defaults(st.units), coachLog: st.coachLog }; S.ui.confirm = null; saveState(); render(); break;
    case "signout": signOutNow(); break;
    case "fc": S.ui.compose = { ex: b.dataset.ex || "", wid: b.dataset.w || "" }; MSG.err = ""; S.ui.summary = null; location.hash = "#coach"; if (S.ui.view === "coach") render(); break;
    case "m-send": sendMessage(); break;
    case "m-clear-file": { const f = $("#m-file"); if (f) f.value = ""; $("#m-fname").textContent = ""; b.hidden = true; break; }
    case "sw-update": swUpdate(); break;
    case "sw-reload": location.reload(); break;
  }
});
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.f && S.state.active) {
    const x = S.state.active.items[+t.dataset.e]?.sets[+t.dataset.s]; if (!x) return;
    if (t.dataset.f === "s") x.s = parseTime(t.value); else if (t.dataset.f === "r") x.r = Math.max(0, Math.round(NUM(t.value))); else x[t.dataset.f] = NUM(t.value);
    if (t.dataset.f === "w" && x.top) x.own = t.value.trim() !== ""; // the client chose their own back-off weight
    saveState(); return;
  }
  if (t.dataset.note != null && S.state.active) { S.state.active.items[+t.dataset.note].note = t.value; saveState(); return; }
  if (t.dataset.wnote && S.state.active) { S.state.active.note = t.value; saveState(); return; }
  if (t.id === "pick-q" && S.ui.picker) { S.ui.picker.q = t.value; renderPickList(); }
  if (t.id === "m-body") S.ui.draft = t.value;
});
document.addEventListener("change", (ev) => {
  const t = ev.target, st = S.state;
  if (t.dataset.f && S.state.active) { // tidy the field in place (no re-render, so focus can move to the next box)
    const it = S.state.active.items[+t.dataset.e], si = +t.dataset.s, x = it && it.sets[si]; if (!x) return;
    if (t.dataset.f === "s") t.value = mmss(x.s);
    else if (t.dataset.f === "w" || t.dataset.f === "d") {
      const old = NUM(t.dataset.old), nv = x[t.dataset.f];
      if (t.dataset.old != null && old !== nv) it.sets.forEach((y, j) => {
        if (j > si && !y.done && y.t === x.t && y[t.dataset.f] === old) { y[t.dataset.f] = nv; const el = document.querySelector(`[data-f="${t.dataset.f}"][data-e="${t.dataset.e}"][data-s="${j}"]`); if (el) el.value = fmt(nv); }
      });
      t.dataset.old = fmt(nv);
      if (t.dataset.f === "w") for (const j of fillBackoffs(it)) { const el = document.querySelector(`[data-f="w"][data-e="${t.dataset.e}"][data-s="${j}"]`); if (el) el.value = it.sets[j].w ? fmt(it.sets[j].w) : ""; }
    }
    saveState(); return;
  }
  if (t.dataset.barsel) { setEx(t.dataset.barsel, { bar: t.value }); saveState(); render(); return; }
  if (t.dataset.barw != null) { const bar = st.bars[+t.dataset.barw], v = parseFloat(t.value); if (bar && isFinite(v) && v >= 0) { bar.w = v; saveState(); } render(); return; }
  if (t.dataset.barname != null) { const bar = st.bars[+t.dataset.barname], v = t.value.trim().slice(0, 40); if (bar && v) { bar.name = v; saveState(); } render(); return; }
  if (t.dataset.rm5) { const v = parseFloat(t.value); if (isFinite(v) && v > 0) st.rm5[t.dataset.rm5] = v; else delete st.rm5[t.dataset.rm5]; saveState(); render(); return; }
  if (t.dataset.pin) { const v = t.value.trim().slice(0, 300); if (v) st.exNotes[t.dataset.pin] = v; else delete st.exNotes[t.dataset.pin]; saveState(); renderSheet(); return; }
  if (t.id === "chart-ex") { S.ui.chartEx = t.value; render(); return; }
  if (t.id === "m-ex" || t.id === "m-w") { S.ui.compose = { ...(S.ui.compose || {}), [t.id === "m-ex" ? "ex" : "wid"]: t.value }; return; }
  if (t.id === "m-file") {
    const f = t.files && t.files[0], err = window.PPMessages.checkVideo(f);
    if (err) { t.value = ""; MSG.err = err; refreshCompose(); return; }
    MSG.err = ""; refreshCompose();
    $("#m-fname").textContent = f ? `${f.name} · ${Math.max(1, Math.round(f.size / 1048576))} MB` : ""; $("[data-act='m-clear-file']").hidden = !f;
    return;
  }
  if (t.id === "ne-kind" || t.id === "ne-muscle" || t.id === "ne-track") { S.ui.newEx = { kind: $("#ne-kind").value, muscle: $("#ne-muscle").value, track: $("#ne-track").value }; return; }
  if (t.id === "imp") {
    const files = [...(t.files || [])]; if (!files.length) return;
    importFood(files).then((r) => { toast(r.foodDays || r.weightDays ? `Imported ${r.foodDays} day${r.foodDays === 1 ? "" : "s"} of food${r.weightDays ? ` and ${r.weightDays} weigh-ins` : ""}.` : "No food or weight rows found in that file."); render(); })
      .catch((e) => toast((e && e.message) || "That file couldn’t be read."));
    return;
  }
  if (t.id === "progfile") {
    const f = t.files && t.files[0]; if (!f) return;
    f.text().then((txt) => {
      const pr = JSON.parse(txt);
      if (!pr || !pr.days || !pr.weeks || !window.PPProgram.compile(pr).weeks.length) throw new Error("bad");
      pr.sample = false; S.program = pr; lsSet("pp1.program", pr); toast(`Loaded “${pr.name}”.`); location.hash = "#program"; render();
    }).catch(() => toast("That file isn’t a Power Plant program."));
    return;
  }
  if (t.id === "restore") {
    const f = t.files && t.files[0]; if (!f) return;
    f.text().then((txt) => { S.ui.pendingRestore = readBackup(JSON.parse(txt)); S.ui.confirm = "restore"; render(); }).catch((e) => { S.ui.msg = e instanceof SyntaxError ? "That file isn’t a Power Plant backup." : e.message; render(); });
    return;
  }
  if (t.dataset.rname) { const r = routine(t.dataset.rname); const v = t.value.trim().slice(0, 40); if (r && v) { r.name = v; saveState(); } render(); return; }
  if (t.dataset.exf) {
    const v = parseFloat(t.value); if (!isFinite(v) || v < 0) { render(); return; }
    const f = t.dataset.exf, id = t.dataset.id, e = getEx(id), patch = {};
    if (f === "sets") patch.sets = Math.max(1, Math.min(12, Math.round(v)));
    else if (f === "repsMin") { patch.repsMin = Math.max(1, Math.round(v)); if (patch.repsMin > e.repsMax) patch.repsMax = patch.repsMin; }
    else if (f === "repsMax") { patch.repsMax = Math.max(1, Math.round(v)); if (patch.repsMax < e.repsMin) patch.repsMin = patch.repsMax; }
    else if (f === "weight") { patch.weight = v; patch.fails = 0; }
    else if (f === "inc") patch.inc = v;
    setEx(id, patch); saveState(); render(); return;
  }
  if (t.dataset.max) { const v = parseFloat(t.value); if (isFinite(v) && v > 0) S.state.maxes[t.dataset.max] = v; else delete S.state.maxes[t.dataset.max]; saveState(); render(); return; }
  if (t.dataset.field) {
    const v = parseFloat(t.value); if (!isFinite(v) || v < 0) { render(); return; }
    st[t.dataset.field] = ["bar", "trapBar"].includes(t.dataset.field) ? v : Math.round(v); saveState();
  }
});
document.addEventListener("focusin", (ev) => { const t = ev.target; if (t.dataset && t.dataset.f) t.dataset.old = t.value; });
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && S.ui.info) closeInfo(); else if (ev.key === "Escape" && S.ui.picker) closePicker();
  if (ev.key === "Enter" && ev.target.tagName === "LABEL" && ev.target.htmlFor) $("#" + ev.target.htmlFor)?.click();
});
function changeUnits(nu) {
  const st = S.state; if (st.units === nu) return;
  const f = nu === "kg" ? 1 / 2.20462 : 2.20462;
  for (const id of Object.keys(st.ex)) { const x = { ...st.ex[id] }; if (x.weight != null) x.weight = roundTo(x.weight * f, nu === "kg" ? 2.5 : 5); delete x.inc; st.ex[id] = x; }
  if (st.active) for (const it of st.active.items) for (const x of it.sets) if (x.w != null) x.w = roundTo(x.w * f, nu === "kg" ? 2.5 : 5);
  st.bar = nu === "kg" ? 20 : 45; st.trapBar = nu === "kg" ? 25 : 60; st.bars = defaultBars(nu); st.units = nu;
  for (const k of Object.keys(st.rm5)) st.rm5[k] = roundTo(st.rm5[k] * f, nu === "kg" ? 2.5 : 5);
  for (const k of Object.keys(st.maxes)) st.maxes[k] = roundTo(st.maxes[k] * f, nu === "kg" ? 2.5 : 5);
  saveState(); render();
}

/* ================= Service worker + updates ================= */
let swReg = null;
let updateRequested = false;
function swUpdate() { if (swReg && swReg.waiting) { updateRequested = true; swReg.waiting.postMessage("skipWaiting"); } }
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    // A new version just took over. Reload now unless a workout is open; then offer it instead.
    if (updateRequested || !S.state.active) { reloading = true; location.reload(); }
    else toast("Power Plant was updated. Reload when you finish this workout.", { act: "sw-reload", label: "Reload", sticky: true });
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    swReg = reg;
    const offer = () => { if (reg.waiting && navigator.serviceWorker.controller) toast("A new version of Power Plant is ready.", { act: "sw-update", label: "Update", sticky: true }); };
    offer();
    reg.addEventListener("updatefound", () => { const nw = reg.installing; nw && nw.addEventListener("statechange", () => { if (nw.state === "installed") offer(); }); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
}

/* ================= Account + sync (the gym's Supabase project) ================= */
// The phone keeps a full copy (so the app works offline); changes go up to the account a moment later,
// and the coach's program, maxes and anything changed on another device come down on start and on return.
const Cloud = window.PPCloud;
const CL = { user: null, pushing: false, again: false, failed: false, timer: null, pulledAt: 0 };
const LOCAL_KEYS = ["pp1.state", "pp1.workouts", "pp1.days", "pp1.program", "pp1.wsync", "pp1.stateAt", "pp1.stateSynced", "pp1.uid", "pp1.msgs"];
function stateChanged() { lsSet("pp1.stateAt", Date.now()); cloudSoon(); }
function cloudSoon(ms = 2000) { if (!CL.user) return; clearTimeout(CL.timer); CL.timer = setTimeout(pushAll, ms); }
const RECENT = 14 * 864e5; // new 5RMs from workouts older than this aren't sent to the coach again

async function pushAll() {
  const c = Cloud && Cloud.client(); if (!CL.user || !c) return;
  if (CL.pushing) { CL.again = true; return; }
  CL.pushing = true; const wasFailed = CL.failed;
  try {
    const uid = CL.user.id;
    const at = lsGet("pp1.stateAt") || 0;
    if (at > (lsGet("pp1.stateSynced") || 0)) {
      const { error } = await c.from("client_state").upsert({ client_id: uid, data: { state: S.state, days: S.days, at }, updated_at: new Date().toISOString() });
      if (error) throw error;
      lsSet("pp1.stateSynced", at);
    }
    const sync = lsGet("pp1.wsync") || {};
    const changed = S.workouts.filter((w) => sync[w.id] !== Cloud.hash(w));
    if (changed.length) {
      const { error } = await c.from("workouts").upsert(changed.map((w) => ({ id: w.id, client_id: uid, done_at: w.date, data: w })));
      if (error) throw error;
      for (const w of changed) {
        if (!sync[w.id] && Date.now() - Date.parse(w.date) < RECENT) for (const m of w.maxes || []) await c.rpc("report_5rm", { p_ex: m.ex, p_rm5: m.rm5, p_suggested: m.suggested });
        sync[w.id] = Cloud.hash(w);
      }
      lsSet("pp1.wsync", sync);
    }
    const ids = new Set(S.workouts.map((w) => w.id)), gone = Object.keys(sync).filter((id) => !ids.has(id));
    if (gone.length) {
      const { error } = await c.from("workouts").delete().in("id", gone);
      if (error) throw error;
      for (const id of gone) delete sync[id];
      lsSet("pp1.wsync", sync);
    }
    CL.failed = false;
  } catch { CL.failed = true; }
  finally {
    CL.pushing = false;
    if (CL.failed !== wasFailed && S.ui.view === "setup") render();
    if (CL.again) { CL.again = false; cloudSoon(500); }
  }
}

async function pull() {
  const c = Cloud && Cloud.client(); if (!CL.user || !c) return;
  CL.pulledAt = Date.now();
  const uid = CL.user.id;
  const [st, wo, pr, mx] = await Promise.all([
    c.from("client_state").select("data").eq("client_id", uid).maybeSingle(),
    c.from("workouts").select("id,data").eq("client_id", uid).order("done_at", { ascending: false }).limit(5000),
    c.from("programs").select("id,name,data,updated_at").eq("client_id", uid),
    c.from("client_maxes").select("ex,rm5,rm1,target").eq("client_id", uid),
  ]);
  if (st.error || wo.error || pr.error || mx.error) { CL.failed = true; return; }
  const before = Cloud.hash([S.state, S.workouts, S.days, S.program]);

  // Settings and routines: the newer copy wins. A workout in progress on this phone is never replaced.
  const remote = st.data && st.data.data, localAt = lsGet("pp1.stateAt") || 0;
  if (remote && remote.state && (remote.at || 0) > localAt && !S.state.active) {
    S.state = normalize(remote.state); S.days = remote.days && typeof remote.days === "object" ? remote.days : {};
    lsSet("pp1.state", S.state); lsSet("pp1.days", S.days); lsSet("pp1.stateAt", remote.at); lsSet("pp1.stateSynced", remote.at);
  } else if (!remote) lsSet("pp1.stateAt", Math.max(localAt, 1)); // first sign-in: upload what's already on this phone

  // Workouts: merge by id. Unsynced edits on this phone win; ones deleted on another device go away here too.
  const old = lsGet("pp1.wsync") || {}, sync = {}, have = new Map(S.workouts.map((w) => [w.id, w])), remoteIds = new Set();
  for (const r of wo.data || []) {
    remoteIds.add(r.id);
    const mine = have.get(r.id);
    if (!mine || old[r.id] === Cloud.hash(mine)) have.set(r.id, r.data);
    sync[r.id] = Cloud.hash(r.data);
  }
  for (const [id, w] of have) if (!remoteIds.has(id) && old[id] && old[id] === Cloud.hash(w)) have.delete(id);
  S.workouts = [...have.values()].sort((x, y) => (x.date < y.date ? 1 : -1));
  lsSet("pp1.workouts", S.workouts); lsSet("pp1.wsync", sync);

  // The coach's program: the latest one that has started, else the next one coming up. Maxes come with it.
  const today = todayISO(), progs = (pr.data || []).map((r) => ({ ...r.data, id: r.id, name: r.name || (r.data && r.data.name) || "Program", _at: r.updated_at }));
  const pick = PP.pickProgram(progs, today); // the same choice the coach's dashboard shows
  const maxes = {};
  for (const m of mx.data || []) { const o = {}; for (const k of ["rm5", "rm1", "target"]) if (m[k] != null && +m[k] > 0) o[k] = +m[k]; maxes[m.ex] = o; }
  if (pick) { delete pick._at; S.program = { ...pick, maxes, sample: false, cloud: true }; lsSet("pp1.program", S.program); }
  else if (S.program && S.program.cloud) { S.program = PPSample.program(); try { localStorage.removeItem("pp1.program"); } catch {} }

  if (Cloud.hash([S.state, S.workouts, S.days, S.program]) !== before) render();
  pushAll();
}

async function signOutNow() {
  clearTimeout(CL.timer); await pushAll();
  if (CL.failed && !confirm("Some changes haven’t reached your account yet (no connection). Sign out anyway and lose them?")) return;
  CL.leaving = true; clearTimeout(saveTimer);
  await Cloud.signOut();
  for (const k of LOCAL_KEYS) try { localStorage.removeItem(k); } catch {}
  location.hash = ""; location.reload();
}

async function startCloud() {
  if (!Cloud || !Cloud.client()) return; // the sign-in library couldn't load; keep working on this phone
  let s = await Cloud.session();
  if (!s || Cloud.isRecovery()) s = await Cloud.authScreen({ app: APP_NAME, sub: "Use the email you gave the gym. First time? Create an account." });
  if (!s) return;
  const prev = lsGet("pp1.uid");
  if (prev && prev !== s.user.id) { for (const k of LOCAL_KEYS) try { localStorage.removeItem(k); } catch {} load(); MSG.list = []; } // someone else used this phone
  lsSet("pp1.uid", s.user.id);
  CL.user = s.user; render();
  try { await pull(); } catch { CL.failed = true; }
  loadCoachNames().then(() => loadMessages()).catch(() => {});
  subscribeMessages();
  window.addEventListener("online", () => { pushAll(); loadMessages().catch(() => {}); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (Date.now() - CL.pulledAt > 60000) pull().catch(() => {});
    loadMessages().catch(() => {});
  });
  Cloud.client().auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT" && CL.user && !CL.leaving) { CL.user = null; location.reload(); } });
}

/* ================= Messages with the coaches ================= */
// One conversation per client that every coach can answer. Clients can attach a form-check video tied to a movement
// and a workout; coaches can answer with a Loom video. Loaded on sign-in, kept live, cached on the phone for offline reading.
const PM = window.PPMessages;
const MSG = { list: lsGet("pp1.msgs") || [], coaches: {}, err: "", sending: false, ch: null };
const unreadCount = () => (CL.user ? MSG.list.filter((m) => m.sender_id !== CL.user.id && !m.read_at).length : 0);
function msgBadge() { const el = document.querySelector('[data-tab="coach"] .badge'); if (!el) return; const n = unreadCount(); el.textContent = n > 9 ? "9+" : String(n); el.hidden = !n; }
async function loadMessages() {
  const c = Cloud && Cloud.client(); if (!CL.user || !c) return;
  const r = await c.from("messages").select(PM.COLS).eq("client_id", CL.user.id).order("created_at", { ascending: true }).limit(1000);
  if (r.error) return;
  const changed = Cloud.hash(r.data) !== Cloud.hash(MSG.list);
  MSG.list = r.data; lsSet("pp1.msgs", MSG.list);
  if (S.ui.view === "coach") { if (changed) refreshConversation(); markRead(); } else msgBadge();
}
async function loadCoachNames() {
  const c = Cloud.client(); try { const { data } = await c.rpc("coach_names"); for (const x of data || []) MSG.coaches[x.id] = x.name; } catch {}
}
async function markRead() {
  const c = Cloud && Cloud.client(), uid = CL.user && CL.user.id; if (!uid || !c || document.visibilityState !== "visible") return;
  const unread = MSG.list.filter((m) => m.sender_id !== uid && !m.read_at); if (!unread.length) return;
  const now = new Date().toISOString();
  const { error } = await c.from("messages").update({ read_at: now }).eq("client_id", uid).neq("sender_id", uid).is("read_at", null);
  if (!error) { for (const m of unread) m.read_at = now; lsSet("pp1.msgs", MSG.list); msgBadge(); }
}
function subscribeMessages() {
  const c = Cloud.client(); if (!c.channel || MSG.ch) return;
  MSG.ch = c.channel("msgs-" + CL.user.id)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `client_id=eq.${CL.user.id}` }, () => loadMessages())
    .subscribe();
}
function conversationHTML() {
  const uid = CL.user.id;
  if (!MSG.list.length) return `<div class="pm-empty">No messages yet. Ask your coach anything, or send a short video of a lift for feedback on your form.</div>`;
  return MSG.list.map((m) => {
    const mine = m.sender_id === uid, w = m.workout_id && S.workouts.find((x) => x.id === m.workout_id);
    const tag = m.ex || w ? `Form check${m.ex ? " · " + esc(getEx(m.ex).name) : ""}${w ? " · " + esc(dateLabel(w.date)) : ""}` : "";
    return PM.bubble(m, { mine, who: mine ? "You" : MSG.coaches[m.sender_id] || "Your coach", tag });
  }).join("");
}
function composeHTML() {
  const cm = S.ui.compose || {};
  const ids = new Set(); const pr = program();
  if (pr && pr.weeks) for (const wk of pr.weeks) for (const d of wk.days) for (const it of d.items) ids.add(it.ex);
  for (const w of S.workouts.slice(0, 20)) for (const e of w.exercises || []) ids.add(e.ex || e.lift);
  if (cm.ex) ids.add(cm.ex);
  const exOpts = [...ids].filter((id) => id && meta(id)).map((id) => [id, getEx(id).name]).sort((a, b) => a[1].localeCompare(b[1]))
    .map(([id, n]) => `<option value="${esc(id)}" ${id === cm.ex ? "selected" : ""}>${esc(n)}</option>`).join("");
  const wOpts = S.workouts.slice(0, 20).map((w) => `<option value="${esc(w.id)}" ${w.id === cm.wid ? "selected" : ""}>${esc(dateLabel(w.date))} · ${esc(wName(w))}</option>`).join("");
  return `<textarea id="m-body" class="text-in" rows="3" placeholder="Message your coaches. For a form check, say what felt off." aria-label="Message">${esc(S.ui.draft || "")}</textarea>
    <div class="row"><label class="btn small" for="m-file" role="button" tabindex="0">🎥 Add a video</label><input type="file" id="m-file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden>
      <span class="note grow" id="m-fname"></span><button class="btn small ghost" data-act="m-clear-file" hidden>Remove</button></div>
    <div class="row"><select id="m-ex" class="text-in" aria-label="Movement"><option value="">Movement (optional)</option>${exOpts}</select>
      <select id="m-w" class="text-in" aria-label="Workout"><option value="">Workout (optional)</option>${wOpts}</select></div>
    <div id="m-err">${MSG.err ? `<span class="note" role="alert" style="color:var(--accent)">${esc(MSG.err)}</span>` : ""}</div>
    <button class="btn primary" data-act="m-send" ${MSG.sending ? "disabled" : ""}>${MSG.sending ? "Sending…" : "Send"}</button>
    <span class="note">Videos up to 50 MB (about a minute from a phone). Every coach at the gym can read and answer this conversation.</span>`;
}
function renderCoach() {
  PM.css();
  if (!CL.user) return `${header("Messages", "Coach")}<section class="panel"><span class="sub">Sign in to message your coaches.</span></section>`;
  return `${header("Messages", "Coach")}
    <section class="pm-list" id="conv">${conversationHTML()}</section>
    <section class="panel compose" id="compose">${composeHTML()}</section>`;
}
function afterCoachRender() { PM.hydrate($("#conv")); markRead(); if (S.ui.compose && (S.ui.compose.ex || S.ui.compose.wid)) $("#compose")?.scrollIntoView({ block: "end" }); else $("#conv")?.lastElementChild?.scrollIntoView({ block: "end" }); }
// Update the conversation without touching what's being typed.
function refreshConversation() { const el = $("#conv"); if (!el) return; el.innerHTML = conversationHTML(); PM.hydrate(el); el.lastElementChild?.scrollIntoView({ block: "end" }); msgBadge(); }
function refreshCompose() { const el = $("#m-err"); if (el) el.innerHTML = MSG.err ? `<span class="note" role="alert" style="color:var(--accent)">${esc(MSG.err)}</span>` : ""; const b = $("[data-act='m-send']"); if (b) { b.disabled = MSG.sending; b.textContent = MSG.sending ? "Sending…" : "Send"; } }
async function sendMessage() {
  if (MSG.sending || !CL.user) return;
  const c = Cloud.client(), uid = CL.user.id;
  const body = ($("#m-body")?.value || "").trim(), file = $("#m-file")?.files?.[0] || null;
  const ex = $("#m-ex")?.value || null, wid = $("#m-w")?.value || null;
  if (!body && !file) { MSG.err = "Write a message or add a video first."; refreshCompose(); return; }
  const bad = PM.checkVideo(file); if (bad) { MSG.err = bad; refreshCompose(); return; }
  if (!navigator.onLine) { MSG.err = "You’re offline. Send this when you have a connection."; refreshCompose(); return; }
  MSG.sending = true; MSG.err = file ? "" : ""; refreshCompose();
  if (file) { const el = $("#m-err"); if (el) el.innerHTML = `<span class="note">Uploading the video… keep the app open.</span>`; }
  let path = null;
  try {
    // The workout has to be in the account before a message can point at it.
    let workout = wid && (lsGet("pp1.wsync") || {})[wid] ? wid : null;
    if (wid && !workout) { clearTimeout(CL.timer); await pushAll(); workout = (lsGet("pp1.wsync") || {})[wid] ? wid : null; }
    if (file) path = await PM.upload(uid, file);
    const { error } = await c.from("messages").insert({ client_id: uid, sender_id: uid, body, video_path: path, workout_id: workout, ex: ex || null });
    if (error) throw error;
    S.ui.draft = ""; S.ui.compose = null; MSG.err = ""; MSG.sending = false;
    await loadMessages(); render();
  } catch (e) {
    if (path) PM.removeUpload(path);
    MSG.sending = false; MSG.err = "Couldn’t send: " + Cloud.friendly(e); refreshCompose();
  }
}

/* ================= Boot ================= */
load();
route();
if (!PREVIEW) startCloud();
})();
