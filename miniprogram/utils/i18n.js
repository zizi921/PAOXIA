const STORAGE_KEY = 'paoxia.language';

const COPY = {
  en: {
    home: {
      go: 'GO', continueRun: 'Continue run', continueDraft: 'Continue draft', history: 'Days Out.',
      goAria: 'Start run timer', continueRunAria: 'Continue this run', continueDraftAria: 'Continue your draft', historyAria: 'View running history',
      loadError: 'Could not load your run or draft.'
    },
    run: {
      moving: 'Moving', breath: 'Take a breath.', pause: 'Pause', resume: 'Resume', done: 'Done',
      timeAria: 'Current run time', distanceAria: 'Current run distance', pauseAria: 'Pause run timer', resumeAria: 'Resume run timer', doneAria: 'Finish run and fill in recap',
      findingGps: 'Finding GPS…', gpsOn: 'GPS on · distance updates automatically', distancePaused: 'Distance paused', gpsNeeded: 'Distance needs phone GPS', allowLocation: 'Allow location to calculate distance',
      restoreError: 'Could not save or restore this run.', stateError: 'Could not save run state.', finishError: 'Could not finish this run.'
    },
    recap: {
      edit: 'Edit', so: 'So?', weather: 'Weather', notSelected: 'Not selected', weatherMenuAria: 'Weather options',
      weatherOptions: { sunny: 'Sunny', cloudy: 'Cloudy', rainy: 'Rainy', windy: 'Windy' },
      howWasIt: 'How was it?', good: 'Good', calm: 'Calm', tired: 'Tired', unsure: 'Not sure',
      whatNotice: 'What did you notice?', tree: 'Tree', wind: 'Wind', cloud: 'Cloud', cat: 'Cat', streetlight: 'Streetlight', dog: 'Dog', flower: 'Flower', didnt: 'Didn’t', notice: 'notice',
      distance: 'Distance', editHint: '(edit)', notePlaceholder: 'A little note, if you like',
      save: 'Save →', saveChanges: 'Save changes →', continueRun: 'Continue this run', cancel: 'Cancel', discardDraft: 'Discard draft', deleteRun: 'Delete this run',
      discardTitle: 'Discard draft?', discardContent: 'Your time and notes will be deleted. This run will not be saved.', discardConfirm: 'Discard', keep: 'Keep',
      deleteTitle: 'Delete this run?', deleteContent: 'This saved run and its details will be permanently deleted.', deleteConfirm: 'Delete',
      loadRecordError: 'Could not load this run. Reopen it.', loadDraftError: 'Could not load draft. Reopen this page.', draftError: 'Could not save draft. Try again.',
      continueError: 'Could not open run. Try again.', discardError: 'Could not discard draft. Try again.', discardNavError: 'Draft discarded. Could not open home.', historyError: 'Could not open history. Try again.',
      deleteError: 'Could not delete this run. Try again.', deleteNavError: 'Run deleted. Could not open history.', saveChangesError: 'Could not save changes. Try again.', saveError: 'Could not save this run. Try again.', cleanupError: 'Run saved. Draft cleanup failed.', savedNavError: 'Run saved. Tap Save to open history.'
    },
    history: {
      title: 'Days Out.', edit: 'Edit', year: 'Year', month: 'Month', day: 'Day', previous: 'Previous period', next: 'Next period', monthFilter: 'Filter month', dayFilter: 'Filter date', viewRecord: 'View run on', viewMonth: 'View runs in',
      noRuns: 'No days out yet.', noRunsCopy: 'Go again, then save your first run.', localCopy: 'Your saved runs stay on this device.',
      noMonth: 'No days out this month.', noMonthCopy: 'Pick another month or go again.', noYear: 'No days out this year.', noYearCopy: 'Try another year or start a new run.',
      dayKicker: 'DAY', timeKicker: 'TIME OUT', distanceKicker: 'DISTANCE', felt: 'FELT', spotted: 'Spotted out there', nothing: 'Nothing noted this time.', noNote: 'No note this time.',
      noDay: 'No day out here yet.', noDayCopy: 'Choose another date or go again.', goAgain: 'Go again',
      notSet: 'Not set', good: 'Good', calm: 'Calm', tired: 'Tired', unsure: 'Not sure',
      tree: 'Tree', wind: 'Wind', cloud: 'Cloud', cat: 'Cat', dog: 'Dog', flower: 'Flower', sun: 'Sun', moon: 'Moon', streetlight: 'Streetlight', didntNotice: 'Didn’t notice',
      emptyYearHint: 'Try another year.', emptyMonthHint: 'Pick another month.', readError: 'Could not read saved runs.', editError: 'Could not open edit. Try again.'
    }
  },
  zh: {
    home: {
      go: '出发', continueRun: '继续跑步', continueDraft: '继续填写', history: '跑步记录',
      goAria: '开始跑步计时', continueRunAria: '继续本次跑步', continueDraftAria: '继续填写跑后记录', historyAria: '查看跑步记录',
      loadError: '无法读取跑步或草稿'
    },
    run: {
      moving: '跑起来', breath: '休息一下', pause: '暂停', resume: '继续', done: '完成',
      timeAria: '当前跑步时长', distanceAria: '当前跑步距离', pauseAria: '暂停跑步计时', resumeAria: '继续跑步计时', doneAria: '结束跑步并填写跑后记录',
      findingGps: '正在寻找 GPS…', gpsOn: 'GPS 已开启 · 距离自动更新', distancePaused: '距离记录已暂停', gpsNeeded: '距离记录需要手机 GPS', allowLocation: '请允许定位以计算距离',
      restoreError: '无法保存或恢复本次跑步', stateError: '无法保存跑步状态', finishError: '无法结束本次跑步'
    },
    recap: {
      edit: '编辑', so: '跑完啦', weather: '天气', notSelected: '未选择', weatherMenuAria: '天气选项',
      weatherOptions: { sunny: '晴天', cloudy: '多云', rainy: '下雨', windy: '有风' },
      howWasIt: '感觉怎么样？', good: '不错', calm: '平静', tired: '累了', unsure: '说不准',
      whatNotice: '一路看到了什么？', tree: '树', wind: '风', cloud: '云', cat: '猫', streetlight: '路灯', dog: '狗', flower: '花', didnt: '没特别', notice: '留意',
      distance: '距离', editHint: '（修改）', notePlaceholder: '想写点什么也可以',
      save: '保存 →', saveChanges: '保存修改 →', continueRun: '继续这次跑步', cancel: '取消', discardDraft: '放弃草稿', deleteRun: '删除这次记录',
      discardTitle: '放弃草稿？', discardContent: '本次时长和填写内容将被删除，且不会保存为跑步记录。', discardConfirm: '放弃', keep: '保留',
      deleteTitle: '删除这次记录？', deleteContent: '这条跑步记录及其内容将被永久删除。', deleteConfirm: '删除',
      loadRecordError: '无法读取这条记录，请重新打开', loadDraftError: '无法读取草稿，请重新打开页面', draftError: '无法保存草稿，请重试',
      continueError: '无法打开跑步页面，请重试', discardError: '无法放弃草稿，请重试', discardNavError: '草稿已放弃，但无法返回首页', historyError: '无法打开跑步记录，请重试',
      deleteError: '无法删除这条记录，请重试', deleteNavError: '记录已删除，但无法打开跑步记录', saveChangesError: '无法保存修改，请重试', saveError: '无法保存这次记录，请重试', cleanupError: '记录已保存，但草稿清理失败', savedNavError: '记录已保存，请再次点击保存进入跑步记录'
    },
    history: {
      title: '跑步记录', edit: '编辑', year: '年', month: '月', day: '日', previous: '上一个时间段', next: '下一个时间段', monthFilter: '筛选月份', dayFilter: '筛选日期', viewRecord: '查看跑步记录', viewMonth: '查看月份记录',
      noRuns: '还没有跑步记录', noRunsCopy: '再跑一次，保存你的第一条记录。', localCopy: '记录会保存在这台设备上。',
      noMonth: '这个月还没有跑步记录', noMonthCopy: '换一个月份，或再跑一次。', noYear: '这一年还没有跑步记录', noYearCopy: '换一个年份，或开始一次跑步。',
      dayKicker: '日期', timeKicker: '跑步时长', distanceKicker: '距离', felt: '感受', spotted: '沿途看到', nothing: '这次没有特别记录', noNote: '这次没有备注',
      noDay: '这一天还没有跑步记录', noDayCopy: '选择其他日期，或再跑一次。', goAgain: '再跑一次',
      notSet: '未填写', good: '不错', calm: '平静', tired: '累了', unsure: '说不准',
      tree: '树', wind: '风', cloud: '云', cat: '猫', dog: '狗', flower: '花', sun: '太阳', moon: '月亮', streetlight: '路灯', didntNotice: '没特别留意',
      emptyYearHint: '换一个年份看看', emptyMonthHint: '换一个月份看看', readError: '无法读取本机记录', editError: '无法打开编辑页面，请重试'
    }
  }
};

function normalizeLanguage(value) { return value === 'zh' ? 'zh' : 'en'; }

function readLanguage() {
  return normalizeLanguage(wx.getStorageSync(STORAGE_KEY));
}

function saveLanguage(language) {
  const value = normalizeLanguage(language);
  wx.setStorageSync(STORAGE_KEY, value);
  return value;
}

function copyFor(language, page) {
  return COPY[normalizeLanguage(language)][page];
}

module.exports = { readLanguage, saveLanguage, copyFor, normalizeLanguage };
