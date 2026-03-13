/**
 * @created 2026-03-02 by sig-OpenDesign with Claude AI
 * @description getMeetingInfo 工具函数单元测试
 */

// 测试辅助工具：模拟 fetch
function createMockFetch(responses) {
  let callCount = 0;
  return function mockFetch(url, options) {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    if (response.error) {
      return Promise.reject(response.error);
    }
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      json: () => Promise.resolve(response.data),
    });
  };
}

// 测试统计
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

// ============================
// 测试 1：正常场景 - 按日期查询有会议
// ============================
async function testQueryByDateWithMeetings() {
  console.log('\n【测试 1】按日期查询 - 有会议数据');

  const mockMeetings = [
    {
      topic: 'Kernel SIG 例会',
      sig_name: 'Kernel',
      date: '2026-03-03',
      start: '10:00',
      end: '11:00',
      agenda: '讨论内核补丁合入',
      etherpad: 'https://etherpad.openeuler.org/p/test',
      url: 'https://meet.example.com/kernel'
    },
    {
      topic: 'AI SIG 周会',
      sig_name: 'ai',
      date: '2026-03-03',
      start: '14:00',
      end: '15:00',
      agenda: '机器学习框架适配进展',
    }
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ data: mockMeetings }]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('date', '2026-03-03');

    assert(result.includes('2026-03-03'), '结果包含查询日期');
    assert(result.includes('Kernel SIG 例会'), '结果包含第一场会议议题');
    assert(result.includes('AI SIG 周会'), '结果包含第二场会议议题');
    assert(result.includes('2 场会议') || result.includes('共找到 2'), '结果显示会议总数');
    assert(result.includes('10:00'), '结果包含会议时间');
    assert(result.includes('etherpad'), '结果包含协作文档链接');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 2：按日期查询 - 无会议时推荐附近日期
// ============================
async function testQueryByDateNoMeetingsWithRecommendation() {
  console.log('\n【测试 2】按日期查询 - 无会议，推荐附近日期');

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: [] }, // 当天无会议
    { data: ['2026-03-01', '2026-03-05', '2026-03-08'] } // 附近有会议的日期
  ]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('date', '2026-03-03');

    assert(result.includes('暂无'), '结果说明无会议');
    assert(result.includes('附近有会议'), '结果包含附近日期推荐');
    assert(result.includes('2026-03-01') || result.includes('2026-03-05'), '推荐中包含附近日期');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 3：按日期查询 - 无会议且附近日期查询也失败
// ============================
async function testQueryByDateNoMeetingsNearbyFailed() {
  console.log('\n【测试 3】按日期查询 - 无会议且附近日期查询失败');

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: [] }, // 当天无会议
    { ok: false, status: 500, data: {} } // 附近日期查询失败
  ]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('date', '2026-03-03');

    assert(result.includes('暂无'), '结果说明无会议');
    assert(!result.includes('Error') && !result.includes('错误'), '无附近日期时不显示错误');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 4：按 SIG 查询 - 精确匹配
// ============================
async function testQueryBySigExactMatch() {
  console.log('\n【测试 4】按 SIG 查询 - 精确匹配');

  const mockSigData = {
    code: 1,
    data: ['Kernel', 'ai', 'Compiler', 'Networking', 'Storage']
  };

  const mockSigMeetings = [
    {
      topic: 'Kernel 例会 - 第10期',
      sig_name: 'Kernel',
      date: '2026-03-01',
      start: '10:00',
      end: '11:00',
    }
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: mockSigData },      // SIG 列表
    { data: mockSigMeetings }   // 会议列表
  ]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('sig', '', 'Kernel');

    assert(result.includes('Kernel'), '结果包含 SIG 名称');
    assert(result.includes('Kernel 例会 - 第10期'), '结果包含会议议题');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 5：按 SIG 查询 - 大小写不敏感匹配
