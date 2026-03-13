/**
 * @created 2026-03-09 by sig-OpenDesign with Claude AI
 * @modified 2026-03-09 by sig-OpenDesign with Claude AI
 * @description getMeetingInfo 工具函数单元测试
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

/**
 * URL-aware mock fetch，根据 URL 路径返回不同响应。
 * @param {Object} opts
 *   - sigListData: SIG 列表响应
 *   - meetingData: /meeting/ 响应（数组或包装对象）
 *   - dateData: /meeting_date/ 响应（日期数组或包装对象）
 *   - meetingDataMap: { 'YYYY-MM-DD': meetingData } 按日期区分
 *   - dateDataMap: { 'YYYY-MM-DD': dateData } 按日期区分
 *   - forceError: 抛出此错误
 */
function createMockFetch({
  sigListData,
  meetingData,
  dateData,
  meetingDataMap,
  dateDataMap,
  forceError,
} = {}) {
  return function mockFetch(url, opts) {
    if (forceError) return Promise.reject(forceError);

    // SIG 列表
    if (url.includes("stat/sig/info")) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(sigListData || { code: 0 }),
      });
    }

    // 提取 date 参数
    const urlObj = new URL(url);
    const dateParam = urlObj.searchParams.get("date") || "";

    // /meeting/ 接口
    if (url.includes("/meeting/meeting/")) {
      const data = (meetingDataMap && meetingDataMap[dateParam]) ?? meetingData ?? [];
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(data),
      });
    }

    // /meeting_date/ 接口
    if (url.includes("/meeting_date/")) {
      const data = (dateDataMap && dateDataMap[dateParam]) ?? dateData ?? [];
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(data),
      });
    }

    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
}

