/**
 * The reservable iCARE rooms. `value` must match the Google Form option text
 * exactly, because that is what the Form writes into the sheet.
 */
export const ROOMS = [
  {
    value: "Audio-Visual Room / Enhancement Area (Capacity: 40)",
    label: "Audio-Visual Room",
    capacity: 40,
  },
  {
    value: "Individual Training / Small Group Discussion Room (Capacity: 10)",
    label: "Training Room",
    capacity: 10,
  },
];

export function findRoom(value) {
  const v = (value || "").trim();
  return ROOMS.find((room) => room.value === v) || null;
}