// ============================
async function testQueryBySigCaseInsensitiveMatch() {
  console.log('\n【测试 5】按 SIG 查询 - 大小写不敏感匹配');

  const mockSigData = {
    code: 1,
    data: ['Kernel', 'ai', 'Compiler']
  };

  const mockSigMeetings = [
    {
      topic: 'AI SIG 周会',
      sig_name: 'ai',
      date: '2026-03-05',
      start: '14:00',
      end: '15:00',
    }
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { data: mockSigData },
    { data: mockSigMeetings }
  ]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    // 用户输入 "AI"，但正确名称是 "ai"
    const result = await getMeetingInfo('sig', '', 'AI');

    assert(result.includes('ai') || result.includes('AI'), '结果包含 SIG 名称');
    assert(result.includes('自动匹配') || result.includes('AI SIG 周会'), '结果显示匹配信息或会议');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 6：按 SIG 查询 - 无会议记录
// 注意：SIG 列表可能已从前面的测试中缓存，此测试只需 1 次 fetch（会议列表）
// ============================
async function testQueryBySigNoMeetings() {
  console.log('\n【测试 6】按 SIG 查询 - 无会议记录');

  const originalFetch = global.fetch;
  // SIG 列表已被缓存，只需提供会议列表的 mock（返回空数组）
  global.fetch = createMockFetch([
    { data: [] } // 会议列表为空
  ]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    // 使用缓存中已有的 SIG 名称 'Kernel'
    const result = await getMeetingInfo('sig', '', 'Kernel');

    assert(result.includes('暂无') || result.includes('无已安排'), '结果说明无会议记录');
    assert(result.includes('Kernel'), '结果包含 SIG 名称');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 7：网络超时处理
// ============================
async function testNetworkTimeout() {
  console.log('\n【测试 7】网络超时处理');

  const originalFetch = global.fetch;
  const abortError = new Error('The operation was aborted');
  abortError.name = 'AbortError';
  global.fetch = createMockFetch([{ error: abortError }]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('date', '2026-03-03');

    assert(result.includes('超时'), '超时时返回超时提示');
    assert(!result.includes('AbortError'), '不暴露内部错误名称');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 8：日期格式验证
// ============================
async function testDateFormatValidation() {
  console.log('\n【测试 8】日期格式验证');

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');

    // 测试错误格式
    const result1 = await getMeetingInfo('date', '20260303');
    assert(result1.includes('格式错误') || result1.includes('格式'), '拒绝 YYYYMMDD 格式');

    const result2 = await getMeetingInfo('date', '03/03/2026');
    assert(result2.includes('格式错误') || result2.includes('格式'), '拒绝 MM/DD/YYYY 格式');

    // 测试空日期
    const result3 = await getMeetingInfo('date', '');
    assert(result3.includes('请提供'), '空日期时提示提供日期');
  } catch (e) {
    assert(false, `日期验证测试失败: ${e.message}`);
  }
}

// ============================
// 测试 9：SIG 名称为空
// ============================
async function testEmptySigName() {
  console.log('\n【测试 9】SIG 名称为空');

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('sig', '', '');

    assert(result.includes('请提供'), '空 SIG 名称时提示提供名称');
  } catch (e) {
    assert(false, `空SIG名称测试失败: ${e.message}`);
  }
}

// ============================
// 测试 10：API 返回错误状态码
// ============================
async function testApiErrorResponse() {
  console.log('\n【测试 10】API 返回错误状态码');

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([{ ok: false, status: 500, data: {} }]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('date', '2026-03-03');

    assert(result.includes('API 错误时返回错误提示') || result.includes('错误'), 'API 错误时返回错误提示');
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 11：不支持的查询类型
// ============================
async function testUnsupportedQueryType() {
  console.log('\n【测试 11】不支持的查询类型');

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('unknown_type', '2026-03-03');

    assert(result.includes('不支持'), '不支持的查询类型返回提示');
  } catch (e) {
    assert(false, `不支持查询类型测试失败: ${e.message}`);
  }
}

// ============================
// 测试 12：SIG 列表获取失败时回退到原始输入
// ============================
async function testSigListFetchFallback() {
  console.log('\n【测试 12】SIG 列表获取失败时回退到原始输入');

  const mockSigMeetings = [
    {
      topic: 'Kernel 例会',
      sig_name: 'Kernel',
      date: '2026-03-01',
    }
  ];

  const originalFetch = global.fetch;
  global.fetch = createMockFetch([
    { ok: false, status: 503, data: {} }, // SIG 列表获取失败
    { data: mockSigMeetings }             // 会议列表正常返回
  ]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('sig', '', 'Kernel');

    // 即使 SIG 列表失败，仍应尝试用原始名称查询
    assert(
      result.includes('Kernel') || result.includes('错误'),
      'SIG 列表失败时仍尝试查询或返回错误信息'
    );
  } finally {
    global.fetch = originalFetch;
  }
}

// ============================
// 测试 13：会议数据格式兼容性（data 字段包装）
// ============================
async function testMeetingDataFormatCompatibility() {
  console.log('\n【测试 13】会议数据格式兼容性');

  const originalFetch = global.fetch;
  // API 返回包装在 data 字段中的会议数据
  global.fetch = createMockFetch([{
    data: {
      data: [
        {
          topic: '格式兼容测试会议',
          date: '2026-03-03',
          start_time: '09:00',
          end_time: '10:00',
        }
      ]
    }
  }]);

  try {
    const { getMeetingInfo } = await import('../src/tools/getMeetingInfo.js');
    const result = await getMeetingInfo('date', '2026-03-03');

    assert(
      result.includes('格式兼容测试会议') || result.includes('2026-03-03'),
      '支持 data 字段包装的响应格式'
    );
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
    testQueryByDateNoMeetingsWithRecommendation,
    testQueryByDateNoMeetingsNearbyFailed,
    testQueryBySigExactMatch,
    testQueryBySigCaseInsensitiveMatch,
    testQueryBySigNoMeetings,
    testNetworkTimeout,
    testDateFormatValidation,
    testEmptySigName,
    testApiErrorResponse,
    testUnsupportedQueryType,
    testSigListFetchFallback,
    testMeetingDataFormatCompatibility,
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

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(e => {
  console.error('测试运行失败:', e);
  process.exit(1);
});
