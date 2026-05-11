/**
 * 東京人診断 — Google Sheets データ蓄積用 Apps Script
 *
 * 【セットアップ手順】
 * 1. Googleスプレッドシートを新規作成（例：「東京人診断_データ」）
 * 2. メニュー → 拡張機能 → Apps Script を開く
 * 3. このコードを丸ごとコピペして保存
 * 4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
 *    - 実行ユーザー：自分
 *    - アクセスできるユーザー：全員
 *    - デプロイ をクリック
 * 5. 発行されるWebアプリURLを tokyo-v11.html の
 *    TRACKING_ENDPOINT 定数に貼り付ける
 *
 * 【初回の注意】
 * 初回デプロイ時に「承認が必要」と出るので、以下の手順で承認：
 * 詳細 → 安全ではないページに移動 → 許可
 */

// スプレッドシートのシート名
const SHEET_NAME = 'responses';

/**
 * POST受信ハンドラ
 */
function doPost(e) {
  try {
    // データをパース
    const data = JSON.parse(e.postData.contents);

    // スプレッドシート取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // シートがなければ作成してヘッダーを設定
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupHeaders(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupHeaders(sheet);
    }

    // データ1行として追加
    const row = buildRow(data);
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET受信ハンドラ（動作確認用）
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: '東京人診断データ収集API（POST専用）',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ヘッダー行のセットアップ
 */
function setupHeaders(sheet) {
  const headers = [
    '受信日時',
    'セッションID',
    'ユーザーID',
    '結果タイプ',
    'タイプ名',
    'マッチ率',
    '2位タイプ',
    '2位率',
    '3位タイプ',
    '3位率',
    '完了時間(秒)',
    '重複セッション',
    '累計完了回数',
    // 20問の回答（-2 〜 +2 の生データ）
    'Q1_friday_night',
    'Q2_new_shop',
    'Q3_weekend_morning',
    'Q4_trouble_alone',
    'Q5_money_use',
    'Q6_decision_basis',
    'Q7_core_need',
    'Q8_community_depth',
    'Q9_coffee_style',
    'Q10_crowded',
    'Q11_praise',
    'Q12_irritation',
    'Q13_new_hobby',
    'Q14_room_state',
    'Q15_social_style',
    'Q16_decision_speed',
    'Q17_future_vision',
    'Q18_stress_escape',
    'Q19_belonging',
    'Q20_lifestyle',
    // 各質問の所要時間（秒）
    'T1', 'T2', 'T3', 'T4', 'T5',
    'T6', 'T7', 'T8', 'T9', 'T10',
    'T11', 'T12', 'T13', 'T14', 'T15',
    'T16', 'T17', 'T18', 'T19', 'T20',
    // 環境情報
    'UserAgent',
    'Referrer',
    'ScreenSize',
    // タイムスタンプ（ISO）
    'ClientTimestamp',
  ];
  sheet.appendRow(headers);

  // ヘッダー行を固定＆太字
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a1208').setFontColor('#ffffff');
}

/**
 * 受信データからスプレッドシート用の行データを構築
 */
function buildRow(data) {
  const answers = data.answers || {};
  const timings = data.timings || {};

  // 質問IDのリスト（並び順固定）
  const Q_IDS = [
    'friday_night', 'new_shop', 'weekend_morning', 'trouble_alone',
    'money_use', 'decision_basis', 'core_need', 'community_depth',
    'coffee_style', 'crowded', 'praise', 'irritation',
    'new_hobby', 'room_state', 'social_style', 'decision_speed',
    'future_vision', 'stress_escape', 'belonging', 'lifestyle'
  ];

  const answerValues = Q_IDS.map(q => answers[q] !== undefined ? answers[q] : '');
  const timingValues = Q_IDS.map(q => timings[q] !== undefined ? Math.round(timings[q] / 1000 * 10) / 10 : '');

  return [
    new Date(),                                    // 受信日時
    data.session_id || '',
    data.user_id || '',
    data.result_type || '',
    data.result_name || '',
    data.result_match_pct || '',
    data.second_type || '',
    data.second_match_pct || '',
    data.third_type || '',
    data.third_match_pct || '',
    data.completion_time_sec || '',
    data.is_duplicate ? 'TRUE' : 'FALSE',
    data.total_completed_count || '',
    ...answerValues,
    ...timingValues,
    data.user_agent || '',
    data.referrer || '',
    data.screen_size || '',
    data.timestamp || '',
  ];
}

/**
 * テスト用関数（Apps Scriptエディタから手動実行して動作確認）
 */
function testSubmit() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        session_id: 's_test_' + Date.now(),
        user_id: 'u_test',
        timestamp: new Date().toISOString(),
        completion_time_sec: 180,
        is_duplicate: false,
        total_completed_count: 1,
        answers: {
          friday_night: -2, new_shop: 1, weekend_morning: 0,
          trouble_alone: 2, money_use: -1, decision_basis: 2,
          core_need: -2, community_depth: 0, coffee_style: -1,
          crowded: 1, praise: 0, irritation: -2,
          new_hobby: 1, room_state: 0, social_style: -1,
          decision_speed: 2, future_vision: -1, stress_escape: 0,
          belonging: 1, lifestyle: 'worker'
        },
        timings: {
          friday_night: 3500, new_shop: 2800, weekend_morning: 4100,
        },
        result_type: 'nakameguro',
        result_name: '中目黒人',
        result_match_pct: 89,
        second_type: 'daikanyama',
        second_match_pct: 84,
        third_type: 'kiyosumi',
        third_match_pct: 78,
        user_agent: 'TestAgent',
        referrer: '(direct)',
        screen_size: '375x812',
      })
    }
  };
  doPost(testData);
  Logger.log('テストデータを追加しました。スプレッドシートを確認してください。');
}
