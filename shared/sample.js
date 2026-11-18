/* A sample 6-week program in the gym's style, used until real programs come from the coach dashboard.
   Clearly marked sample: true. */
(function (root) {
  "use strict";
  const W = (...cells) => cells;
  function program() {
    return {
      v: 2, id: "sample-2", sample: true, name: "Strength Block (sample)", coach: "your coach", weeks: 6,
      schedule: "weekly", startDate: mondayThisWeek(), notes: "",
      weekNotes: ["Find your working weights. Leave 2–3 reps in the tank.", "", "", "Heaviest week so far. Rest fully.", "", "Deload: lighter, crisp reps."],
      days: [
        { id: "d1", name: "Lower", weekday: 1, note: "Brace hard before every squat rep.", warmup: "", blocks: [
          { id: "b1", ex: "squat", rest: 180, warmupSets: true, note: "", weeks: W("1x5 @75% (top set), 3x5 @70%", "1x4 @80% (top set), 3x5 @72.5%", "1x3 @85% (top set), 3x4 @75%", "1x2 @88% (top set), 3x3 @78%", "1x1 @92% (top set), 2x3 @80%", "3x5 @65%") },
          { id: "b2", ex: "rdl", rest: 120, weeks: W("3x8 @RPE7", "3x8 @RPE7.5", "3x8 @RPE8", "4x6 @RPE8", "4x6 @RPE8.5", "2x8 @RPE6") },
          { id: "b3", ex: "bulgarian", group: "A", weeks: W("3x8 @RPE7", "3x10 @RPE7", "3x12 @RPE7.5", "3x10 @RPE8", "3x8 @RPE8", "2x8 @RPE6") },
          { id: "b4", ex: "plank", group: "A", rest: 90, weeks: W("3x30s", "3x40s", "3x45s", "3x50s", "3x60s", "2x30s") },
        ] },
        { id: "d2", name: "Upper", weekday: 3, note: "", warmup: "", blocks: [
          { id: "b5", ex: "bench", rest: 180, warmupSets: true, weeks: W("4x6 @72.5%", "4x5 @75%", "4x5 @77.5%", "4x4 @80%", "1x3 @85%, 3x5 @72.5%", "3x5 @65%") },
          { id: "b6", ex: "row", rest: 120, weeks: W("4x8 @RPE7", "4x8 @RPE7.5", "4x8 @RPE8", "4x6 @RPE8", "4x6 @RPE8", "3x8 @RPE6") },
          { id: "b7", ex: "db_shoulder", group: "B", weeks: W("3x10 @RPE7", "3x10 @RPE7.5", "3x12 @RPE8", "3x10 @RPE8", "3xAMRAP @RPE9", "2x10 @RPE6") },
          { id: "b8", ex: "face_pull", group: "B", rest: 90, weeks: W("3x15 @RPE7", "3x15 @RPE7", "3x15 @RPE7.5", "3x15 @RPE8", "3x15 @RPE8", "2x15 @RPE6") },
        ] },
        { id: "d3", name: "Strongman", weekday: 5, note: "Event day. Film your heaviest yoke run for your coach.", warmup: "", blocks: [
          { id: "b9", ex: "trap_dl", rest: 150, warmupSets: true, weeks: W("1x5 @75%, 2x5 @70%", "1x3 @80%, 2x5 @72.5%", "1x3 @85%, 2x3 @77.5%", "1x2 @88%, 2x3 @80%", "1x1 @92%, 1x3 @80%", "2x5 @65%") },
          { id: "b10", ex: "sled_push", fields: ["w", "d", "s"], rest: 120, note: "Record the time for each push.", weeks: W("4x20yd @180", "4x20yd @200", "4x20yd @220", "4x20yd @240", "3x20yd @260", "3x20yd @180") },
          { id: "b11", ex: "farmer", fields: ["w", "d", "s"], rest: 90, weeks: W("3x40yd @50", "3x40yd @55", "3x40yd @60", "3x40yd @65", "3x40yd @70", "2x40yd @50") },
          { id: "b12", ex: "pushup", format: { t: "emom", every: 60, rounds: 8 }, weeks: W("8x8", "8x9", "8x10", "8x10", "8x12", "6x8") },
        ] },
      ],
    };
  }
  function mondayThisWeek() {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const api = { program };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PPSample = api;
})(typeof window !== "undefined" ? window : globalThis);
