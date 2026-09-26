const STORAGE_KEY = 'paoxia.completedRuns';

function readRecords() {
  const records = wx.getStorageSync(STORAGE_KEY);
  if (records === '' || records === undefined || records === null) return [];
  if (!Array.isArray(records)) throw new Error('Invalid completed records');
  return records;
}

function saveRecord(record) {
  const records = readRecords();
  const baseId = record.id;
  let id = baseId;
  let suffix = 1;
  while (records.some(item => item.id === id)) id = `${baseId}-${suffix++}`;
  wx.setStorageSync(STORAGE_KEY, [{ ...record, id }, ...records]);
}

module.exports = { readRecords, saveRecord };
