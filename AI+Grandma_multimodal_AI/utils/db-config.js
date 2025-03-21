export const collections = {
  MEDICINES: 'medicines',
  REMINDERS: 'reminders',
  USERS: 'users',
  USAGE_RECORDS: 'usage_records'
}

export const indexes = {
  medicines: [
    {
      key: { userId: 1, createTime: -1 },
      name: 'userId_createTime'
    }
  ],
  reminders: [
    {
      key: { userId: 1, status: 1 },
      name: 'userId_status'
    }
  ],
  usage_records: [
    {
      key: { userId: 1, medicineId: 1, createTime: -1 },
      name: 'userId_medicineId_createTime'
    }
  ]
} 