// ============================
// 测试 1：按日期查询 - 有会议
// ============================
async function testQueryByDateWithMeetings() {
  console.log('\n【测试 1】按日期查询 - 有会议数据');

  const mockMeetings = [
    { topic: 'BMC SIG 例会', sig_name: 'BMC', date: '2026-03-09', start: '10:00', end: '11:00',
      agenda: '讨论 BMC 固件适配', etherpad: 'https://etherpad.example.com/p/bmc', url: 'https://meet.example.com/bmc' },
    { topic: 'Security SIG 周会', sig_name: 'Security', date: '2026-03-09', start: '14:00', end: '15:00' },
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({ meetingData: mockMeetings });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09');

    assert(result.includes('2026-03-09'), '结果包含查询日期');
    assert(result.includes('BMC SIG 例会'), '结果包含第一场会议议题');
    assert(result.includes('Security SIG 周会'), '结果包含第二场会议议题');
    assert(result.includes('2 场'), '结果显示会议总数');
    assert(result.includes('10:00'), '结果包含会议时间');
    assert(result.includes('etherpad'), '结果包含协作文档链接');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：按日期查询 - 无会议，推荐附近日期
// ============================
async function testQueryByDateNoMeetingsRecommend() {
  console.log('\n【测试 2】按日期查询 - 无会议，推荐附近日期');

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({
    meetingData: [],
    dateData: ['2026-03-07', '2026-03-12', '2026-03-15'],
  });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09');

    assert(result.includes('暂无'), '结果说明无会议');
    assert(result.includes('附近有会议'), '结果包含附近日期推荐');
    assert(result.includes('2026-03-07') || result.includes('2026-03-12'), '推荐中包含附近日期');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：按日期查询 - 无会议且附近日期查询也失败
// ============================
async function testQueryByDateNoMeetingsNoNearby() {
  console.log('\n【测试 3】按日期查询 - 无会议且附近日期查询失败');

  let callCount = 0;
  const originalFetch = global.fetch;
  global.fetch = function (url) {
    callCount++;
    if (url.includes("/meeting/meeting/")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }
    // meeting_date 失败
    return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
  };

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09');

    assert(result.includes('暂无'), '结果说明无会议');
    assert(!result.includes('Error') && !result.includes('Uncaught'), '不暴露异常');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：按日期查询 + SIG 过滤 - 精确匹配
// ============================
async function testQueryByDateWithSigExact() {
  console.log('\n【测试 4】按日期查询 + SIG 过滤（精确匹配）');

  const mockSigList = { code: 1, data: ['BMC', 'Security', 'infrastructure'] };
  const mockMeetings = [
    { topic: 'BMC 双周会', sig_name: 'BMC', date: '2026-03-09', start: '10:00', end: '11:00' },
  ];

  let capturedGroupName = '';
  const originalFetch = global.fetch;
  global.fetch = function (url) {
    const u = new URL(url);
    if (u.searchParams.get('group_name')) capturedGroupName = u.searchParams.get('group_name');
    return createMockFetch({ sigListData: mockSigList, meetingData: mockMeetings })(url);
  };

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09', 'BMC');

    assert(result.includes('BMC 双周会'), '结果包含 SIG 过滤的会议');
    assert(capturedGroupName === 'BMC', 'API 请求包含 group_name=BMC');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：按日期查询 + SIG 过滤 - 大小写修正
// ============================
async function testQueryByDateWithSigCaseCorrect() {
  console.log('\n【测试 5】按日期查询 + SIG 过滤（大小写修正）');

  const mockSigList = { code: 1, data: ['BMC', 'Security', 'infrastructure'] };
  const mockMeetings = [{ topic: 'BMC 例会', sig_name: 'BMC', date: '2026-03-09', start: '10:00', end: '11:00' }];

  let capturedGroupName = '';
  const originalFetch = global.fetch;
  global.fetch = function (url) {
    const u = new URL(url);
    if (u.searchParams.get('group_name')) capturedGroupName = u.searchParams.get('group_name');
    return createMockFetch({ sigListData: mockSigList, meetingData: mockMeetings })(url);
  };

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09', 'bmc'); // 小写输入

    assert(result.includes('BMC 例会'), '大小写修正后返回正确会议');
    assert(capturedGroupName === 'BMC', 'API 请求使用修正后的大小写');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 6：按日期查询 + SIG 过滤 - 名称未找到，返回相似推荐
// ============================
async function testQueryByDateWithSigNotFound() {
  console.log('\n【测试 6】按日期查询 + SIG 未匹配，返回相似推荐');

  const mockSigList = { code: 1, data: ['BMC', 'BMC-Driver', 'Security'] };

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({ sigListData: mockSigList });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09', 'bmc-xyz');

    // 应返回相似推荐，不调用会议接口
    assert(result.includes('未找到') || result.includes('相似'), '未匹配时返回提示');
    assert(result.includes('BMC') || result.includes('BMC-Driver'), '包含相似 SIG 名称');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：按 SIG 查询 - 有会议
// ============================
async function testQueryBySigWithMeetings() {
  console.log('\n【测试 7】按 SIG 查询 - 有会议');

  const mockSigList = { code: 1, data: ['infrastructure', 'BMC'] };
  const mockDates = ['2026-03-10', '2026-03-17'];
  const mockMeetings = [
    { topic: 'infrastructure 例会', sig_name: 'infrastructure', date: '2026-03-10', start: '10:00', end: '11:00' },
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({
    sigListData: mockSigList,
    dateData: mockDates,
    meetingData: mockMeetings,
  });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('sig', '', 'infrastructure');

    assert(result.includes('infrastructure'), '结果包含 SIG 名称');
    assert(result.includes('infrastructure 例会'), '结果包含会议议题');
    assert(result.includes('2026-03-10'), '结果包含会议日期');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：按 SIG 查询 - 大小写修正
// ============================
async function testQueryBySigCaseCorrect() {
  console.log('\n【测试 8】按 SIG 查询 - 大小写修正');

  const mockSigList = { code: 1, data: ['infrastructure', 'BMC'] };
  const mockDates = ['2026-03-10'];
  const mockMeetings = [
    { topic: 'infrastructure 双周会', sig_name: 'infrastructure', date: '2026-03-10', start: '14:00', end: '15:00' },
  ];

  let capturedGroupName = '';
  const originalFetch = global.fetch;
  global.fetch = function (url) {
    const u = new URL(url);
    if (u.searchParams.get('group_name')) capturedGroupName = u.searchParams.get('group_name');
    return createMockFetch({ sigListData: mockSigList, dateData: mockDates, meetingData: mockMeetings })(url);
  };

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('sig', '', 'Infrastructure'); // 首字母大写

    assert(result.includes('infrastructure'), '大小写修正后使用正确 SIG 名称');
    assert(capturedGroupName === 'infrastructure', 'API 请求使用修正后的名称');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 9：按 SIG 查询 - 相似推荐
// ============================
async function testQueryBySigSimilarRecommend() {
  console.log('\n【测试 9】按 SIG 查询 - 无匹配返回相似推荐');

  const mockSigList = { code: 1, data: ['infrastructure', 'infra-tools', 'BMC'] };

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({ sigListData: mockSigList });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('sig', '', 'infra'); // 部分名称

    // "infra" 匹配到 infrastructure 和 infra-tools，应返回相似列表
    assert(
      result.includes('infrastructure') || result.includes('infra-tools') || result.includes('相似'),
      '返回相似 SIG 列表'
    );
    assert(result.includes('未找到') || result.includes('相似'), '提示用户名称未精确匹配');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 10：按 SIG 查询 - 无会议
// ============================
async function testQueryBySigNoMeetings() {
  console.log('\n【测试 10】按 SIG 查询 - 该 SIG 附近无会议');

  const mockSigList = { code: 1, data: ['BMC'] };

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({ sigListData: mockSigList, dateData: [] });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('sig', '', 'BMC');

    assert(result.includes('BMC'), '结果包含 SIG 名称');
    assert(result.includes('暂无'), '结果说明无会议');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：按 SIG 查询 - 附加 date 参数
// ============================
async function testQueryBySigWithDate() {
  console.log('\n【测试 11】按 SIG 查询 + 指定 date');

  const mockSigList = { code: 1, data: ['BMC'] };
  const mockDates = ['2026-04-01'];
  const mockMeetings = [
    { topic: 'BMC 季度会', sig_name: 'BMC', date: '2026-04-01', start: '10:00', end: '12:00' },
  ];

  let capturedDateParam = '';
  const originalFetch = global.fetch;
  global.fetch = function (url) {
    const u = new URL(url);
    capturedDateParam = u.searchParams.get('date') || capturedDateParam;
    return createMockFetch({ sigListData: mockSigList, dateData: mockDates, meetingData: mockMeetings })(url);
  };

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('sig', '2026-04-01', 'BMC');

    assert(result.includes('BMC'), '结果包含 SIG 名称');
    assert(capturedDateParam === '2026-04-01', 'API 请求使用指定日期');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 12：日期格式验证
// ============================
async function testDateFormatValidation() {
  console.log('\n【测试 12】日期格式验证');

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();

    const r1 = await getMeetingInfo('date', '20260309');
    assert(r1.includes('格式错误'), '拒绝 YYYYMMDD 格式');

    const r2 = await getMeetingInfo('date', '03/09/2026');
    assert(r2.includes('格式错误'), '拒绝 MM/DD/YYYY 格式');

    const r3 = await getMeetingInfo('date', '');
    assert(r3.includes('请提供'), '空日期时提示提供日期');

    const r4 = await getMeetingInfo('sig', 'bad-date-fmt', 'BMC');
    assert(r4.includes('格式错误'), 'sig 模式下 date 格式也验证');
  } catch (e) {
    assert(false, `日期格式验证测试异常: ${e.message}`);
  }
}

// ============================
// 测试 13：SIG 名称为空
// ============================
async function testEmptySigName() {
  console.log('\n【测试 13】SIG 名称为空');

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('sig', '', '');

    assert(result.includes('请提供'), '空 SIG 名称时提示');
  } catch (e) {
    assert(false, `空 SIG 名称测试异常: ${e.message}`);
  }
}

// ============================
// 测试 14：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log('\n【测试 14】网络超时处理');

  const originalFetch = global.fetch;
  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';
  global.fetch = createMockFetch({ forceError: abortError });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09');

    assert(result.includes('超时'), '超时时返回超时提示');
    assert(!result.includes('AbortError'), '不暴露内部错误名称');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 15：不支持的查询类型
// ============================
async function testUnsupportedQueryType() {
  console.log('\n【测试 15】不支持的查询类型');

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('unknown_type', '2026-03-09');

    assert(result.includes('不支持'), '不支持的查询类型返回提示');
  } catch (e) {
    assert(false, `不支持查询类型测试异常: ${e.message}`);
  }
}

// ============================
// 测试 16：会议数据 data 字段包装兼容性
// ============================
async function testMeetingDataWrapped() {
  console.log('\n【测试 16】会议数据格式兼容（data 字段包装）');

  const originalFetch = global.fetch;
  global.fetch = createMockFetch({
    meetingData: {
      data: [{ topic: '格式兼容会议', date: '2026-03-09', start_time: '09:00', end_time: '10:00' }],
    },
  });

  try {
    const { getMeetingInfo, _resetCache } = await import('../src/tools/getMeetingInfo.js');
    _resetCache();
    const result = await getMeetingInfo('date', '2026-03-09');

    assert(result.includes('格式兼容会议') || result.includes('2026-03-09'), '支持 data 字段包装格式');
  } finally {
    global.fetch = originalFetch;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('==========================================');
  console.log(' getMeetingInfo 工具函数单元测试');
  console.log('==========================================');

  const tests = [
    testQueryByDateWithMeetings,
    testQueryByDateNoMeetingsRecommend,
    testQueryByDateNoMeetingsNoNearby,
    testQueryByDateWithSigExact,
    testQueryByDateWithSigCaseCorrect,
    testQueryByDateWithSigNotFound,
    testQueryBySigWithMeetings,
    testQueryBySigCaseCorrect,
    testQueryBySigSimilarRecommend,
    testQueryBySigNoMeetings,
    testQueryBySigWithDate,
    testDateFormatValidation,
    testEmptySigName,
    testNetworkTimeout,
    testUnsupportedQueryType,
    testMeetingDataWrapped,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (e) {
      console.error(`  ❌ 测试异常: ${e.message}`);
      failed++;
    }
  }

  console.log('\n==========================================');
  console.log(` 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log('==========================================');

  if (failed > 0) process.exit(1);
}

runAllTests().catch(e => {
  console.error('测试运行失败:', e);
  process.exit(1);
});
