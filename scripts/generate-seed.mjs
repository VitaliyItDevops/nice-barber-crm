/**
 * One-off seed generator. Run: node scripts/generate-seed.mjs
 * Reference "today" fixed to 2026-09-26 for reproducible seed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TODAY = new Date(2026, 8, 26); // Sep 26, 2026 local

const barberIds = [
  "a1111111-1111-1111-1111-111111111111",
  "a2222222-2222-2222-2222-222222222222",
  "a3333333-3333-3333-3333-333333333333",
  "a4444444-4444-4444-4444-444444444444",
];
const barberNames = ["Mark", "Thomas", "Jacob", "Peter"];

const services = [
  { id: "b1111111-1111-1111-1111-111111111111", name: "MY. FADE", name_en: "Fade", price: 23, duration: 45 },
  { id: "b2222222-2222-2222-2222-222222222222", name: "MY. CLASSIC HAIRCUT", name_en: "Classic Haircut", price: 25, duration: 60 },
  { id: "b3333333-3333-3333-3333-333333333333", name: "MY. BEARD TRIM", name_en: "Beard Trim", price: 18, duration: 30 },
  { id: "b4444444-4444-4444-4444-444444444444", name: "MY. WELLNESS CUT", name_en: "Wellness Cut", price: 60, duration: 120 },
  { id: "b5555555-5555-5555-5555-555555555555", name: "MY. BEARD COLORING", name_en: "Beard Coloring", price: 15, duration: 30 },
  { id: "b6666666-6666-6666-6666-666666666666", name: "MY. COMBO", name_en: "Combo", price: 35, duration: 90 },
  { id: "b7777777-7777-7777-7777-777777777777", name: "MY. KIDS HAIRCUT", name_en: "Kids Haircut", price: 20, duration: 60 },
];

const clients = [
  ["James Smith", "+421901234567"],
  ["John Johnson", "+421902345678"],
  ["Robert Williams", "+421903456789"],
  ["Michael Brown", "+421904567890"],
  ["William Jones", "+421905678901"],
  ["David Miller", "+421906789012"],
  ["Richard Davis", "+421907890123"],
  ["Joseph Wilson", "+421908901234"],
  ["Thomas Moore", "+421909012345"],
  ["Charles Taylor", "+421910123456"],
  ["Daniel Anderson", "+421911234567"],
  ["Matthew Thomas", "+421912345678"],
  ["Anthony Jackson", "+421913456789"],
  ["Andrew White", "+421914567890"],
  ["Joshua Harris", "+421915678901"],
  ["Ryan Martin", "+421916789012"],
  ["Kevin Thompson", "+421917890123"],
  ["Brian Garcia", "+421918901234"],
  ["George Clark", "+421919012345"],
  ["Edward Lewis", "+421920123456"],
];

const clientIds = clients.map((_, i) => {
  const n = (i + 1).toString(16).padStart(12, "0");
  return `c0000000-0000-4000-8000-${n}`;
});

function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isBusinessDay(d) {
  const day = d.getDay();
  return day !== 0; // no Sunday
}
function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${pad(h)}:${pad(min)}:00`;
}
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Occupancy: barberId|date -> [{start,end}]
const occupied = new Map();
function key(barberId, dateStr) {
  return `${barberId}|${dateStr}`;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function canPlace(barberId, dateStr, startMin, endMin) {
  const list = occupied.get(key(barberId, dateStr)) || [];
  return !list.some((s) => overlaps(startMin, endMin, s.start, s.end));
}
function place(barberId, dateStr, startMin, endMin) {
  const k = key(barberId, dateStr);
  if (!occupied.has(k)) occupied.set(k, []);
  occupied.get(k).push({ start: startMin, end: endMin });
}

const comboCount = new Map();
function comboKey(clientId, serviceId) {
  return `${clientId}|${serviceId}`;
}
function canUseCombo(clientId, serviceId) {
  return (comboCount.get(comboKey(clientId, serviceId)) || 0) < 3;
}
function useCombo(clientId, serviceId) {
  const k = comboKey(clientId, serviceId);
  comboCount.set(k, (comboCount.get(k) || 0) + 1);
}

function pick(arr, i) {
  return arr[i % arr.length];
}

function tryFindSlot(date, preferredStartMin, duration, preferBarberIdx) {
  const dateStr = fmtDate(date);
  const dayEnd = 19 * 60;
  const dayStart = 9 * 60;
  const order = [0, 1, 2, 3].map((o) => (preferBarberIdx + o) % 4);

  for (const bi of order) {
    const barberId = barberIds[bi];
    // try preferred and then scan
    const starts = [];
    if (preferredStartMin != null) starts.push(preferredStartMin);
    for (let m = dayStart; m + duration <= dayEnd; m += 15) {
      if (m !== preferredStartMin) starts.push(m);
    }
    for (const startMin of starts) {
      const endMin = startMin + duration;
      if (endMin > dayEnd) continue;
      if (canPlace(barberId, dateStr, startMin, endMin)) {
        return { barberId, barberIdx: bi, startMin, endMin, dateStr };
      }
    }
  }
  return null;
}

const bookings = [];
let bookingSeq = 0;
function addBooking({ date, status, serviceIdx, clientIdx, preferStart, preferBarber }) {
  const service = services[serviceIdx % services.length];
  let clientId = clientIds[clientIdx % clientIds.length];
  // find client+service under limit
  for (let attempt = 0; attempt < 40; attempt++) {
    const ci = (clientIdx + attempt) % clientIds.length;
    const si = (serviceIdx + Math.floor(attempt / 5)) % services.length;
    const svc = services[si];
    if (!canUseCombo(clientIds[ci], svc.id)) continue;
    const slot = tryFindSlot(date, preferStart ?? null, svc.duration, preferBarber ?? attempt % 4);
    if (!slot) continue;
    place(slot.barberId, slot.dateStr, slot.startMin, slot.endMin);
    useCombo(clientIds[ci], svc.id);
    bookingSeq += 1;
    const id = `d0000000-0000-4000-8000-${bookingSeq.toString(16).padStart(12, "0")}`;
    bookings.push({
      id,
      client_id: clientIds[ci],
      barber_id: slot.barberId,
      service_id: svc.id,
      booking_date: slot.dateStr,
      start_time: minutesToTime(slot.startMin),
      end_time: minutesToTime(slot.endMin),
      status,
      rescheduled_count: status === "completed" && attempt % 7 === 0 ? 1 : 0,
    });
    return true;
  }
  return false;
}

// Collect business days
const pastDays = [];
const futureDays = [];
for (let i = 30; i >= 1; i--) {
  const d = addDays(TODAY, -i);
  if (isBusinessDay(d)) pastDays.push(d);
}
for (let i = 0; i <= 7; i++) {
  const d = addDays(TODAY, i);
  if (isBusinessDay(d)) futureDays.push(d);
}

// 30 completed in the past
let completed = 0;
for (let i = 0; completed < 30 && i < 500; i++) {
  const date = pastDays[i % pastDays.length];
  const hourSlots = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  const start = hourSlots[i % hourSlots.length] * 60 + (i % 2 === 0 ? 0 : 30);
  if (addBooking({ date, status: "completed", serviceIdx: i, clientIdx: i * 3, preferStart: start, preferBarber: i % 4 })) {
    completed++;
  }
}

// 3 no_show — at least 2 on Friday 17:00-19:00
const fridays = pastDays.filter((d) => d.getDay() === 5);
const noShowSpecs = [
  { date: fridays[fridays.length - 1] || pastDays[0], preferStart: 17 * 60 },
  { date: fridays[Math.max(0, fridays.length - 2)] || pastDays[1], preferStart: 17 * 60 + 30 },
  { date: pastDays[5], preferStart: 11 * 60 },
];
let noShows = 0;
for (let i = 0; i < noShowSpecs.length; i++) {
  if (
    addBooking({
      date: noShowSpecs[i].date,
      status: "no_show",
      serviceIdx: i + 1,
      clientIdx: i * 5 + 2,
      preferStart: noShowSpecs[i].preferStart,
      preferBarber: i % 4,
    })
  ) {
    noShows++;
  }
}

// 4 cancelled (past)
let cancelled = 0;
for (let i = 0; cancelled < 4 && i < 100; i++) {
  const date = pastDays[(i + 3) % pastDays.length];
  if (
    addBooking({
      date,
      status: "cancelled",
      serviceIdx: i + 2,
      clientIdx: i * 4 + 1,
      preferStart: (10 + (i % 6)) * 60,
      preferBarber: (i + 1) % 4,
    })
  ) {
    cancelled++;
  }
}

// 8 confirmed — today/future only
let confirmed = 0;
const confirmDays = futureDays.length ? futureDays : [TODAY];
for (let i = 0; confirmed < 8 && i < 200; i++) {
  const date = confirmDays[i % confirmDays.length];
  if (
    addBooking({
      date,
      status: "confirmed",
      serviceIdx: i + 3,
      clientIdx: i * 2 + 7,
      preferStart: (9 + (i % 8)) * 60 + (i % 2) * 15,
      preferBarber: i % 4,
    })
  ) {
    confirmed++;
  }
}

// Fill remaining to 45 with completed if short
while (bookings.length < 45) {
  const date = pastDays[bookings.length % pastDays.length];
  if (
    !addBooking({
      date,
      status: "completed",
      serviceIdx: bookings.length,
      clientIdx: bookings.length * 2,
      preferStart: 9 * 60 + (bookings.length % 20) * 15,
      preferBarber: bookings.length % 4,
    })
  ) {
    break;
  }
}

const counts = bookings.reduce((a, b) => {
  a[b.status] = (a[b.status] || 0) + 1;
  return a;
}, {});
console.error("Bookings:", bookings.length, counts);
console.error("No-show Friday evening:", bookings.filter((b) => b.status === "no_show").map((b) => `${b.booking_date} ${b.start_time}`));

let sql = `-- Nice Barber CRM seed data
-- Run AFTER schema.sql
-- Reference date for distribution: 2026-09-26
-- Truncates existing CRM data (safe for fresh projects)

truncate table bookings, barber_time_off, clients, services, barbers restart identity cascade;

`;

sql += `insert into barbers (id, name, active) values\n`;
sql += barberIds.map((id, i) => `  ('${id}', '${barberNames[i]}', true)`).join(",\n") + ";\n\n";

sql += `insert into services (id, name, name_en, price, duration_minutes) values\n`;
sql +=
  services
    .map((s) => `  ('${s.id}', '${s.name.replace(/'/g, "''")}', '${s.name_en}', ${s.price.toFixed(2)}, ${s.duration})`)
    .join(",\n") + ";\n\n";

sql += `insert into clients (id, name, phone) values\n`;
sql += clients.map((c, i) => `  ('${clientIds[i]}', '${c[0].replace(/'/g, "''")}', '${c[1]}')`).join(",\n") + ";\n\n";

sql += `insert into bookings (id, client_id, barber_id, service_id, booking_date, start_time, end_time, status, rescheduled_count) values\n`;
sql +=
  bookings
    .map(
      (b) =>
        `  ('${b.id}', '${b.client_id}', '${b.barber_id}', '${b.service_id}', '${b.booking_date}', '${b.start_time}', '${b.end_time}', '${b.status}', ${b.rescheduled_count})`
    )
    .join(",\n") + ";\n\n";

// A couple of time-off examples in the future week
sql += `insert into barber_time_off (id, barber_id, date, reason) values
  ('e0000000-0000-4000-8000-000000000001', '${barberIds[0]}', '${fmtDate(addDays(TODAY, 3))}', 'Family day'),
  ('e0000000-0000-4000-8000-000000000002', '${barberIds[2]}', '${fmtDate(addDays(TODAY, 5))}', 'Training');\n`;

const out = path.join(__dirname, "..", "sql", "seed.sql");
fs.writeFileSync(out, sql, { encoding: "utf8" });
console.error("Wrote sql/seed.sql");
