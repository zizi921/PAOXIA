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

function updateRecord(id, changes) {
  const records = readRecords();
  const index = records.findIndex(record => record.id === id);
  if (index < 0) throw new Error('Record not found');
  const { distance, mood, moodType, notices, note } = changes;
  records[index] = { ...records[index], distance, mood, moodType, notices, note };
  wx.setStorageSync(STORAGE_KEY, records);
}

function deleteRecord(id) {
  const records = readRecords();
  const index = records.findIndex(record => record.id === id);
  if (index < 0) throw new Error('Record not found');
  records.splice(index, 1);
  wx.setStorageSync(STORAGE_KEY, records);
}

module.exports = { readRecords, saveRecord, updateRecord, deleteRecord };
