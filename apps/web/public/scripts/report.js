function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('print-report')?.addEventListener('click', () => window.print());

  try {
    const raw = sessionStorage.getItem('cherrypicker:analysis');
    if (!raw) return;

    const data = JSON.parse(raw);
    const opt = data.optimization;
    if (!opt) return;

    const formatWon = (amount) => amount.toLocaleString('ko-KR') + '원';
    const reportContent = document.getElementById('report-content');
    if (!reportContent) return;

    const uniqueCards = new Set(opt.assignments.map((assignment) => assignment.assignedCardId)).size;
    let html = '<h2 style="font-size:1.25rem;font-weight:bold;margin-bottom:1rem;">분석 요약</h2>';
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:2rem;">';
    html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">분석 기간</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">' + (data.statementPeriod ? esc(data.statementPeriod.start) + ' ~ ' + esc(data.statementPeriod.end) : '-') + '</td></tr>';
    html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">총 지출</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">' + formatWon(opt.totalSpending) + '</td></tr>';
    html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">체리피킹 혜택</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">' + formatWon(opt.totalReward) + '</td></tr>';
    html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">추가 절약</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">' + formatWon(opt.savingsVsSingleCard) + '</td></tr>';
    html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">사용 카드 수</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">' + uniqueCards + '장</td></tr>';
    html += '</table>';

    html += '<h2 style="font-size:1.25rem;font-weight:bold;margin-bottom:1rem;">추천 카드 조합</h2>';
    html += '<table style="width:100%;border-collapse:collapse;">';
    html += '<thead><tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">카테고리</th><th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">추천 카드</th><th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">혜택</th><th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">지출</th></tr></thead><tbody>';

    for (const assignment of opt.assignments) {
      html += `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${esc(assignment.categoryNameKo)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${esc(assignment.assignedCardName)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatWon(assignment.reward)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatWon(assignment.spending)}</td>
      </tr>`;
    }

    html += '</tbody></table>';
    reportContent.innerHTML = html;
  } catch {
    // Ignore malformed persisted state.
  }
});
